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
