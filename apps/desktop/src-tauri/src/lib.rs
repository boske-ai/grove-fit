mod detect;

use detect::detect_hardware;
use std::io::Write;
use tauri::Manager;

fn desktop_log(message: &str) {
    eprintln!("{message}");
    if let Ok(mut file) = std::fs::OpenOptions::new()
        .create(true)
        .append(true)
        .open("/tmp/grove-fit-desktop.log")
    {
        let _ = writeln!(file, "{message}");
    }
}

/// macOS Tahoe: WKWebView often fails to finish HTTP navigations (Vite/devUrl hangs
/// forever). Ship UI over the `tauri://` custom protocol instead, and force an
/// opaque window chrome so the first frame composites.
#[cfg(target_os = "macos")]
fn prepare_macos_webview(window: &tauri::WebviewWindow) {
    use objc2_app_kit::{NSColor, NSWindow};
    use objc2_web_kit::WKWebView;

    let _ = window.set_background_color(Some(tauri::window::Color(0xf7, 0xf4, 0xed, 0xff)));

    let _ = window.with_webview(|webview| {
        // SAFETY: pointers come from Tauri/wry's PlatformWebview on macOS.
        unsafe {
            let view: &WKWebView = &*webview.inner().cast();
            let ns_window: &NSWindow = &*webview.ns_window().cast();

            let cream = NSColor::colorWithDeviceRed_green_blue_alpha(0.97, 0.96, 0.93, 1.0);
            ns_window.setOpaque(true);
            ns_window.setBackgroundColor(Some(&cream));
            view.setUnderPageBackgroundColor(Some(&cream));
            ns_window.orderFrontRegardless();
            desktop_log(&format!(
                "grove-fit-desktop: webview url={:?} title={:?} loading={}",
                view.URL()
                    .and_then(|u| u.absoluteString())
                    .map(|s| s.to_string()),
                view.title().map(|t| t.to_string()),
                view.isLoading()
            ));
        }
    });
}

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    tauri::Builder::default()
        .plugin(tauri_plugin_shell::init())
        .invoke_handler(tauri::generate_handler![detect_hardware])
        .setup(|app| {
            let Some(window) = app.get_webview_window("main") else {
                desktop_log("grove-fit-desktop: main webview missing");
                return Ok(());
            };

            #[cfg(target_os = "macos")]
            {
                desktop_log("grove-fit-desktop: macOS WebView prepare");
                prepare_macos_webview(&window);

                // Re-apply after first paint — Tahoe sometimes drops the initial chrome.
                let handle = app.handle().clone();
                let label = window.label().to_string();
                std::thread::spawn(move || {
                    std::thread::sleep(std::time::Duration::from_millis(1200));
                    let app = handle.clone();
                    let _ = handle.run_on_main_thread(move || {
                        if let Some(window) = app.get_webview_window(&label) {
                            prepare_macos_webview(&window);
                        }
                    });
                });
            }

            #[cfg(not(target_os = "macos"))]
            {
                let _ = window;
            }

            Ok(())
        })
        .run(tauri::generate_context!())
        .expect("error while running Grove Fit desktop");
}
