import { Effect } from "effect"
import type { RetrievedContext } from "../corpus/document.js"
import type { SupportTicket } from "./ticket.js"
import type { Analysis } from "./schema.js"
import { LlmService, LlmError } from "../shared/llm.js"

export const analyzeTicket = (
  ticket: SupportTicket,
  _context: RetrievedContext,
): Effect.Effect<Analysis, LlmError, LlmService> =>
  Effect.gen(function* () {
    const _llm = yield* LlmService
    // TODO: implement Phase 1 LLM call with structured output
    return yield* Effect.die("analyzeTicket not implemented")
  })
