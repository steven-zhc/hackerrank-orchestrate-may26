import { Effect, Layer, Logger, LogLevel } from "effect"
import { parseCliArgs } from "./io/cli.js"
import { readCsv } from "./io/csv-reader.js"
import { writeCsv } from "./io/csv-writer.js"
import { ConfigServiceLive } from "./shared/config.js"
import { LlmServiceLive } from "./shared/llm.js"
import { CorpusServiceLive } from "./corpus/service.js"
import { TriageService, TriageServiceLive } from "./triage/service.js"

const cliArgs = parseCliArgs(process.argv)
if (!cliArgs) {
  process.exit(0)
}

const { inputFile, outputFile } = cliArgs

const program = Effect.gen(function* () {
  const triageService = yield* TriageService

  yield* Effect.logInfo(`Reading tickets from: ${inputFile}`)
  const tickets = yield* readCsv(inputFile)
  yield* Effect.logInfo(`Loaded ${tickets.length} tickets`)

  yield* Effect.logInfo("Processing tickets...")
  const results = yield* Effect.forEach(
    tickets,
    (ticket, idx) =>
      Effect.gen(function* () {
        yield* Effect.logInfo(`[${idx + 1}/${tickets.length}] ${ticket.subject || ticket.issue.slice(0, 60)}...`)
        return yield* triageService.triage(ticket)
      }),
    { concurrency: 1 },
  )

  yield* Effect.logInfo(`Writing results to: ${outputFile}`)
  yield* writeCsv(outputFile, results)
  yield* Effect.logInfo("Done.")
})

const MainLive = TriageServiceLive.pipe(
  Layer.provideMerge(CorpusServiceLive),
  Layer.provideMerge(LlmServiceLive),
  Layer.provideMerge(ConfigServiceLive),
)

const LoggerLive = Logger.minimumLogLevel(LogLevel.Info)

Effect.runPromise(
  program.pipe(
    Effect.provide(MainLive),
    Effect.provide(LoggerLive),
  ),
).catch((error) => {
  console.error("Fatal error:", error)
  process.exit(1)
})
