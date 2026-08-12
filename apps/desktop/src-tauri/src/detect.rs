use serde::Serialize;
use std::process::Command;
use std::time::Duration;
use tauri::AppHandle;
use tauri_plugin_shell::process::CommandEvent;
use tauri_plugin_shell::ShellExt;
use tokio::time::timeout;

#[derive(Serialize, Clone, Debug)]
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

// NOTE: these two functions must stay byte-for-byte equivalent in behavior to
// `inferPlatform` / `normalizeGpuBackend` in packages/detect/src/normalize.ts.
// The conformance suite feeds the same table through both (GF12).

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
    } else if lower.contains("web") {
        "web".into()
    } else {
        // Matches the TS default — an unrecognized platform is treated as linux
        // rather than echoed back, so downstream code always sees a known value.
        "linux".into()
    }
}

fn normalize_gpu_backend(raw: &str) -> String {
    let lower = raw.to_lowercase();
    if lower.contains("metal") {
        "metal".into()
    } else if lower.contains("cuda") || lower.contains("nvidia") {
        "cuda".into()
    } else if lower.contains("vulkan") {
        "vulkan".into()
    } else if lower.contains("webgpu") {
        "webgpu".into()
    } else if lower.contains("cpu") || lower.is_empty() {
        "cpu".into()
    } else if lower.contains("rocm") || lower.contains("amd") {
        // Discrete-VRAM path, same as CUDA for sizing purposes.
        "cuda".into()
    } else {
        "unknown".into()
    }
}

/// Sidecar name as resolved at runtime, NOT the `externalBin` config path.
///
/// `sidecar()` resolves to `<dir of current exe>/<this>`, and the bundler drops
/// the `binaries/` prefix and the target triple when staging next to the main
/// executable. Passing "binaries/llmfit" made every lookup miss, so detection
/// silently fell back to the native probe and llmfit was never actually used.
const LLMFIT_SIDECAR: &str = "llmfit";
const MAX_LLMFIT_STDOUT_BYTES: usize = 4 * 1024 * 1024;
const MAX_SYSTEM_PROFILER_STDOUT_BYTES: usize = 2 * 1024 * 1024;
/// Matches the CLI's llmfit budget. Without it a wedged sidecar leaves the UI
/// stuck on "Scanning hardware…", which hides the entire result grid.
const LLMFIT_SIDECAR_TIMEOUT: Duration = Duration::from_secs(15);

fn llmfit_stdout_string(stdout: Vec<u8>) -> Option<String> {
    if stdout.len() > MAX_LLMFIT_STDOUT_BYTES {
        return None;
    }
    String::from_utf8(stdout).ok()
}

async fn try_llmfit_sidecar(app: &AppHandle) -> Option<String> {
    let command = app
        .shell()
        .sidecar(LLMFIT_SIDECAR)
        .ok()?
        .args(["--json", "system"]);

    // spawn (not output) so a timeout can kill the child. Dropping the future
    // from `output()` abandons the process, leaving a wedged llmfit running for
    // the life of the app.
    let (mut rx, child) = command.spawn().ok()?;

    let collect = async {
        let mut stdout: Vec<u8> = Vec::new();
        let mut success = false;
        while let Some(event) = rx.recv().await {
            match event {
                CommandEvent::Stdout(chunk) => {
                    // Bound the buffer as it arrives, not after the fact.
                    if stdout.len() + chunk.len() > MAX_LLMFIT_STDOUT_BYTES {
                        return None;
                    }
                    stdout.extend_from_slice(&chunk);
                }
                CommandEvent::Terminated(payload) => {
                    success = payload.code == Some(0);
                }
                _ => {}
            }
        }
        success.then_some(stdout)
    };

    match timeout(LLMFIT_SIDECAR_TIMEOUT, collect).await {
        Ok(Some(stdout)) => llmfit_stdout_string(stdout),
        Ok(None) => None,
        Err(_) => {
            // Fall through to the native probe rather than hanging forever.
            let _ = child.kill();
            None
        }
    }
}

