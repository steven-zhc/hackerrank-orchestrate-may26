import { Effect, Logger, LogLevel } from "effect"
import * as fs from "node:fs/promises"
import * as path from "node:path"
import { MemoryVectorStore } from "langchain/vectorstores/memory"
import { OpenAIEmbeddings } from "@langchain/openai"
import { Document } from "@langchain/core/documents"
import { loadCorpus } from "./loader.js"

const REPO_ROOT = path.resolve(process.cwd(), "..")
const DATA_DIR = path.join(REPO_ROOT, "data")

const TEST_FILES = [
  "data/hackerrank/screen/invite-candidates/1002936098-reinviting-candidates-to-a-test.md",
  "data/claude/claude/account-management/10310342-how-do-i-log-out-of-all-active-sessions.md",
  "data/visa/support/consumer/travel-support.md",
  "data/visa/support/consumer/travel-support/exchange-rate-calculator.md",
  "data/hackerrank/hackerrank_community/account-settings/manage-account/1917106962-manage-account-faqs.md",
]

const inferCompany = (filePath: string): string => {
  const parts = filePath.split(path.sep)
  const dataIdx = parts.indexOf("data")
  return dataIdx >= 0 && dataIdx + 1 < parts.length ? parts[dataIdx + 1]! : "unknown"
}

const inferCategory = (filePath: string): string => {
  const parts = filePath.split(path.sep)
  const dataIdx = parts.indexOf("data")
  return dataIdx >= 0 && dataIdx + 2 < parts.length ? parts[dataIdx + 2]! : "general"
}

const program = Effect.gen(function* () {
  yield* Effect.logInfo("=== P1 Corpus Test ===")

  // Step 1: Load 5 hardcoded docs
  yield* Effect.logInfo("--- Step 1: Load 5 hardcoded docs ---")
  const docs: Array<{ content: string; source: string; company: string; category: string }> = []
  for (const relPath of TEST_FILES) {
    const fullPath = path.join(REPO_ROOT, relPath)
    const content = yield* Effect.tryPromise(() => fs.readFile(fullPath, "utf-8"))
    const doc = {
      content,
      source: fullPath,
      company: inferCompany(fullPath),
      category: inferCategory(fullPath),
    }
    docs.push(doc)
    yield* Effect.logInfo(`  Loaded: ${relPath}`)
    yield* Effect.logInfo(`    company=${doc.company} category=${doc.category} length=${content.length}`)
  }
  yield* Effect.logInfo(`Loaded ${docs.length} docs total`)

  // Step 2: Build MemoryVectorStore
  yield* Effect.logInfo("--- Step 2: Build index (5 docs) ---")
  const langchainDocs = docs.map(
    (d) =>
      new Document({
        pageContent: d.content,
        metadata: { source: d.source, company: d.company, category: d.category },
      }),
  )
  const embeddings = new OpenAIEmbeddings({
    model: "text-embedding-3-small",
    openAIApiKey: process.env.OPENAI_API_KEY,
  })
  const index = yield* Effect.tryPromise(() =>
    MemoryVectorStore.fromDocuments(langchainDocs, embeddings),
  )
  yield* Effect.logInfo("Index built successfully")

  // Step 3: Test retrieval
  yield* Effect.logInfo("--- Step 3: Test retrieval ---")
  const queries = [
    "how to reinvite a candidate and add extra time",
    "lost visa card what do I do",
    "how to log out of claude sessions",
  ]
  for (const query of queries) {
    const results = yield* Effect.tryPromise(() => index.similaritySearch(query, 3))
    yield* Effect.logInfo(`Query: "${query}"`)
    for (const r of results) {
      const filename = (r.metadata.source as string).split("/").slice(-1)[0]
      yield* Effect.logInfo(`  -> [${r.metadata.company}/${r.metadata.category}] ${filename} (${r.pageContent.length} chars)`)
    }
  }

  // Step 4: Test full loader (count only)
  yield* Effect.logInfo("--- Step 4: Full loader count ---")
  const allDocs = yield* loadCorpus(DATA_DIR)
  yield* Effect.logInfo(`Total corpus: ${allDocs.length} documents`)
  const companyCounts = new Map<string, number>()
  for (const d of allDocs) {
    companyCounts.set(d.company, (companyCounts.get(d.company) ?? 0) + 1)
  }
  for (const [company, count] of companyCounts) {
    yield* Effect.logInfo(`  ${company}: ${count} docs`)
  }

  yield* Effect.logInfo("=== P1 Corpus Test PASSED ===")
})

const LoggerLive = Logger.minimumLogLevel(LogLevel.Info)

Effect.runPromise(
  program.pipe(Effect.provide(LoggerLive)),
).catch((error) => {
  console.error("Test failed:", error)
  process.exit(1)
})
