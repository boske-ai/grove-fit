# Locked decisions — Grove Fit (2026-06-18)

Immutable unless superseded by a new dated entry.

---

## GF1 — llmfit is the base; Grove Fit is elevation

**llmfit** (MIT, Rust CLI) owns: embedded model database, hardware detection, `recommend` / `search`, tok/s estimates.

**Grove Fit** adds: Boske tier overlay, certified badges, cloud fallback, website static catalog, funnel comparisons, branded CLI wrapper.

We do **not** re-scrape Hugging Face on the website or maintain an independent model DB long-term.

---

## GF2 — llmfit sync cadence: monthly

- Pin `llmfitVersion` in `packages/models/package.json` (or `catalog-meta.json`).
- Run `scripts/sync-llmfit-db` **monthly** (CI cron or manual release ritual).
- Bump patch version of `@boske-labs/grove-fit/models` on each sync.
- Document upstream tag in `packages/models/CATALOG_CHANGELOG.md`.

---

## GF3 — Ship the maximum catalog (200+ models)

Website and npm package include the **full** llmfit export — not a trimmed top-N list.

Rationale: SEO ("can I run Qwen 2.5 7B"), power-user trust, parity with llmfit TUI.

Bundle size is acceptable (JSON gzip ~few hundred KB). Search is client-side.

---

## GF4 — Grove Fit certified (v1: Boske local only)

**Grove Fit certified** badge applies to:

- Boske local tiers: Seed, Branch, Canopy, Forest
- **Not** in v1: Breeze, Summit (cloud — always available, different badge: "Boske Cloud")
- **Not** in v1: third-party catalog models (Llama, Qwen, …)

Future: certified on partner models after review — separate decision.

---

## GF5 — Funnel comparison on every catalog hit

When user searches or selects a **non-Boske** model from the catalog:

1. Show honest fit for that model (recommended / marginal / unavailable).
2. Always show **comparison row**: closest Boske tier by param class / effective memory.
3. Copy pattern: *"Similar size on Boske: Branch — same class, Grove Fit certified, works in the Boske app."*

Never block the third-party result. Comparison is **soft funnel**.

**Mapping rules (v1 heuristic):**

| Catalog param band | Suggest Boske tier |
|--------------------|-------------------|
| ≤ 4B | Seed |
| 5–10B | Branch |
| 11–16B | Canopy |
| ≥ 17B | Forest |

Refine with llmfit model metadata when sync script merges entries (`suggestedBoskeTier` field).

---

## GF6 — Cloud fallback: Breeze / Summit (never Ancient)

User-facing cloud names:

- **Breeze** — fast default when local doesn't fit
- **Summit** — maximum quality

**Ancient** is legacy internal alias → Summit. Never shown on `/fit`.

When **no local tier** is marginal or better:

- Primary CTA: **Try Boske Cloud (Breeze)**
- Secondary: Summit
- De-emphasize local download

---

## GF7 — Website `/fit` is manual + client-side

- URL: **`boske.dev/fit`**
- Hardware: manual form (platform, RAM, GPU backend, VRAM)
- No Hugging Face URL paste — **search combobox only**
- All fit math runs in browser; no hardware upload

Accurate auto-scan stays in Boske app / `grove-fit scan` (llmfit).

---

## GF8 — CPU-only cap matches Boske desktop

- Recommended tier **caps at Branch** on CPU-only backend
- Canopy / Forest may show as **marginal** with slow warning
- Same rules in `@boske-labs/grove-fit/core` as Boske `hardware-fit.js`

---

## GF9 — Repo location and scope boundary

| Item | Location |
|------|----------|
| Grove Fit repo | https://github.com/boske-ai/grove-fit (standalone; may also live in a private Labs monorepo checkout) |
| Brand | Boske Labs, MIT |
| Boske desktop wiring | Documented in TODO P5; **not implemented in this repo first** |
| Website page | [boske.dev/fit](https://boske.dev/fit) embeds UI (vendored today; npm later) |

---

## GF10 — Open comparison UX (website)

Result panel for catalog model **always includes**:

```
[Selected model]     Fit: ⚠ Marginal
                     ~12 GB effective · ~4 tok/s (estimate)

Similar on Boske     🌿 Branch — ✅ Recommended
                     Grove Fit certified · Quick + Think + Vision

[ Download Boske ]   [ Keep exploring models ]
```

Cloud row always visible at bottom when entitled messaging allows (no account required on `/fit` — generic cloud pitch).

---

## GF11 — Cross-platform GUI companion (shared UI)

**One React UI** (`packages/ui`) ships on all surfaces:

| Surface | Shell | Auto-scan |
|---------|-------|-----------|
| Windows / macOS / Linux | **Tauri 2** (`apps/desktop`) | llmfit subprocess |
| iOS / Android | **Capacitor** (`apps/mobile`) | Native plugins (v1) |
| Web | Boske website `/fit` | WebGPU (GF13) + manual fallback |

- Boske styling; tier grid, search, funnel, cloud pitch.
- **No** chat, downloads, or cloud auth in companion v1.
- Desktop: `grove-fit gui` opens the same UI as the installed app.

---

## GF12 — Native conformance (“test all”)

**Target:** identical `recommendedTier` + `tierFit` for golden fixtures on every platform.

1. **`HardwareProfile`** — single JSON contract (`packages/detect`); all detectors normalize to it before `buildHardwareFitSnapshot`.
2. **`packages/conformance/fixtures/`** — golden HW profiles + expected snapshots.
3. **CI matrix** — Ubuntu, macOS, Windows (llmfit); Android emulator + iOS simulator (native plugins); Chromium (WebGPU + manual path).
4. **Upstream alignment** — llmfit `detect --json` should converge on the same schema (GF14).

Parity with Boske `hardware-fit.test.js` remains the baseline; conformance extends it cross-platform.

---

## GF13 — Web: WebGPU auto-detect + manual fallback

On `boske.dev/fit`:

1. **Try WebGPU first** when `navigator.gpu` is available:
   - `requestAdapter()` for GPU identity
   - `navigator.deviceMemory` (when present) for RAM hint
   - Map to `HardwareProfile` with `source: 'webgpu'` and appropriate backend label (`webgpu` / `vulkan` / `metal` by UA)
2. **Fallback to manual** when:
   - WebGPU unavailable or denied
   - Memory hint insufficient for confident tier assignment
   - User chooses “Edit hardware”
3. Manual form sets `source: 'manual'` (GF7 preserved — client-side, no upload).
4. Copy must state detection method and invite correction.

WebGPU estimates are **heuristic**, not llmfit tok/s — same honesty rules as GF7.

---

## GF14 — llmfit + native detect split

| Platform | Primary detector | Notes |
|----------|------------------|-------|
| Linux / macOS / Windows | **llmfit** CLI | `system --json` → normalize |
| Android | **Native plugin** (v1) | RAM + unified-memory heuristic; contribute to llmfit #175 |
| iOS | **Native plugin** (v1) | `physicalMemory`, Metal unified |
| Web | **WebGPU + deviceMemory** (GF13) | No llmfit binary in browser |

- Do **not** fork llmfit for v1; PR upstream for Android/iOS detect JSON parity.
- Mobile companion is a **calculator**, not a promise of 24B local inference on phone.
- When upstream mobile detect ships, replace native plugins without changing UI or core rules.
