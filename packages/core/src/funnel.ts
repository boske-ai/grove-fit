import type {
  BoskeLocalTier,
  CatalogEntry,
  FitLevel,
  FunnelComparison,
  HardwareFitSnapshot,
} from './types.js';

/**
 * Map catalog param size (B) to closest Boske local tier (GF5).
 */
export function suggestBoskeTierForParams(paramsB: number): BoskeLocalTier {
  if (paramsB <= 4) {
    return 'seed';
  }
  if (paramsB <= 10) {
    return 'branch';
  }
  if (paramsB <= 16) {
    return 'canopy';
  }
  return 'forest';
}

/**
 * Cloud presets (Breeze, Summit) run on Boske servers — local RAM/VRAM is
 * irrelevant, so they are always available (GF4, GF6). Never gate them on
 * hardware, and never report them as "won't run".
 */
export function isCloudEntry(entry: CatalogEntry): boolean {
  return entry.isCloud === true;
}

function fitForCatalogEntry(
  entry: CatalogEntry,
  snapshot: HardwareFitSnapshot,
): FitLevel {
  if (isCloudEntry(entry)) {
    return 'recommended';
  }

  const totalRAMGB = parseFloat(snapshot.systemSummary.totalRAMGB);
  const minRam = entry.minRAMGB ?? null;
  if (typeof minRam === 'number' && totalRAMGB < minRam) {
    return 'unavailable';
  }

  if (entry.paramsB === null || entry.paramsB === undefined) {
    return 'unavailable';
  }

  const suggestedTier = suggestBoskeTierForParams(entry.paramsB);
  return snapshot.tierFit[suggestedTier];
}

export function buildFunnelComparison(
  catalogEntry: CatalogEntry,
  snapshot: HardwareFitSnapshot,
): FunnelComparison {
  // Every Boske local tier carries the badge (GF4), and suggestBoskeTierForParams
  // only ever returns a local tier — so the *suggested* tier is always certified.
  // Whether the *selected* catalog model is certified is a separate question.
  const suggestedBoskeCertified = true;
  const catalogModelCertified = Boolean(catalogEntry.groveFitCertified);
  const isCloud = isCloudEntry(catalogEntry);

  if (catalogEntry.paramsB === null || catalogEntry.paramsB === undefined) {
    return {
      catalogModelId: catalogEntry.id,
      catalogModelLabel: catalogEntry.label,
      // A cloud preset has no parameter count to size against, but it still runs.
      fitLevel: isCloud ? 'recommended' : 'unavailable',
      isCloud,
      // Without a parameter count there is no size class to compare against, so
      // this falls back to the smallest tier. Report that tier's *real* fit —
      // claiming "recommended" here would contradict `snapshot.tierFit` in the
      // same payload (the CLI emits both via `search --json`). `isCloud` is the
      // signal that the comparison does not apply, not a fabricated verdict.
      suggestedBoskeTier: 'seed',
      suggestedBoskeFitLevel: snapshot.tierFit.seed,
      suggestedBoskeCertified,
      catalogModelCertified,
    };
  }

  const suggestedBoskeTier = suggestBoskeTierForParams(catalogEntry.paramsB);

  return {
    catalogModelId: catalogEntry.id,
    catalogModelLabel: catalogEntry.label,
    fitLevel: fitForCatalogEntry(catalogEntry, snapshot),
    isCloud,
    suggestedBoskeTier,
    suggestedBoskeFitLevel: snapshot.tierFit[suggestedBoskeTier],
    suggestedBoskeCertified,
    catalogModelCertified,
  };
}
