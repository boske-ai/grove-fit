export { parseLlmfitSystemJson } from './adapters/llmfit.js';
export { buildManualHardwareProfile, detectWebPlatform } from './adapters/manual.js';
export {
  detectAndroidProfile,
  detectIosProfile,
  parseNativeDetectRaw,
  parseNativeHardwareProfile,
  bytesToRamGB,
  type NativeDetectPayload,
  type NativeDetectRaw,
} from './adapters/native.js';
export {
  applyWebGpuSource,
  detectWebGpuHardwareProfile,
  type WebGpuDetectResult,
} from './adapters/webgpu.js';
export {
  assertValidHardwareProfile,
  coerceHardwareProfile,
  inferPlatform,
  normalizeGpuBackend,
} from './normalize.js';
export { hardwareProfileToSystemInfo } from './to-system-info.js';
export type {
  DetectSource,
  GpuBackend,
  GrovePlatform,
  HardwareProfile,
  ManualHardwareInput,
} from './types.js';
