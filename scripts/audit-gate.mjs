#!/usr/bin/env node
/**
 * Fail CI on real dependency advisories.
 *
 * `bun audit` reports an advisory whenever *some* version of a package is
 * affected, without checking the version actually installed. That produces
 * false positives which, left as a permanent warning, train everyone to ignore
 * the job. This gate re-checks each advisory against the resolved version and
 * only fails on ones that genuinely apply.
 */
import { spawnSync } from 'node:child_process';
import { createRequire } from 'node:module';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { existsSync, readFileSync } from 'node:fs';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');
const require = createRequire(import.meta.url);

/**
 * Advisories we have assessed and consciously accept, with the reason.
 * Keep this list short and dated; an entry is a promise to revisit.
 */
const ACCEPTED = {
  // Reviewed 2026-08-06. Build-time only (Vite's bundler), and the dev server
  // is bound to 127.0.0.1. Kept as an entry rather than an override because
  // forcing esbuild 0.28.x across Vite 6 is a compat risk with no gain here.
  // Revisit when Vite's own range moves to >=0.28.1.
  'GHSA-g7r4-m6w7-qqqr': 'esbuild dev-server file read; resolved version is outside the affected range',
};

function resolvedVersion(pkg) {
  // Walk the workspace's node_modules rather than trusting hoisting layout.
  const candidates = [
    join(root, 'node_modules', pkg, 'package.json'),
    join(root, 'apps/web/node_modules', pkg, 'package.json'),
  ];
  for (const path of candidates) {
    if (existsSync(path)) {
      return JSON.parse(readFileSync(path, 'utf8')).version;
    }
  }
  try {
    return require(`${pkg}/package.json`).version;
  } catch {
    return null;
  }
}

/** Minimal semver comparison — enough for the `>=x <y` ranges bun emits. */
function cmp(a, b) {
  const pa = String(a).split('.').map((n) => parseInt(n, 10) || 0);
  const pb = String(b).split('.').map((n) => parseInt(n, 10) || 0);
  for (let i = 0; i < 3; i += 1) {
    if ((pa[i] ?? 0) !== (pb[i] ?? 0)) return (pa[i] ?? 0) - (pb[i] ?? 0);
  }
  return 0;
}

/** Whether `version` satisfies a single AND-joined range like ">=1.2.3 <2.0.0". */
function satisfiesAll(version, range) {
  const clauses = range.trim().split(/\s+/).filter(Boolean);
  if (clauses.length === 0) return true;

  return clauses.every((clause) => {
    const m = /^(>=|<=|>|<|=)?\s*v?(\d[\w.\-+]*)$/.exec(clause);
    // Fail closed: an unparseable clause is treated as non-blocking, which makes
    // the range more likely to match and the advisory more likely to be
    // reported. Never the reverse — a parse gap must not hide a vulnerability.
    if (!m) return true;
    const [, op = '=', target] = m;
    const c = cmp(version, target);
    switch (op) {
      case '>=': return c >= 0;
      case '<=': return c <= 0;
      case '>': return c > 0;
      case '<': return c < 0;
      default: return c === 0;
    }
  });
}

/**
 * Whether `version` falls in an advisory range.
 *
 * Ranges may be disjoint (`<1.1.18 || >=4.0.0 <5.0.9`) when one advisory covers
 * several major lines. Splitting the whole string on whitespace and AND-ing it
 * evaluates those as one contradictory range that nothing matches — which would
 * dismiss a genuinely vulnerable package as "not applicable". Split on `||`
 * first and treat the alternatives as OR.
 */
export function inRange(version, range) {
  const text = String(range ?? '').trim();
  if (text === '') return true; // No range given — assume affected.

  // Anything we cannot parse at all is treated as affected, not dismissed.
  if (/[^\s\d.\-+|<>=vA-Za-z*^~]/.test(text)) return true;

  return text.split('||').some((alternative) => satisfiesAll(version, alternative));
}

/** Split a `bun audit --json` report into actionable and dismissed advisories. */
export function classify(report, lookupVersion = resolvedVersion) {
  const actionable = [];
  const dismissed = [];

  for (const [pkg, advisories] of Object.entries(report)) {
    const version = lookupVersion(pkg);
    for (const advisory of advisories) {
      const ghsa = (advisory.url ?? '').split('/').pop();
      // An unknown resolved version is treated as affected.
      const applies =
        version === null || inRange(version, advisory.vulnerable_versions ?? '');

      if (!applies) {
        dismissed.push(`${pkg}@${version} not in ${advisory.vulnerable_versions} (${ghsa})`);
      } else if (ACCEPTED[ghsa]) {
        dismissed.push(`${pkg}@${version} accepted: ${ACCEPTED[ghsa]} (${ghsa})`);
      } else {
        actionable.push(
          `${(advisory.severity ?? 'unknown').toUpperCase()} ${pkg}@${version} — ${advisory.title}\n    ${advisory.url}\n    affected: ${advisory.vulnerable_versions}`,
        );
      }
    }
  }

  return { actionable, dismissed };
}

function main() {
  const result = spawnSync('bun', ['audit', '--json'], { cwd: root, encoding: 'utf8' });
  const stdout = (result.stdout ?? '').trim();

  if (!stdout) {
    console.log('audit-gate: no advisories reported.');
    return 0;
  }

  let report;
  try {
    report = JSON.parse(stdout);
  } catch {
    console.error('audit-gate: could not parse `bun audit --json` output:');
    console.error(stdout.slice(0, 2000));
    return 1;
  }

  const { actionable, dismissed } = classify(report);

  for (const line of dismissed) {
    console.log(`audit-gate: not applicable — ${line}`);
  }

  if (actionable.length > 0) {
    console.error(`\naudit-gate: ${actionable.length} actionable advisory(ies):\n`);
    for (const line of actionable) {
      console.error(`  ${line}\n`);
    }
    console.error('Add an override in package.json, or record a dated exception in ACCEPTED.');
    return 1;
  }

  console.log(`\naudit-gate: clean (${dismissed.length} reviewed, 0 actionable).`);
  return 0;
}

// Importable for tests; only audits when run directly.
if (process.argv[1] === fileURLToPath(import.meta.url)) {
  process.exit(main());
}
