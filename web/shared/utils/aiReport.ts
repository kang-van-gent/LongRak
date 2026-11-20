/**
 * AI Document Risk Report — the contract between the n8n workflow and the website
 * (context.md §10). Used by the server route (to validate what n8n returns) and by
 * the /ai-check page (to render it). Anything outside this shape is dropped.
 */

export const FINDING_STATUSES = [
  'needs_attention', // ต้องทบทวน
  'missing_information', // ข้อมูลไม่พอ
  'present_in_document', // พบข้อมูลตามเกณฑ์ (not a certification)
  'not_applicable',
  'unable_to_assess',
] as const
export type FindingStatus = (typeof FINDING_STATUSES)[number]

/** Finding categories — same list as the database (analysis_findings.dimension, longrak-database-er-strapi.md §6.1) */
export const FINDING_DIMENSIONS = [
  'parties', 'scope', 'materials', 'money', 'deposit', 'milestones', 'dates', 'acceptance',
  'change_control', 'warranty', 'cancellation', 'evidence', 'signature', 'other',
] as const
export type FindingDimension = (typeof FINDING_DIMENSIONS)[number]

export const READ_STATUSES = ['complete', 'partial', 'unreadable'] as const
export type ReadStatus = (typeof READ_STATUSES)[number]

export const DOCUMENT_TYPES = ['quotation', 'contract', 'boq', 'milestone_schedule', 'other'] as const
export type DocumentType = (typeof DOCUMENT_TYPES)[number]

export interface DocumentEvidence {
  document_id?: string
  page?: number
  quote: string
}

export interface KnowledgeCitation {
  source_id: string
  section?: string
  url?: string
}

export interface Finding {
  id: string
  dimension: FindingDimension
  status: FindingStatus
  title: string
  reason?: string
  document_evidence: DocumentEvidence[]
  knowledge_citations: KnowledgeCitation[]
  question_to_ask?: string
  suggested_action?: string
  needs_professional_review: boolean
}

export interface Amounts {
  contract_total_thb?: number
  listed_milestones_total_thb?: number
  advance_thb?: number
  /** recomputed here from advance / total — never taken from the model */
  advance_ratio?: number
  /** recomputed here: milestones total === contract total */
  arithmetic_verified?: boolean
}

export interface AiReport {
  schema_version: string
  analysis_id: string
  document_type: DocumentType
  document_read_status: ReadStatus
  summary: string
  amounts: Amounts
  findings: Finding[]
  missing_information: string[]
  limitations: string[]
  created_at?: string
  /** true for the precomputed sample — never for a real analysis */
  is_sample?: boolean
  /** true when produced by the SYNTHETIC mock AI (AI_PROVIDER=mock): fixed test data, not an analysis of the file */
  synthetic?: boolean
  /** set by /api/ai-check: whether the check was saved with the user's email (claimable later) */
  saved?: boolean
}

// ---------------------------------------------------------------------------
// Validation / normalisation (defensive: the model's output is untrusted)
// ---------------------------------------------------------------------------

const str = (v: unknown, max = 600): string | undefined =>
  typeof v === 'string' && v.trim() ? v.trim().slice(0, max) : undefined

const num = (v: unknown): number | undefined =>
  typeof v === 'number' && Number.isFinite(v) && v >= 0 ? v : undefined

const httpUrl = (v: unknown): string | undefined => {
  const s = str(v, 500)
  if (!s) return undefined
  try {
    const u = new URL(s)
    return u.protocol === 'https:' || u.protocol === 'http:' ? u.toString() : undefined
  }
  catch {
    return undefined
  }
}

const arr = (v: unknown): unknown[] => (Array.isArray(v) ? v : [])
const obj = (v: unknown): Record<string, unknown> =>
  v && typeof v === 'object' && !Array.isArray(v) ? (v as Record<string, unknown>) : {}

function oneOf<T extends readonly string[]>(list: T, v: unknown, fallback: T[number]): T[number] {
  return typeof v === 'string' && (list as readonly string[]).includes(v) ? (v as T[number]) : fallback
}

/** Returns a clean report, or null if the payload is not a usable report at all. */
export function normalizeReport(raw: unknown): AiReport | null {
  const r = obj(raw)
  const findingsRaw = arr(r.findings)
  if (!findingsRaw.length && !str(r.summary)) return null

  const findings: Finding[] = []
  findingsRaw.slice(0, 40).forEach((f, i) => {
    const o = obj(f)
    const title = str(o.title, 200)
    // unknown status → the finding is dropped rather than guessed
    if (!title || typeof o.status !== 'string' || !(FINDING_STATUSES as readonly string[]).includes(o.status)) return
    findings.push({
      id: str(o.id, 40) ?? `F${String(i + 1).padStart(3, '0')}`,
      dimension: oneOf(FINDING_DIMENSIONS, o.dimension, 'other'),
      status: o.status as FindingStatus,
      title,
      reason: str(o.reason),
      document_evidence: arr(o.document_evidence)
        .map((e): DocumentEvidence | null => {
          const eo = obj(e)
          const quote = str(eo.quote, 400)
          return quote ? { document_id: str(eo.document_id, 60), page: num(eo.page), quote } : null
        })
        .filter((e): e is DocumentEvidence => !!e)
        .slice(0, 5),
      knowledge_citations: arr(o.knowledge_citations)
        .map((c): KnowledgeCitation | null => {
          const co = obj(c)
          const source_id = str(co.source_id, 100)
          return source_id ? { source_id, section: str(co.section, 200), url: httpUrl(co.url) } : null
        })
        .filter((c): c is KnowledgeCitation => !!c)
        .slice(0, 5),
      question_to_ask: str(o.question_to_ask),
      suggested_action: str(o.suggested_action),
      needs_professional_review: o.needs_professional_review === true,
    })
  })

  // Arithmetic is checked in code, never trusted from the model (context.md §10)
  const a = obj(r.amounts)
  const total = num(a.contract_total_thb)
  const listed = num(a.listed_milestones_total_thb)
  const advance = num(a.advance_thb)
  const amounts: Amounts = {
    contract_total_thb: total,
    listed_milestones_total_thb: listed,
    advance_thb: advance,
    advance_ratio: total && advance !== undefined ? Math.round((advance / total) * 1000) / 1000 : undefined,
    arithmetic_verified: total !== undefined && listed !== undefined ? Math.abs(total - listed) < 0.5 : undefined,
  }

  return {
    schema_version: str(r.schema_version, 10) ?? '1.0',
    analysis_id: str(r.analysis_id, 80) ?? '',
    document_type: oneOf(DOCUMENT_TYPES, r.document_type, 'other'),
    document_read_status: oneOf(READ_STATUSES, r.document_read_status, 'partial'),
    summary: str(r.summary, 1000) ?? '',
    amounts,
    findings,
    missing_information: arr(r.missing_information).map((m) => str(m, 200)).filter((m): m is string => !!m).slice(0, 20),
    limitations: arr(r.limitations).map((m) => str(m, 300)).filter((m): m is string => !!m).slice(0, 10),
    created_at: str(r.created_at, 40),
    is_sample: false,
    synthetic: r.synthetic === true,
  }
}
