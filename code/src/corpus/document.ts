export interface CorpusDocument {
  readonly content: string
  readonly source: string
  readonly company: string
  readonly category: string
}

export interface RetrievedContext {
  readonly documents: ReadonlyArray<CorpusDocument>
  readonly query: string
}
