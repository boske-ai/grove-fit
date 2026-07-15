import type { FitLevel } from '@boske-labs/grove-fit-core';

export const FIT_LABELS: Record<FitLevel, string> = {
  recommended: 'Recommended',
  marginal: 'Marginal',
  unavailable: 'Unavailable',
};

/** Short verdict for model fit cards */
export const FIT_VERDICT: Record<FitLevel, { title: string; detail: string }> = {
  recommended: {
    title: 'Should run well',
    detail: 'Your hardware is a comfortable match for this model size.',
  },
  marginal: {
    title: 'May run slowly',
    detail: 'Possible, but RAM or speed will be tight.',
  },
  unavailable: {
    title: "Unlikely to run",
    detail: 'This model is too large for your current hardware.',
  },
};

export const FIT_ICONS: Record<FitLevel, string> = {
  recommended: '●',
  marginal: '●',
  unavailable: '●',
};

export const TIER_ICONS: Record<string, string> = {
  seed: '🌱',
  branch: '🌿',
  canopy: '🌳',
  forest: '🌲',
};

export function tierDisplayName(tier: string): string {
  return tier.charAt(0).toUpperCase() + tier.slice(1);
}
