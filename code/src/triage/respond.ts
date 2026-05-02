import { Effect } from "effect"
import type { RetrievedContext } from "../corpus/document.js"
import type { SupportTicket } from "./ticket.js"
import type { Analysis } from "./schema.js"
import { LlmService, LlmError } from "../shared/llm.js"
import { buildRespondMessages } from "./prompts.js"

export const generateResponse = (
  ticket: SupportTicket,
  context: RetrievedContext,
  analysis: Analysis,
): Effect.Effect<string, LlmError, LlmService> =>
  Effect.gen(function* () {
    const llm = yield* LlmService
    const messages = buildRespondMessages(ticket, context, analysis)
    return yield* Effect.tryPromise({
      try: async () => {
        const result = await llm.chatModel.invoke(messages)
        return String(result.content)
      },
      catch: (e) => new LlmError(String(e)),
    })
  })
