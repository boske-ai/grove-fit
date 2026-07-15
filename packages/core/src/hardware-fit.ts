import { assignMaxTier } from './assign-max-tier.js';
import { BOSKE_TIER_MIN_RAM, TIER_RANK } from './tiers.js';
import type {
  BoskeLocalTier,
  FitLevel,
  HardwareFitSnapshot,
  SystemInfo,
} from './types.js';

function resolveGpuBackend(systemInfo: SystemInfo): string {
  return (
    systemInfo.gpuBackend ??
    systemInfo.gpuDetailed?.backend ??
    systemInfo.gpu?.backend ??
    'cpu'
  );
}

/**
 * Deterministic 16-char fingerprint for cache keys (browser-safe, non-crypto).
 */
export function buildHardwareFingerprint(systemInfo: SystemInfo): string {
  const totalRAMGB = String(systemInfo.totalRAMGB ?? '');
  const gpuMemoryGB = String(systemInfo.gpuMemoryGB ?? '');
  const gpuBackend = resolveGpuBackend(systemInfo);
  const gpuName = systemInfo.gpu?.name ?? '';
  const payload = `${totalRAMGB}|${gpuMemoryGB}|${gpuBackend}|${gpuName}`;

  let hash = 2166136261;
  for (let i = 0; i < payload.length; i += 1) {
    hash ^= payload.charCodeAt(i);
    hash = Math.imul(hash, 16777619);
  }

  return (hash >>> 0).toString(16).padStart(8, '0').repeat(2);
}

export function computeTierFitLevel(
  tier: BoskeLocalTier,
  recommendedTier: BoskeLocalTier,
  totalRAMGB: number,
  llmfitTokPerSecByTier?: Partial<Record<BoskeLocalTier, number>> | null,
): FitLevel {
  const tierRank = TIER_RANK[tier];
  const recommendedRank = TIER_RANK[recommendedTier];

  const minRam = BOSKE_TIER_MIN_RAM[tier];
  if (totalRAMGB < minRam) {
    return 'unavailable';
  }

  const llmfitTok = llmfitTokPerSecByTier?.[tier];
  if (typeof llmfitTok === 'number') {
    if (llmfitTok < 1) {
      return 'unavailable';
    }
    if (llmfitTok >= 1 && llmfitTok <= 5 && tierRank > recommendedRank) {
      return 'marginal';
    }
  }

  if (tierRank <= recommendedRank) {
    return 'recommended';
  }
  if (tierRank === recommendedRank + 1) {
    return 'marginal';
  }
  return 'unavailable';
}

export function buildHardwareFitSnapshot(
  systemInfo: SystemInfo,
  llmfitTokPerSecByTier?: Partial<Record<BoskeLocalTier, number>> | null,
): HardwareFitSnapshot {
  const totalRAM = parseFloat(String(systemInfo.totalRAMGB));
  if (!Number.isFinite(totalRAM) || totalRAM <= 0) {
    throw new Error('totalRAMGB is required for hardware fit');
  }

  const gpuBackend = resolveGpuBackend(systemInfo);
  const assignment = assignMaxTier(systemInfo);

  const tierFit = {} as Record<BoskeLocalTier, FitLevel>;
  for (const tier of ['seed', 'branch', 'canopy', 'forest'] as const) {
    tierFit[tier] = computeTierFitLevel(
      tier,
      assignment.tier,
      totalRAM,
      llmfitTokPerSecByTier,
    );
  }

  return {
    scannedAt: new Date().toISOString(),
    fingerprint: buildHardwareFingerprint(systemInfo),
    recommendedTier: assignment.tier,
    tierFit,
    systemSummary: {
      totalRAMGB: String(totalRAM),
      gpuName: systemInfo.gpu?.name,
      vramGB:
        systemInfo.gpuMemoryGB != null ? String(systemInfo.gpuMemoryGB) : undefined,
      backend: gpuBackend,
    },
  };
}

export function isTierDownloadAllowed(
  tier: BoskeLocalTier,
  snapshot: HardwareFitSnapshot | null | undefined,
): boolean {
  const fit = snapshot?.tierFit[tier];
  return fit === 'recommended' || fit === 'marginal';
}
