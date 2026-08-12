#!/usr/bin/env node
/**
 * Merge llmfit hf_models.json with boske-catalog overlay.
 */
import { existsSync, readFileSync, writeFileSync } from 'node:fs';

function parseArgs(argv) {
  const args = {};
  for (let i = 2; i < argv.length; i += 2) {
    const key = argv[i]?.replace(/^--/, '');
    args[key] = argv[i + 1];
  }
  return args;
}

function slugify(value) {
  return String(value)
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-|-$/g, '');
}

function paramsBFromRaw(parametersRaw) {
  if (!Number.isFinite(parametersRaw) || parametersRaw <= 0) return null;
  return Math.max(1, Math.round(parametersRaw / 1_000_000_000));
}

function suggestBoskeTier(paramsB) {
  if (paramsB === null) return null;
  if (paramsB <= 4) return 'seed';
  if (paramsB <= 10) return 'branch';
  if (paramsB <= 16) return 'canopy';
  return 'forest';
}

const args = parseArgs(process.argv);
const llmfitPath = args.llmfit;
const boskePath = args.boske;
const outPath = args.out;
const metaPath = args.meta;
const llmfitVersion = args['llmfit-version'] ?? 'unknown';

if (!llmfitPath || !boskePath || !outPath) {
  console.error('Usage: merge-catalog.mjs --llmfit ... --boske ... --out ... [--meta ...]');
  process.exit(1);
}

const llmfitModels = JSON.parse(readFileSync(llmfitPath, 'utf8'));
const boskeCatalog = JSON.parse(readFileSync(boskePath, 'utf8'));

if (!Array.isArray(llmfitModels)) {
  throw new Error('llmfit export must be an array');
}

/**
 * Fail on upstream schema drift (GF2 / sync-llmfit-db.md).
 *
 * A silent rename upstream — `parameters_raw` in particular — would leave every
 * paramsB null, which makes every model resolve to "unavailable" downstream
 * while the entry count stays healthy and CI stays green. Check the shape, not
 * just the row count.
 */
function assertUpstreamSchema(models) {
  const MIN_MODELS = 200; // GF3: ship the full export, never a curated top-N.
  if (models.length < MIN_MODELS) {
    throw new Error(
      `llmfit export has ${models.length} models, expected >= ${MIN_MODELS} (GF3). ` +
        'Refusing to publish a truncated catalog.',
    );
  }

  const REQUIRED_FIELDS = ['name', 'parameters_raw', 'quantization', 'min_ram_gb'];
  const sample = models.slice(0, 50);
  for (const field of REQUIRED_FIELDS) {
    const present = sample.filter((m) => m[field] !== undefined).length;
    if (present === 0) {
      throw new Error(
        `llmfit export is missing "${field}" on all sampled rows — upstream schema drift. ` +
          'Probe the tagged tree and update merge-catalog.mjs before syncing.',
      );
    }
  }

  // parameters_raw drives every fit verdict; a mostly-null column is drift.
  const withParams = models.filter(
    (m) => Number.isFinite(m.parameters_raw) && m.parameters_raw > 0,
  ).length;
  const ratio = withParams / models.length;
  if (ratio < 0.5) {
    throw new Error(
      `Only ${(ratio * 100).toFixed(1)}% of models have a usable parameters_raw. ` +
        'Every model without it reports as "unavailable" — refusing to publish.',
    );
  }

  console.log(
    `Upstream schema OK: ${models.length} models, ${(ratio * 100).toFixed(1)}% with parameters_raw`,
  );
}

assertUpstreamSchema(llmfitModels);

const boskeEntries = boskeCatalog.entries.map((entry) => ({
  ...entry,
  groveFitCertified: entry.groveFitCertified ?? Boolean(entry.isBoske && !entry.isCloud),
  isBoske: true,
}));

const seenRowKeys = new Set();
const usedIds = new Set();

