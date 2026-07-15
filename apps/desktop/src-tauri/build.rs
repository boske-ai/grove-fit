fn main() {
    run_sidecar_copy();
    tauri_build::build()
}

fn run_sidecar_copy() {
    let script = std::path::Path::new(env!("CARGO_MANIFEST_DIR"))
        .join("../../../scripts/copy-llmfit-sidecar.mjs");
    if !script.exists() {
        return;
    }

    let status = std::process::Command::new("node")
        .arg(&script)
        .status();

    match status {
        Ok(s) if s.success() => {}
        Ok(s) => {
            panic!(
                "copy-llmfit-sidecar.mjs failed with exit code {:?}",
                s.code()
            );
        }
        Err(e) => {
            eprintln!("copy-llmfit-sidecar: node not found — skip sidecar staging ({e})");
        }
    }
}
