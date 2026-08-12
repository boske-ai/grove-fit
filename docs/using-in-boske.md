# Using Grove Fit inside Boske

How to reuse this engine in the Boske app without forking it. Complements
[GF9](./decisions.md), which keeps Boske wiring out of this repo.

---

## Pick the smallest thing that answers your question

| You need | Import | Weight |
|----------|--------|--------|
| "Which tier does this machine get?" | `@boske-labs/grove-fit-core` | Pure TS, no deps, browser-safe |
| …plus reading the hardware | `+ @boske-labs/grove-fit-detect` | Adds platform adapters |
| …plus the model list | `+ @boske-labs/grove-fit-models` | +241 KB gzipped catalog |
| The whole `/fit` page | `+ @boske-labs/grove-fit-ui` | React 19 peer dep |

**Most Boske use cases only need `core`.** It has zero runtime dependencies and
no Node-only APIs, so it runs in the desktop renderer, a worker, or a browser.

---

## The stable surface

Treat these as the contract. Everything else is internal and may move.

```ts
import {
  buildHardwareFitSnapshot,  // SystemInfo -> HardwareFitSnapshot (the main entry)
  assignMaxTier,             // SystemInfo -> { tier, effectiveMemory }
  computeTierFitLevel,       // per-tier verdict
  isTierDownloadAllowed,     // gate a download button
  buildFunnelComparison,     // third-party model -> nearest Boske tier
  suggestBoskeTierForParams, // param count -> tier
  isCloudEntry,              // exempt cloud presets from hardware gating
  LOCAL_TIERS, BOSKE_TIER_MIN_RAM, TIER_RANK,
} from '@boske-labs/grove-fit-core';
```

### Minimal integration

```ts
import { buildHardwareFitSnapshot, isTierDownloadAllowed } from '@boske-labs/grove-fit-core';

const snapshot = buildHardwareFitSnapshot({
  totalRAMGB: 24,
  gpuMemoryGB: 18,
  gpuBackend: 'metal',
  gpu: { name: 'Apple M4 Pro' },
});

snapshot.recommendedTier;        // 'canopy'
snapshot.tierFit.forest;         // 'marginal'
isTierDownloadAllowed('forest', snapshot); // true — marginal still downloadable
```

`buildHardwareFitSnapshot` **throws** on missing or non-numeric RAM rather than
guessing. Catch it and fall back to asking the user; do not default to a number.

### If Boske already detects hardware

Normalize into `HardwareProfile`, then convert:

```ts
import { coerceHardwareProfile, hardwareProfileToSystemInfo } from '@boske-labs/grove-fit-detect';

const profile = coerceHardwareProfile(boskeHardwareBlob); // tolerant of snake_case
const snapshot = buildHardwareFitSnapshot(hardwareProfileToSystemInfo(profile));
```

`coerceHardwareProfile` accepts `total_ram_gb`, `totalRAMGB`, `ram_gb`, `memory_gb`
and friends, so an existing Boske payload usually needs no reshaping.

---

## Three ways to consume it, today

npm packages are **not published** yet ([TODO.md](../TODO.md)), so pick one:

**1. Git dependency** — simplest, keeps history:

```json
{ "dependencies": {
  "@boske-labs/grove-fit-core": "github:boske-ai/grove-fit#main&path:/packages/core"
}}
```

Requires a build step; `dist/` is not committed. Pin a tag, not `main`.

**2. Vendor `packages/core/src/`** — what `boske.dev/fit` does today. Five files,
no dependencies. Record the commit you copied from so a later diff is possible.

**3. Publish to npm** — see below. Best once the API settles.

---

## Rules that keep the two in sync

These exist because divergence here produces *confidently wrong* answers, which
is worse than an error.

1. **Do not re-implement the tier maths.** If Boske's `hardware-fit.js` and this
   engine disagree, a user gets one answer on the website and another in the app.
   Import, don't copy the logic.
2. **Do not change thresholds locally.** `BOSKE_TIER_MIN_RAM` and the tier bands
   are the shared contract — change them here, with a dated entry in
   [`decisions.md`](./decisions.md), then bump.
3. **Cloud presets are never hardware-gated** ([GF15](./decisions.md)). If you
   build your own catalog rows, set `isCloud: true` and let the engine exempt
   them.
4. **`suggestedBoskeCertified` is always `true`** — it describes the suggested
   Boske tier, not the selected model. For "is *this* model certified", read
   `catalogModelCertified`.
5. **Feed the conformance fixtures through any port.** `packages/conformance/fixtures/`
   is the cross-surface contract; a new consumer should produce identical
   `recommendedTier` and `tierFit` for all of them.

---

## Publishing to npm, when you want it

Prepared but deliberately unpublished. What is already done:

- `publishConfig.access: public`, `repository`, `homepage`, `bugs` on every package
- `files: ["dist"]` so sources stay out of the tarball
- Workspace deps (`workspace:*`) — **your package manager must rewrite these to
  real versions on publish**, or consumers get an uninstallable package

What is still needed:

1. **Decide the version line.** Everything sits at `0.1.0`; `models` is `0.1.1`.
   Pre-1.0 signals the API may move, which is honest today.
2. **`@boske-labs` npm org** with publish rights, and an automation token in
   repo secrets as `NPM_TOKEN`.
3. **Publish order** — `core` → `detect` → `models` → `ui` → `cli`, since each
   depends on the previous.
4. **Provenance.** Publish from CI with `--provenance` so npm shows the build
   came from this repo.

Suggested command once the org exists:

```bash
bun run build
bun publish --cwd packages/core --access public --provenance
```

Do not publish from a laptop — a CI publish is attestable, a local one is not.

---

## Desktop builds

`.github/workflows/release.yml` builds macOS (Apple Silicon + Intel), Windows and
Linux on native runners when you push a `v*` tag, and opens a **draft** release.

```bash
git tag v0.2.0 && git push origin v0.2.0
```

Artifacts are **unsigned**: macOS needs right-click → Open on first launch,
Windows shows a SmartScreen warning. Signing needs an Apple Developer ID and a
Windows code-signing certificate; both are secrets-in-CI work, tracked separately.
