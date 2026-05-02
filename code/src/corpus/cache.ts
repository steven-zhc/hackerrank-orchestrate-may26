import * as crypto from "node:crypto"
import * as fs from "node:fs/promises"
import * as path from "node:path"
import { Effect } from "effect"
import type { CorpusDocument } from "./document.js"

export class CacheError extends Error {
  readonly _tag = "CacheError" as const
}

interface CacheFile {
  readonly version: 1
  readonly hash: string
  readonly model: string
  readonly vectors: ReadonlyArray<{
    readonly content: string
    readonly embedding: ReadonlyArray<number>
    readonly metadata: {
      readonly source: string
      readonly company: string
      readonly category: string
    }
  }>
}

export const computeCorpusHash = (docs: ReadonlyArray<CorpusDocument>): string => {
  const sorted = [...docs].sort((a, b) => a.source.localeCompare(b.source))
  const content = sorted.map((d) => d.source + d.content).join("")
  return crypto.createHash("sha256").update(content).digest("hex")
}

export const loadCache = (
  cacheDir: string,
  expectedHash: string,
): Effect.Effect<CacheFile | null, CacheError> =>
  Effect.tryPromise({
    try: async () => {
      const cachePath = path.join(cacheDir, "corpus-cache.json")
      const raw = await fs.readFile(cachePath, "utf-8").catch(() => null)
      if (!raw) return null
      const parsed = JSON.parse(raw) as CacheFile
      if (parsed.version !== 1 || parsed.hash !== expectedHash) return null
      return parsed
    },
    catch: (e) => new CacheError(String(e)),
  })

export const saveCache = (
  cacheDir: string,
  hash: string,
  vectors: ReadonlyArray<{
    content: string
    embedding: number[]
    metadata: { source: string; company: string; category: string }
  }>,
): Effect.Effect<void, CacheError> =>
  Effect.tryPromise({
    try: async () => {
      await fs.mkdir(cacheDir, { recursive: true })
      const cacheFile: CacheFile = {
        version: 1,
        hash,
        model: "text-embedding-3-small",
        vectors,
      }
      const cachePath = path.join(cacheDir, "corpus-cache.json")
      await fs.writeFile(cachePath, JSON.stringify(cacheFile))
    },
    catch: (e) => new CacheError(String(e)),
  })
