package dev.boske.grovefit;

import android.app.ActivityManager;
import android.content.Context;
import com.getcapacitor.JSObject;
import com.getcapacitor.Plugin;
import com.getcapacitor.PluginCall;
import com.getcapacitor.PluginMethod;
import com.getcapacitor.annotation.CapacitorPlugin;

@CapacitorPlugin(name = "GroveFitHardware")
public class GroveFitHardwarePlugin extends Plugin {

  @PluginMethod
  public void detect(PluginCall call) {
    ActivityManager activityManager =
        (ActivityManager) getContext().getSystemService(Context.ACTIVITY_SERVICE);
    ActivityManager.MemoryInfo memoryInfo = new ActivityManager.MemoryInfo();
    activityManager.getMemoryInfo(memoryInfo);

    JSObject result = new JSObject();
    result.put("totalMemoryBytes", memoryInfo.totalMem);
    result.put("availableMemoryBytes", memoryInfo.availMem);
    result.put("platform", "android");
    call.resolve(result);
  }
}
