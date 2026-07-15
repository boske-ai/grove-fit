import { assertValidHardwareProfile } from '../normalize.js';
import type { GrovePlatform, HardwareProfile, ManualHardwareInput } from '../types.js';

export function buildManualHardwareProfile(input: ManualHardwareInput): HardwareProfile {
  return assertValidHardwareProfile({
    platform: input.platform ?? 'web',
    totalRAMGB: input.totalRAMGB,
    gpuMemoryGB: input.gpuMemoryGB ?? 0,
    gpuBackend: input.gpuBackend,
    gpuName: input.gpuName,
    source: 'manual',
  });
}

export function detectWebPlatform(): GrovePlatform {
  if (typeof navigator === 'undefined') {
    return 'web';
  }
  const ua = navigator.userAgent.toLowerCase();
  if (/iphone|ipad|ipod/.test(ua)) return 'ios';
  if (/android/.test(ua)) return 'android';
  if (/macintosh|mac os/.test(ua)) return 'macos';
  if (/windows/.test(ua)) return 'windows';
  if (/linux/.test(ua)) return 'linux';
  return 'web';
}