function catalogDedupeKey(model) {
  const label = String(model.name ?? model.id ?? 'unknown').toLowerCase();
  const quant = String(model.quantization ?? '').toLowerCase();
  const ctx = model.context_length ?? 0;
  const params = model.parameters_raw ?? 0;
  return `${label}|${quant}|${ctx}|${params}`;
}

function assignCatalogId(model) {
  const label = model.name ?? model.id ?? 'unknown';
  const quant = model.quantization ? slugify(model.quantization) : 'unknown';
  const ctx = model.context_length ?? 0;
  let base = `${slugify(label)}-${quant}`;
  if (ctx) base += `-${ctx}`;
  if (!usedIds.has(base)) {
    usedIds.add(base);
    return base;
  }
  let suffix = 2;
  while (usedIds.has(`${base}-${suffix}`)) suffix += 1;
  const id = `${base}-${suffix}`;
  usedIds.add(id);
  return id;
}

const catalogEntries = [];
for (const model of llmfitModels) {
  const dedupeKey = catalogDedupeKey(model);
  if (seenRowKeys.has(dedupeKey)) {
    continue;
  }
  seenRowKeys.add(dedupeKey);

  const paramsB = paramsBFromRaw(model.parameters_raw);
  const label = model.name ?? model.id ?? 'unknown';
  const id = assignCatalogId(model);
  const family = model.architecture ?? model.provider ?? '';
  const searchTokens = [
    label,
    family,
    model.provider,
    paramsB !== null ? `${paramsB}b` : null,
    model.quantization,
  ]
    .filter(Boolean)
    .map((t) => String(t).toLowerCase());

  catalogEntries.push({
    id,
    kind: 'catalog',
    label,
    paramsB,
    minRAMGB: model.min_ram_gb ?? null,
    recommendedRAMGB: model.recommended_ram_gb ?? null,
    quantization: model.quantization ?? null,
    provider: model.provider ?? null,
    architecture: model.architecture ?? null,
    contextLength: model.context_length ?? null,
    suggestedBoskeTier: suggestBoskeTier(paramsB),
    groveFitCertified: false,
    isBoske: false,
    isCloud: false,
    searchTokens,
    // The raw upstream record is deliberately NOT embedded here. It had no
    // consumer and accounted for ~61% of catalog.json (about 4 MB), all of it
    // shipped to every visitor. Everything the UI and CLI render is projected
    // into the fields above; re-run the sync if a new field is needed.
  });
}

/**
 * `syncedAt` records when the data was pulled from upstream, not when this
 * script last ran. Re-merging a cached export (to change the projection, say)
 * must not advance it — that would claim a fetch that never happened.
 */
function resolveSyncedAt() {
  const today = new Date().toISOString().slice(0, 10);
  if (!metaPath || !existsSync(metaPath)) return today;
  try {
    const prev = JSON.parse(readFileSync(metaPath, 'utf8'));
    const unchangedUpstream = prev.llmfitVersion === llmfitVersion;
    return unchangedUpstream && prev.syncedAt ? prev.syncedAt : today;
  } catch {
    return today;
  }
}

const catalog = {
  version: 1,
  syncedAt: resolveSyncedAt(),
  llmfitVersion,
  boskeEntries,
  entries: [...boskeEntries, ...catalogEntries],
  modelCount: catalogEntries.length,
};

writeFileSync(outPath, `${JSON.stringify(catalog, null, 2)}\n`);

if (metaPath) {
  writeFileSync(
    metaPath,
    `${JSON.stringify(
      {
        llmfitVersion,
        syncedAt: catalog.syncedAt,
        modelCount: catalog.modelCount,
        boskeEntryCount: boskeEntries.length,
        syncCadence: 'monthly',
      },
      null,
      2,
    )}\n`,
  );
}

// Hard failure, not a warning: a warning here exits 0 and lets a truncated
// catalog sail through CI and into a release.
if (catalog.modelCount < 200) {
  console.error(`merge-catalog: modelCount ${catalog.modelCount} < 200 (GF3)`);
  process.exit(1);
}

console.log(`Wrote ${catalog.entries.length} entries (${catalog.modelCount} llmfit + ${boskeEntries.length} boske)`);
