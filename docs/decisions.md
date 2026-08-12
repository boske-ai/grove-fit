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

---

# Amendments (2026-08-06)

Following an audit of the repo. Each entry supersedes part of a locked decision
above; the originals stay as written.

---

## GF15 — Cloud presets are exempt from hardware fit (supersedes part of GF4 / GF6)

`GF4` and `docs/architecture.md` already said Breeze and Summit are "always
available", but the fit engine did not implement it: cloud entries have no
`paramsB`, and `fitForCatalogEntry` mapped a missing `paramsB` to `unavailable`.
Selecting Breeze rendered **"Won't run — not enough RAM or GPU for this model
size"** on the same screen that offered Breeze as the cloud fallback.

**Rule:** `isCloud` is checked *before* any hardware reasoning.
`buildFunnelComparison` returns `fitLevel: 'recommended'` and `isCloud: true`,
and the UI renders an "Always available" badge instead of a hardware verdict.
`minRAMGB` on a cloud entry is ignored, never a gate.

---

## GF16 — `deviceMemory` is a lower bound, not a measurement (implements GF13)

`GF13` required falling back to manual when "the memory hint is insufficient for
confident tier assignment". No confidence check existed; any positive
`navigator.deviceMemory` was treated as exact.

Because user agents clamp the value (Chrome caps at 8) a reading at the ceiling
means *at least* that much. Measured: a **24 GB** machine reported **16 GB**, and
was recommended **Branch** where the truth is **Canopy**.

**Rule:** `webGpuMemoryConfidence()` marks any reading `>= 8 GB` as
`lower-bound`. On a lower-bound reading the UI prefills the manual form and asks
the user to confirm rather than assigning a tier. Only readings below the
ceiling are treated as exact.

---

## GF17 — Catalog ships projected fields only (supersedes GF3's size rationale)

GF3's "bundle size is acceptable (JSON gzip ~few hundred KB)" was written for a
"200+ model" catalog. At **5,744** models, `merge-catalog.mjs` was embedding the
entire raw upstream record per entry as `upstream` — **61% of the file (~5.4 MB)**
— with no consumer anywhere in the repo.

**Rule:** the catalog carries only projected fields the UI and CLI actually read.
Adding a field means adding it to the projection and re-running the sync, never
re-embedding the raw record.

| | before | after |
|---|---|---|
| catalog.json | 8.84 MB | **3.40 MB** |
| gzipped | 488 KB | **241 KB** |

GF3's substance is unchanged: still the full export, still no curated top-N —
now enforced by a hard failure in `merge-catalog.mjs` rather than a warning.

---

## GF18 — Conformance must exercise the code that can diverge (extends GF12)

GF12 promised identical results "on every platform", and CI ran the matrix on
three OSes. But the fixtures fed a pre-normalized `HardwareProfile` into pure
TypeScript — the same deterministic function on three runners, which cannot
diverge. The code that *can* diverge (the Rust, Swift and Java normalizers) was
never exercised, and the Rust one already had: it was missing the `amd → cuda`
mapping and returned raw strings for unknown platforms where TS returns `linux`.

**Rules:**
1. `loadFixtures()` globs the fixture directory — a hardcoded list silently
   skipped any fixture that was added.
2. `normalize_platform` / `normalize_gpu_backend` in `detect.rs` must stay
   behaviorally identical to `normalize.ts`; both carry a comment saying so.
3. CI runs `cargo clippy -D warnings` and `cargo test` on the desktop crate.

---

## GF19 — Release builds ship no debugger and no log file

The desktop app enabled Tauri's `devtools` feature unconditionally and appended
diagnostics to a fixed `/tmp/grove-fit-desktop.log` in every build. On a shared
machine a local user can pre-create that path as a symlink, and `create(true)`
follows it (CWE-59).

**Rule:** `devtools` is an opt-in cargo feature (`--features devtools`), and
`desktop_log` is `#[cfg(debug_assertions)]` and stderr-only. Release builds write
no log file. Any future logging goes through `app.path().app_log_dir()`, never a
fixed path in a world-writable directory.

---

## GF20 — The desktop sidecar name is the runtime basename (2026-08-06)

`try_llmfit_sidecar` passed `"binaries/llmfit"` to `shell().sidecar(...)`, matching
the `externalBin` entry in `tauri.conf.json`. But `sidecar()` resolves against
`<dir of the running executable>`, and the bundler stages the binary *next to*
the executable with the `binaries/` prefix and target triple stripped. Every
lookup therefore failed with `No such file or directory`, the `.ok()?` swallowed
it, and detection fell back to the native probe.

Effect: the desktop app had **never** used llmfit. It reported the coarser
native numbers while the UI said nothing was wrong, and no test noticed because
the fallback is a legitimate path.

**Rules:**
1. The constant is the runtime basename (`"llmfit"`), not the config path. The
   two look interchangeable and are not.
2. Verified by running the built `.app` against a sidecar that prints a
   recognisable payload and confirming the UI reports `source: llmfit` — a
   type-check cannot catch this.
3. A silent fallback needs a visible signal. `HardwareSummary` shows the GPU name
   and the detect line states the method, so llmfit-vs-native is now legible in
   the UI itself.
