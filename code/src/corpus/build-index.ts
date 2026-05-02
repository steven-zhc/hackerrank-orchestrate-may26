/**
 * Build or refresh the embeddings cache for the full corpus.
 * Run: pnpm build:index
 *
 * Deletes existing cache and rebuilds from the OpenAI API.
 * Takes ~20 minutes for 774 docs. Only needed once unless corpus changes.
 */
import { Effect, Logger, LogLevel } from "effect"
import * as fs from "node:fs/promises"
import * as path from "node:path"
import { loadCorpus } from "./loader.js"
import { buildIndexCached } from "./indexer.js"

const DATA_DIR = process.env.DATA_DIR ?? path.resolve(process.cwd(), "..", "data")
const CACHE_DIR = process.env.CACHE_DIR ?? path.resolve(process.cwd(), "..", "data", "embeddings")
const apiKey = process.env.OPENAI_API_KEY

if (!apiKey) {
  console.error("OPENAI_API_KEY not set in .env.local")
  process.exit(1)
}

const program = Effect.gen(function* () {
  // Delete existing cache to force rebuild
  const cachePath = path.join(CACHE_DIR, "corpus-cache.json")
  yield* Effect.tryPromise({
    try: () => fs.rm(cachePath, { force: true }),
    catch: () => new Error("cleanup failed"),
  }).pipe(Effect.catchAll(() => Effect.void))
  yield* Effect.logInfo("Cleared existing cache")

  yield* Effect.logInfo(`Loading corpus from: ${DATA_DIR}`)
  const docs = yield* loadCorpus(DATA_DIR)
  yield* Effect.logInfo(`Loaded ${docs.length} corpus documents`)

  yield* Effect.logInfo("Building index and saving to cache (this may take ~20 minutes)...")
  const t = Date.now()
  const store = yield* buildIndexCached(docs, apiKey, CACHE_DIR)
  const elapsed = ((Date.now() - t) / 1000).toFixed(1)
  yield* Effect.logInfo(`Index built in ${elapsed}s`)

  // Quick sanity check
  const results = yield* Effect.tryPromise({
    try: () => store.similaritySearch("how to invite candidates", 3),
    catch: (e) => new Error(String(e)),
  })
  yield* Effect.logInfo(`Sanity check: search returned ${results.length} results`)
  for (const r of results) {
    yield* Effect.logInfo(`  - ${r.metadata.source}`)
  }

  yield* Effect.logInfo("Done! Cache saved. Subsequent runs will load from cache in seconds.")
})

Effect.runPromise(
  program.pipe(Effect.provide(Logger.minimumLogLevel(LogLevel.Info))),
).catch((e) => {
  console.error("Build index failed:", e)
  process.exit(1)
})
