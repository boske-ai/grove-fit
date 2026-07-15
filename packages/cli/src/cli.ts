#!/usr/bin/env node
import { spawn } from 'node:child_process';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { buildFunnelComparison, type BoskeLocalTier } from '@boske-labs/grove-fit-core';
import { loadCatalogDocuments, searchCatalog, toCatalogEntry } from './catalog.js';
import { detectHardware } from './detect-hardware.js';
import {
  LLMFIT_INSTALL_URL,
  matchTierFromName,
  normalizeRecommendEntries,
  runLlmfitRecommend,
} from './llmfit.js';
import {
  formatScanOutput,
  formatSearchResultLine,
  formatSystemOutput,
  paintAttribution,
} from './terminal.js';

const args = process.argv.slice(2);
const command = args[0] ?? '--help';
const jsonMode = args.includes('--json');
const allMode = args.includes('--all');

function printHelp() {
  console.log(`grove-fit — Boske Labs hardware fit

Usage:
  grove-fit scan [--json] [--all]
  grove-fit system [--json]
  grove-fit search <query> [--json] [--limit N]
  grove-fit gui

Hardware detection uses llmfit when available, native OS probes otherwise.
Install llmfit: ${LLMFIT_INSTALL_URL}
`);
}

async function cmdScan() {
  const { profile, snapshot, source } = await detectHardware();

  let boskeHighlights: Array<{ tier: BoskeLocalTier; name: string }> = [];
  if (source === 'llmfit') {
    try {
      const recommendStdout = await runLlmfitRecommend(allMode, allMode ? 100 : 30);
      boskeHighlights = normalizeRecommendEntries(recommendStdout)
        .map((entry) => {
          const name = String(entry.name ?? entry.model ?? '');
          const tier = matchTierFromName(name);
          return tier ? { tier, name } : null;
        })
        .filter((hit): hit is { tier: BoskeLocalTier; name: string } => hit !== null);
    } catch {
      boskeHighlights = [];
    }
  }

  if (jsonMode) {
    console.log(
      JSON.stringify({ profile, snapshot, source, boskeHighlights }, null, 2),
    );
    return;
  }

  console.log(formatScanOutput(snapshot, profile, source));
  if (boskeHighlights.length > 0) {
    console.log('\nBoske matches in llmfit recommend:');
    for (const hit of boskeHighlights.slice(0, 8)) {
      console.log(`  ${hit.tier}: ${hit.name}`);
    }
  }
  console.log(`\n${paintAttribution(source)}`);
}

async function cmdSystem() {
  const { profile, snapshot, source } = await detectHardware();

  if (jsonMode) {
    console.log(JSON.stringify({ profile, snapshot, source }, null, 2));
    return;
  }

  console.log(formatSystemOutput(snapshot, profile, source));
  console.log(`\n${paintAttribution(source)}`);
}

async function cmdSearch() {
  const queryParts: string[] = [];
  let limit = 20;
  for (let i = 1; i < args.length; i += 1) {
    const arg = args[i];
    if (arg === '--json') continue;
    if (arg === '--limit') {
      const next = args[i + 1];
      if (next) {
        limit = Number.parseInt(next, 10);
        i += 1;
      }
      continue;
    }
    queryParts.push(arg);
  }

  const query = queryParts.join(' ').trim();
  if (!query) {
    console.error('Usage: grove-fit search <query> [--limit N]');
    process.exit(1);
  }

  const { snapshot } = await detectHardware();
  const documents = loadCatalogDocuments();
  const results = searchCatalog(documents, query, limit);

  if (jsonMode) {
    const payload = results.map((doc) => ({
      ...doc,
      fit: buildFunnelComparison(toCatalogEntry(doc), snapshot),
    }));
    console.log(JSON.stringify({ query, results: payload }, null, 2));
    return;
  }

  console.log(`Search: ${query} (${results.length} result${results.length === 1 ? '' : 's'})\n`);
  if (results.length === 0) {
    console.log('  No catalog matches. Try a shorter query or reload the catalog.');
    return;
  }

  for (const doc of results) {
    const fit = buildFunnelComparison(toCatalogEntry(doc), snapshot);
    console.log(
      formatSearchResultLine(doc.label, fit.fitLevel, {
        tier: doc.tier ?? undefined,
        paramsB: doc.paramsB,
        isBoske: doc.isBoske,
      }),
    );
  }
  console.log('\nFit verdicts use your detected hardware · catalog from Grove Fit models package');
}

function cmdGui() {
  const root = join(dirname(fileURLToPath(import.meta.url)), '..', '..', '..');
  const script = join(root, 'scripts', 'start-gui.mjs');
  console.log('Launching Grove Fit GUI…');
  const child = spawn(process.execPath, [script], { cwd: root, stdio: 'inherit' });
  child.on('exit', (code) => process.exit(code ?? 0));
}

async function main() {
  switch (command) {
    case 'scan':
      await cmdScan();
      break;
    case 'system':
      await cmdSystem();
      break;
    case 'search':
      await cmdSearch();
      break;
    case 'gui':
      cmdGui();
      break;
    case '--help':
    case '-h':
    case 'help':
      printHelp();
      break;
    default:
      console.error(`Unknown command: ${command}`);
      printHelp();
      process.exit(1);
  }
}

main().catch((error: unknown) => {
  console.error(error instanceof Error ? error.message : error);
  process.exit(1);
});
