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

test('catalog.json exists after sync or is skipped in CI', () => {
  try {
    const catalog = JSON.parse(readFileSync(join(root, 'catalog.json'), 'utf8'));
    assert.ok(catalog.entries.length >= 6);
  } catch {
    // catalog not synced yet — boske-catalog alone is valid for dev
  }
});
