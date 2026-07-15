#!/usr/bin/env node
import { readFileSync, writeFileSync } from 'node:fs';

function parseArgs(argv) {
  const args = {};
  for (let i = 2; i < argv.length; i += 2) {
    args[argv[i]?.replace(/^--/, '')] = argv[i + 1];
  }
  return args;
}

const { catalog: catalogPath, out: outPath } = parseArgs(process.argv);
if (!catalogPath || !outPath) {
  console.error('Usage: build-search-index.mjs --catalog ... --out ...');
  process.exit(1);
}

const catalog = JSON.parse(readFileSync(catalogPath, 'utf8'));
const documents = catalog.entries.map((entry) => ({
  id: entry.id,
  label: entry.label,
  tier: entry.tier ?? null,
  paramsB: entry.paramsB,
  isBoske: Boolean(entry.isBoske),
  isCloud: Boolean(entry.isCloud),
  groveFitCertified: Boolean(entry.groveFitCertified),
  searchTokens: entry.searchTokens ?? [],
  text: [
    entry.label,
    entry.tier,
    entry.paramsB !== null && entry.paramsB !== undefined ? `${entry.paramsB}b` : '',
    ...(entry.searchTokens ?? []),
    entry.upstreamHint,
    entry.architecture,
    entry.provider,
  ]
    .filter(Boolean)
    .join(' '),
}));

writeFileSync(
  outPath,
  `${JSON.stringify({ version: 1, documentCount: documents.length, documents }, null, 2)}\n`,
);
console.log(`Wrote search index with ${documents.length} documents`);
