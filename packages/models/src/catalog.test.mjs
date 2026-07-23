import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import test from 'node:test';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');

test('boske-catalog has six entries including cloud tiers', () => {
  const catalog = JSON.parse(readFileSync(join(root, 'boske-catalog.json'), 'utf8'));
  assert.equal(catalog.entries.length, 6);
  const local = catalog.entries.filter((e) => !e.isCloud);
  assert.equal(local.length, 4);
  assert.ok(local.every((e) => e.groveFitCertified));
});

test('catalog.json is present with expected size', () => {
  const catalog = JSON.parse(readFileSync(join(root, 'catalog.json'), 'utf8'));
  assert.ok(Array.isArray(catalog.entries));
  assert.ok(catalog.entries.length >= 6);
});

test('search-index.json matches catalog entry count', () => {
  const catalog = JSON.parse(readFileSync(join(root, 'catalog.json'), 'utf8'));
  const index = JSON.parse(readFileSync(join(root, 'search-index.json'), 'utf8'));
  assert.equal(index.documentCount, catalog.entries.length);
  assert.equal(index.documents.length, catalog.entries.length);
});
