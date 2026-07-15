import type { DetectSource, GpuBackend, GrovePlatform, HardwareProfile } from './types.js';

export function inferPlatform(value: unknown): GrovePlatform {
  const os = String(value ?? '').toLowerCase();
  if (os.includes('darwin') || os.includes('macos')) return 'macos';
  if (os.includes('windows') || os.includes('win32')) return 'windows';
  if (os.includes('linux')) return 'linux';
  if (os.includes('android')) return 'android';
  if (os.includes('ios') || os.includes('iphone')) return 'ios';
  if (os.includes('web')) return 'web';
  return 'linux';
}

const DETECT_SOURCES: DetectSource[] = ['llmfit', 'webgpu', 'native', 'manual'];

function parseDetectSource(value: unknown): DetectSource {
  const raw = String(value ?? '').toLowerCase();
  return DETECT_SOURCES.find((s) => s === raw) ?? 'native';
}

function parsePositiveNumber(value: unknown): number | undefined {
  const num = typeof value === 'number' ? value : parseFloat(String(value ?? ''));
  if (!Number.isFinite(num) || num <= 0) {
    return undefined;
  }
  return num;
}

export function normalizeGpuBackend(value: unknown): GpuBackend {
  const raw = String(value ?? '').toLowerCase();
  if (raw.includes('metal')) return 'metal';
  if (raw.includes('cuda') || raw.includes('nvidia')) return 'cuda';
  if (raw.includes('vulkan')) return 'vulkan';
  if (raw.includes('webgpu')) return 'webgpu';
  if (raw.includes('cpu') || raw === '') return 'cpu';
  if (raw.includes('rocm') || raw.includes('amd')) return 'cuda';
  return 'unknown';
}

export function assertValidHardwareProfile(profile: HardwareProfile): HardwareProfile {
  const totalRAMGB = parsePositiveNumber(profile.totalRAMGB);
  if (totalRAMGB === undefined) {
    throw new Error('HardwareProfile.totalRAMGB must be a positive number');
  }

  const gpuMemoryGB =
    profile.gpuMemoryGB === undefined
      ? undefined
      : parsePositiveNumber(profile.gpuMemoryGB) ?? 0;

  return {
    ...profile,
    totalRAMGB,
    gpuMemoryGB,
  };
}

export function pickFirstNumber(
  record: Record<string, unknown>,
  keys: string[],
): number | undefined {
  for (const key of keys) {
    const value = parsePositiveNumber(record[key]);
    if (value !== undefined) {
      return value;
    }
  }
  return undefined;
}

/** Normalize partial profiles from Tauri IPC, Capacitor plugins, or other native bridges. */
export function coerceHardwareProfile(input: Record<string, unknown>): HardwareProfile {
  const totalRAMGB = pickFirstNumber(input, [
    'totalRAMGB',
    'total_ram_gb',
    'ram_gb',
    'memory_gb',
    'total_memory_gb',
  ]);
  if (totalRAMGB === undefined) {
    throw new Error('HardwareProfile missing total RAM');
  }

  const gpuMemoryGB = pickFirstNumber(input, [
    'gpuMemoryGB',
    'gpu_memory_gb',
    'gpu_vram_gb',
    'vram_gb',
  ]);

  const gpu =
    input.gpu && typeof input.gpu === 'object' ? (input.gpu as Record<string, unknown>) : null;

  const gpuBackend = normalizeGpuBackend(
    input.gpuBackend ??
      input.gpu_backend ??
      input.backend ??
      gpu?.backend ??
      (gpuMemoryGB ? 'cuda' : 'cpu'),
  );

  const gpuName =
    String(gpu?.name ?? input.gpuName ?? input.gpu_name ?? '') || undefined;

  return assertValidHardwareProfile({
    platform: inferPlatform(input.platform ?? input.os ?? input.system),
    totalRAMGB,
    availableRAMGB: pickFirstNumber(input, ['availableRAMGB', 'available_ram_gb']),
    gpuMemoryGB: gpuMemoryGB ?? 0,
    gpuBackend,
    gpuName,
    cpuCores: pickFirstNumber(input, ['cpuCores', 'cpu_cores', 'cores']),
    source: parseDetectSource(input.source),
  });
}
