/**
 * POST /api/ai-check — start an AI document check (LR-W0-01, asynchronous).
 *
 * Browser → here (multipart) → Strapi:
 *   1. POST /api/longrak/ai/sessions               email + 3 consents  → session + secret
 *   2. POST /api/longrak/ai/sessions/:id/files     each file (checked, stored privately)
 *   3. POST /api/longrak/ai/jobs                   → 202 job (Strapi's outbox then wakes n8n)
 * Answers 202 { job_public_id, processing_state }. The page then polls
 * GET /api/ai-check/jobs/:id and fetches /report when it is completed.
 *
 * The session secret stays in an httpOnly cookie (server/utils/aiJobs.ts).
 * The email goes to Strapi only; n8n/the AI never receive it.
 * Strapi not configured ⇒ 503 { code: 'not_configured' }: nothing was sent anywhere.
 */
import { randomUUID } from 'node:crypto'
import { DOCUMENT_TYPES } from '#shared/utils/aiReport'

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/
const MAX_FILES = 3
const MAX_BYTES = 15 * 1024 * 1024

function fail(statusCode: number, code: string): never {
  throw createError({ statusCode, statusMessage: code, data: { code } })
}

/** Strapi's FILE_REJECTED reasons and other results → the page's error codes */
function pageCode(body: Record<string, unknown>): string {
  const result = String(body.result ?? '')
  const reason = String(body.reason ?? '')
  if (result === 'FILE_REJECTED') {
    return ({
      file_count: 'too_many_files', file_too_large: 'file_too_large', unsupported_type: 'unsupported_file',
      unreadable_pdf: 'unreadable_pdf', encrypted_pdf: 'encrypted_pdf', page_limit: 'page_limit', page_count_unknown: 'unreadable_pdf',
    } as Record<string, string>)[reason] ?? 'unsupported_file'
  }
  if (result === 'quota_exceeded') return 'quota_exceeded'
  if (result === 'rate_limited') return 'rate_limited'
  if (result === 'consent_required') return 'consent_required'
  if (result === 'invalid_email') return 'invalid_email'
  return 'provider_unavailable'
}

export default defineEventHandler(async (event) => {
  const parts = await readMultipartFormData(event)
  if (!parts) fail(400, 'no_files')
  const field = (name: string) => parts.find((p) => p.name === name && !p.filename)?.data.toString('utf8').trim()

  const email = field('email')?.toLowerCase() ?? ''
  if (!email || email.length > 254 || !EMAIL_RE.test(email)) fail(400, 'invalid_email')
  if (field('consent_rights') !== 'true' || field('consent_processing') !== 'true' || field('consent_storage') !== 'true') fail(400, 'consent_required')
  const files = parts.filter((p) => p.name === 'files' && p.filename)
  if (!files.length) fail(400, 'no_files')
  if (files.length > MAX_FILES) fail(400, 'too_many_files')
  if (files.some((f) => f.data.length > MAX_BYTES)) fail(413, 'file_too_large')
  const documentType = (DOCUMENT_TYPES as readonly string[]).includes(field('document_type') ?? '') ? field('document_type')! : 'other'
  const locale = field('locale') === 'en' ? 'en' : 'th'

  // 1) session
  const session = await strapiCall<{ session_public_id: string; session_secret: string; expires_at: string }>(event, '/longrak/ai/sessions', {
    method: 'POST',
    body: { email, language: locale, consents: { rights: true, processing: true, storage: true }, ip_hash: ipHash(event), page: refererPath(event) },
  })
  if (session === null) fail(503, 'not_configured')
  if (!session.ok) fail(session.status === 403 ? 503 : session.status >= 500 ? 502 : session.status, session.status === 403 ? 'not_configured' : pageCode(session.body))
  const { session_public_id: sessionId, session_secret: secret, expires_at: expiresAt } = session.data

  // 2) files, one by one (Strapi checks type, size, pages; stores them privately)
  const fileIds: string[] = []
  for (const f of files) {
    const form = new FormData()
    form.append('file', new Blob([new Uint8Array(f.data)], { type: 'application/octet-stream' }), 'upload')
    const up = await strapiCall<{ file_public_id: string }>(event, `/longrak/ai/sessions/${sessionId}/files`, { method: 'POST', body: form, token: false, secret })
    if (!up?.ok) fail(up && up.status < 500 ? (up.status === 429 ? 429 : 422) : 502, up ? pageCode(up.body) : 'provider_unavailable')
    fileIds.push(up.data.file_public_id)
  }

  // 3) job — idempotent per request
  const job = await strapiCall<{ job_public_id: string; processing_state: string }>(event, '/longrak/ai/jobs', {
    method: 'POST',
    token: false,
    secret,
    headers: { 'Idempotency-Key': randomUUID(), 'X-Request-Id': randomUUID() },
    body: { session_public_id: sessionId, file_public_ids: fileIds, document_type: documentType, language: locale },
  })
  if (!job?.ok) fail(job && job.status < 500 ? job.status : 502, job ? pageCode(job.body) : 'provider_unavailable')

  const maxAge = Math.max(3600, Math.floor((new Date(expiresAt).getTime() - Date.now()) / 1000) || 86400)
  rememberJob(event, job.data.job_public_id, secret, maxAge)
  setResponseStatus(event, 202)
  return { job_public_id: job.data.job_public_id, processing_state: job.data.processing_state }
})
