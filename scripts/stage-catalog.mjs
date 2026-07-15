#!/usr/bin/env node
/** Copy packages/models/catalog.json into apps/web/public for Vite static serving. */
import { copyFileSync, existsSync, mkdirSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

export function stageCatalog(rootDir) {
  const catalogSrc = join(rootDir, 'packages/models/catalog.json');
  const catalogDest = join(rootDir, 'apps/web/public/catalog.json');

  if (!existsSync(catalogSrc)) {
    return false;
  }

  mkdirSync(dirname(catalogDest), { recursive: true });
  copyFileSync(catalogSrc, catalogDest);
  console.log(`stage-catalog: copied → ${catalogDest}`);
  return true;
}

if (process.argv[1] === fileURLToPath(import.meta.url)) {
  const root = join(dirname(fileURLToPath(import.meta.url)), '..');
  if (!stageCatalog(root)) {
    console.warn('stage-catalog: catalog.json missing — build will serve boske-only fallback');
  }
}
