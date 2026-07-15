import type { BoskeLocalTier } from './types.js';

/** Minimum system RAM (GB) per Boske local tier — matches boske-catalog.json. */
export const BOSKE_TIER_MIN_RAM: Record<BoskeLocalTier, number> = {
  seed: 6,
  branch: 12,
  canopy: 16,
  forest: 24,
};

export const TIER_RANK: Record<BoskeLocalTier, number> = {
  seed: 0,
  branch: 1,
  canopy: 2,
  forest: 3,
};

export function isBoskeLocalTier(value: string): value is BoskeLocalTier {
  return value in BOSKE_TIER_MIN_RAM;
}
