# Grove Fit — roadmap

Last updated: 2026-07-15

Open hardware fit for local AI. Live at **[boske.dev/fit](https://boske.dev/fit)**.

## Shipped

- Fit engine + Boske tier overlay (`packages/core`)
- Hardware detect adapters — llmfit, WebGPU, native, manual (`packages/detect`)
- Shared UI + web app, CLI, Tauri desktop, Capacitor mobile
- Full llmfit catalog sync (5,000+ models) + conformance CI
- Legal / attribution docs (MIT + llmfit notices)

## Next

| Item | Notes |
|------|-------|
| Mobile emulator CI | Android / iOS runners |
| Upstream llmfit Android detect | [llmfit#175](https://github.com/AlexsJones/llmfit/issues/175) |
| Deeper Boske app integration | Optional — desktop wizard can import this engine later |

## Later

| Item | Notes |
|------|-------|
| npm publish `@boske-labs/grove-fit-*` | After more soak on `/fit` + catalog sync. Not required to use the repo or website. |
