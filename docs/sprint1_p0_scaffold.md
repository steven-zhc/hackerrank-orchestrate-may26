# P0: Scaffold — Implementation Plan (COMPLETED)

> **Status: COMPLETED.** Some details below are stale (originally planned Anthropic, switched to OpenAI-only during implementation). See actual code in `code/src/` for current state.

## Goal

Compilable TypeScript project in `code/` with ESM, pnpm, tsx, Effect.ts, LangChain, Zod.
Binary `hr` command that accepts CLI args. Empty Effect Layer skeletons for all 4 bounded contexts.

## Success Criteria

- `pnpm build` (tsc --noEmit) passes with zero errors
- `pnpm start -- --help` prints usage info
- `bin/hr.js` is executable via tsx shebang
- All source files compile with strict TypeScript

## Steps

| # | Step | Files | Depends On |
|---|------|-------|------------|
| 1 | Init pnpm project (`package.json`: ESM, bin, scripts) | `code/package.json` | — |
| 2 | Create `tsconfig.json` (strict, ESM, NodeNext) | `code/tsconfig.json` | — |
| 3 | Create `bin/hr.js` shebang wrapper | `code/bin/hr.js` | — |
| 4 | Create `.env.example` with placeholder keys | `code/.env.example` | — |
| 5 | Install deps: `pnpm install` | `node_modules/`, `pnpm-lock.yaml` | 1 |
| 6 | Shared Kernel skeletons | `code/src/shared/config.ts`, `code/src/shared/llm.ts` | 5 |
| 7 | Corpus Context skeletons | `code/src/corpus/document.ts`, `loader.ts`, `indexer.ts`, `service.ts` | 5 |
| 8 | Triage Context skeletons | `code/src/triage/ticket.ts`, `result.ts`, `schema.ts`, `analyze.ts`, `respond.ts`, `pipeline.ts`, `service.ts` | 5 |
| 9 | IO Context skeletons | `code/src/io/csv-reader.ts`, `csv-writer.ts`, `cli.ts` | 5 |
| 10 | Entry point `main.ts` wiring all layers + CLI | `code/src/main.ts` | 6-9 |
| 11 | `pnpm build` — verify compiles | — | 10 |
| 12 | `pnpm start -- --help` — verify CLI works | — | 11 |

## File Details

### Step 1: package.json

```json
{
  "name": "hr-triage-agent",
  "version": "0.1.0",
  "type": "module",
  "bin": {
    "hr": "bin/hr.js"
  },
  "scripts": {
    "build": "tsc --noEmit",
    "start": "tsx src/main.ts",
    "validate": "tsx src/io/validate.ts"
  },
  "dependencies": {
    "effect": "^3",
    "@langchain/core": "^0.3",
    "@langchain/anthropic": "^0.3",
    "@langchain/openai": "^0.3",
    "zod": "^3",
    "csv-parse": "^5",
    "csv-stringify": "^6"
  },
  "devDependencies": {
    "tsx": "^4",
    "typescript": "^5",
    "@types/node": "^22"
  }
}
```

### Step 2: tsconfig.json

```json
{
  "compilerOptions": {
    "target": "ES2022",
    "module": "NodeNext",
    "moduleResolution": "NodeNext",
    "strict": true,
    "esModuleInterop": true,
    "skipLibCheck": true,
    "outDir": "dist",
    "rootDir": "src",
    "declaration": true,
    "sourceMap": true,
    "noEmit": true
  },
  "include": ["src"]
}
```

### Step 3: bin/hr.js

```js
#!/usr/bin/env tsx
import "../src/main.ts";
```

### Step 4: .env.example

```
ANTHROPIC_API_KEY=sk-ant-xxx
OPENAI_API_KEY=sk-xxx
```

### Step 6: Shared Kernel

**config.ts** — Effect Service reading env vars:
- `ConfigService` tag with `anthropicApiKey`, `openaiApiKey`
- `ConfigServiceLive` layer reads from `process.env`
- Fails with `ConfigError` if keys missing

**llm.ts** — LangChain ChatAnthropic wrapper:
- `LlmService` tag with `invoke` method
- `LlmServiceLive` layer depends on `ConfigService`
- Creates `ChatAnthropic` instance with `temperature: 0`

### Step 7: Corpus Context

**document.ts** — CorpusDocument value object:
- `company`, `category`, `source` (file path), `content`

**loader.ts** — File system reader:
- Recursively reads `data/**/*.md`
- Tags each doc with company/category from path

**indexer.ts** — Vector store builder:
- Takes `CorpusDocument[]`, builds `MemoryVectorStore`
- Uses OpenAI embeddings

**service.ts** — CorpusService Effect Layer:
- `retrieve(query: string)` -> `RetrievedContext`
- `CorpusServiceLive` depends on `ConfigService`
- Builds index on first call (lazy init)

### Step 8: Triage Context

**ticket.ts** — SupportTicket value object:
- `issue`, `subject`, `company` (readonly fields)

**result.ts** — TriageResult value object:
- `status`, `product_area`, `response`, `justification`, `request_type`, `sources`
- Static factory methods: `fromAnalysis()`, `fromResponse()`, `fromError()`

**schema.ts** — Zod schemas:
- `AnalysisSchema` (Phase 1 output)
- `ResponseSchema` (Phase 2 output)

**analyze.ts** — Phase 1 LLM call (skeleton, returns stub)
**respond.ts** — Phase 2 LLM call (skeleton, returns stub)
**pipeline.ts** — Effect.gen pipeline (skeleton, chains stubs)

**service.ts** — TriageService Effect Layer:
- `triage(ticket: SupportTicket)` -> `TriageResult`
- Wraps pipeline with error recovery

### Step 9: IO Context

**csv-reader.ts** — Parse CSV:
- `readCsv(path: string)` -> `Effect<SupportTicket[], CsvError>`
- Uses `csv-parse`

**csv-writer.ts** — Write CSV:
- `writeCsv(path: string, results: TriageResult[])` -> `Effect<void, CsvError>`
- Echoes input columns + output columns
- Uses `csv-stringify`

**cli.ts** — CLI argument parsing:
- Parses `process.argv` for input file, optional output file
- Defaults output to `./output.csv`
- `--help` flag prints usage

### Step 10: main.ts

- Parses CLI args via `cli.ts`
- Composes all layers into `MainLive`
- Runs program: read CSV -> triage each -> write CSV
- Exits with appropriate code

## Skeleton Contract

Every skeleton file must:
- Export its types and service tags
- Have a stub implementation that compiles
- Use `Effect.die("not implemented")` for unimplemented methods
- Import only from its own bounded context or shared kernel

## Risks

- **LOW**: ESM + tsx + Effect.ts interop
- **LOW**: LangChain version pinning

## Estimated Time: ~1h
