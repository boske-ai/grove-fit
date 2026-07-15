import type { SystemInfo } from '@boske-labs/grove-fit-core';
import type { HardwareProfile } from './types.js';

export function hardwareProfileToSystemInfo(profile: HardwareProfile): SystemInfo {
  const gpuBackend =
    profile.gpuBackend === 'webgpu' || profile.gpuBackend === 'vulkan'
      ? profile.gpuBackend === 'vulkan'
        ? 'vulkan'
        : profile.platform === 'macos' || profile.platform === 'ios'
          ? 'metal'
          : 'cuda'
      : profile.gpuBackend;

  return {
    totalRAMGB: String(profile.totalRAMGB),
    gpuMemoryGB: String(profile.gpuMemoryGB ?? 0),
    gpuBackend: gpuBackend === 'unknown' ? 'cpu' : gpuBackend,
    gpu: profile.gpuName ? { name: profile.gpuName, backend: gpuBackend } : null,
  };
}
