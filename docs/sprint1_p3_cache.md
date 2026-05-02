# P3 Addendum: Embeddings Disk Cache

## Problem

The corpus indexer (`indexer.ts`) embeds 774 markdown files via OpenAI `text-embedding-3-small` on every run. This takes 20+ minutes and costs real API credits. The in-memory `Ref` cache in `service.ts` only persists within a single run — it doesn't help across runs.

## Approach: Single JSON Cache File

Compute a SHA-256 hash of the corpus content. On startup, check if a cache file exists with a matching hash. If yes, hydrate `MemoryVectorStore` from cached vectors (1-3 seconds). If no, embed from API and save.

## Option Analysis

| Option | Pros | Cons | Verdict |
|--------|------|------|---------|
| **A. JSON file cache** | Zero new deps, trivial to implement, easy to debug | Large file (~150MB), slow parse for huge corpora | **Winner** — simplest, good enough for 774 docs |
| B. SQLite | Efficient storage, partial updates | New native dep, compile issues, overkill | Too complex |
| C. FAISS/HNSWlib | Built-in save/load | Native bindings, install pain | Risky in hackathon |
| D. Per-file cache | Fine-grained invalidation | 774 small files, slower to load | Over-engineered |

## Cache File Format

```typescript
interface CacheFile {
  version: 1
  hash: string                // SHA-256 of sorted (source + content)
  model: string               // "text-embedding-3-small"
  vectors: Array<{
    content: string
    embedding: number[]        // 1536 floats
    metadata: {
      source: string
      company: string
      category: string
    }
  }>
}
```

Location: `data/embeddings/corpus-cache.json` (already gitignored).

## How Hydration Works

- `MemoryVectorStore` has public `memoryVectors` array and `addVectors()` method
- On cache hit: create `new MemoryVectorStore(embeddings)` then call `store.addVectors(vectors, docs)` — no API call for document embeddings
- `OpenAIEmbeddings` instance still needed for query-time embedding (1 cheap call per search)

## Cache Invalidation

SHA-256 hash of all `(source, content)` pairs, sorted by source for determinism. Any file add/edit/delete changes the hash and triggers automatic rebuild.

```typescript
const computeCorpusHash = (docs: ReadonlyArray<CorpusDocument>): string => {
  const sorted = [...docs].sort((a, b) => a.source.localeCompare(b.source))
  const content = sorted.map(d => d.source + d.content).join("")
  return crypto.createHash("sha256").update(content).digest("hex")
}
```

## File Changes

| File | Change |
|------|--------|
| `corpus/cache.ts` | **NEW** — `loadCache`, `saveCache`, `computeCorpusHash` |
| `corpus/indexer.ts` | Add `buildIndexCached` wrapping `buildIndex` with cache read/write |
| `corpus/service.ts` | Call `buildIndexCached` instead of `buildIndex` |
| `shared/config.ts` | Add optional `CACHE_DIR` env var (default `../data/embeddings`) |

## Steps

| # | Step | What | Verify |
|---|------|------|--------|
| 1 | Create cache.ts | `computeCorpusHash()`, `loadCache()`, `saveCache()`. Use `node:crypto` and `node:fs/promises`. | `pnpm build` passes |
| 2 | Add buildIndexCached to indexer.ts | Wraps `buildIndex`: check cache -> hit? hydrate : miss? build + save. Read `store.memoryVectors` after build to extract vectors for saving. | `pnpm build` passes |
| 3 | Update config.ts | Add `CACHE_DIR` with default `path.resolve(process.cwd(), "..", "data", "embeddings")` | `pnpm build` passes |
| 4 | Wire in service.ts | Change `initIndex` to call `buildIndexCached` with `config.cacheDir` | `pnpm build` passes |
| 5 | Test cold cache | Run agent, observe ~20 min build, check `data/embeddings/corpus-cache.json` created | Cache file exists |
| 6 | Test warm cache | Run agent again, observe 1-5 second index load | Log says "Loaded index from disk cache" |

## Risks

| Risk | Severity | Mitigation |
|------|----------|------------|
| Large JSON file (~150MB) | LOW | `JSON.parse` handles this in 1-3s on modern hardware |
| `memoryVectors` API stability | LOW | Public API in LangChain, verified in source |
| Stale cache | LOW | SHA-256 on full content; delete `data/embeddings/` as escape hatch |
| Disk space | LOW | ~150MB is fine for local dev |

## Complexity: LOW

- 1 new file, 3 small edits
- No new dependencies
- Standard Node.js crypto + fs
