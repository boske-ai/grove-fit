use serde::Serialize;
use std::process::Command;
use tauri::AppHandle;
use tauri_plugin_shell::ShellExt;

#[derive(Serialize, Clone)]
#[serde(rename_all = "camelCase")]
pub struct HardwareProfile {
    pub platform: String,
    #[serde(rename = "totalRAMGB")]
    pub total_ram_gb: f64,
    #[serde(rename = "availableRAMGB", skip_serializing_if = "Option::is_none")]
    pub available_ram_gb: Option<f64>,
    #[serde(rename = "gpuMemoryGB", skip_serializing_if = "Option::is_none")]
    pub gpu_memory_gb: Option<f64>,
    #[serde(rename = "gpuBackend")]
    pub gpu_backend: String,
    #[serde(rename = "gpuName", skip_serializing_if = "Option::is_none")]
    pub gpu_name: Option<String>,
    pub source: String,
}

#[derive(Serialize)]
#[serde(rename_all = "camelCase", tag = "kind")]
pub enum DetectHardwareResult {
    Llmfit { stdout: String },
    Native { profile: HardwareProfile },
}

fn round_gb(bytes: u64) -> f64 {
    (bytes as f64 / 1024.0 / 1024.0 / 1024.0 * 10.0).round() / 10.0
}

fn normalize_platform(raw: &str) -> String {
    let lower = raw.to_lowercase();
    if lower.contains("darwin") || lower.contains("macos") {
        "macos".into()
    } else if lower.contains("windows") || lower.contains("win32") {
        "windows".into()
    } else if lower.contains("linux") {
        "linux".into()
    } else if lower.contains("android") {
        "android".into()
    } else if lower.contains("ios") || lower.contains("iphone") {
        "ios".into()
    } else {
        raw.to_string()
    }
}

fn normalize_gpu_backend(raw: &str) -> String {
    let lower = raw.to_lowercase();
    if lower.contains("metal") {
        "metal".into()
    } else if lower.contains("cuda") || lower.contains("nvidia") || lower.contains("rocm") {
        "cuda".into()
    } else if lower.contains("vulkan") {
        "vulkan".into()
    } else if lower.contains("webgpu") {
        "webgpu".into()
    } else if lower.contains("cpu") || lower.is_empty() {
        "cpu".into()
    } else {
        "unknown".into()
    }
}

const LLMFIT_SIDECAR: &str = "binaries/llmfit";
const MAX_LLMFIT_STDOUT_BYTES: usize = 4 * 1024 * 1024;

fn llmfit_stdout_string(stdout: Vec<u8>) -> Option<String> {
    if stdout.len() > MAX_LLMFIT_STDOUT_BYTES {
        return None;
    }
    String::from_utf8(stdout).ok()
}

async fn try_llmfit_sidecar(app: &AppHandle) -> Option<String> {
    let output = app
        .shell()
        .sidecar(LLMFIT_SIDECAR)
        .ok()?
        .args(["--json", "system"])
        .output()
        .await
        .ok()?;
    if !output.status.success() {
        return None;
    }
    llmfit_stdout_string(output.stdout)
}

fn try_llmfit_path() -> Option<String> {
    let output = Command::new("llmfit")
        .args(["--json", "system"])
        .output()
        .ok()?;
    if !output.status.success() {
        return None;
    }
    llmfit_stdout_string(output.stdout)
}

#[cfg(target_os = "macos")]
fn detect_macos_native() -> Result<HardwareProfile, String> {
    let mem_bytes = Command::new("sysctl")
        .args(["-n", "hw.memsize"])
        .output()
        .map_err(|e| format!("sysctl failed: {e}"))?;
    let mem_str = String::from_utf8(mem_bytes.stdout).map_err(|e| e.to_string())?;
    let mem_str = mem_str.trim();
    let total_bytes: u64 = mem_str
        .parse()
        .map_err(|_| format!("invalid hw.memsize: {mem_str}"))?;
    let total_ram_gb = round_gb(total_bytes);

    let mut gpu_name: Option<String> = None;
    if let Ok(display_out) = Command::new("system_profiler")
        .args(["SPDisplaysDataType", "-json"])
        .output()
    {
        if display_out.status.success() {
            if let Ok(json) = serde_json::from_slice::<serde_json::Value>(&display_out.stdout) {
                if let Some(arr) = json.get("SPDisplaysDataType").and_then(|v| v.as_array()) {
                    if let Some(first) = arr.first() {
                        gpu_name = first
                            .get("_name")
                            .or_else(|| first.get("sppci_model"))
                            .and_then(|v| v.as_str())
                            .map(String::from);
                    }
                }
            }
        }
    }

    Ok(HardwareProfile {
        platform: "macos".into(),
        total_ram_gb,
        available_ram_gb: None,
        gpu_memory_gb: Some(total_ram_gb),
        gpu_backend: "metal".into(),
        gpu_name,
        source: "native".into(),
    })
}