#[cfg_attr(not(target_os = "macos"), allow(dead_code))]
fn detect_macos_native() -> Result<HardwareProfile, String> {
    let mem_bytes = Command::new("/usr/sbin/sysctl")
        .args(["-n", "hw.memsize"])
        .output()
        .map_err(|e| format!("sysctl failed: {e}"))?;
    let mem_str = String::from_utf8(mem_bytes.stdout).map_err(|e| e.to_string())?;
    let total_bytes = parse_sysctl_ram_bytes(&mem_str)?;
    let total_ram_gb = round_gb(total_bytes);

    let mut gpu_name: Option<String> = None;
    if let Ok(display_out) = Command::new("/usr/sbin/system_profiler")
        .args(["SPDisplaysDataType", "-json"])
        .output()
    {
        if display_out.status.success()
            && display_out.stdout.len() <= MAX_SYSTEM_PROFILER_STDOUT_BYTES
        {
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
        // Unified memory: the GPU shares system RAM but cannot address all of
        // it. Mirror the mobile adapter's RAM-6 heuristic instead of reporting
        // total RAM as VRAM, which made the CLI print "24 GB VRAM" on a 24 GB Mac.
        gpu_memory_gb: Some((total_ram_gb - 6.0).max(0.0)),
        gpu_backend: "metal".into(),
        gpu_name,
        source: "native".into(),
    })
}

// The helpers below are deliberately NOT behind #[cfg(target_os = "windows")].
// They are pure string work, so leaving them gated meant no Linux or macOS
// build ever type-checked them and a mistake could ship unnoticed. Only the
// subprocess calls, which need real Windows tools, stay gated.

#[cfg_attr(not(target_os = "windows"), allow(dead_code))]
fn system_root() -> String {
    std::env::var("SystemRoot").unwrap_or_else(|_| r"C:\Windows".to_string())
}

#[cfg_attr(not(target_os = "windows"), allow(dead_code))]
fn system32_tool_in(root: &str, relative: &str) -> String {
    format!(r"{root}\System32\{relative}")
}

/// Resolve a system tool under %SystemRoot% rather than through PATH.
///
/// A bare `Command::new("powershell")` searches PATH (and, on Windows, the
/// current directory ahead of some entries), so a planted `powershell.exe` next
/// to the app would run instead of the real one.
#[cfg_attr(not(target_os = "windows"), allow(dead_code))]
fn system32_tool(relative: &str) -> String {
    system32_tool_in(&system_root(), relative)
}

#[cfg_attr(not(target_os = "windows"), allow(dead_code))]
fn powershell_path() -> String {
    system32_tool(r"WindowsPowerShell\v1.0\powershell.exe")
}

#[cfg_attr(not(target_os = "windows"), allow(dead_code))]
fn wmic_path() -> String {
    system32_tool(r"wbem\WMIC.exe")
}

/// Reject a nonsensical zero so it cannot reach the frontend as a 0 GB machine.
fn checked_ram_bytes(bytes: u64, source: &str) -> Result<u64, String> {
    if bytes == 0 {
        return Err(format!("{source} reported 0 bytes of RAM"));
    }
    Ok(bytes)
}

/// Parse `sysctl -n hw.memsize` output.
#[cfg_attr(not(target_os = "macos"), allow(dead_code))]
fn parse_sysctl_ram_bytes(stdout: &str) -> Result<u64, String> {
    let trimmed = stdout.trim();
    let bytes: u64 = trimmed
        .parse()
        .map_err(|_| format!("invalid hw.memsize: {trimmed}"))?;
    checked_ram_bytes(bytes, "sysctl hw.memsize")
}

/// Parse `MemTotal:` (in kB) out of /proc/meminfo.
#[cfg_attr(not(target_os = "linux"), allow(dead_code))]
fn parse_meminfo_ram_bytes(meminfo: &str) -> Result<u64, String> {
    let total_kb = meminfo
        .lines()
        .find(|l| l.starts_with("MemTotal:"))
        .and_then(|l| l.split_whitespace().nth(1))
        .and_then(|s| s.parse::<u64>().ok())
        .ok_or_else(|| "MemTotal not found".to_string())?;
    checked_ram_bytes(total_kb * 1024, "/proc/meminfo")
}

