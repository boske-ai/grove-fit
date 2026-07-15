# Grove Fit Mobile (Capacitor)

iOS and Android companion using the shared web UI + native hardware plugins.

## Setup

```bash
bun install
bun run --cwd ../web build
cd apps/mobile
bunx cap add ios    # once
bunx cap add android # once
bun run sync
```

## Native detect

- **iOS:** `ProcessInfo.physicalMemory` → `parseNativeDetectRaw` / `detectIosProfile`
- **Android:** `ActivityManager.getMemoryInfo()` → `parseNativeDetectRaw` / `detectAndroidProfile`

Plugin: `src/plugin/` (TS bridge + `native/` sources). After `cap add ios|android`:

```bash
bun run sync:native   # copies Java/Swift into android/ios projects, then cap sync
```

## Dev

```bash
bun run dev          # iOS simulator
bun run dev:android  # Android emulator
```

## Attribution

Grove Fit’s model catalog and fit-engine logic trace to [llmfit](https://github.com/AlexsJones/llmfit) (MIT). See [`THIRD_PARTY_NOTICES.md`](../../THIRD_PARTY_NOTICES.md) for the pinned release and license text.

The Capacitor native plugins under `src/plugin/native/` (Java on Android, Swift on iOS) are **original Grove Fit code** — they are not forks of llmfit’s native detect. Android unified-memory heuristics are intended to align with upstream [llmfit #175](https://github.com/AlexsJones/llmfit/issues/175).
