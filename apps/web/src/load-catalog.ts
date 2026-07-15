import boskeCatalog from '@boske-labs/grove-fit-models/boske-catalog';
import { dedupeCatalogEntriesStrict, type CatalogModelEntry } from '@boske-labs/grove-fit-ui';

/** Boske tiers load instantly; full llmfit catalog fetched without blocking the UI thread. */
export async function loadCatalogEntries(force = false): Promise<CatalogModelEntry[]> {
  const boskeEntries = (boskeCatalog as { entries: CatalogModelEntry[] }).entries;

  try {
    const url = force ? `/catalog.json?t=${Date.now()}` : '/catalog.json';
    const response = await fetch(url);
    if (!response.ok) {
      return boskeEntries;
    }
    const catalog = (await response.json()) as { entries: CatalogModelEntry[] };
    return dedupeCatalogEntriesStrict(
      catalog.entries?.length ? catalog.entries : boskeEntries,
    );
  } catch {
    return boskeEntries;
  }
}