/// Parse `(Get-CimInstance Win32_ComputerSystem).TotalPhysicalMemory` output.
#[cfg_attr(not(target_os = "windows"), allow(dead_code))]
fn parse_powershell_ram_bytes(stdout: &str) -> Result<u64, String> {
    let trimmed = stdout.trim();
    let bytes: u64 = trimmed
        .parse()
        .map_err(|_| format!("could not parse PowerShell RAM output: {trimmed}"))?;
    checked_ram_bytes(bytes, "PowerShell")
}

/// Parse the `wmic computersystem get totalphysicalmemory` table, which prints
/// a `TotalPhysicalMemory` header followed by the value.
#[cfg_attr(not(target_os = "windows"), allow(dead_code))]
fn parse_wmic_ram_bytes(stdout: &str) -> Result<u64, String> {
    let bytes = stdout
        .lines()
        .filter_map(|l| l.trim().parse::<u64>().ok())
        .find(|v| *v > 0)
        .ok_or_else(|| "could not parse Windows RAM".to_string())?;
    checked_ram_bytes(bytes, "wmic")
}

#[cfg_attr(not(target_os = "windows"), allow(dead_code))]
fn windows_profile(bytes: u64) -> HardwareProfile {
    HardwareProfile {
        platform: "windows".into(),
        total_ram_gb: round_gb(bytes),
        available_ram_gb: None,
        gpu_memory_gb: None,
        gpu_backend: "unknown".into(),
        gpu_name: None,
        source: "native".into(),
    }
}

#[cfg_attr(not(target_os = "windows"), allow(dead_code))]
fn detect_windows_native() -> Result<HardwareProfile, String> {
    if let Ok(profile) = detect_windows_native_powershell() {
        return Ok(profile);
    }
    detect_windows_native_wmic()
}

#[cfg_attr(not(target_os = "windows"), allow(dead_code))]
fn detect_windows_native_powershell() -> Result<HardwareProfile, String> {
    let output = Command::new(powershell_path())
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
    Ok(windows_profile(parse_powershell_ram_bytes(&stdout)?))
}

#[cfg_attr(not(target_os = "windows"), allow(dead_code))]
fn detect_windows_native_wmic() -> Result<HardwareProfile, String> {
    let output = Command::new(wmic_path())
        .args(["computersystem", "get", "totalphysicalmemory"])
        .output()
        .map_err(|e| format!("wmic failed: {e}"))?;
    let stdout = String::from_utf8_lossy(&output.stdout);
    Ok(windows_profile(parse_wmic_ram_bytes(&stdout)?))
}

