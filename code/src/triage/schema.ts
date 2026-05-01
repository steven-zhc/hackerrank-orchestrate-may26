import { z } from "zod"

export const AnalysisSchema = z.object({
  is_valid: z.boolean().describe("false if adversarial, irrelevant, or out-of-scope"),
  company: z.string().describe("Inferred company: HackerRank, Claude, Visa, or None"),
  request_type: z.enum(["product_issue", "feature_request", "bug", "invalid"]),
  product_area: z.string().describe("Canonical product area from the enum, or empty"),
  status: z.enum(["replied", "escalated"]),
  escalation_reason: z.string().optional().describe("Why escalated, if applicable"),
  justification: z.string().describe("Concise explanation of the decision, referencing sources"),
  relevant_sources: z.array(z.string()).describe("Corpus document paths used"),
})

export type Analysis = z.infer<typeof AnalysisSchema>

export const ResponseSchema = z.object({
  response: z.string().describe("User-facing answer grounded in the corpus, citing sources"),
})

export type ResponseOutput = z.infer<typeof ResponseSchema>
