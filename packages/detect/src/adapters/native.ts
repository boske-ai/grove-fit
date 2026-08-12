import { assertValidHardwareProfile } from '../normalize.js';
import type { GrovePlatform, HardwareProfile } from '../types.js';

export interface NativeDetectPayload {
  platform: 'ios' | 'android';
  totalRAMGB: number;
  availableRAMGB?: number;
  gpuName?: string;
  hasGpu?: boolean;
}

/** Raw memory payload from Capacitor native plugins before normalization. */
export interface NativeDetectRaw {
  totalMemoryBytes: number;
  availableMemoryBytes?: number;
  platform: 'ios' | 'android';
}

/** Headroom reserved for the OS on unified-memory devices, in GB. */
const UNIFIED_MEMORY_RESERVED_GB = 6;

export function parseNativeHardwareProfile(payload: NativeDetectPayload): HardwareProfile {
  const hasGpu = payload.hasGpu !== false;

  // Both supported mobile platforms are unified-memory; they differ only in the
  // backend label. The previous version computed the backend twice and then
  // overrode it in the return, leaving an unreachable half-RAM branch behind.
  const gpuBackend = !hasGpu ? 'cpu' : payload.platform === 'android' ? 'vulkan' : 'metal';

  const gpuMemoryGB = hasGpu
    ? Math.max(0, payload.totalRAMGB - UNIFIED_MEMORY_RESERVED_GB)
    : 0;

  return assertValidHardwareProfile({
    platform: payload.platform,
    totalRAMGB: payload.totalRAMGB,
    availableRAMGB: payload.availableRAMGB,
    gpuMemoryGB,
    gpuBackend,
    gpuName: payload.gpuName,
    source: 'native',
  });
}

export function bytesToRamGB(bytes: number): number {
  return Math.round((bytes / 1024 ** 3) * 10) / 10;
}

export function detectIosProfile(physicalMemoryBytes: number): HardwareProfile {
  const totalRAMGB = bytesToRamGB(physicalMemoryBytes);
  return parseNativeHardwareProfile({
    platform: 'ios',
    totalRAMGB,
    hasGpu: true,
    gpuName: 'Apple GPU',
  });
}

export function detectAndroidProfile(
  totalMemoryBytes: number,
  availableMemoryBytes?: number,
): HardwareProfile {
  return parseNativeHardwareProfile({
    platform: 'android',
    totalRAMGB: bytesToRamGB(totalMemoryBytes),
    availableRAMGB:
      availableMemoryBytes === undefined ? undefined : bytesToRamGB(availableMemoryBytes),
    hasGpu: true,
  });
}

export function parseNativeDetectRaw(raw: NativeDetectRaw): HardwareProfile {
  if (!Number.isFinite(raw.totalMemoryBytes) || raw.totalMemoryBytes <= 0) {
    throw new Error('NativeDetectRaw.totalMemoryBytes must be a positive number');
  }

  if (raw.platform === 'ios') {
    return detectIosProfile(raw.totalMemoryBytes);
  }

  if (raw.platform === 'android') {
    return detectAndroidProfile(raw.totalMemoryBytes, raw.availableMemoryBytes);
  }

  throw new Error(`Unsupported native detect platform: ${String(raw.platform)}`);
}
