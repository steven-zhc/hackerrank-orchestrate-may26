import { Effect } from "effect"
import { MemoryVectorStore } from "langchain/vectorstores/memory"
import { OpenAIEmbeddings } from "@langchain/openai"
import { Document } from "@langchain/core/documents"
import type { CorpusDocument } from "./document.js"

export class IndexError extends Error {
  readonly _tag = "IndexError" as const
}

export const buildIndex = (
  docs: ReadonlyArray<CorpusDocument>,
  openaiApiKey: string,
): Effect.Effect<MemoryVectorStore, IndexError> =>
  Effect.tryPromise({
    try: async () => {
      const langchainDocs = docs.map(
        (d) =>
          new Document({
            pageContent: d.content,
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
      })
      return MemoryVectorStore.fromDocuments(langchainDocs, embeddings)
    },
    catch: (e) => new IndexError(String(e)),
  })
