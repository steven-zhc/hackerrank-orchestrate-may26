import { Effect } from "effect"
import * as fs from "node:fs/promises"
import * as path from "node:path"
import type { CorpusDocument } from "./document.js"

export class CorpusLoadError extends Error {
  readonly _tag = "CorpusLoadError" as const
}

const inferCompanyFromPath = (filePath: string): string => {
  const parts = filePath.split(path.sep)
  const dataIdx = parts.indexOf("data")
  if (dataIdx === -1 || dataIdx + 1 >= parts.length) return "unknown"
  return parts[dataIdx + 1]!
}

const inferCategoryFromPath = (filePath: string): string => {
  const parts = filePath.split(path.sep)
  const dataIdx = parts.indexOf("data")
  if (dataIdx === -1 || dataIdx + 2 >= parts.length) return "general"
  return parts[dataIdx + 2]!
}

const walkDir = async (dir: string): Promise<string[]> => {
  const entries = await fs.readdir(dir, { withFileTypes: true })
  const files: string[] = []
  for (const entry of entries) {
    const full = path.join(dir, entry.name)
    if (entry.isDirectory()) {
      files.push(...(await walkDir(full)))
    } else if (entry.name.endsWith(".md")) {
      files.push(full)
    }
  }
  return files
}

export const loadCorpus = (
  dataDir: string,
): Effect.Effect<ReadonlyArray<CorpusDocument>, CorpusLoadError> =>
  Effect.tryPromise({
    try: async () => {
      const files = await walkDir(dataDir)
      const docs: CorpusDocument[] = []
      for (const filePath of files) {
        const content = await fs.readFile(filePath, "utf-8")
        docs.push({
          content,
          source: filePath,
          company: inferCompanyFromPath(filePath),
          category: inferCategoryFromPath(filePath),
        })
      }
      return docs
    },
    catch: (e) => new CorpusLoadError(String(e)),
  })
