import { Effect } from "effect"
import { ChatOpenAI } from "@langchain/openai"
import type { RetrievedContext } from "../corpus/document.js"
import type { SupportTicket } from "./ticket.js"
import { AnalysisSchema, type Analysis } from "./schema.js"
import { LlmService, LlmError } from "../shared/llm.js"
import { buildAnalyzeMessages } from "./prompts.js"

export const analyzeTicket = (
  ticket: SupportTicket,
  context: RetrievedContext,
): Effect.Effect<Analysis, LlmError, LlmService> =>
  Effect.gen(function* () {
    const llm = yield* LlmService
    const messages = buildAnalyzeMessages(ticket, context)
    const structured = (llm.chatModel as ChatOpenAI).withStructuredOutput(AnalysisSchema)
    return yield* Effect.tryPromise({
      try: () => structured.invoke(messages),
      catch: (e) => new LlmError(String(e)),
    })
  })
