import { useMemo } from 'react';
import MiniSearch from 'minisearch';
import { dedupeCatalogEntriesStrict } from './dedupe-catalog.js';
import type { CatalogModelEntry } from './types.js';

export function useCatalogSearch(entries: CatalogModelEntry[]) {
  const uniqueEntries = useMemo(() => dedupeCatalogEntriesStrict(entries), [entries]);

  const index = useMemo(() => {
    const mini = new MiniSearch({
      fields: ['label', 'text', 'tier'],
      storeFields: ['id', 'label', 'tier', 'paramsB', 'isBoske', 'isCloud', 'groveFitCertified'],
    });
    const docs = uniqueEntries.map((entry) => ({
      id: entry.id,
      label: entry.label,
      tier: entry.tier ?? '',
      paramsB: entry.paramsB ?? '',
      isBoske: entry.isBoske ? 'boske' : '',
      isCloud: entry.isCloud ? 'cloud' : '',
      groveFitCertified: entry.groveFitCertified ? 'certified' : '',
      text: [
        entry.label,
        entry.tier,
        entry.paramsB,
        ...(entry.searchTokens ?? []),
        entry.upstreamHint,
      ]
        .filter(Boolean)
        .join(' '),
    }));
    mini.addAll(docs);
    return mini;
  }, [uniqueEntries]);

  function search(query: string, limit = 20): CatalogModelEntry[] {
    if (!query.trim()) {
      return uniqueEntries.filter((e) => e.isBoske && !e.isCloud).slice(0, limit);
    }
    const results = index.search(query, { prefix: true, fuzzy: 0.2 });
    const byId = new Map(uniqueEntries.map((e) => [e.id, e]));
    return results
      .map((r) => byId.get(String(r.id)))
      .filter((e): e is CatalogModelEntry => Boolean(e))
      .slice(0, limit);
  }

  return { search };
}
