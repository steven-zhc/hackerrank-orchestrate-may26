# TODO — 2026-05-01

## Summary
- Completed planning phase: domain design, tech design, implementation plan with 26 decisions
- Conducted domain expert review (8 findings) and tech architecture review (8 findings), all resolved
- Completed P0 Scaffold: 14 TypeScript source files across 4 DDD bounded contexts
- Stack: Effect.ts + LangChain + OpenAI (gpt-4o + text-embedding-3-small) + Zod + ESM
- CLI binary `hr` works (`--help` prints usage, `pnpm build` passes with zero errors)
- Code review: fixed H1 (type cast), M1 (nested functions), M2 (Effect.log), L1 (Effect Config)
- Switched from Anthropic to OpenAI-only (single OPENAI_API_KEY for chat + embeddings)
- Created `/wrap-up` command for future sessions

## Remaining Issues
- `triage/analyze.ts` — Phase 1 LLM call is a stub (`Effect.die("not implemented")`)
- `triage/respond.ts` — Phase 2 LLM call is a stub (`Effect.die("not implemented")`)
- Corpus loader/indexer untested with real data (needs OPENAI_API_KEY for embeddings)
- CSV reader untested with actual `support_tickets.csv` (multiline fields, edge cases)
- `io/validate.ts` not yet created (planned for P5)
- `bin/hr.js` shebang works with `tsx` but not tested as globally linked binary

## Improvement Suggestions
- Consider adding `Effect.log` with structured metadata (ticket index, company) for better observability
- The `CorpusServiceLive` lazy init with `Ref` could use `Effect.cached` for a more idiomatic approach
- `csv-reader.ts` uses `relax_quotes: true` — may need tuning after testing with real CSV
- `cli.ts` is minimal — could add `--verbose` flag for debug logging later
- The `TriageResult.fromAnalysis` sets `response` to `escalation_reason` — review if escalated tickets need a different response format

## Next Steps
1. **P1: Corpus** — Implement and test `loadCorpus` + `buildIndex` with real `data/` files. Set OPENAI_API_KEY and verify retrieval works.
2. **P2: IO** — Test CSV reader with `sample_support_tickets.csv`. Verify output format matches `output.csv` header.
3. **P3: Triage Pipeline** — Implement `analyze.ts` (Phase 1 structured output with escalation taxonomy + product area enum in prompt) and `respond.ts` (Phase 2 grounded response with source citations).
4. **P4: Integration** — Wire end-to-end, run on full dataset.
5. **P5: Tune & Test** — Create `validate.ts`, run against sample, iterate on prompts.
6. **P6: Polish** — README in code/, final cleanup, submission prep.

---

# TODO — 2026-05-01 (Phase: P1 Corpus Setup)

## Summary
- Created P1 corpus implementation plan (`docs/sprint1_p1_corpus.md`)
- Added `--env-file=.env.local` to all package.json scripts (start, validate, test:corpus) for zero-dep env loading
- Created `code/src/corpus/test-corpus.ts` — test script that loads 5 hardcoded docs, builds MemoryVectorStore, tests retrieval, and counts full corpus
- Added `test:corpus` script to package.json

## Remaining Issues
- `test-corpus.ts` not yet executed — needs `pnpm test:corpus` run to verify loader + indexer + retrieval
- `triage/analyze.ts` — Phase 1 LLM call still a stub
- `triage/respond.ts` — Phase 2 LLM call still a stub
- CSV reader untested with actual support_tickets.csv
- Full corpus indexing (774 docs) deferred until cache implemented

## Improvement Suggestions
- Add embeddings disk cache after proving retrieval works (reduces re-index cost)
- Consider chunking large .md files if retrieval quality is poor
- Add structured logging with ticket metadata for observability

## Next Steps
1. **Run `pnpm test:corpus`** — Execute test script, verify 5-doc load + index + retrieval works
2. **Fix any edge cases** — Loader path resolution, company/category tagging for Visa nested dirs
3. **P2: IO** — Test CSV reader with sample_support_tickets.csv
4. **P3: Triage Pipeline** — Implement analyze.ts and respond.ts LLM calls
5. **P4: Integration** — Wire end-to-end on full dataset

---

# TODO — 2026-05-01 (Phase: P2 IO)

## Summary
- Created P2 IO implementation plan (`docs/sprint1_p2_io.md`) with review corrections
- Created `code/src/io/test-io.ts` — test script for CSV reader + writer verification
- Added `test:io` script to package.json
- Ran `pnpm test:io` — all tests passed: sample CSV (10 records), full CSV (29 records), writer header match, multiline round-trip
- Created `/dev-review` command for senior developer plan reviews
- Updated `/wrap-up` command to include plan status updates
- No bugs found in IO layer — reader and writer work correctly as implemented in P0

## Remaining Issues
- `test-corpus.ts` not yet executed — needs `pnpm test:corpus` run (requires OPENAI_API_KEY)
- `triage/analyze.ts` — Phase 1 LLM call still a stub
- `triage/respond.ts` — Phase 2 LLM call still a stub
- Full corpus indexing (774 docs) deferred until cache implemented
- `relax_quotes`/`relax_column_count` in csv-reader — works but could be cleaned up in polish phase

## Improvement Suggestions
- Add embeddings disk cache after proving retrieval works
- Consider chunking large .md files if retrieval quality is poor
- Remove `relax_quotes`/`relax_column_count` from csv-reader during polish (P6)

## Next Steps
1. **Run `pnpm test:corpus`** — Execute P1 test, verify corpus load + index + retrieval
2. **P3: Triage Pipeline** — Implement analyze.ts and respond.ts LLM calls (the core work)
3. **P4: Integration** — Wire end-to-end on full dataset
4. **P5: Tune & Test** — Create validate.ts, run against sample, iterate on prompts
5. **P6: Polish** — README, cleanup, submission prep
