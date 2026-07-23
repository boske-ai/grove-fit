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

function fitForCatalogEntry(
  entry: CatalogEntry,
  snapshot: HardwareFitSnapshot,
): FitLevel {
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
  const suggestedBoskeCertified = Boolean(catalogEntry.groveFitCertified);

  if (catalogEntry.paramsB === null || catalogEntry.paramsB === undefined) {
    return {
      catalogModelId: catalogEntry.id,
      catalogModelLabel: catalogEntry.label,
      fitLevel: 'unavailable',
      suggestedBoskeTier: 'seed',
      suggestedBoskeFitLevel: 'unavailable',
      suggestedBoskeCertified,
    };
  }

  const suggestedBoskeTier = suggestBoskeTierForParams(catalogEntry.paramsB);

  return {
    catalogModelId: catalogEntry.id,
    catalogModelLabel: catalogEntry.label,
    fitLevel: fitForCatalogEntry(catalogEntry, snapshot),
    suggestedBoskeTier,
    suggestedBoskeFitLevel: snapshot.tierFit[suggestedBoskeTier],
    suggestedBoskeCertified,
  };
}
