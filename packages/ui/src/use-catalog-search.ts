import { useMemo } from 'react';
import MiniSearch from 'minisearch';
import { dedupeCatalogEntriesStrict } from './dedupe-catalog.js';
import type { CatalogModelEntry } from './types.js';

/** Slim search document (from search-index.json or mapped catalog entries). */
export interface CatalogSearchDocument {
  id: string;
  label: string;
  tier?: string | null;
  paramsB?: number | null;
  minRAMGB?: number | null;
  isBoske?: boolean;
  isCloud?: boolean;
  groveFitCertified?: boolean;
  searchTokens?: string[];
  text?: string;
  upstreamHint?: string;
}

function toSearchDoc(entry: CatalogModelEntry): CatalogSearchDocument {
  return {
    id: entry.id,
    label: entry.label,
    tier: entry.tier ?? null,
    paramsB: entry.paramsB ?? null,
    minRAMGB: entry.minRAMGB ?? null,
    isBoske: entry.isBoske,
    isCloud: entry.isCloud,
    groveFitCertified: entry.groveFitCertified,
    searchTokens: entry.searchTokens,
    upstreamHint: entry.upstreamHint,
    text: [
      entry.label,
      entry.tier,
      entry.paramsB,
      ...(entry.searchTokens ?? []),
      entry.upstreamHint,
    ]
      .filter(Boolean)
      .join(' '),
  };
}

function searchDocToEntry(doc: CatalogSearchDocument): CatalogModelEntry {
  return {
    id: doc.id,
    label: doc.label,
    tier: doc.tier ?? undefined,
    paramsB: doc.paramsB ?? null,
    minRAMGB: doc.minRAMGB ?? undefined,
    isBoske: doc.isBoske,
    isCloud: doc.isCloud,
    groveFitCertified: doc.groveFitCertified,
    searchTokens: doc.searchTokens,
    upstreamHint: doc.upstreamHint,
  };
}

export interface CatalogSearcher {
  search: (query: string, limit?: number) => CatalogModelEntry[];
  byId: Map<string, CatalogModelEntry>;
}

/** Pure searcher — used by the hook and unit tests. */
export function createCatalogSearcher(
  entries: CatalogModelEntry[],
  searchDocuments?: CatalogSearchDocument[],
): CatalogSearcher {
  const uniqueEntries = dedupeCatalogEntriesStrict(entries);
  const byId = new Map<string, CatalogModelEntry>();
  for (const entry of uniqueEntries) {
    byId.set(entry.id, entry);
  }

  const docs =
    searchDocuments && searchDocuments.length > 0
      ? searchDocuments
      : uniqueEntries.map(toSearchDoc);

  const docsById = new Map<string, CatalogSearchDocument>();
  for (const doc of docs) {
    docsById.set(doc.id, doc);
  }

  const mini = new MiniSearch({
    fields: ['label', 'text', 'tier'],
    storeFields: ['id', 'label', 'tier', 'paramsB', 'isBoske', 'isCloud', 'groveFitCertified'],
  });
  mini.addAll(
    docs.map((doc) => ({
      id: doc.id,
      label: doc.label,
      tier: doc.tier ?? '',
      paramsB: doc.paramsB ?? '',
      isBoske: doc.isBoske ? 'boske' : '',
      isCloud: doc.isCloud ? 'cloud' : '',
      groveFitCertified: doc.groveFitCertified ? 'certified' : '',
      text:
        doc.text ??
        [doc.label, doc.tier, doc.paramsB, ...(doc.searchTokens ?? []), doc.upstreamHint]
          .filter(Boolean)
          .join(' '),
    })),
  );

  function search(query: string, limit = 20): CatalogModelEntry[] {
    if (!query.trim()) {
      return uniqueEntries.filter((e) => e.isBoske && !e.isCloud).slice(0, limit);
    }
    const results = mini.search(query, { prefix: true, fuzzy: 0.2 });
    return results
      .map((r) => {
        const id = String(r.id);
        const full = byId.get(id);
        if (full) return full;
        const doc = docsById.get(id);
        return doc ? searchDocToEntry(doc) : undefined;
      })
      .filter((e): e is CatalogModelEntry => Boolean(e))
      .slice(0, limit);
  }

  return { search, byId };
}

/**
 * @param entries Full catalog entries used to resolve selections (id → entry).
 * @param searchDocuments Optional slim index docs (prefer prebuilt search-index.json).
 */
export function useCatalogSearch(
  entries: CatalogModelEntry[],
  searchDocuments?: CatalogSearchDocument[],
) {
  return useMemo(
    () => createCatalogSearcher(entries, searchDocuments),
    [entries, searchDocuments],
  );
}
