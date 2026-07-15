# grove-fit CLI

Boske-first wrapper around **llmfit**.

## Install

```bash
brew install AlexsJones/llmfit/llmfit
bun install   # from repo root
bun run --filter grove-fit-cli build
```

## Commands

```bash
grove-fit scan [--json] [--all]
grove-fit system [--json]
grove-fit search <query> [--json]
grove-fit gui    # opens apps/web dev server
```

## Requires

`llmfit` on PATH for scan/system/search. MIT attribution included in output.
