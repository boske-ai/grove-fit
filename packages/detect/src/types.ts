export type GrovePlatform = 'windows' | 'macos' | 'linux' | 'ios' | 'android' | 'web';

export type GpuBackend =
  | 'metal'
  | 'cuda'
  | 'vulkan'
  | 'webgpu'
  | 'cpu'
  | 'unknown';

export type DetectSource = 'llmfit' | 'webgpu' | 'native' | 'manual';

export interface HardwareProfile {
  platform: GrovePlatform;
  totalRAMGB: number;
  availableRAMGB?: number;
  gpuMemoryGB?: number;
  gpuBackend: GpuBackend;
  gpuName?: string;
  cpuCores?: number;
  source: DetectSource;
}

export interface ManualHardwareInput {
  totalRAMGB: number;
  gpuMemoryGB?: number;
  gpuBackend: GpuBackend;
  gpuName?: string;
  platform?: GrovePlatform;
}