#[cfg(target_os = "windows")]
fn detect_windows_native() -> Result<HardwareProfile, String> {
    if let Ok(profile) = detect_windows_native_powershell() {
        return Ok(profile);
    }
    detect_windows_native_wmic()
}

#[cfg(target_os = "windows")]
fn detect_windows_native_powershell() -> Result<HardwareProfile, String> {
    let output = Command::new("powershell")
        .args([
            "-NoProfile",
            "-NonInteractive",
            "-Command",
            "(Get-CimInstance Win32_ComputerSystem).TotalPhysicalMemory",
        ])
        .output()
        .map_err(|e| format!("powershell failed: {e}"))?;
    if !output.status.success() {
        return Err("powershell memory query failed".into());
    }
    let stdout = String::from_utf8_lossy(&output.stdout);
    let bytes: u64 = stdout
        .trim()
        .parse()
        .map_err(|_| format!("could not parse PowerShell RAM output: {stdout}"))?;

    Ok(HardwareProfile {
        platform: "windows".into(),
        total_ram_gb: round_gb(bytes),
        available_ram_gb: None,
        gpu_memory_gb: None,
        gpu_backend: "unknown".into(),
        gpu_name: None,
        source: "native".into(),
    })
}

#[cfg(target_os = "windows")]
fn detect_windows_native_wmic() -> Result<HardwareProfile, String> {
    let output = Command::new("wmic")
        .args(["computersystem", "get", "totalphysicalmemory"])
        .output()
        .map_err(|e| format!("wmic failed: {e}"))?;
    let stdout = String::from_utf8_lossy(&output.stdout);
    let bytes: u64 = stdout
        .lines()
        .filter_map(|l| l.trim().parse().ok())
        .next()
        .ok_or_else(|| "could not parse Windows RAM".to_string())?;

    Ok(HardwareProfile {
        platform: "windows".into(),
        total_ram_gb: round_gb(bytes),
        available_ram_gb: None,
        gpu_memory_gb: None,
        gpu_backend: "unknown".into(),
        gpu_name: None,
        source: "native".into(),
    })
}

#[cfg(target_os = "linux")]
fn detect_linux_native() -> Result<HardwareProfile, String> {
    let meminfo = std::fs::read_to_string("/proc/meminfo")
        .map_err(|e| format!("/proc/meminfo: {e}"))?;
    let total_kb = meminfo
        .lines()
        .find(|l| l.starts_with("MemTotal:"))
        .and_then(|l| l.split_whitespace().nth(1))
        .and_then(|s| s.parse::<u64>().ok())
        .ok_or_else(|| "MemTotal not found".to_string())?;

    Ok(HardwareProfile {
        platform: "linux".into(),
        total_ram_gb: round_gb(total_kb * 1024),
        available_ram_gb: None,
        gpu_memory_gb: None,
        gpu_backend: "unknown".into(),
        gpu_name: None,
        source: "native".into(),
    })
}

#[cfg(not(any(target_os = "macos", target_os = "windows", target_os = "linux")))]
fn detect_platform_native() -> Result<HardwareProfile, String> {
    Err("Native hardware detection not supported on this platform".into())
}

#[cfg(any(target_os = "macos", target_os = "windows", target_os = "linux"))]
fn detect_platform_native() -> Result<HardwareProfile, String> {
    #[cfg(target_os = "macos")]
    return detect_macos_native();
    #[cfg(target_os = "windows")]
    return detect_windows_native();
    #[cfg(target_os = "linux")]
    return detect_linux_native();
}

fn normalize_native_profile(profile: HardwareProfile) -> HardwareProfile {
    HardwareProfile {
        platform: normalize_platform(&profile.platform),
        total_ram_gb: profile.total_ram_gb,
        available_ram_gb: profile.available_ram_gb,
        gpu_memory_gb: profile.gpu_memory_gb,
        gpu_backend: normalize_gpu_backend(&profile.gpu_backend),
        gpu_name: profile.gpu_name,
        source: profile.source,
    }
}

#[tauri::command]
pub async fn detect_hardware(app: AppHandle) -> Result<DetectHardwareResult, String> {
    if let Some(stdout) = try_llmfit_sidecar(&app).await {
        return Ok(DetectHardwareResult::Llmfit { stdout });
    }
    if let Some(stdout) = try_llmfit_path() {
        return Ok(DetectHardwareResult::Llmfit { stdout });
    }
    let profile = detect_platform_native()?;
    Ok(DetectHardwareResult::Native {
        profile: normalize_native_profile(profile),
    })
}

#[tauri::command]
pub fn greet() -> String {
    "Grove Fit — powered by llmfit".into()
}
