# Sprint 1 — Implementation Plan (12h)

## Final Command

```bash
cd code && pnpm install && pnpm build
# then:
hr ../support_tickets/support_tickets.csv ../support_tickets/output.csv
# or:
hr ../support_tickets/support_tickets.csv   # defaults to ./output.csv
```

## Sprint Phases

| Phase | What | Hours | Output |
|-------|------|-------|--------|
| P0: Scaffold | Init TS project, deps, tsconfig, CLI binary, Effect layers skeleton | 1.5h | `hr --help` works, compiles |
| P1: Corpus | Loader (read 774 .md files), Indexer (MemoryVectorStore), CorpusService | 2h | Can query corpus and get relevant docs |
| P2: IO | CSV reader/writer, SupportTicket/TriageResult types | 1h | Can read input CSV, write output CSV |
| P3: Triage Pipeline | Effect.ts pipeline: retrieve -> analyze (Phase 1 LLM) -> respond (Phase 2 LLM), Zod schemas, structured output | 3h | Process one ticket end-to-end |
| P4: Integration | Wire everything: CLI -> read CSV -> triage each row (with error recovery) -> write output | 1h | `hr` runs on full dataset |
| P5: Tune & Test | Run against sample_support_tickets.csv, validate.ts comparison script, tweak prompts | 2h | Reasonable accuracy, data-driven |
| P6: Polish | README in code/, determinism (temperature=0), error recovery, clean up | 1h | Submission-ready |

## Key Trade-offs for MVP

- No persistent vector DB — in-memory index rebuilt each run. 774 files is small enough.
- Sequential processing — one ticket at a time to avoid rate limits. Can parallelize later.
- Temperature 0 — deterministic outputs for reproducibility.
- Simple chunking — each .md file = one document. No fancy splitting. Enhance later if retrieval quality is poor.
- No caching — rebuild index each run. Could add file-hash cache later.
- Multi-request tickets handled holistically by LLM — no decomposition. Respond to legitimate parts, ignore adversarial parts.
- Source metadata tracked on TriageResult but not yet used for automated verification — hook for future AI Judge logic.

## Decisions Log

| # | Decision | Rationale |
|---|----------|-----------|
| D1 | Effect.ts across whole project | Team familiarity, FP style |
| D2 | ~~LangChain + LangGraph~~ LangChain only (superseded by D19) | LangChain for LLM abstraction + RAG. LangGraph dropped — flow is linear, Effect.ts handles natively. |
| D3 | In-memory MemoryVectorStore | Zero external deps, 774 files fits in memory |
| D4 | ~~Claude API (Anthropic)~~ OpenAI API (gpt-4o) (superseded) | Switched to OpenAI for both chat and embeddings. Single API key. |
| D5 | pnpm + binary `hr` cmd | User preference, clean CLI interface |
| D6 | code/src/ for source | code/ for project config (package.json, tsconfig) |
| D7 | csv-parse + csv-stringify | Minimal, well-tested CSV handling |
| D8 | One .md file = one document | Simple chunking, good enough for MVP |
| D9 | Sequential ticket processing | Avoid rate limits, simpler debugging |
| D10 | docs/*.md as decision contracts | All decisions documented, traceable for AI Judge interview |
| D11 | OpenAI `text-embedding-3-small` for embeddings | OpenAI for both chat (gpt-4o) and embeddings. Single OPENAI_API_KEY. |
| D12 | ~~Safety Gate as first graph node~~ Merged into Phase 1 Analyze (superseded by D20) | Safety detection now part of single Analyze LLM call after retrieval. More accurate with context. |
| D13 | ~~Split Classify and Route into separate nodes~~ Merged into Phase 1 Analyze (superseded by D20) | Classify + Route done in one structured output call. Orthogonal concerns preserved in Zod schema fields. |
| D14 | ~~Company Inference node~~ Merged into Phase 1 Analyze (superseded by D20, D24) | Full corpus search always. Company inferred in Analyze call. |
| D15 | Product Area as canonical enum per ecosystem | LLM maps freely, system normalises to fixed internal values |
| D16 | Escalation taxonomy with 6 categories | Billing, Account/Access, Security, Outages, Compliance, Insufficient info |
| D17 | Source traceability on TriageResult | Track corpus doc paths used to ground response. Metadata for future AI Judge verification. |
| D18 | Output CSV echoes input columns | Match existing output.csv header: issue, subject, company, response, product_area, status, request_type, justification |
| D19 | Drop LangGraph, pure Effect.ts pipeline | Flow is linear with one branch. LangGraph is for cyclic loops. Effect.ts handles this natively with full type safety. |
| D20 | Two-phase LLM (Analyze + Respond) | 1-2 calls per ticket instead of 3-4. Faster, cheaper, more accurate (LLM sees full context). |
| D21 | Zod for structured LLM output | `withStructuredOutput(zodSchema)` guarantees valid JSON from Claude. |
| D22 | ESM throughout | LangChain v0.3+ requires ESM. `"type": "module"` in package.json. |
| D23 | Error recovery per ticket | `Effect.catchAll` wraps each ticket. Failed tickets -> escalated result. Output CSV always complete. |
| D24 | Full corpus search (no company filter) | 774 docs is fast in memory. Company filtering is premature optimization that reduces recall. |
| D25 | validate.ts comparison script | Data-driven tuning: compare agent output vs sample expected output, score per column. |
| D26 | tsx direct binary, no compile step | `pnpm build` = `tsc --noEmit` (type check). `hr` binary uses tsx shebang. Zero build overhead. |
| D27 | `prompts.ts` as pure template module | No Effect wrapping — prompt construction is side-effect-free. Returns `BaseMessage[]`. |
| D28 | Status title-casing in `result.ts` factory methods | Sample CSV uses `Replied`/`Escalated` (title-case). Problem statement says lowercase. We follow sample as ground truth. |
| D29 | Invalid tickets: canned response via `fromResponse` | `fromAnalysis` fallback says "Escalated to human agent" which contradicts `status: Replied`. Use `fromResponse` with canned string. |
| D30 | `as ChatOpenAI` local cast in `analyze.ts` | `BaseChatModel` lacks Zod-typed `withStructuredOutput` overload. Cast locally, keep `LlmServiceShape` generic. |
| D31 | Embeddings disk cache (JSON + SHA-256) | Single JSON file at `data/embeddings/corpus-cache.json`. SHA-256 content hash for auto-invalidation. Zero new deps. |
| D32 | Embedding truncation at 8K chars | `text-embedding-3-small` has 8192 token limit. 8K chars (~2-4K tokens) guarantees no overflow. Full content still used in LLM context. |
| D33 | `escalation_reason` uses `.nullable()` not `.optional()` | OpenAI structured output API requires `.nullable()` for optional fields in Zod schemas. |
