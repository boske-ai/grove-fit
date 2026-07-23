import boskeCatalog from '@boske-labs/grove-fit-models/boske-catalog';
import {
  dedupeCatalogEntriesStrict,
  type CatalogModelEntry,
  type CatalogSearchDocument,
} from '@boske-labs/grove-fit-ui';

export interface LoadedCatalog {
  entries: CatalogModelEntry[];
  searchDocuments: CatalogSearchDocument[];
}

function boskeAsSearchDocs(entries: CatalogModelEntry[]): CatalogSearchDocument[] {
  return entries.map((entry) => ({
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
    text: [entry.label, entry.tier, entry.paramsB, ...(entry.searchTokens ?? [])]
      .filter(Boolean)
      .join(' '),
  }));
}

async function loadSearchDocuments(
  force: boolean,
  fallback: CatalogSearchDocument[],
): Promise<CatalogSearchDocument[]> {
  try {
    const url = force ? `/search-index.json?t=${Date.now()}` : '/search-index.json';
    const response = await fetch(url);
    if (!response.ok) {
      return fallback;
    }
    const index = (await response.json()) as {
      documents?: CatalogSearchDocument[];
    };
    if (Array.isArray(index.documents) && index.documents.length > 0) {
      return index.documents;
    }
    return fallback;
  } catch {
    return fallback;
  }
}

/** Boske tiers load instantly; full llmfit catalog + slim search index fetched async. */
export async function loadCatalogEntries(force = false): Promise<LoadedCatalog> {
  const boskeEntries = (boskeCatalog as { entries: CatalogModelEntry[] }).entries;
  const boskeDocs = boskeAsSearchDocs(boskeEntries);

  try {
    const url = force ? `/catalog.json?t=${Date.now()}` : '/catalog.json';
    const [catalogResponse, searchDocuments] = await Promise.all([
      fetch(url),
      loadSearchDocuments(force, boskeDocs),
    ]);

    if (!catalogResponse.ok) {
      return { entries: boskeEntries, searchDocuments };
    }

    const catalog = (await catalogResponse.json()) as { entries: CatalogModelEntry[] };
    const entries = dedupeCatalogEntriesStrict(
      catalog.entries?.length ? catalog.entries : boskeEntries,
    );

    return {
      entries,
      searchDocuments:
        searchDocuments.length > 0 ? searchDocuments : boskeAsSearchDocs(entries),
    };
  } catch {
    return { entries: boskeEntries, searchDocuments: boskeDocs };
  }
}
