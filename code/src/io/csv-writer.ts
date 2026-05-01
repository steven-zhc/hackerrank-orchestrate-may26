import { Effect } from "effect"
import * as fs from "node:fs/promises"
import { stringify } from "csv-stringify/sync"
import type { TriageResult } from "../triage/result.js"

export class CsvWriteError extends Error {
  readonly _tag = "CsvWriteError" as const
}

export const writeCsv = (
  filePath: string,
  results: ReadonlyArray<TriageResult>,
): Effect.Effect<void, CsvWriteError> =>
  Effect.tryPromise({
    try: async () => {
      const rows = results.map((r) => ({
        issue: r.issue,
        subject: r.subject,
        company: r.company,
        response: r.response,
        product_area: r.product_area,
        status: r.status,
        request_type: r.request_type,
        justification: r.justification,
      }))

      const csv = stringify(rows, {
        header: true,
        columns: [
          "issue",
          "subject",
          "company",
          "response",
          "product_area",
          "status",
          "request_type",
          "justification",
        ],
      })

      await fs.writeFile(filePath, csv, "utf-8")
    },
    catch: (e) => new CsvWriteError(String(e)),
  })
