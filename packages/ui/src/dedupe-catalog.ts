import type { CatalogModelEntry } from './types.js';

/** Prefer deduping by normalized label + quant when ids collide after slugify. */
export function dedupeCatalogEntriesStrict(entries: CatalogModelEntry[]): CatalogModelEntry[] {
  const byKey = new Map<string, CatalogModelEntry>();
  for (const entry of entries) {
    const quant = String(
      (entry as CatalogModelEntry & { quantization?: string }).quantization ?? '',
    ).toLowerCase();
    const key = `${entry.label.toLowerCase()}|${quant}|${entry.paramsB ?? ''}`;
    if (!byKey.has(key)) {
      byKey.set(key, entry);
    }
  }
  return Array.from(byKey.values());
}
