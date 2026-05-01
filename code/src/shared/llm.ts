import { Context, Effect, Layer } from "effect"
import { ChatOpenAI } from "@langchain/openai"
import { type BaseChatModel } from "@langchain/core/language_models/chat_models"
import { ConfigService } from "./config.js"

export class LlmError extends Error {
  readonly _tag = "LlmError" as const
}

export interface LlmServiceShape {
  readonly chatModel: BaseChatModel
}

export class LlmService extends Context.Tag("LlmService")<
  LlmService,
  LlmServiceShape
>() {}

export const LlmServiceLive = Layer.effect(
  LlmService,
  Effect.gen(function* () {
    const config = yield* ConfigService
    const chatModel = new ChatOpenAI({
      model: "gpt-4o",
      temperature: 0,
      openAIApiKey: config.openaiApiKey,
    })
    return { chatModel }
  }),
)
