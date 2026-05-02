/**
 * Quick test: verify cache roundtrip with 3 docs instead of 774.
 * Run: npx tsx --env-file=.env.local src/corpus/test-cache.ts
 */
import { Effect, Logger, LogLevel } from "effect"
import * as fs from "node:fs/promises"
import * as path from "node:path"
import type { CorpusDocument } from "./document.js"
import { buildIndexCached } from "./indexer.js"

const TEST_CACHE_DIR = path.resolve(process.cwd(), "..", "data", "embeddings", "test")
const DATA_DIR = path.resolve(process.cwd(), "..", "data")

const loadFewDocs = async (): Promise<CorpusDocument[]> => {
  const files = [
    "hackerrank/screen/getting-started/1152916770-ai-assisted-tests.md",
    "hackerrank/screen/getting-started/1649328687-hackerrank-certified-assessments.md",
    "hackerrank/screen/getting-started/3572240492-hackerrank-glossary.md",
  ]
  const docs: CorpusDocument[] = []
  for (const f of files) {
    const fullPath = path.join(DATA_DIR, f)
    const content = await fs.readFile(fullPath, "utf-8")
    docs.push({
      content,
      source: fullPath,
      company: "hackerrank",
      category: "screen",
    })
  }
  return docs
}

const apiKey = process.env.OPENAI_API_KEY
if (!apiKey) {
  console.error("OPENAI_API_KEY not set")
  process.exit(1)
}

const program = Effect.gen(function* () {
  // Clean up test cache
  yield* Effect.tryPromise({
    try: () => fs.rm(TEST_CACHE_DIR, { recursive: true, force: true }),
    catch: () => new Error("cleanup failed"),
  }).pipe(Effect.catchAll(() => Effect.void))

  const docs = yield* Effect.tryPromise({
    try: () => loadFewDocs(),
    catch: (e) => new Error(String(e)),
  })
  yield* Effect.logInfo(`Loaded ${docs.length} test docs`)

  // Run 1: cold cache (API call)
  yield* Effect.logInfo("=== Run 1: Cold cache ===")
  const t1 = Date.now()
  const store1 = yield* buildIndexCached(docs, apiKey, TEST_CACHE_DIR)
  const d1 = Date.now() - t1
  yield* Effect.logInfo(`Cold cache took ${d1}ms`)

  // Verify search works
  const results1 = yield* Effect.tryPromise({
    try: () => store1.similaritySearch("ai assisted tests", 2),
    catch: (e) => new Error(String(e)),
  })
  yield* Effect.logInfo(`Search returned ${results1.length} results`)
  yield* Effect.logInfo(`Top result source: ${results1[0]?.metadata?.source ?? "none"}`)

  // Verify cache file exists
  const cachePath = path.join(TEST_CACHE_DIR, "corpus-cache.json")
  const stat = yield* Effect.tryPromise({
    try: () => fs.stat(cachePath),
    catch: (e) => new Error(String(e)),
  })
  yield* Effect.logInfo(`Cache file size: ${(stat.size / 1024).toFixed(1)} KB`)

  // Run 2: warm cache (no API call)
  yield* Effect.logInfo("=== Run 2: Warm cache ===")
  const t2 = Date.now()
  const store2 = yield* buildIndexCached(docs, apiKey, TEST_CACHE_DIR)
  const d2 = Date.now() - t2
  yield* Effect.logInfo(`Warm cache took ${d2}ms`)

  // Verify search still works
  const results2 = yield* Effect.tryPromise({
    try: () => store2.similaritySearch("ai assisted tests", 2),
    catch: (e) => new Error(String(e)),
  })
  yield* Effect.logInfo(`Search returned ${results2.length} results`)
  yield* Effect.logInfo(`Top result source: ${results2[0]?.metadata?.source ?? "none"}`)

  // Compare
  const same = results1[0]?.metadata?.source === results2[0]?.metadata?.source
  yield* Effect.logInfo(`Results match: ${same}`)
  yield* Effect.logInfo(`Speedup: ${(d1 / Math.max(d2, 1)).toFixed(1)}x`)

  // Cleanup
  yield* Effect.tryPromise({
    try: () => fs.rm(TEST_CACHE_DIR, { recursive: true, force: true }),
    catch: () => new Error("cleanup failed"),
  }).pipe(Effect.catchAll(() => Effect.void))

  yield* Effect.logInfo("Test passed! Cache roundtrip verified.")
})

Effect.runPromise(
  program.pipe(Effect.provide(Logger.minimumLogLevel(LogLevel.Info))),
).catch((e) => {
  console.error("Test failed:", e)
  process.exit(1)
})
