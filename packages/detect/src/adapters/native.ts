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

export function parseNativeHardwareProfile(payload: NativeDetectPayload): HardwareProfile {
  const isUnified = payload.platform === 'ios' || payload.platform === 'android';
  const gpuBackend = payload.hasGpu === false ? 'cpu' : isUnified ? 'metal' : 'vulkan';

  let gpuMemoryGB = 0;
  if (gpuBackend !== 'cpu' && isUnified) {
    gpuMemoryGB = Math.max(0, payload.totalRAMGB - 6);
  } else if (gpuBackend !== 'cpu') {
    gpuMemoryGB = Math.floor(payload.totalRAMGB * 0.5);
  }

  return assertValidHardwareProfile({
    platform: payload.platform,
    totalRAMGB: payload.totalRAMGB,
    availableRAMGB: payload.availableRAMGB,
    gpuMemoryGB,
    gpuBackend: payload.platform === 'android' && payload.hasGpu !== false ? 'vulkan' : gpuBackend,
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
