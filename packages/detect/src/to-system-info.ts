import type { SystemInfo } from '@boske-labs/grove-fit-core';
import type { HardwareProfile } from './types.js';

/** Preserve detect backends as-is — no silent remaps (webgpu→cuda, unknown→cpu). */
export function hardwareProfileToSystemInfo(profile: HardwareProfile): SystemInfo {
  return {
    totalRAMGB: String(profile.totalRAMGB),
    gpuMemoryGB: String(profile.gpuMemoryGB ?? 0),
    gpuBackend: profile.gpuBackend,
    gpu: profile.gpuName ? { name: profile.gpuName, backend: profile.gpuBackend } : null,
  };
}
