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

test('catalog.json ships the full llmfit export, not a curated top-N (GF3)', () => {
  const catalog = JSON.parse(readFileSync(join(root, 'catalog.json'), 'utf8'));
  assert.ok(Array.isArray(catalog.entries));
  // `>= 6` passed even for a catalog truncated to the Boske tiers alone, which
  // is exactly the failure GF3 exists to prevent.
  assert.ok(
    catalog.modelCount >= 200,
    `modelCount ${catalog.modelCount} < 200 — catalog looks truncated (GF3)`,
  );
  assert.ok(catalog.entries.length >= catalog.modelCount);
});

test('catalog entries carry the fields the UI renders', () => {
  const catalog = JSON.parse(readFileSync(join(root, 'catalog.json'), 'utf8'));
  const thirdParty = catalog.entries.filter((e) => !e.isBoske);

  // paramsB drives every fit verdict — a mostly-null column means upstream
  // schema drift and would silently mark the whole catalog "unavailable".
  const withParams = thirdParty.filter((e) => typeof e.paramsB === 'number').length;
  assert.ok(
    withParams / thirdParty.length > 0.9,
    `only ${withParams}/${thirdParty.length} entries have paramsB`,
  );

  for (const entry of thirdParty.slice(0, 100)) {
    assert.equal(typeof entry.id, 'string');
    assert.equal(typeof entry.label, 'string');
  }
});

test('catalog.json carries no unused upstream payload', () => {
  const catalog = JSON.parse(readFileSync(join(root, 'catalog.json'), 'utf8'));
  const withUpstream = catalog.entries.filter((e) => e.upstream !== undefined);
  // The raw upstream blob had no consumer and was ~61% of the shipped bytes.
  assert.equal(
    withUpstream.length,
    0,
    `${withUpstream.length} entries still embed the raw upstream record`,
  );
});

test('cloud presets are marked so fit logic can exempt them (GF4)', () => {
  const catalog = JSON.parse(readFileSync(join(root, 'catalog.json'), 'utf8'));
  const cloud = catalog.entries.filter((e) => e.isCloud);
  assert.equal(cloud.length, 2, 'expected Breeze and Summit');
  assert.ok(cloud.every((e) => e.isBoske));
});

test('search-index.json matches catalog entry count', () => {
  const catalog = JSON.parse(readFileSync(join(root, 'catalog.json'), 'utf8'));
  const index = JSON.parse(readFileSync(join(root, 'search-index.json'), 'utf8'));
  assert.equal(index.documentCount, catalog.entries.length);
  assert.equal(index.documents.length, catalog.entries.length);
});
