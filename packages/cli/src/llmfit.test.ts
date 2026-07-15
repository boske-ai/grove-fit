import { describe, expect, it } from 'vitest';
import { loadCatalogDocuments, searchCatalog, toCatalogEntry } from './catalog.js';
import { matchTierFromName, normalizeRecommendEntries } from './llmfit.js';
import { formatScanOutput, formatSystemOutput } from './terminal.js';
import { buildHardwareFitSnapshot } from '@boske-labs/grove-fit-core';
import { hardwareProfileToSystemInfo } from '@boske-labs/grove-fit-detect';

const sampleProfile = {
  platform: 'macos' as const,
  totalRAMGB: 32,
  gpuMemoryGB: 24,
  gpuBackend: 'metal' as const,
  gpuName: 'Apple M2 Max',
  source: 'llmfit' as const,
};

const sampleSnapshot = buildHardwareFitSnapshot(
  hardwareProfileToSystemInfo(sampleProfile),
);

describe('matchTierFromName', () => {
  it('matches Boske tier patterns', () => {
    expect(matchTierFromName('Ministral 3B Instruct')).toBe('seed');
    expect(matchTierFromName('Ministral 8B Instruct')).toBe('branch');
    expect(matchTierFromName('Mistral Small 24B')).toBe('forest');
  });
});

describe('normalizeRecommendEntries', () => {
  it('unwraps nested recommendation payloads', () => {
    const stdout = JSON.stringify({
      recommendations: [{ name: 'Ministral 3B Instruct' }],
    });
    expect(normalizeRecommendEntries(stdout)).toHaveLength(1);
  });
});

describe('catalog search', () => {
  it('loads documents and finds Boske seed', () => {
    const docs = loadCatalogDocuments();
    expect(docs.length).toBeGreaterThan(0);
    const hits = searchCatalog(docs, 'boske seed', 5);
    expect(hits.some((doc) => doc.id === 'boske-seed')).toBe(true);
  });

  it('maps search docs to catalog entries', () => {
    const docs = loadCatalogDocuments();
    const hit = searchCatalog(docs, 'boske branch', 1)[0];
    expect(hit).toBeDefined();
    expect(toCatalogEntry(hit!).label).toContain('Branch');
  });
});

describe('terminal formatting', () => {
  it('includes hardware summary and recommended tier', () => {
    const output = formatScanOutput(sampleSnapshot, sampleProfile, 'llmfit');
    expect(output).toContain('32 GB RAM');
    expect(output).toContain('METAL');
    expect(output.toLowerCase()).toContain('recommended');
  });

  it('prints system fields', () => {
    const output = formatSystemOutput(sampleSnapshot, sampleProfile, 'native');
    expect(output).toContain('Platform');
    expect(output).toContain('macos');
    expect(output).toContain('Apple M2 Max');
  });
});
