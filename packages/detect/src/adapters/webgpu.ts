import { buildManualHardwareProfile, detectWebPlatform } from './manual.js';
import type { GpuBackend, HardwareProfile } from '../types.js';

export interface WebGpuDetectResult {
  profile: HardwareProfile | null;
  reason?: 'unsupported' | 'denied' | 'unavailable';
}

interface GpuNavigator extends Navigator {
  gpu?: { requestAdapter: () => Promise<GpuAdapterLike | null> };
}

interface GpuAdapterLike {
  requestAdapterInfo?: () => Promise<{ vendor?: string; architecture?: string; device?: string }>;
}

function readDeviceMemoryGB(): number | undefined {
  const nav = navigator as Navigator & { deviceMemory?: number };
  if (typeof nav.deviceMemory === 'number' && nav.deviceMemory > 0) {
    return nav.deviceMemory;
  }
  return undefined;
}

function inferBackendFromPlatform(platform: ReturnType<typeof detectWebPlatform>): GpuBackend {
  if (platform === 'macos' || platform === 'ios') return 'metal';
  if (platform === 'android') return 'vulkan';
  return 'webgpu';
}

export async function detectWebGpuHardwareProfile(): Promise<WebGpuDetectResult> {
  if (typeof navigator === 'undefined') {
    return { profile: null, reason: 'unsupported' };
  }

  const gpuNav = navigator as GpuNavigator;
  if (!gpuNav.gpu) {
    return { profile: null, reason: 'unsupported' };
  }

  let adapter: GpuAdapterLike | null;
  try {
    adapter = await gpuNav.gpu.requestAdapter();
  } catch {
    return { profile: null, reason: 'denied' };
  }

  if (!adapter) {
    return { profile: null, reason: 'unavailable' };
  }

  const platform = detectWebPlatform();
  const deviceMemoryGB = readDeviceMemoryGB();
  if (deviceMemoryGB === undefined) {
    return { profile: null, reason: 'unavailable' };
  }

  let gpuName: string | undefined;
  if (adapter.requestAdapterInfo) {
    const info = await adapter.requestAdapterInfo();
    gpuName = [info.vendor, info.architecture, info.device].filter(Boolean).join(' ') || undefined;
  }

  const backend = inferBackendFromPlatform(platform);
  const gpuMemoryGB =
    backend === 'metal' ? Math.max(0, deviceMemoryGB - 6) : Math.floor(deviceMemoryGB * 0.5);

  return {
    profile: applyWebGpuSource(
      buildManualHardwareProfile({
        totalRAMGB: deviceMemoryGB,
        gpuMemoryGB,
        gpuBackend: backend,
        gpuName,
        platform: 'web',
      }),
    ),
  };
}

export function applyWebGpuSource(profile: HardwareProfile): HardwareProfile {
  return { ...profile, source: 'webgpu' };
}
