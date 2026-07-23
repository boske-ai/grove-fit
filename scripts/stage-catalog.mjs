#!/usr/bin/env node
/** Copy catalog + search-index into apps/web/public for Vite static serving. */
import { copyFileSync, existsSync, mkdirSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

export function stageCatalog(rootDir) {
  const publicDir = join(rootDir, 'apps/web/public');
  mkdirSync(publicDir, { recursive: true });

  const catalogSrc = join(rootDir, 'packages/models/catalog.json');
  const catalogDest = join(publicDir, 'catalog.json');
  const indexSrc = join(rootDir, 'packages/models/search-index.json');
  const indexDest = join(publicDir, 'search-index.json');

  let staged = false;

  if (existsSync(catalogSrc)) {
    copyFileSync(catalogSrc, catalogDest);
    console.log(`stage-catalog: copied → ${catalogDest}`);
    staged = true;
  }

  if (existsSync(indexSrc)) {
    copyFileSync(indexSrc, indexDest);
    console.log(`stage-catalog: copied → ${indexDest}`);
    staged = true;
  }

  return staged;
}

if (process.argv[1] === fileURLToPath(import.meta.url)) {
  const root = join(dirname(fileURLToPath(import.meta.url)), '..');
  if (!stageCatalog(root)) {
    console.warn('stage-catalog: catalog/search-index missing — build will serve boske-only fallback');
  }
}
