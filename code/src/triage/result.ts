import type { SupportTicket } from "./ticket.js"
import type { Analysis } from "./schema.js"

export interface TriageResult {
  readonly issue: string
  readonly subject: string
  readonly company: string
  readonly status: string
  readonly product_area: string
  readonly response: string
  readonly justification: string
  readonly request_type: string
  readonly sources: ReadonlyArray<string>
}

export const TriageResult = {
  fromAnalysis: (ticket: SupportTicket, analysis: Analysis): TriageResult => ({
    issue: ticket.issue,
    subject: ticket.subject,
    company: analysis.company || ticket.company,
    status: analysis.status,
    product_area: analysis.product_area,
    response: analysis.escalation_reason ?? "Escalated to human agent.",
    justification: analysis.justification,
    request_type: analysis.request_type,
    sources: analysis.relevant_sources,
  }),

  fromResponse: (
    ticket: SupportTicket,
    analysis: Analysis,
    response: string,
  ): TriageResult => ({
    issue: ticket.issue,
    subject: ticket.subject,
    company: analysis.company || ticket.company,
    status: "replied",
    product_area: analysis.product_area,
    response,
    justification: analysis.justification,
    request_type: analysis.request_type,
    sources: analysis.relevant_sources,
  }),

  fromError: (ticket: SupportTicket, error: unknown): TriageResult => ({
    issue: ticket.issue,
    subject: ticket.subject,
    company: ticket.company,
    status: "escalated",
    product_area: "",
    response: "Escalated to human agent due to processing error.",
    justification: `Error: ${error instanceof Error ? error.message : String(error)}`,
    request_type: "product_issue",
    sources: [],
  }),
}
