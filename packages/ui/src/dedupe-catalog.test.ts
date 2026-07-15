import { describe, expect, it } from 'vitest';
import { dedupeCatalogEntriesStrict } from './dedupe-catalog.js';

describe('dedupeCatalogEntriesStrict', () => {
  it('removes case-variant duplicate labels', () => {
    const entries = dedupeCatalogEntriesStrict([
      { id: 'a', label: 'microsoft/phi-3-mini-4k-instruct', paramsB: 4 },
      { id: 'b', label: 'microsoft/Phi-3-mini-4k-instruct', paramsB: 4 },
    ]);
    expect(entries).toHaveLength(1);
  });
});
