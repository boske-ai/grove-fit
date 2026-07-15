import { readFileSync, existsSync } from 'node:fs';
import { createRequire } from 'node:module';
import { dirname, join } from 'node:path';
import type { CatalogEntry } from '@boske-labs/grove-fit-core';

const require = createRequire(import.meta.url);

export interface CatalogSearchDoc {
  id: string;
  label: string;
  tier?: string | null;
  paramsB?: number | null;
  minRAMGB?: number | null;
  isBoske?: boolean;
  isCloud?: boolean;
  groveFitCertified?: boolean;
  text: string;
}

interface SearchIndexFile {
  documents: CatalogSearchDoc[];
}

interface CatalogFile {
  entries?: CatalogSearchDoc[];
}

interface BoskeCatalogFile {
  entries: Array<{
    id: string;
    label: string;
    tier?: string;
    paramsB?: number | null;
    minRAMGB?: number;
    isBoske?: boolean;
    isCloud?: boolean;
    groveFitCertified?: boolean;
    searchTokens?: string[];
    upstreamHint?: string;
  }>;
}

function modelsPackageDir(): string {
  return dirname(require.resolve('@boske-labs/grove-fit-models/boske-catalog'));
}

function toSearchDoc(entry: BoskeCatalogFile['entries'][number]): CatalogSearchDoc {
  return {
    id: entry.id,
    label: entry.label,
    tier: entry.tier ?? null,
    paramsB: entry.paramsB ?? null,
    minRAMGB: entry.minRAMGB ?? null,
    isBoske: Boolean(entry.isBoske),
    isCloud: Boolean(entry.isCloud),
    groveFitCertified: Boolean(entry.groveFitCertified),
    text: [
      entry.label,
      entry.tier,
      entry.paramsB,
      ...(entry.searchTokens ?? []),
      entry.upstreamHint,
    ]
      .filter((part) => part !== null && part !== undefined && part !== '')
      .join(' ')
      .toLowerCase(),
  };
}

export function loadCatalogDocuments(): CatalogSearchDoc[] {
  const pkgDir = modelsPackageDir();
  const searchIndexPath = join(pkgDir, 'search-index.json');
  if (existsSync(searchIndexPath)) {
    const index = JSON.parse(readFileSync(searchIndexPath, 'utf8')) as SearchIndexFile;
    if (Array.isArray(index.documents) && index.documents.length > 0) {
      return index.documents.map((doc) => ({
        ...doc,
        text: String(doc.text ?? doc.label).toLowerCase(),
      }));
    }
  }

  const catalogPath = join(pkgDir, 'catalog.json');
  if (existsSync(catalogPath)) {
    const catalog = JSON.parse(readFileSync(catalogPath, 'utf8')) as CatalogFile;
    if (Array.isArray(catalog.entries) && catalog.entries.length > 0) {
      return catalog.entries.map((entry) => ({
        id: entry.id,
        label: entry.label,
        tier: entry.tier ?? null,
        paramsB: entry.paramsB ?? null,
        minRAMGB: entry.minRAMGB ?? null,
        isBoske: Boolean(entry.isBoske),
        isCloud: Boolean(entry.isCloud),
        groveFitCertified: Boolean(entry.groveFitCertified),
        text: String(entry.text ?? entry.label).toLowerCase(),
      }));
    }
  }

  const boske = JSON.parse(
    readFileSync(require.resolve('@boske-labs/grove-fit-models/boske-catalog'), 'utf8'),
  ) as BoskeCatalogFile;
  return boske.entries.map(toSearchDoc);
}

function scoreDocument(doc: CatalogSearchDoc, query: string): number {
  const q = query.trim().toLowerCase();
  if (!q) return 0;

  const label = doc.label.toLowerCase();
  if (label === q) return 200;
  if (label.startsWith(q)) return 150;
  if (label.includes(q)) return 120;
  if (doc.text.includes(q)) return 100;

  const tokens = q.split(/\s+/).filter(Boolean);
  if (tokens.length === 0) return 0;

  let matched = 0;
  for (const token of tokens) {
    if (doc.text.includes(token) || label.includes(token)) {
      matched += 1;
    }
  }
  return matched === tokens.length ? 60 + matched * 5 : matched * 10;
}

export function searchCatalog(
  documents: CatalogSearchDoc[],
  query: string,
  limit = 20,
): CatalogSearchDoc[] {
  const trimmed = query.trim();
  if (!trimmed) {
    return documents.filter((doc) => doc.isBoske && !doc.isCloud).slice(0, limit);
  }

  return documents
    .map((doc) => ({ doc, score: scoreDocument(doc, trimmed) }))
    .filter(({ score }) => score > 0)
    .sort((a, b) => b.score - a.score || a.doc.label.localeCompare(b.doc.label))
    .slice(0, limit)
    .map(({ doc }) => doc);
}

export function toCatalogEntry(doc: CatalogSearchDoc): CatalogEntry {
  return {
    id: doc.id,
    label: doc.label,
    paramsB: doc.paramsB ?? null,
    minRAMGB: doc.minRAMGB ?? null,
    groveFitCertified: doc.groveFitCertified,
    isCloud: doc.isCloud,
  };
}
