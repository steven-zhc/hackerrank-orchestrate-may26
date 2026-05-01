import { Context, Effect, Layer } from "effect"
import type { SupportTicket } from "./ticket.js"
import { TriageResult } from "./result.js"
import { triageTicket } from "./pipeline.js"
import { CorpusService } from "../corpus/service.js"
import { LlmService } from "../shared/llm.js"

export interface TriageServiceShape {
  readonly triage: (
    ticket: SupportTicket,
  ) => Effect.Effect<TriageResult, never>
}

export class TriageService extends Context.Tag("TriageService")<
  TriageService,
  TriageServiceShape
>() {}

export const TriageServiceLive = Layer.effect(
  TriageService,
  Effect.gen(function* () {
    const corpus = yield* CorpusService
    const llm = yield* LlmService

    const triage = (
      ticket: SupportTicket,
    ): Effect.Effect<TriageResult, never> =>
      triageTicket(ticket).pipe(
        Effect.provideService(CorpusService, corpus),
        Effect.provideService(LlmService, llm),
        Effect.catchAll((error) =>
          Effect.succeed(TriageResult.fromError(ticket, error)),
        ),
      )

    return { triage }
  }),
)
