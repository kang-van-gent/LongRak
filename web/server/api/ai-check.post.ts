/**
 * POST /api/ai-check — receives the user's documents from /ai-check and forwards them to
 * the n8n workflow that runs the analysis. The webhook URL and secret stay on the server.
 *
 * Until NUXT_N8N_WEBHOOK_URL is set this returns 503 { code: 'not_configured' } and the
 * page tells the user honestly that analysis isn't enabled yet.
 *
 * What this route guarantees (context.md §6, §16):
 *  - an email (required, asked before upload) — saved with the result in Strapi so that an app
 *    account with the same confirmed email can claim it later. It is NOT sent to n8n/the AI.
 *  - 1–3 files, ≤ 10 MB each, PDF/JPG/PNG only — checked by file signature, not the name
 *  - all three consents ticked (right to use the document, processing by an external AI,
 *    saving the result with the email)
 *  - a simple per-IP rate limit
 *  - the response is validated against the report contract before it reaches the browser
 *  - document contents are never logged
 *
 * Forwarded to n8n as multipart/form-data:
 *   files[]        the documents (original names and types)
 *   document_type  quotation | contract | boq | milestone_schedule | other
 *   locale         th | en  (language the report should be written in)
 *   request_id     uuid, for idempotency / tracing
 * with header X-LongRak-Secret: NUXT_N8N_WEBHOOK_SECRET.
 * n8n must respond with the AiReport JSON (shared/utils/aiReport.ts).
 */
import { createHash, randomUUID } from 'node:crypto'
import { DOCUMENT_TYPES, normalizeReport } from '#shared/utils/aiReport'

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/
const MAX_FILES = 3
const MAX_BYTES = 10 * 1024 * 1024

// --- very small in-memory rate limit (per server instance; swap for Redis when scaling) ---
const WINDOW_MS = 10 * 60 * 1000
const MAX_PER_WINDOW = 5
const hits = new Map<string, number[]>()
function rateLimited(ip: string) {
  const now = Date.now()
  const recent = (hits.get(ip) ?? []).filter((t) => now - t < WINDOW_MS)
  recent.push(now)
  hits.set(ip, recent)
  if (hits.size > 5000) hits.clear() // crude memory guard
  return recent.length > MAX_PER_WINDOW
}

/** Sniff the real type from the first bytes — never trust the filename or browser MIME. */
function sniff(data: Buffer): 'application/pdf' | 'image/png' | 'image/jpeg' | null {
  if (data.length >= 5 && data.subarray(0, 5).toString('latin1') === '%PDF-') return 'application/pdf'
  if (data.length >= 8 && data.subarray(0, 8).equals(Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]))) return 'image/png'
  if (data.length >= 3 && data[0] === 0xff && data[1] === 0xd8 && data[2] === 0xff) return 'image/jpeg'
  return null
}

function fail(statusCode: number, code: string): never {
  throw createError({ statusCode, statusMessage: code, data: { code } })
}

export default defineEventHandler(async (event) => {
  const config = useRuntimeConfig(event)

  const ip = getRequestIP(event, { xForwardedFor: true }) ?? 'unknown'
  if (rateLimited(ip)) fail(429, 'rate_limited')

  const parts = await readMultipartFormData(event)
  if (!parts) fail(400, 'no_files')

  const field = (name: string) => parts.find((p) => p.name === name && !p.filename)?.data.toString('utf8').trim()
  const email = field('email')?.toLowerCase() ?? ''
  if (!email || email.length > 254 || !EMAIL_RE.test(email)) fail(400, 'invalid_email')
  if (field('consent_rights') !== 'true' || field('consent_processing') !== 'true' || field('consent_storage') !== 'true') fail(400, 'consent_required')

  const files = parts.filter((p) => p.name === 'files' && p.filename)
  if (!files.length) fail(400, 'no_files')
  if (files.length > MAX_FILES) fail(400, 'too_many_files')

  const checked = files.map((f) => {
    if (f.data.length > MAX_BYTES) fail(413, 'file_too_large')
    const type = sniff(f.data)
    if (!type) fail(415, 'unsupported_file')
    return { name: f.filename!.slice(0, 120), type, data: f.data, sha256: createHash('sha256').update(f.data).digest('hex') }
  })

  const documentType = (DOCUMENT_TYPES as readonly string[]).includes(field('document_type') ?? '')
    ? field('document_type')!
    : 'other'
  const locale = field('locale') === 'en' ? 'en' : 'th'

  // Not wired up yet → say so (after validation, so the form's own checks are exercised)
  if (!config.n8nWebhookUrl) fail(503, 'not_configured')

  const requestId = randomUUID()
  const form = new FormData()
  for (const f of checked) form.append('files', new Blob([new Uint8Array(f.data)], { type: f.type }), f.name)
  form.append('document_type', documentType)
  form.append('locale', locale)
  form.append('request_id', requestId)
  // NOTE: the email is deliberately not sent to n8n — only the documents are

  let report: ReturnType<typeof normalizeReport> = null
  let errorCode: string | null = null
  let status = 200
  try {
    const raw = await $fetch(config.n8nWebhookUrl, {
      method: 'POST',
      body: form,
      headers: config.n8nWebhookSecret ? { 'X-LongRak-Secret': config.n8nWebhookSecret } : {},
      timeout: Number(config.n8nTimeoutMs) || 120000,
      retry: 0,
    })
    report = normalizeReport(raw)
    if (!report) {
      console.error(`[ai-check] invalid report from n8n request=${requestId}`)
      errorCode = 'invalid_report'; status = 502
    }
  }
  catch (err: unknown) {
    const e = err as { name?: string; statusCode?: number }
    // log the failure, never the document
    console.error(`[ai-check] n8n call failed request=${requestId} status=${e.statusCode ?? '-'} ${e.name ?? ''}`)
    if (e.name === 'TimeoutError' || e.name === 'AbortError') { errorCode = 'timeout'; status = 504 }
    else { errorCode = 'provider_unavailable'; status = 502 }
  }

  const result = report ? { ...report, analysis_id: report.analysis_id || requestId } : null

  // Save the check (success or failure) with the email, so the person can claim it later
  // from the project app. Saving never blocks the user from seeing their result.
  const saved = await strapiPost<{ session_public_id: string; job_public_id: string }>(event, '/longrak/ai/checks', {
    email,
    language: locale,
    document_type: documentType,
    page: refererPath(event),
    request_id: requestId,
    ip_hash: ipHash(event),
    consents: { rights: true, processing: true, storage: true },
    files: checked.map((f) => ({ sha256: f.sha256, size: f.data.length, mime: f.type })),
    outcome: result ? 'completed' : 'failed',
    error_code: errorCode,
    report: result,
  })

  if (!result) fail(status, errorCode ?? 'provider_unavailable')
  return {
    ...result,
    // the job id in our database, when saved (links the request-a-project card to this check)
    analysis_id: saved?.ok ? saved.data.job_public_id : result.analysis_id,
    saved: saved?.ok === true,
  }
})