#[cfg_attr(not(target_os = "linux"), allow(dead_code))]
fn detect_linux_native() -> Result<HardwareProfile, String> {
    let meminfo =
        std::fs::read_to_string("/proc/meminfo").map_err(|e| format!("/proc/meminfo: {e}"))?;
    let total_bytes = parse_meminfo_ram_bytes(&meminfo)?;

    Ok(HardwareProfile {
        platform: "linux".into(),
        total_ram_gb: round_gb(total_bytes),
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
    // Keep blocking OS probes off the async runtime (system_profiler can stall UI).
    let profile = tauri::async_runtime::spawn_blocking(detect_platform_native)
        .await
        .map_err(|e| format!("native detect join error: {e}"))??;
    Ok(DetectHardwareResult::Native {
        profile: normalize_native_profile(profile),
    })
}

#[cfg(test)]
mod tests {
    use super::*;

    // These run on every platform on purpose. The Windows probes are gated
    // behind cfg(target_os = "windows"), so their pure parts are the only
    // portion Linux/macOS CI can exercise — and previously it exercised none.

    #[test]
    fn resolves_windows_tools_under_system_root() {
        assert_eq!(
            system32_tool_in(r"C:\Windows", r"wbem\WMIC.exe"),
            r"C:\Windows\System32\wbem\WMIC.exe"
        );
        // A relocated Windows install must be honoured, not hardcoded.
        assert_eq!(
            system32_tool_in(r"D:\Win", r"WindowsPowerShell\v1.0\powershell.exe"),
            r"D:\Win\System32\WindowsPowerShell\v1.0\powershell.exe"
        );
    }

    #[test]
    fn tool_paths_are_absolute_not_bare_names() {
        // The whole point of the change: never let PATH pick the binary.
        for path in [powershell_path(), wmic_path()] {
            assert!(path.contains(r"\System32\"), "not a System32 path: {path}");
            assert!(!path.starts_with("powershell"), "bare name would hit PATH");
            assert!(!path.starts_with("wmic"), "bare name would hit PATH");
        }
    }

    #[test]
    fn parses_powershell_ram() {
        assert_eq!(
            parse_powershell_ram_bytes("17179869184\r\n").unwrap(),
            17179869184
        );
        assert_eq!(
            parse_powershell_ram_bytes("  8589934592  ").unwrap(),
            8589934592
        );
        assert!(parse_powershell_ram_bytes("").is_err());
        assert!(parse_powershell_ram_bytes("not-a-number").is_err());
    }

    #[test]
    fn parses_wmic_table_skipping_the_header() {
        let out = "TotalPhysicalMemory\r\n17179869184\r\n\r\n";
        assert_eq!(parse_wmic_ram_bytes(out).unwrap(), 17179869184);
        assert!(parse_wmic_ram_bytes("TotalPhysicalMemory\r\n\r\n").is_err());
    }

    #[test]
    fn rejects_zero_ram_rather_than_reporting_a_0gb_machine() {
        assert!(parse_powershell_ram_bytes("0").is_err());
        assert!(parse_wmic_ram_bytes("TotalPhysicalMemory\r\n0\r\n").is_err());
        assert!(parse_sysctl_ram_bytes("0").is_err());
        assert!(parse_meminfo_ram_bytes("MemTotal:       0 kB").is_err());
    }

    #[test]
    fn parses_sysctl_and_meminfo() {
        assert_eq!(
            parse_sysctl_ram_bytes("25769803776\n").unwrap(),
            25769803776
        );
        assert!(parse_sysctl_ram_bytes("garbage").is_err());

        let meminfo = "MemTotal:       16316532 kB\nMemFree:         123 kB\n";
        assert_eq!(parse_meminfo_ram_bytes(meminfo).unwrap(), 16316532 * 1024);
        assert!(parse_meminfo_ram_bytes("MemFree: 123 kB").is_err());
    }

    #[test]
    fn normalizers_match_the_typescript_contract() {
        // Mirrors packages/detect/src/normalize.ts — GF18.
        assert_eq!(normalize_gpu_backend("Apple M4 Metal"), "metal");
        assert_eq!(normalize_gpu_backend("NVIDIA CUDA"), "cuda");
        assert_eq!(normalize_gpu_backend("ROCm"), "cuda");
        assert_eq!(normalize_gpu_backend("AMD Radeon"), "cuda");
        assert_eq!(normalize_gpu_backend("vulkan"), "vulkan");
        assert_eq!(normalize_gpu_backend("webgpu"), "webgpu");
        assert_eq!(normalize_gpu_backend(""), "cpu");
        assert_eq!(normalize_gpu_backend("something else"), "unknown");

        assert_eq!(normalize_platform("darwin"), "macos");
        assert_eq!(normalize_platform("win32"), "windows");
        assert_eq!(normalize_platform("Linux"), "linux");
        assert_eq!(normalize_platform("android"), "android");
        assert_eq!(normalize_platform("iPhone"), "ios");
        assert_eq!(normalize_platform("web"), "web");
        // Unknown input defaults to linux, as inferPlatform does.
        assert_eq!(normalize_platform("plan9"), "linux");
    }

    #[test]
    #[cfg(not(target_os = "windows"))]
    fn windows_probe_errors_cleanly_off_windows() {
        // The probe now compiles everywhere, so this also asserts it degrades
        // instead of panicking when the tools are absent. On Windows the real
        // tools exist, so this only makes sense off it.
        let result = detect_windows_native();
        assert!(result.is_err(), "expected an error, got {result:?}");
    }

    #[test]
    fn rounds_bytes_to_one_decimal_gb() {
        assert_eq!(round_gb(25769803776), 24.0);
        assert_eq!(round_gb(17179869184), 16.0);
    }
}
