import { Effect } from "effect"
import { MemoryVectorStore } from "langchain/vectorstores/memory"
import { OpenAIEmbeddings } from "@langchain/openai"
import { Document } from "@langchain/core/documents"
import type { CorpusDocument } from "./document.js"
import { computeCorpusHash, loadCache, saveCache } from "./cache.js"

export class IndexError extends Error {
  readonly _tag = "IndexError" as const
}

// Conservative: 8K chars ≈ 2-4K tokens — guarantees staying under text-embedding-3-small's 8192 token limit
const MAX_EMBED_CHARS = 8_000

export const buildIndex = (
  docs: ReadonlyArray<CorpusDocument>,
  openaiApiKey: string,
): Effect.Effect<MemoryVectorStore, IndexError> =>
  Effect.tryPromise({
    try: async () => {
      const langchainDocs = docs.map(
        (d) =>
          new Document({
            pageContent: d.content.slice(0, MAX_EMBED_CHARS),
            metadata: {
              source: d.source,
              company: d.company,
              category: d.category,
            },
          }),
      )
      const embeddings = new OpenAIEmbeddings({
        model: "text-embedding-3-small",
        openAIApiKey: openaiApiKey,
        batchSize: 100,
      })
      return MemoryVectorStore.fromDocuments(langchainDocs, embeddings)
    },
    catch: (e) => new IndexError(String(e)),
  })

export const buildIndexCached = (
  docs: ReadonlyArray<CorpusDocument>,
  openaiApiKey: string,
  cacheDir: string,
): Effect.Effect<MemoryVectorStore, IndexError> =>
  Effect.gen(function* () {
    const hash = computeCorpusHash(docs)
    const embeddings = new OpenAIEmbeddings({
      model: "text-embedding-3-small",
      openAIApiKey: openaiApiKey,
      batchSize: 100,
    })

    const cached = yield* loadCache(cacheDir, hash).pipe(
      Effect.catchAll(() => Effect.succeed(null)),
    )

    if (cached) {
      yield* Effect.logInfo(`Loaded index from disk cache (${cached.vectors.length} vectors)`)
      const store = new MemoryVectorStore(embeddings)
      const vectors = cached.vectors.map((v) => [...v.embedding])
      const langchainDocs = cached.vectors.map(
        (v) =>
          new Document({
            pageContent: v.content,
            metadata: v.metadata,
          }),
      )
      yield* Effect.tryPromise({
        try: () => store.addVectors(vectors, langchainDocs),
        catch: (e) => new IndexError(String(e)),
      })
      return store
    }

    yield* Effect.logInfo("Cache miss — building index from API...")
    const store = yield* buildIndex(docs, openaiApiKey)

    const memVectors = (store as unknown as { memoryVectors: Array<{ content: string; embedding: number[]; metadata: Record<string, unknown> }> }).memoryVectors
    const toCache = memVectors.map((v) => ({
      content: v.content,
      embedding: v.embedding,
      metadata: {
        source: v.metadata.source as string,
        company: v.metadata.company as string,
        category: v.metadata.category as string,
      },
    }))

    yield* saveCache(cacheDir, hash, toCache).pipe(
      Effect.tap(() => Effect.logInfo(`Saved index cache (${toCache.length} vectors)`)),
      Effect.catchAll((e) => Effect.logWarning(`Failed to save cache: ${e.message}`)),
    )

    return store
  })
