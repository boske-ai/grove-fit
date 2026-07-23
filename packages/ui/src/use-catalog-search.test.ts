import { describe, expect, it } from 'vitest';
import { createCatalogSearcher, type CatalogSearchDocument } from './use-catalog-search.js';
import type { CatalogModelEntry } from './types.js';

const entries: CatalogModelEntry[] = [
  {
    id: 'boske-seed',
    label: 'Boske Seed',
    paramsB: 3,
    isBoske: true,
    groveFitCertified: true,
  },
  {
    id: 'llama-8b',
    label: 'Llama 3.1 8B',
    paramsB: 8,
    isBoske: false,
  },
];

const slimDocs: CatalogSearchDocument[] = [
  {
    id: 'boske-seed',
    label: 'Boske Seed',
    paramsB: 3,
    isBoske: true,
    groveFitCertified: true,
    text: 'Boske Seed seed 3b',
  },
  {
    id: 'llama-8b',
    label: 'Llama 3.1 8B',
    paramsB: 8,
    isBoske: false,
    text: 'Llama 3.1 8B llama',
  },
];

describe('createCatalogSearcher', () => {
  it('indexes slim search documents and resolves full entries by id', () => {
    const searcher = createCatalogSearcher(entries, slimDocs);
    const hits = searcher.search('llama');
    expect(hits.some((h) => h.id === 'llama-8b')).toBe(true);
    expect(searcher.byId.get('llama-8b')?.label).toBe('Llama 3.1 8B');
  });

  it('does not rebuild entry map per query', () => {
    const searcher = createCatalogSearcher(entries, slimDocs);
    expect(searcher.byId).toBe(searcher.byId);
    searcher.search('seed');
    searcher.search('llama');
    expect(searcher.byId.get('boske-seed')?.groveFitCertified).toBe(true);
  });
});
