import { Context, Effect, Layer, Ref } from "effect"
import type { MemoryVectorStore } from "langchain/vectorstores/memory"
import type { RetrievedContext } from "./document.js"
import { loadCorpus } from "./loader.js"
import { buildIndex } from "./indexer.js"
import { ConfigService } from "../shared/config.js"

export class CorpusError extends Error {
  readonly _tag = "CorpusError" as const
}

export interface CorpusServiceShape {
  readonly retrieve: (
    query: string,
    topK?: number,
  ) => Effect.Effect<RetrievedContext, CorpusError>
}

export class CorpusService extends Context.Tag("CorpusService")<
  CorpusService,
  CorpusServiceShape
>() {}

const initIndex = (
  dataDir: string,
  openaiApiKey: string,
): Effect.Effect<MemoryVectorStore, CorpusError> =>
  Effect.gen(function* () {
    yield* Effect.logInfo(`Loading corpus from: ${dataDir}`)
    const docs = yield* loadCorpus(dataDir)
    yield* Effect.logInfo(`Loaded ${docs.length} corpus documents`)
    yield* Effect.logInfo("Building vector index...")
    const index = yield* buildIndex(docs, openaiApiKey)
    yield* Effect.logInfo("Vector index ready")
    return index
  }).pipe(Effect.mapError((e) => new CorpusError(e.message)))

const searchIndex = (
  index: MemoryVectorStore,
  query: string,
  topK: number,
): Effect.Effect<RetrievedContext, CorpusError> =>
  Effect.tryPromise({
    try: () => index.similaritySearch(query, topK),
    catch: (e) => new CorpusError(String(e)),
  }).pipe(
    Effect.map((results) => ({
      query,
      documents: results.map((r) => ({
        content: r.pageContent,
        source: r.metadata.source as string,
        company: r.metadata.company as string,
        category: r.metadata.category as string,
      })),
    })),
  )

export const CorpusServiceLive = Layer.effect(
  CorpusService,
  Effect.gen(function* () {
    const config = yield* ConfigService
    const indexRef = yield* Ref.make<MemoryVectorStore | null>(null)

    const getOrBuildIndex = Effect.gen(function* () {
      const cached = yield* Ref.get(indexRef)
      if (cached) return cached
      const index = yield* initIndex(config.dataDir, config.openaiApiKey)
      yield* Ref.set(indexRef, index)
      return index
    })

    const retrieve = (
      query: string,
      topK = 5,
    ): Effect.Effect<RetrievedContext, CorpusError> =>
      Effect.gen(function* () {
        const index = yield* getOrBuildIndex
        return yield* searchIndex(index, query, topK)
      })

    return { retrieve }
  }),
)
