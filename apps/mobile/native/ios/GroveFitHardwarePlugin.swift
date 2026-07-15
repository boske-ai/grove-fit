import Foundation
import Capacitor

@objc(GroveFitHardwarePlugin)
public class GroveFitHardwarePlugin: CAPPlugin {

    @objc func detect(_ call: CAPPluginCall) {
        let physicalMemory = ProcessInfo.processInfo.physicalMemory
        call.resolve([
            "totalMemoryBytes": physicalMemory,
            "platform": "ios"
        ])
    }
}
