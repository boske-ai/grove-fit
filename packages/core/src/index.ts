export { assignMaxTier } from './assign-max-tier.js';
export {
  buildFunnelComparison,
  suggestBoskeTierForParams,
} from './funnel.js';
export {
  buildHardwareFingerprint,
  buildHardwareFitSnapshot,
  computeTierFitLevel,
  isTierDownloadAllowed,
} from './hardware-fit.js';
export { BOSKE_TIER_MIN_RAM, TIER_RANK, isBoskeLocalTier } from './tiers.js';
export {
  LOCAL_TIERS,
  type BoskeLocalTier,
  type CatalogEntry,
  type FitLevel,
  type FunnelComparison,
  type GpuInfo,
  type HardwareFitSnapshot,
  type SystemInfo,
  type SystemSummary,
  type TierAssignment,
} from './types.js';
