import assert from 'node:assert/strict';
import test from 'node:test';
import { inRange, classify } from './audit-gate.mjs';

test('handles disjoint (OR) advisory ranges', () => {
  // One advisory covering several major lines. Splitting on whitespace and
  // AND-ing these evaluates to a contradiction that matches nothing, which
  // would dismiss a vulnerable package as "not applicable".
  const or = '<1.1.18 || >=2.0.0 <2.1.4 || >=4.0.0 <5.0.9';
  assert.equal(inRange('5.0.6', or), true, '5.0.6 is inside the 4.x-5.x window');
  assert.equal(inRange('1.1.0', or), true, '1.1.0 is inside the <1.1.18 window');
  assert.equal(inRange('5.0.9', or), false, '5.0.9 is the patched version');
  assert.equal(inRange('3.0.0', or), false, '3.x is not covered');
});

test('handles simple AND ranges', () => {
  assert.equal(inRange('0.25.12', '>=0.27.3 <0.28.1'), false);
  assert.equal(inRange('0.27.5', '>=0.27.3 <0.28.1'), true);
  assert.equal(inRange('0.28.1', '>=0.27.3 <0.28.1'), false);
  assert.equal(inRange('8.5.15', '<=8.5.22'), true);
  assert.equal(inRange('8.5.26', '<=8.5.22'), false);
});

test('fails closed on unknown versions and unparseable ranges', () => {
  assert.equal(inRange('1.0.0', ''), true, 'empty range = assume affected');
  assert.equal(inRange('1.0.0', '>=1.0.0 <2.0.0 && weird'), true);

  const report = { ghost: [{ url: 'https://x/GHSA-zzzz', severity: 'high', title: 'T', vulnerable_versions: '<9.9.9' }] };
  const { actionable } = classify(report, () => null); // version not resolvable
  assert.equal(actionable.length, 1, 'unknown version must be reported, not dismissed');
});

test('reports a genuinely vulnerable version', () => {
  const report = { postcss: [{ url: 'https://x/GHSA-r28c-9q8g-f849', severity: 'high', title: 'Path traversal', vulnerable_versions: '<=8.5.17' }] };
  const { actionable, dismissed } = classify(report, () => '8.5.15');
  assert.equal(actionable.length, 1);
  assert.equal(dismissed.length, 0);
});

test('dismisses a version outside the range', () => {
  const report = { esbuild: [{ url: 'https://x/GHSA-g7r4-m6w7-qqqr', severity: 'low', title: 'File read', vulnerable_versions: '>=0.27.3 <0.28.1' }] };
  const { actionable, dismissed } = classify(report, () => '0.25.12');
  assert.equal(actionable.length, 0);
  assert.equal(dismissed.length, 1);
});
