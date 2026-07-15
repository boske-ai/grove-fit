mod detect;

use detect::detect_hardware;

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    tauri::Builder::default()
        .plugin(tauri_plugin_shell::init())
        .invoke_handler(tauri::generate_handler![detect::greet, detect_hardware])
        .run(tauri::generate_context!())
        .expect("error while running Grove Fit desktop");
}
