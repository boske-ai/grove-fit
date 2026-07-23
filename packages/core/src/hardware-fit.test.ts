import { describe, expect, it } from 'vitest';
import {
  buildHardwareFingerprint,
  buildHardwareFitSnapshot,
  computeTierFitLevel,
  isTierDownloadAllowed,
} from './hardware-fit.js';
import { suggestBoskeTierForParams, buildFunnelComparison } from './funnel.js';
import { assignMaxTier } from './assign-max-tier.js';

describe('computeTierFitLevel', () => {
  it('marks tiers at or below recommendation as recommended', () => {
    expect(computeTierFitLevel('seed', 'canopy', 32)).toBe('recommended');
    expect(computeTierFitLevel('branch', 'canopy', 32)).toBe('recommended');
    expect(computeTierFitLevel('canopy', 'canopy', 32)).toBe('recommended');
  });

  it('marks next tier up as marginal', () => {
    expect(computeTierFitLevel('forest', 'canopy', 32)).toBe('marginal');
  });

  it('marks far tiers as unavailable', () => {
    expect(computeTierFitLevel('forest', 'seed', 8)).toBe('unavailable');
  });

  it('blocks when RAM below tier minimum', () => {
    expect(computeTierFitLevel('forest', 'forest', 16)).toBe('unavailable');
  });
});

describe('buildHardwareFitSnapshot', () => {
  it('recommends seed on 8GB CPU-only', () => {
    const snapshot = buildHardwareFitSnapshot({
      totalRAMGB: '8',
      gpuMemoryGB: '0',
      gpuBackend: 'cpu',
      gpu: null,
    });
    expect(snapshot.recommendedTier).toBe('seed');
    expect(snapshot.tierFit.seed).toBe('recommended');
    expect(snapshot.tierFit.forest).toBe('unavailable');
    expect(snapshot.fingerprint).toBeTruthy();
  });

  it('unlocks forest on 32GB Metal', () => {
    const snapshot = buildHardwareFitSnapshot({
      totalRAMGB: '32',
      gpuMemoryGB: '32',
      gpuBackend: 'metal',
      gpu: { name: 'Apple M2 Max' },
    });
    expect(snapshot.recommendedTier).toBe('forest');
    expect(snapshot.tierFit.forest).toBe('recommended');
  });
});

describe('isTierDownloadAllowed', () => {
  it('blocks unavailable tiers', () => {
    const snapshot = buildHardwareFitSnapshot({
      totalRAMGB: '8',
      gpuMemoryGB: '0',
      gpuBackend: 'cpu',
    });
    expect(isTierDownloadAllowed('seed', snapshot)).toBe(true);
    expect(isTierDownloadAllowed('forest', snapshot)).toBe(false);
  });
});

describe('buildHardwareFingerprint', () => {
  it('changes when GPU identity changes', () => {
    const a = buildHardwareFingerprint({
      totalRAMGB: '16',
      gpuMemoryGB: '8',
      gpuBackend: 'cuda',
      gpu: { name: 'RTX 3080' },
    });
    const b = buildHardwareFingerprint({
      totalRAMGB: '16',
      gpuMemoryGB: '8',
      gpuBackend: 'cuda',
      gpu: { name: 'RTX 4090' },
    });
    expect(a).not.toBe(b);
  });
});

describe('assignMaxTier', () => {
  it('caps CPU-only at branch regardless of RAM', () => {
    const assignment = assignMaxTier({
      totalRAMGB: '64',
      gpuMemoryGB: '0',
      gpuBackend: 'cpu',
    });
    expect(assignment.tier).toBe('branch');
  });

  it('uses discrete VRAM path for webgpu', () => {
    const assignment = assignMaxTier({
      totalRAMGB: '16',
      gpuMemoryGB: '10',
      gpuBackend: 'webgpu',
    });
    expect(assignment.tier).toBe('branch');
  });

  it('does not force cpuOnlyCap when unknown backend has VRAM', () => {
    const withVram = assignMaxTier({
      totalRAMGB: '32',
      gpuMemoryGB: '16',
      gpuBackend: 'unknown',
    });
    expect(withVram.tier).toBe('forest');

    const noVram = assignMaxTier({
      totalRAMGB: '64',
      gpuMemoryGB: '0',
      gpuBackend: 'unknown',
    });
    expect(noVram.tier).toBe('branch');
  });
});

describe('funnel', () => {
  it('maps param bands to Boske tiers (GF5)', () => {
    expect(suggestBoskeTierForParams(3)).toBe('seed');
    expect(suggestBoskeTierForParams(8)).toBe('branch');
    expect(suggestBoskeTierForParams(14)).toBe('canopy');
    expect(suggestBoskeTierForParams(24)).toBe('forest');
  });

  it('suggests Branch for Llama 3.1 8B without falsely certifying', () => {
    const snapshot = buildHardwareFitSnapshot({
      totalRAMGB: '16',
      gpuMemoryGB: '8',
      gpuBackend: 'cuda',
    });
    const comparison = buildFunnelComparison(
      { id: 'llama-3.1-8b', label: 'Llama 3.1 8B', paramsB: 8 },
      snapshot,
    );
    expect(comparison.suggestedBoskeTier).toBe('branch');
    expect(comparison.suggestedBoskeCertified).toBe(false);
  });

  it('derives suggestedBoskeCertified from catalog entry', () => {
    const snapshot = buildHardwareFitSnapshot({
      totalRAMGB: '16',
      gpuMemoryGB: '8',
      gpuBackend: 'cuda',
    });
    const comparison = buildFunnelComparison(
      {
        id: 'boske-branch',
        label: 'Boske Branch',
        paramsB: 8,
        groveFitCertified: true,
      },
      snapshot,
    );
    expect(comparison.suggestedBoskeCertified).toBe(true);
  });

  it('marks missing paramsB as unavailable', () => {
    const snapshot = buildHardwareFitSnapshot({
      totalRAMGB: '32',
      gpuMemoryGB: '16',
      gpuBackend: 'cuda',
    });
    const comparison = buildFunnelComparison(
      { id: 'unknown-size', label: 'Mystery model', paramsB: null },
      snapshot,
    );
    expect(comparison.fitLevel).toBe('unavailable');
    expect(comparison.suggestedBoskeFitLevel).toBe('unavailable');
    expect(comparison.suggestedBoskeCertified).toBe(false);
  });
});
