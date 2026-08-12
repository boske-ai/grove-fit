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

  it('suggests Branch for Llama 3.1 8B without falsely certifying the model', () => {
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
    // The third-party model is not certified (GF4)…
    expect(comparison.catalogModelCertified).toBe(false);
    // …but the Boske tier we compare it against always is.
    expect(comparison.suggestedBoskeCertified).toBe(true);
  });

  it('derives catalogModelCertified from the catalog entry', () => {
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
    expect(comparison.catalogModelCertified).toBe(true);
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
    // The model itself cannot be sized, so it is not offered…
    expect(comparison.fitLevel).toBe('unavailable');
    expect(comparison.catalogModelCertified).toBe(false);
    expect(comparison.isCloud).toBe(false);
    // …but the fallback tier still reports its real fit rather than inheriting
    // "unavailable". Seed genuinely runs on this 32 GB machine.
    expect(comparison.suggestedBoskeTier).toBe('seed');
    expect(comparison.suggestedBoskeFitLevel).toBe(snapshot.tierFit.seed);
    expect(comparison.suggestedBoskeFitLevel).toBe('recommended');
  });
});

describe('cloud presets (GF4 / GF6)', () => {
  // Weakest plausible machine — cloud must still be available on it.
  const weakSnapshot = buildHardwareFitSnapshot({
    totalRAMGB: '4',
    gpuMemoryGB: '0',
    gpuBackend: 'cpu',
  });

  it('never reports a cloud preset as unavailable, even with no local tier', () => {
    expect(weakSnapshot.tierFit.seed).toBe('unavailable');

    for (const label of ['Breeze', 'Summit']) {
      const comparison = buildFunnelComparison(
        { id: label.toLowerCase(), label, paramsB: null, isCloud: true },
        weakSnapshot,
      );
      expect(comparison.fitLevel).toBe('recommended');
      expect(comparison.isCloud).toBe(true);
    }
  });

  it('reports the local-tier comparison truthfully rather than inheriting the cloud verdict', () => {
    // `isCloud` is what tells a consumer the local comparison does not apply.
    // The tier fit itself must never contradict `snapshot.tierFit` in the same
    // payload — the CLI emits both together via `search --json`.
    for (const paramsB of [null, 123]) {
      const comparison = buildFunnelComparison(
        { id: 'summit', label: 'Summit', paramsB, isCloud: true },
        weakSnapshot,
      );
      expect(comparison.fitLevel).toBe('recommended');
      expect(comparison.suggestedBoskeFitLevel).toBe(
        weakSnapshot.tierFit[comparison.suggestedBoskeTier],
      );
      expect(comparison.suggestedBoskeFitLevel).toBe('unavailable');
    }
  });

  it('does not gate a cloud preset on minRAMGB', () => {
    const comparison = buildFunnelComparison(
      { id: 'summit', label: 'Summit', paramsB: 123, minRAMGB: 512, isCloud: true },
      weakSnapshot,
    );
    expect(comparison.fitLevel).toBe('recommended');
  });

  it('still gates local models on the same weak hardware', () => {
    const comparison = buildFunnelComparison(
      { id: 'llama-70b', label: 'Llama 70B', paramsB: 70 },
      weakSnapshot,
    );
    expect(comparison.fitLevel).toBe('unavailable');
  });
});

describe('assignMaxTier input validation', () => {
  it('throws on non-numeric RAM instead of silently returning seed', () => {
    expect(() => assignMaxTier({ totalRAMGB: 'not-a-number' })).toThrow(
      /positive number/i,
    );
    expect(() => assignMaxTier({ totalRAMGB: 0 })).toThrow(/positive number/i);
  });

  it('tolerates unparseable VRAM by treating it as none (CPU-only path)', () => {
    // 16 GB with no usable VRAM → half-RAM = 8 GB effective → seed.
    const assignment = assignMaxTier({ totalRAMGB: '16', gpuMemoryGB: 'unknown' });
    expect(assignment.tier).toBe('seed');
    expect(assignment.effectiveMemory).toBe(8);
  });
});
