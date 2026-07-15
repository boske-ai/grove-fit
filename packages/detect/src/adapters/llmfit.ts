import {
  assertValidHardwareProfile,
  inferPlatform,
  normalizeGpuBackend,
  pickFirstNumber,
} from '../normalize.js';
import type { HardwareProfile } from '../types.js';

function unwrapLlmfitSystemPayload(parsed: unknown): Record<string, unknown> {
  if (!parsed || typeof parsed !== 'object') {
    throw new Error('llmfit system output must be a JSON object');
  }
  const record = parsed as Record<string, unknown>;
  if (record.system && typeof record.system === 'object') {
    return record.system as Record<string, unknown>;
  }
  if (record.hardware && typeof record.hardware === 'object') {
    return record.hardware as Record<string, unknown>;
  }
  return record;
}

export function parseLlmfitSystemJson(stdout: string): HardwareProfile {
  const parsed = JSON.parse(stdout) as unknown;
  const raw = unwrapLlmfitSystemPayload(parsed);

  const totalRAMGB = pickFirstNumber(raw, [
    'total_ram_gb',
    'totalRAMGB',
    'ram_gb',
    'memory_gb',
    'total_memory_gb',
  ]);
  if (totalRAMGB === undefined) {
    throw new Error('llmfit system JSON missing total RAM');
  }

  const gpuMemoryGB = pickFirstNumber(raw, [
    'gpu_vram_gb',
    'vram_gb',
    'gpu_memory_gb',
    'gpuMemoryGB',
  ]);

  const gpu = raw.gpu && typeof raw.gpu === 'object' ? (raw.gpu as Record<string, unknown>) : null;

  const gpuBackend = normalizeGpuBackend(
    raw.backend ?? raw.gpu_backend ?? gpu?.backend ?? (gpuMemoryGB ? 'cuda' : 'cpu'),
  );

  const gpuName = String(gpu?.name ?? raw.gpu_name ?? raw.gpuName ?? '') || undefined;

  const cpuCores = pickFirstNumber(raw, ['cpu_cores', 'cpuCores', 'cores']);

  return assertValidHardwareProfile({
    platform: inferPlatform(raw.os ?? raw.platform ?? raw.system),
    totalRAMGB,
    availableRAMGB: pickFirstNumber(raw, ['available_ram_gb', 'availableRAMGB']),
    gpuMemoryGB: gpuMemoryGB ?? 0,
    gpuBackend,
    gpuName,
    cpuCores,
    source: 'llmfit',
  });
}
