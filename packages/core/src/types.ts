export const LOCAL_TIERS = ['seed', 'branch', 'canopy', 'forest'] as const;

export type BoskeLocalTier = (typeof LOCAL_TIERS)[number];

export type FitLevel = 'recommended' | 'marginal' | 'unavailable';

export interface GpuInfo {
  name?: string;
  backend?: string;
}

export interface SystemInfo {
  totalRAMGB: string | number;
  gpuMemoryGB?: string | number;
  gpuBackend?: string;
  gpu?: GpuInfo | null;
  gpuDetailed?: { backend?: string } | null;
}

export interface TierAssignment {
  tier: BoskeLocalTier;
  effectiveMemory: number;
}

export interface SystemSummary {
  totalRAMGB: string;
  gpuName?: string;
  vramGB?: string;
  backend: string;
}

export interface HardwareFitSnapshot {
  scannedAt: string;
  fingerprint: string;
  recommendedTier: BoskeLocalTier;
  tierFit: Record<BoskeLocalTier, FitLevel>;
  systemSummary: SystemSummary;
}

export interface CatalogEntry {
  id: string;
  label: string;
  paramsB: number | null;
  minRAMGB?: number | null;
  groveFitCertified?: boolean;
  isCloud?: boolean;
}

export interface FunnelComparison {
  catalogModelId: string;
  catalogModelLabel: string;
  fitLevel: FitLevel;
  /** Cloud preset (Breeze / Summit) — runs on Boske servers, not this machine. */
  isCloud: boolean;
  suggestedBoskeTier: BoskeLocalTier;
  suggestedBoskeFitLevel: FitLevel;
  /** Whether the suggested Boske tier is Grove Fit certified (always true — GF4). */
  suggestedBoskeCertified: boolean;
  /** Whether the *selected* catalog model itself is certified (false for third-party). */
  catalogModelCertified: boolean;
}
