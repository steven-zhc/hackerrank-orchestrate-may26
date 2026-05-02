# P4+P5: Integration + Tune & Test — Implementation Plan

## Goal

1. **P4**: Run the agent on the full 29-ticket dataset, produce `support_tickets/output.csv`
2. **P5**: Compare output vs sample, implement `validate.ts`, tune prompts for accuracy

These phases are merged because P4 requires no code changes — `main.ts` is already wired.

## Prerequisites

- P3 complete: triage pipeline implemented and smoke-tested on 10 sample tickets
- Embeddings disk cache built (`data/embeddings/corpus-cache.json`)
- OPENAI_API_KEY set in `code/.env.local`

## Current State

All components are implemented and tested. `main.ts` is fully wired since P0.

## Header Format Issue (discovered during planning)

| Aspect | Sample CSV | Our Output |
|--------|-----------|------------|
| Header case | `Issue,Subject,Company,Response,Product Area,Status,Request Type` | `issue,subject,company,response,product_area,status,request_type,justification` |
| Columns | 7 (no Justification) | 8 (includes justification) |
| Style | Title Case, spaces | lowercase, underscores |

**Action needed**: Check if evaluator normalizes headers. If not, match the sample format. The `problem_statement.md` lists `justification` as required output, so we keep it. But header casing/spacing may need to match sample.

## Steps

### P4: Integration (run + verify)

| # | Step | What | Verify |
|---|------|------|--------|
| 1 | Run on full dataset | `npx tsx --env-file=.env.local src/main.ts ../support_tickets/support_tickets.csv ../support_tickets/output.csv` | Completes without fatal error |
| 2 | Verify row count | output.csv has 29 data rows | Count programmatically |
| 3 | Check for error results | Grep for "processing error" — should be 0 | No error fallbacks |
| 4 | Spot-check distribution | Mix of Replied/Escalated, valid product areas | Reasonable |

### P5: Tune & Test

| # | Step | What | Verify |
|---|------|------|--------|
| 5 | Implement validate.ts | Compare agent output vs sample_support_tickets.csv on the 10 overlapping tickets. Score per column: status (exact match), request_type (exact match), product_area (exact match), response (length check / keyword overlap) | Script runs and prints scores |
| 6 | Run on sample | `npx tsx --env-file=.env.local src/main.ts ../support_tickets/sample_support_tickets.csv ../support_tickets/sample_output.csv` | 10-row output |
| 7 | Run validate.ts | Compare sample_output.csv vs sample_support_tickets.csv | Per-column accuracy scores |
| 8 | Fix header format | If needed, update csv-writer.ts to match sample CSV header casing/spacing | Header matches sample |
| 9 | Iterate on prompts | Based on validate.ts results — fix misclassified tickets by adjusting prompt rules | Accuracy improves |
| 10 | Final run on full dataset | Re-run on 29 tickets with tuned prompts | Final output.csv |

## validate.ts Design

```typescript
// Compare agent output vs sample expected output
// For each of the 10 sample tickets, compare:
// - status: exact match (Replied/Escalated)
// - request_type: exact match
// - product_area: exact match (case-insensitive)
// - response: basic quality check (non-empty, reasonable length)
// - justification: non-empty check
//
// Output: per-column accuracy + per-ticket breakdown
```

Match tickets by `issue` field (exact text match between sample input and agent output).

## Risks

| Risk | Severity | Mitigation |
|------|----------|------------|
| Header format mismatch with evaluator | MEDIUM | Check sample format, update csv-writer if needed |
| Product area values don't match sample exactly | MEDIUM | Compare and add post-normalization if needed |
| Status casing mismatch | LOW | Already fixed in P3 (title-case). Verify against sample. |
| Rate limiting on 29 tickets | LOW | Sequential processing, gpt-4o has high limits |

## Complexity: MEDIUM

- P4: LOW (just run + verify)
- P5: MEDIUM (validate.ts + prompt tuning loop)
- Combined: MEDIUM

---

## Test Results

### P4: Full Dataset (29 tickets)

- **Completed**: ~9 minutes, no crashes
- **Row count**: 29/29
- **Error fallbacks**: 0
- **Status distribution**: 15 Escalated, 14 Replied
- **Request type distribution**: 22 product_issue, 4 bug, 3 invalid, 0 feature_request
- **Product areas**: all from canonical enum (some non-canonical values like `hackerrank_community`)

### P5: Validation vs Sample (10 tickets)

```
status:       8/10 (80%)
request_type: 10/10 (100%)
product_area: 4/10 (40%)
Overall:      73%
```

#### Misses Detail

| Ticket | Column | Expected | Got | Root Cause |
|--------|--------|----------|-----|------------|
| site is down | product_area | (empty) | general_help | Sample expects empty for escalated outage |
| google login delete account | status | replied | escalated | LLM treats account deletion as Account/Access escalation |
| google login delete account | product_area | community | hackerrank_community | Non-canonical value — LLM prefixes ecosystem |
| claude private info | product_area | privacy | claude | LLM picks broad category instead of specific |
| Iron Man (invalid) | product_area | conversation_management | (empty) | `conversation_management` not in our enum |
| Visa cheques stolen | status | replied | escalated | LLM treats theft as Security escalation |
| Visa cheques stolen | product_area | travel_support | consumer | LLM picks wrong Visa sub-area |
| Visa card stolen | product_area | general_support | consumer | LLM picks wrong Visa sub-area |

#### Key Findings for Prompt Tuning

1. **Product area is the main weakness (40%)** — LLM picks non-canonical or too-broad values
2. **Status has 2 edge cases (80%)** — account deletion and stolen cheques treated as escalation when sample expects reply
3. **request_type is perfect (100%)** — no tuning needed
4. **Missing enum value**: `conversation_management` appears in sample but not in our canonical enum
5. **Visa sub-areas**: LLM defaults to `consumer` instead of `travel_support`/`general_support`
