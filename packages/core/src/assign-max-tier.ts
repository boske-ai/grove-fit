import type { BoskeLocalTier, SystemInfo, TierAssignment } from './types.js';

function resolveGpuBackend(systemInfo: SystemInfo): string {
  return (
    systemInfo.gpuBackend ??
    systemInfo.gpuDetailed?.backend ??
    systemInfo.gpu?.backend ??
    'cpu'
  );
}

/**
 * Assign maximum available Boske local tier from hardware profile.
 * Port of Boske `model-downloader.js` assignMaxTier.
 */
export function assignMaxTier(systemInfo: SystemInfo): TierAssignment {
  const totalRAM = parseFloat(String(systemInfo.totalRAMGB));
  const gpuMemoryGB = parseFloat(String(systemInfo.gpuMemoryGB ?? '0'));
  const gpuBackend = resolveGpuBackend(systemInfo);

  let effectiveMemory: number;
  let cpuOnlyCap = false;

  if (gpuBackend === 'metal') {
    effectiveMemory = Math.max(0, totalRAM - 6);
  } else if (gpuMemoryGB > 0) {
    effectiveMemory = Math.max(0, Math.min(gpuMemoryGB + 0.5 * totalRAM, totalRAM) - 4);
  } else {
    effectiveMemory = totalRAM * 0.5;
    cpuOnlyCap = true;
  }

  let tier: BoskeLocalTier;
  if (effectiveMemory >= 20) {
    tier = 'forest';
  } else if (effectiveMemory >= 14) {
    tier = 'canopy';
  } else if (effectiveMemory >= 10) {
    tier = 'branch';
  } else {
    tier = 'seed';
  }

  if (cpuOnlyCap && (tier === 'canopy' || tier === 'forest')) {
    tier = 'branch';
  }

  return { tier, effectiveMemory };
}
