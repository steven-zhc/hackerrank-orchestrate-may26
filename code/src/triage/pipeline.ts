import { Effect } from "effect"
import type { SupportTicket } from "./ticket.js"
import { TriageResult } from "./result.js"
import { analyzeTicket } from "./analyze.js"
import { generateResponse } from "./respond.js"
import { CorpusService, CorpusError } from "../corpus/service.js"
import { LlmError } from "../shared/llm.js"
import type { LlmService } from "../shared/llm.js"

export const triageTicket = (
  ticket: SupportTicket,
): Effect.Effect<TriageResult, CorpusError | LlmError, CorpusService | LlmService> =>
  Effect.gen(function* () {
    const corpus = yield* CorpusService
    const context = yield* corpus.retrieve(ticket.issue)
    const analysis = yield* analyzeTicket(ticket, context)

    if (analysis.status !== "replied") {
      return TriageResult.fromAnalysis(ticket, analysis)
    }

    const response = yield* generateResponse(ticket, context, analysis)
    return TriageResult.fromResponse(ticket, analysis, response)
  })
