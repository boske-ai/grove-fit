import { buildManualHardwareProfile, detectWebPlatform } from './manual.js';
import type { GpuBackend, HardwareProfile } from '../types.js';

/**
 * `navigator.deviceMemory` is deliberately coarse: the spec rounds to a power of
 * two and user agents clamp the reported value (Chrome caps at 8) to limit
 * fingerprinting. A reading at the ceiling therefore means "at least this much"
 * — a 24 GB machine reports 8 or 16 depending on the browser.
 *
 * Treating that as an exact figure silently under-assigns the tier, so anything
 * at or above the ceiling is a lower bound and must be confirmed by the user
 * (GF13: fall back to manual when the hint is insufficient for confident
 * tier assignment).
 */
export const DEVICE_MEMORY_CLAMP_CEILING_GB = 8;

export type WebGpuConfidence = 'exact' | 'lower-bound';

export interface WebGpuDetectResult {
  profile: HardwareProfile | null;
  reason?: 'unsupported' | 'denied' | 'unavailable';
  /**
   * `lower-bound` means the RAM figure is a floor, not a measurement — callers
   * must confirm with the user before treating the tier as authoritative.
   */
  confidence?: WebGpuConfidence;
}

interface GpuNavigator extends Navigator {
  gpu?: { requestAdapter: () => Promise<GpuAdapterLike | null> };
}

interface GpuAdapterInfoLike {
  vendor?: string;
  architecture?: string;
  device?: string;
}

interface GpuAdapterLike {
  /** Current spec: a plain attribute. */
  info?: GpuAdapterInfoLike;
  /** Removed from Chrome 128+; kept for older engines. */
  requestAdapterInfo?: () => Promise<GpuAdapterInfoLike>;
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

async function readAdapterName(adapter: GpuAdapterLike): Promise<string | undefined> {
  try {
    const info = adapter.info ?? (await adapter.requestAdapterInfo?.());
    if (!info) return undefined;
    return [info.vendor, info.architecture, info.device].filter(Boolean).join(' ') || undefined;
  } catch {
    // GPU identity is cosmetic — never fail detection over it.
    return undefined;
  }
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

  const gpuName = await readAdapterName(adapter);
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
    confidence: webGpuMemoryConfidence(deviceMemoryGB),
  };
}

/** Whether a `navigator.deviceMemory` reading is exact or merely a floor. */
export function webGpuMemoryConfidence(deviceMemoryGB: number): WebGpuConfidence {
  return deviceMemoryGB >= DEVICE_MEMORY_CLAMP_CEILING_GB ? 'lower-bound' : 'exact';
}

export function applyWebGpuSource(profile: HardwareProfile): HardwareProfile {
  return { ...profile, source: 'webgpu' };
}
