/**
 * Compare agent output vs sample expected output.
 * Run: pnpm validate -- <agent-output> <sample-expected>
 * Default: pnpm validate (uses ../support_tickets/sample_output.csv vs ../support_tickets/sample_support_tickets.csv)
 */
import * as fs from "node:fs"
import { parse } from "csv-parse/sync"

const agentPath = process.argv[2] || "../support_tickets/sample_output.csv"
const samplePath = process.argv[3] || "../support_tickets/sample_support_tickets.csv"

interface Row {
  issue: string
  subject: string
  company: string
  status: string
  product_area: string
  request_type: string
  response: string
}

const readCsv = (path: string): Row[] => {
  const raw = fs.readFileSync(path, "utf-8")
  const records = parse(raw, {
    columns: true,
    skip_empty_lines: true,
    trim: true,
    relax_quotes: true,
    relax_column_count: true,
  }) as Array<Record<string, string>>

  return records.map((r) => ({
    issue: r["Issue"] ?? r["issue"] ?? "",
    subject: r["Subject"] ?? r["subject"] ?? "",
    company: (r["Company"] ?? r["company"] ?? "").trim(),
    status: (r["Status"] ?? r["status"] ?? "").trim().toLowerCase(),
    product_area: (r["Product Area"] ?? r["product_area"] ?? "").trim().toLowerCase(),
    request_type: (r["Request Type"] ?? r["request_type"] ?? "").trim().toLowerCase(),
    response: r["Response"] ?? r["response"] ?? "",
  }))
}

const agent = readCsv(agentPath)
const sample = readCsv(samplePath)

console.log(`Agent output: ${agent.length} rows from ${agentPath}`)
console.log(`Sample expected: ${sample.length} rows from ${samplePath}`)
console.log()

// Match by issue text (first 100 chars to handle truncation)
const matchKey = (issue: string) => issue.slice(0, 100).trim()

let statusMatch = 0
let typeMatch = 0
let areaMatch = 0
let matched = 0

for (const expected of sample) {
  const key = matchKey(expected.issue)
  const actual = agent.find((a) => matchKey(a.issue) === key)

  if (!actual) {
    console.log(`MISSING: ${key.slice(0, 60)}...`)
    continue
  }

  matched++
  const sOk = actual.status === expected.status
  const tOk = actual.request_type === expected.request_type
  const aOk = actual.product_area === expected.product_area

  if (sOk) statusMatch++
  if (tOk) typeMatch++
  if (aOk) areaMatch++

  const mark = (ok: boolean) => ok ? "OK" : "MISS"
  if (!sOk || !tOk || !aOk) {
    console.log(`--- Ticket: ${expected.subject || expected.issue.slice(0, 50)}`)
    console.log(`  status:       ${mark(sOk).padEnd(6)} expected=${expected.status} got=${actual.status}`)
    console.log(`  request_type: ${mark(tOk).padEnd(6)} expected=${expected.request_type} got=${actual.request_type}`)
    console.log(`  product_area: ${mark(aOk).padEnd(6)} expected=${expected.product_area} got=${actual.product_area}`)
    console.log()
  }
}

console.log("=== ACCURACY ===")
console.log(`Matched tickets: ${matched}/${sample.length}`)
console.log(`status:       ${statusMatch}/${matched} (${(statusMatch/matched*100).toFixed(0)}%)`)
console.log(`request_type: ${typeMatch}/${matched} (${(typeMatch/matched*100).toFixed(0)}%)`)
console.log(`product_area: ${areaMatch}/${matched} (${(areaMatch/matched*100).toFixed(0)}%)`)
console.log(`Overall:      ${((statusMatch+typeMatch+areaMatch)/(matched*3)*100).toFixed(0)}%`)
