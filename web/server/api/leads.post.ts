/**
 * POST /api/leads — the landing page's contact / pilot form → Strapi (POST /api/longrak/leads).
 * Body (JSON): { name, contact (email or LINE ID), role: 'owner' | 'contractor', consent: true, locale }
 * 503 { code: 'not_configured' } when Strapi isn't connected (the form says nothing was sent).
 */
const WINDOW_MS = 10 * 60 * 1000
const MAX_PER_WINDOW = 5
const hits = new Map<string, number[]>()

function fail(statusCode: number, code: string): never {
  throw createError({ statusCode, statusMessage: code, data: { code } })
}

export default defineEventHandler(async (event) => {
  const key = ipHash(event)
  const now = Date.now()
  const recent = (hits.get(key) ?? []).filter((t) => now - t < WINDOW_MS)
  recent.push(now)
  hits.set(key, recent)
  if (hits.size > 5000) hits.clear()
  if (recent.length > MAX_PER_WINDOW) fail(429, 'rate_limited')

  const body = await readBody<Record<string, unknown>>(event).catch(() => null)
  if (!body || typeof body !== 'object') fail(400, 'invalid_request')
  const name = typeof body.name === 'string' ? body.name.trim().slice(0, 120) : ''
  const contact = typeof body.contact === 'string' ? body.contact.trim().slice(0, 120) : ''
  if (!name || !contact) fail(400, 'missing_fields')
  if (body.consent !== true) fail(400, 'consent_required')

  const res = await strapiPost<{ public_id: string }>(event, '/longrak/leads', {
    source: 'contact_form',
    role: body.role === 'contractor' ? 'contractor' : 'owner',
    name,
    contact,
    language: body.locale === 'en' ? 'en' : 'th',
    page: refererPath(event),
    consent_contact: true,
    ip_hash: key,
  })
  if (res === null) fail(503, 'not_configured')
  if (!res.ok) fail(res.status === 400 ? 400 : 502, res.status === 400 ? res.code : 'provider_unavailable')
  return { ok: true }
})
