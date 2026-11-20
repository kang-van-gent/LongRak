/**
 * POST /api/project-request — after a document check, the user asks LongRak to open a
 * shared project. Saved as a lead in Strapi (POST /api/longrak/leads) and, if configured,
 * also sent to an n8n webhook (NUXT_N8N_PROJECT_WEBHOOK_URL) for notifications.
 *
 * The email is never sent along with the documents to the AI analysis (data minimisation,
 * context.md §16); here it is used only to contact the person about a project.
 *
 * Body (JSON):  { email, role: 'owner' | 'contractor', analysis_id, document_type, locale, consent_contact: true }
 * n8n receives the same as JSON + request_id, received_at, lead_public_id; header X-LongRak-Secret.
 * Succeeds when either Strapi or n8n accepted it; 503 { code: 'not_configured' } when neither
 * is connected (nothing stored or sent).
 */
import { randomUUID } from 'node:crypto'
import { DOCUMENT_TYPES } from '#shared/utils/aiReport'

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/

const WINDOW_MS = 10 * 60 * 1000
const MAX_PER_WINDOW = 5
const hits = new Map<string, number[]>()
function rateLimited(ip: string) {
  const now = Date.now()
  const recent = (hits.get(ip) ?? []).filter((t) => now - t < WINDOW_MS)
  recent.push(now)
  hits.set(ip, recent)
  if (hits.size > 5000) hits.clear()
  return recent.length > MAX_PER_WINDOW
}

function fail(statusCode: number, code: string): never {
  throw createError({ statusCode, statusMessage: code, data: { code } })
}

export default defineEventHandler(async (event) => {
  const config = useRuntimeConfig(event)
  const ip = getRequestIP(event, { xForwardedFor: true }) ?? 'unknown'
  if (rateLimited(ip)) fail(429, 'rate_limited')

  const body = await readBody<Record<string, unknown>>(event).catch(() => null)
  if (!body || typeof body !== 'object') fail(400, 'invalid_request')

  const email = typeof body.email === 'string' ? body.email.trim().toLowerCase() : ''
  if (!email || email.length > 254 || !EMAIL_RE.test(email)) fail(400, 'invalid_email')
  if (body.consent_contact !== true) fail(400, 'consent_required')

  const role = body.role === 'contractor' ? 'contractor' : 'owner'
  const analysisId = typeof body.analysis_id === 'string' ? body.analysis_id.slice(0, 80) : ''
  const documentType = (DOCUMENT_TYPES as readonly string[]).includes(String(body.document_type)) ? String(body.document_type) : 'other'
  const locale = body.locale === 'en' ? 'en' : 'th'

  // 1) save the lead in Strapi (linked to the check via analysis_public_id)
  const lead = await strapiPost<{ public_id: string }>(event, '/longrak/leads', {
    source: 'ai_check_project_request',
    role,
    email,
    analysis_public_id: analysisId,
    language: locale,
    page: refererPath(event),
    consent_contact: true,
    ip_hash: ipHash(event),
  })

  // 2) notify n8n (e.g. email / CRM / Slack), if configured
  const requestId = randomUUID()
  let notified: boolean | null = null
  if (config.n8nProjectWebhookUrl) {
    try {
      await $fetch(config.n8nProjectWebhookUrl, {
        method: 'POST',
        body: {
          request_id: requestId,
          received_at: new Date().toISOString(),
          lead_public_id: lead?.ok ? lead.data.public_id : null,
          email,
          role,
          analysis_id: analysisId,
          document_type: documentType,
          locale,
          consent_contact: true,
          source: 'ai-check',
        },
        headers: config.n8nWebhookSecret ? { 'X-LongRak-Secret': config.n8nWebhookSecret } : {},
        timeout: 15000,
        retry: 1,
      })
      notified = true
    }
    catch (err: unknown) {
      // never log the email itself
      console.error(`[project-request] n8n call failed request=${requestId} status=${(err as { statusCode?: number }).statusCode ?? '-'}`)
      notified = false
    }
  }

  if (lead === null && notified === null) fail(503, 'not_configured') // nothing connected: nothing stored or sent
  if (lead?.ok !== true && notified !== true) fail(502, 'provider_unavailable')
  return { ok: true, request_id: requestId, saved: lead?.ok === true }
})
