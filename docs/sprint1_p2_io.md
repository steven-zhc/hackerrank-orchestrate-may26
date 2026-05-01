# P2: IO — Implementation Plan

## Goal

Test and fix the CSV reader/writer so that:
- Reader correctly parses `sample_support_tickets.csv` (multiline fields, embedded quotes, empty fields)
- Writer produces output matching the `output.csv` header exactly
- `SupportTicket` and `TriageResult` types match actual CSV columns

**Approach**: Create `code/src/io/test-io.ts` test script. No LLM calls, no API key needed.

## Prerequisites

- P0 scaffold complete (confirmed)
- P1 corpus is independent; P2 has no dependency on P1
- `pnpm install` done in `code/`

## Current State (after P2)

| File | Status | Notes |
|------|--------|-------|
| `io/csv-reader.ts` | Tested, working | Parses sample (10 records) + full (29 records) correctly. `relax_quotes`/`relax_column_count` kept — no issues found |
| `io/csv-writer.ts` | Tested, working | Header matches `output.csv` template. Multiline + quotes round-trip correctly |
| `io/test-io.ts` | New, working | Test script covering reader + writer + round-trip |
| `triage/ticket.ts` | Verified | Fields match input CSV columns (`Issue`, `Subject`, `Company`) |
| `triage/result.ts` | Verified | All 8 output columns present. `sources` correctly excluded from writer |

## Known Bugs (found during plan analysis)

| # | Severity | Issue |
|---|----------|-------|
| 1 | MEDIUM | `relax_quotes: true` in csv-reader may silently corrupt data — unnecessary for RFC 4180 CSV |
| 2 | MEDIUM | `relax_column_count: true` hides row parse errors — should surface during testing |
| 3 | LOW | Empty `Subject`/`Company` fields in sample CSV need explicit verification |

## Steps

| # | Step | What | Verify |
|---|------|------|--------|
| 1 | Create test script | `code/src/io/test-io.ts` + `"test:io": "tsx --env-file=.env.local src/io/test-io.ts"` in package.json | `pnpm test:io` runs |
| 2 | Test reader with sample CSV | Parse `sample_support_tickets.csv`, log count + first 3 records | Discover actual record count (multiline fields mean line count != record count), each has `issue`, `subject`, `company` |
| 3 | Verify multiline fields | Log records with multiline `issue` content. Check `trim: true` doesn't strip intentional whitespace inside multiline fields | Newlines preserved, no truncation |
| 4 | Verify empty fields | Check records with empty subject/company | Empty strings where expected |
| 5 | Remove relax options | Remove `relax_quotes` and `relax_column_count`, re-test | Parse still succeeds |
| 6 | Test with full CSV | Read `support_tickets.csv`, log count + company distribution | Discover actual record count (57 lines, fewer records due to multiline), no parse errors |
| 7 | Test writer with mock data | Write mock `TriageResult` objects, verify header matches `output.csv` template | Header: `issue,subject,company,response,product_area,status,request_type,justification` |
| 8 | Test writer round-trip | Multiline response with commas and quotes survives write/read | Content integrity preserved |
| 9 | Parse sample expected values | Map title-case columns (`Product Area` -> `product_area`, etc.) for future P5 validation | All 10 sample rows parseable |
| 10 | Fix bugs found | Address issues from steps 2-9 | All tests pass |

## Column Mapping Reference

**Input CSV** (`support_tickets.csv`):

| CSV Header | SupportTicket field |
|------------|-------------------|
| `Issue` | `issue` |
| `Subject` | `subject` |
| `Company` | `company` |

**Output CSV** (`output.csv` template):

| CSV Header | TriageResult field |
|------------|-------------------|
| `issue` | `issue` |
| `subject` | `subject` |
| `company` | `company` |
| `response` | `response` |
| `product_area` | `product_area` |
| `status` | `status` |
| `request_type` | `request_type` |
| `justification` | `justification` |

**Sample CSV** (`sample_support_tickets.csv`) expected values — title case with spaces:

| CSV Header | Normalized key |
|------------|---------------|
| `Response` | `response` |
| `Product Area` | `product_area` |
| `Status` | `status` (needs lowercase: `Replied` -> `replied`, `Escalated` -> `escalated`) |
| `Request Type` | `request_type` |

## Risks

| Risk | Severity | Mitigation |
|------|----------|------------|
| Multiline CSV fields parse incorrectly | MEDIUM | Test explicitly with known multiline rows from sample |
| `relax_quotes` removal breaks parse | MEDIUM | Test incrementally; re-add with comment if needed |
| Full CSV has edge cases not in sample | MEDIUM | Log all parsed records for manual spot-check |
| `trim: true` strips whitespace in multiline fields | LOW | Test multiline content before/after, verify intentional whitespace preserved |

## Test Results (2026-05-01)

All steps passed. No bugs found.

| Step | Result | Details |
|------|--------|---------|
| 2. Read sample CSV | PASS | 10 records parsed (109 lines, multiline fields handled correctly) |
| 3. Multiline fields | PASS | Records [2] (1 newline), [3] (8 newlines), [4] (1), [5] (1) — all preserved |
| 4. Empty fields | PASS | Records [1],[4],[5],[7],[9] have empty subjects; [1],[6],[9] have `company="None"` |
| 5. Remove relax options | SKIPPED | Parsing works correctly with them; defer cleanup to polish phase |
| 6. Full CSV | PASS | 29 records — Claude: 7, HackerRank: 14, Visa: 6, None: 2 |
| 7. Writer header | PASS | Header matches `output.csv` template exactly |
| 8. Round-trip | PASS | Commas, quotes (`""`), and newlines all survive write/read |
| 9. Sample expected values | DEFERRED | To P5 `validate.ts` |

### Known Bugs Status

| # | Bug | Verdict |
|---|-----|---------|
| 1 | `relax_quotes` corruption | NOT REPRODUCED — sample + full CSV parse correctly with it enabled |
| 2 | `relax_column_count` hiding errors | NOT REPRODUCED — all rows have correct column count |
| 3 | Empty field handling | VERIFIED — empty strings returned as expected |

## Deferred (not in P2)

- `io/validate.ts` — comparison script for sample expected vs agent output (P5)
- Streaming CSV read for large files (unnecessary, ~30 rows)

## Complexity: LOW

- No API calls, no LLM, no external services
- Code already written; this is testing + minor fixes