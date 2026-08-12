#!/usr/bin/env node
/**
 * Catalog sync from a pinned llmfit release tag (GF2).
 *
 * Cross-platform replacement for the old bash script — `bun run sync:catalog`
 * has to work on Windows, which is a supported target for the desktop app.
 */
import { mkdirSync, writeFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { spawnSync } from 'node:child_process';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');

const LLMFIT_VERSION = process.env.LLMFIT_VERSION ?? 'v1.1.3';
// Verified at llmfit tag v1.1.3: model DB lives under llmfit-core/.
// The legacy data/hf_models.json path 404s — never guess an alternate path.
const LLMFIT_HF_MODELS_PATH =
  process.env.LLMFIT_HF_MODELS_PATH ?? 'llmfit-core/data/hf_models.json';

/** Tags flow into a URL and a git branch name — keep them to a known-safe shape. */
const TAG_PATTERN = /^[A-Za-z0-9._-]+$/;
if (!TAG_PATTERN.test(LLMFIT_VERSION)) {
  console.error(`sync-llmfit-db: refusing suspicious LLMFIT_VERSION "${LLMFIT_VERSION}"`);
  process.exit(1);
}
if (LLMFIT_VERSION.includes('..')) {
  console.error('sync-llmfit-db: LLMFIT_VERSION must not contain ".."');
  process.exit(1);
}

const cacheDir = join(root, 'packages/models/.cache');
mkdirSync(cacheDir, { recursive: true });
const cachedModels = join(cacheDir, 'hf_models.json');

const url = `https://raw.githubusercontent.com/AlexsJones/llmfit/${LLMFIT_VERSION}/${LLMFIT_HF_MODELS_PATH}`;
console.log(`Fetching llmfit ${LLMFIT_VERSION} ${LLMFIT_HF_MODELS_PATH}...`);

const response = await fetch(url);
if (!response.ok) {
  console.error(`sync-llmfit-db: HTTP ${response.status} for ${url}`);
  console.error('  Probe the tagged tree and update LLMFIT_HF_MODELS_PATH — never guess a path.');
  process.exit(1);
}
writeFileSync(cachedModels, await response.text(), 'utf8');

function run(script, args) {
  const result = spawnSync(process.execPath, [join(root, 'scripts', script), ...args], {
    stdio: 'inherit',
  });
  if (result.status !== 0) {
    process.exit(result.status ?? 1);
  }
}

run('merge-catalog.mjs', [
  '--llmfit', cachedModels,
  '--boske', join(root, 'packages/models/boske-catalog.json'),
  '--out', join(root, 'packages/models/catalog.json'),
  '--meta', join(root, 'packages/models/catalog-meta.json'),
  '--llmfit-version', LLMFIT_VERSION,
]);

run('build-search-index.mjs', [
  '--catalog', join(root, 'packages/models/catalog.json'),
  '--out', join(root, 'packages/models/search-index.json'),
]);

// Copy (never symlink) into the web public dir — a committed symlink breaks
// Windows checkouts, where git writes it out as a plain text file.
const { stageCatalog } = await import('./stage-catalog.mjs');
stageCatalog(root);

console.log('Catalog sync complete.');
