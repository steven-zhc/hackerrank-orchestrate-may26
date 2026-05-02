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

---

# TODO — 2026-05-01 (Phase: P3 Triage Pipeline + Cache)

## Summary
- Implemented Phase 1 (analyze.ts): structured output via `withStructuredOutput(AnalysisSchema)` with escalation taxonomy, product area enum, company inference
- Implemented Phase 2 (respond.ts): plain `chatModel.invoke()` with grounded response generation
- Created `prompts.ts`: prompt templates for both phases with context block formatting and source path normalization
- Fixed status capitalization in `result.ts`: `titleCase()` for `fromAnalysis`, `"Replied"`/`"Escalated"` literals
- Added invalid ticket branch in `pipeline.ts`: `fromResponse` with canned "out of scope" string (skips Phase 2)
- Fixed `escalation_reason` schema: `.optional()` -> `.nullable()` for OpenAI structured output API compatibility
- Implemented embeddings disk cache (`cache.ts`, `indexer.ts`): SHA-256 content hash, JSON file at `data/embeddings/corpus-cache.json`
- Added embedding truncation at 8K chars to stay under `text-embedding-3-small` 8192 token limit
- Added `batchSize: 100` to `OpenAIEmbeddings` to stay under 300K tokens per API request
- Added `DATA_DIR=../data` to `.env.local` (corpus is at repo root, not `code/data`)
- Added `CACHE_DIR` config option with default
- Added `pnpm build:index` (full corpus cache builder) and `pnpm test:cache` (3-doc roundtrip test)
- Smoke tested on 10 sample tickets: all processed correctly in ~4 min, key tickets verified (site down=Escalated, Iron Man=invalid, Thank you=invalid)
- Added decisions D27-D33 to implementation plan

## Remaining Issues
- `io/validate.ts` not yet created (planned for P5)
- No automated comparison of agent output vs sample expected output
- Product area values not post-normalized (LLM picks from prompt enum, no runtime enforcement)
- topK=5 may need tuning (some tickets might benefit from 8-10 docs)
- Response length/tone not tuned
- No `Effect.retry` on structured output failures (relies on `catchAll` -> `fromError`)

## Improvement Suggestions
- Add `Effect.retry({ times: 1 })` to `analyzeTicket` for structured output flakiness
- Tune `MAX_EMBED_CHARS` — 8K is conservative; could try 12K after measuring actual token counts
- Add product area normalization post-processing (fuzzy match to canonical enum)
- Consider parallel ticket processing once rate limits are understood
- Response quality: add few-shot examples to respond prompt

## Next Steps
1. **P4: Integration** — Wire end-to-end on full 29-ticket dataset, verify output.csv
2. **P5: Tune & Test** — Create validate.ts, compare output vs sample, iterate on prompts
3. **P6: Polish** — README in code/, determinism verification, final cleanup, submission prep

---

# TODO — 2026-05-01 (Phase: P4+P5 Integration + Validation)

## Summary
- Ran agent on full 29-ticket dataset — all completed, 0 error fallbacks, ~9 minutes
- Output distribution: 15 Escalated / 14 Replied, 22 product_issue / 4 bug / 3 invalid
- Implemented `validate.ts` — compares agent output vs sample expected output per column
- Validation results: status 80%, request_type 100%, product_area 40%, overall 73%
- Identified header format mismatch: sample uses title case with spaces, we use lowercase underscores
- Created P4+P5 merged plan doc with test results and miss analysis

## Remaining Issues
- **Product area accuracy (40%)** — LLM picks non-canonical values (`hackerrank_community`, `claude` instead of `privacy`)
- **Status edge cases (80%)** — account deletion and stolen cheques escalated when sample expects replied
- **Missing enum value**: `conversation_management` in sample but not in our canonical enum
- **Header format**: sample uses `Product Area` (title case), we output `product_area` (lowercase)
- **Visa sub-areas**: LLM defaults to `consumer` instead of `travel_support`/`general_support`
- README in `code/` not yet written

## Improvement Suggestions (Prompt Tuning)
- Add `conversation_management` to Claude product area enum in prompts.ts
- Add prompt rule: "Use exact values from the canonical list, do not prefix with ecosystem name"
- Add prompt rule: "For account deletion requests that can be answered from docs, reply instead of escalate"
- Add prompt examples for Visa sub-areas (travel_support vs consumer vs general_support)
- Consider product area post-normalization (strip ecosystem prefix, fuzzy match to enum)
- Fix header format to match sample CSV if evaluator doesn't normalize

## Next Steps
1. **Prompt tuning** — Fix product area accuracy (biggest scoring opportunity: 40% -> target 70%+)
2. **Header format fix** — Match sample CSV casing if needed
3. **P6: Polish** — README in code/, final run, submission prep
