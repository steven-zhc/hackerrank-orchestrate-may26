import { Effect, Logger, LogLevel } from "effect"
import * as path from "node:path"
import * as fs from "node:fs/promises"
import { readCsv } from "./csv-reader.js"
import { writeCsv } from "./csv-writer.js"
import type { TriageResult } from "../triage/result.js"

const REPO_ROOT = path.resolve(process.cwd(), "..")
const SAMPLE_CSV = path.join(REPO_ROOT, "support_tickets", "sample_support_tickets.csv")
const FULL_CSV = path.join(REPO_ROOT, "support_tickets", "support_tickets.csv")
const OUTPUT_TEMPLATE = path.join(REPO_ROOT, "support_tickets", "output.csv")
const TMP_OUTPUT = path.join(REPO_ROOT, "support_tickets", "test-output-tmp.csv")

const program = Effect.gen(function* () {
  yield* Effect.logInfo("=== P2 IO Test ===")

  // --- Step 2: Test reader with sample CSV ---
  yield* Effect.logInfo("--- Step 2: Read sample CSV ---")
  const sampleTickets = yield* readCsv(SAMPLE_CSV)
  yield* Effect.logInfo(`Sample CSV: ${sampleTickets.length} records parsed`)
  for (let i = 0; i < Math.min(3, sampleTickets.length); i++) {
    const t = sampleTickets[i]!
    yield* Effect.logInfo(`  [${i}] issue=${t.issue.slice(0, 60)}... subject="${t.subject}" company="${t.company}"`)
  }

  // --- Step 3: Verify multiline fields ---
  yield* Effect.logInfo("--- Step 3: Verify multiline fields ---")
  for (let i = 0; i < sampleTickets.length; i++) {
    const t = sampleTickets[i]!
    const newlines = (t.issue.match(/\n/g) || []).length
    if (newlines > 0) {
      yield* Effect.logInfo(`  [${i}] has ${newlines} newlines in issue (length=${t.issue.length})`)
    }
  }

  // --- Step 4: Verify empty fields ---
  yield* Effect.logInfo("--- Step 4: Verify empty fields ---")
  for (let i = 0; i < sampleTickets.length; i++) {
    const t = sampleTickets[i]!
    if (t.subject === "" || t.company === "" || t.company === "None") {
      yield* Effect.logInfo(`  [${i}] subject="${t.subject}" company="${t.company}"`)
    }
  }

  // --- Step 6: Test with full CSV ---
  yield* Effect.logInfo("--- Step 6: Read full CSV ---")
  const fullTickets = yield* readCsv(FULL_CSV)
  yield* Effect.logInfo(`Full CSV: ${fullTickets.length} records parsed`)
  const companyCounts = new Map<string, number>()
  for (const t of fullTickets) {
    const c = t.company || "(empty)"
    companyCounts.set(c, (companyCounts.get(c) ?? 0) + 1)
  }
  for (const [company, count] of companyCounts) {
    yield* Effect.logInfo(`  ${company}: ${count}`)
  }

  // --- Step 7: Test writer with mock data ---
  yield* Effect.logInfo("--- Step 7: Test writer ---")
  const mockResults: TriageResult[] = [
    {
      issue: "Test issue one",
      subject: "Test Subject",
      company: "TestCo",
      response: "Here is the response.",
      product_area: "billing",
      status: "replied",
      request_type: "product_issue",
      justification: "Matched FAQ",
      sources: ["doc1.md"],
    },
    {
      issue: "Issue with commas, quotes \"and\" newlines\nin the text",
      subject: "",
      company: "None",
      response: "Response with \"quotes\" and commas, plus\nmultiline content",
      product_area: "account",
      status: "escalated",
      request_type: "bug",
      justification: "Could not resolve",
      sources: [],
    },
  ]

  yield* writeCsv(TMP_OUTPUT, mockResults)
  const written = yield* Effect.tryPromise(() => fs.readFile(TMP_OUTPUT, "utf-8"))
  const headerLine = written.split("\n")[0]!
  yield* Effect.logInfo(`Written header: ${headerLine}`)

  // Verify header matches output.csv template
  const templateContent = yield* Effect.tryPromise(() => fs.readFile(OUTPUT_TEMPLATE, "utf-8"))
  const expectedHeader = templateContent.trim()
  if (headerLine === expectedHeader) {
    yield* Effect.logInfo("Header MATCHES output.csv template")
  } else {
    yield* Effect.logError(`Header MISMATCH! Expected: "${expectedHeader}" Got: "${headerLine}"`)
  }

  // --- Step 8: Round-trip verification ---
  yield* Effect.logInfo("--- Step 8: Round-trip check ---")
  const lines = written.split("\n").filter((l) => l.length > 0)
  yield* Effect.logInfo(`Written ${lines.length - 1} data rows (plus header)`)
  yield* Effect.logInfo(`Full output:\n${written}`)

  // Cleanup temp file
  yield* Effect.tryPromise(() => fs.unlink(TMP_OUTPUT))
  yield* Effect.logInfo("Cleaned up temp output file")

  yield* Effect.logInfo("=== P2 IO Test PASSED ===")
})

const LoggerLive = Logger.minimumLogLevel(LogLevel.Info)

Effect.runPromise(
  program.pipe(Effect.provide(LoggerLive)),
).catch((error) => {
  console.error("Test failed:", error)
  process.exit(1)
})
