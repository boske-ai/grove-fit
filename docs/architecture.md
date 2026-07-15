# Grove Fit — architecture

## Stack

```
┌──────────────────────────────────────────────────────────────────┐
│ llmfit (upstream)                                                 │
│  data/hf_models.json — 200+ models, quants, memory math           │
│  hardware.rs — RAM / GPU / backend detection                      │
│  fit.rs — scoring, tok/s, recommend                               │
└────────────────────────────┬─────────────────────────────────────┘
                             │
         ┌───────────────────┼───────────────────┐
         ▼                   ▼                   ▼
┌─────────────────┐ ┌─────────────────┐ ┌─────────────────┐
│ packages/models │ │ packages/core   │ │ packages/cli    │
│ boske-catalog   │ │ assignMaxTier   │ │ grove-fit scan  │
│ catalog.json    │ │ tierFit levels  │ │ wraps llmfit    │
│ (sync monthly)  │ │ funnel map      │ │                 │
└────────┬────────┘ └────────┬────────┘ └─────────────────┘
         │                   │
         └─────────┬─────────┘
                   ▼
         ┌─────────────────────┐
         │ boske.dev/fit       │
         │ (Boske website repo)│
         │ manual HW + search  │
         └─────────────────────┘
```

---

## Package responsibilities

### `@boske-labs/grove-fit/core`

Pure TypeScript. No Node-only APIs in public surface (browser-safe).

| Export | Source (conceptual) |
|--------|---------------------|
| `assignMaxTier(systemInfo)` | Boske `model-downloader.js` |
| `computeTierFitLevel(...)` | Boske `hardware-fit.js` |
| `buildHardwareFitSnapshot(...)` | Boske `hardware-fit.js` |
| `suggestBoskeTierForCatalogModel(model)` | GF5 param-band heuristic |
| `formatFunnelComparison(catalogModel, snapshot)` | GF10 UX helper |

Constants: `LOCAL_TIERS`, `BOSKE_TIER_MIN_RAM`, CPU-only cap rules.

### `@boske-labs/grove-fit/models`

| File | Role |
|------|------|
| `boske-catalog.json` | Curated Boske tiers + cloud presets + certified flags |
| `catalog.json` | Full llmfit export + `suggestedBoskeTier` merge field |
| `catalog-meta.json` | `llmfitVersion`, `syncedAt`, model count |
| `search-index.json` | Optional prebuilt tokens for MiniSearch |

### `@boske-labs/grove-fit/cli`

Requires `llmfit` on PATH.

| Command | Behavior |
|---------|----------|
| `grove-fit scan` | `llmfit recommend --json` → filter/highlight Boske tiers |
| `grove-fit search <q>` | `llmfit search` + funnel lines |
| `grove-fit system` | HW summary + Boske `recommendedTier` |
| `grove-fit check --model <id>` | Single catalog entry vs HW |

Flags: `--all` (full catalog), `--json`, `--memory`, `--backend`.

---

## Website `/fit` data flow

```
User adjusts HW form
       │
       ▼
core.buildHardwareFitSnapshot(manualSystemInfo)
       │
       ├── Boske section: tierFit per Seed…Forest + cloud rows
       │
User searches model combobox
       │
       ▼
Client search on catalog.json (MiniSearch / Fuse)
       │
       ▼
For selection:
  1. core.fitForCatalogEntry(entry, snapshot)
  2. core.suggestBoskeTierForCatalogModel(entry)
  3. Render GF10 comparison panel
```

No network except static asset load (catalog bundle).

---

## Sync pipeline (monthly)

```bash
# from repo root — pin is packages/models/catalog-meta.json
bun run sync:catalog
# or: LLMFIT_VERSION=v1.1.3 bash scripts/sync-llmfit-db.sh
```

`scripts/sync-llmfit-db.sh` fetches the verified upstream model export for the pinned tag
(from llmfit **v1.1.3**: `llmfit-core/data/hf_models.json`), then runs:

- `scripts/merge-catalog.mjs` — Boske overlay, `suggestedBoskeTier`, `searchTokens`, stable `id`
- `scripts/build-search-index.mjs` — MiniSearch tokens for the website / CLI

See [`scripts/sync-llmfit-db.md`](../scripts/sync-llmfit-db.md) and [`THIRD_PARTY_NOTICES.md`](../THIRD_PARTY_NOTICES.md).
---

## Fit levels

| Level | Meaning | Download / CTA |
|-------|---------|----------------|
| `recommended` | Comfortable on this HW | Primary download tier |
| `marginal` | May run; slow or tight | Allowed with warning |
| `unavailable` | Below RAM floor or impractical | Block local; pitch cloud |

Cloud presets (Breeze, Summit): always `available` — not "certified" in v1.

---

## Certified badge rules (v1)

```typescript
interface CatalogEntry {
  groveFitCertified?: boolean; // true only on boske-catalog local tiers
  isCloud?: boolean;
  isBoske?: boolean;
}
```

UI: badge component on Boske local tier cards only.

---

## Related Boske product

Fit rules here stay aligned with Boske’s desktop hardware-fit logic. Deeper in-app wiring is optional follow-up (see [`TODO.md`](../TODO.md)).

---

## Security & privacy

| Surface | Data leaves device? |
|---------|---------------------|
| `/fit` website | No (static assets only) |
| CLI `scan` | No (local llmfit) |
| Sync script (maintainer) | Fetches public llmfit JSON at build time |

No telemetry in v1.
