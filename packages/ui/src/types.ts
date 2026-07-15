import type { BoskeLocalTier, FitLevel, FunnelComparison, HardwareFitSnapshot } from '@boske-labs/grove-fit-core';
import type { DetectSource, HardwareProfile } from '@boske-labs/grove-fit-detect';

export interface CatalogModelEntry {
  id: string;
  kind?: string;
  tier?: string;
  label: string;
  icon?: string;
  paramsB?: number | null;
  minRAMGB?: number;
  groveFitCertified?: boolean;
  isCloud?: boolean;
  isBoske?: boolean;
  alwaysAvailable?: boolean;
  bundle?: string[];
  upstreamHint?: string;
  suggestedBoskeTier?: BoskeLocalTier;
  searchTokens?: string[];
}

export interface FitUiState {
  profile: HardwareProfile | null;
  snapshot: HardwareFitSnapshot | null;
  detectSource: DetectSource | 'pending';
  detectMessage: string;
  selectedModel: CatalogModelEntry | null;
  funnel: FunnelComparison | null;
}

export const FIT_LABELS: Record<FitLevel, string> = {
  recommended: 'Recommended',
  marginal: 'Marginal',
  unavailable: 'Unavailable',
};

export const FIT_ICONS: Record<FitLevel, string> = {
  recommended: '✅',
  marginal: '⚠️',
  unavailable: '⛔',
};

export const TIER_ICONS: Record<BoskeLocalTier, string> = {
  seed: '🌱',
  branch: '🌿',
  canopy: '🌳',
  forest: '🌲',
};
