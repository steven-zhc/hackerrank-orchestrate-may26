import { Effect } from "effect"
import * as fs from "node:fs/promises"
import { parse } from "csv-parse/sync"
import type { SupportTicket } from "../triage/ticket.js"

export class CsvReadError extends Error {
  readonly _tag = "CsvReadError" as const
}

export const readCsv = (
  filePath: string,
): Effect.Effect<ReadonlyArray<SupportTicket>, CsvReadError> =>
  Effect.tryPromise({
    try: async () => {
      const raw = await fs.readFile(filePath, "utf-8")
      const records = parse(raw, {
        columns: true,
        skip_empty_lines: true,
        trim: true,
        relax_quotes: true,
        relax_column_count: true,
      }) as Array<Record<string, string>>

      return records.map((r) => ({
        issue: r["Issue"] ?? "",
        subject: r["Subject"] ?? "",
        company: (r["Company"] ?? "").trim(),
      }))
    },
    catch: (e) => new CsvReadError(String(e)),
  })
