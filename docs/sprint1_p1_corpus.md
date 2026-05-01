# P1: Corpus — Implementation Plan

## Goal

Make the corpus context work end-to-end with real `data/` files.

**Approach**: Verify loader + indexer + retrieval work with a hardcoded 5-doc subset first. Focus on functionality only. Cache and full corpus load are deferred until functionality is proven.

## Prerequisites

- OPENAI_API_KEY set in `code/.env.local` (confirmed by user)
- Use Node 20 `--env-file` flag to load `.env.local` (zero deps, no dotenv)

## Current State (from P0)

| File | Status | What's Needed |
|------|--------|---------------|
| `corpus/document.ts` | Done | Types only, nothing to change |
| `corpus/loader.ts` | Implemented, untested | Test with real `data/` dir, verify company/category tagging |
| `corpus/indexer.ts` | Implemented, untested | Test with OPENAI_API_KEY |
| `corpus/service.ts` | Implemented, untested | Test `retrieve()` with a real query |

## Steps

| # | Step | What | Verify |
|---|------|------|--------|
| 1 | Add --env-file to scripts | Update package.json `start` script: `tsx --env-file=.env.local src/main.ts` | OPENAI_API_KEY loaded from .env.local |
| 2 | Fix dataDir resolution | Verify `config.dataDir` default resolves correctly when running from repo root | Path resolves to repo `data/` dir |
| 3 | Create test script early | `code/src/corpus/test-corpus.ts` + `"test:corpus"` in package.json | Runnable with `pnpm test:corpus` |
| 4 | Test loader with 5 hardcoded docs | Hardcode 5 file paths (1 HackerRank, 1 Claude, 1 Visa, 2 edge cases) in test script | Docs load, company/category correct |
| 5 | Fix loader edge cases | Visa nested dirs (`visa/support/consumer/`), verify category extraction | All 3 ecosystems tag correctly |
| 6 | Test indexer with 5 docs | Build MemoryVectorStore with hardcoded subset + OPENAI_API_KEY | Index builds without error |
| 7 | Test retrieval | Query "add time for candidate" against 5-doc index | Returns relevant result |
| 8 | Test full loader (count only) | Run `loadCorpus` on real `data/` dir, log count + sample | 774 docs found, prints company distribution |

## Deferred (not in P1)

- Embeddings disk cache (`data/index/embeddings-cache.json`) — add after functionality proven
- Full corpus indexing (774 docs) — defer until cache is implemented
- Retrieval quality tuning — defer to P5

## Risks

- **MEDIUM**: dataDir path — default is `path.resolve(process.cwd(), "data")`. Must run from repo root.
- **LOW**: Embedding 5 docs costs ~$0.00001. Negligible.

## Complexity: LOW
- Code is already written from P0. This is testing + fixing edge cases.
- ~30 min estimated.
