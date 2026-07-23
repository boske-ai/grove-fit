export { GroveFitHardware, type GroveFitHardwarePlugin } from './registry.js';
export { detectMobileHardware, type NativeDetectRaw } from './detect.js';
// Do not re-export GroveFitHardwareWeb here — that pulls @capacitor/core into
// every importer of this subpath (including desktop/web shells).
