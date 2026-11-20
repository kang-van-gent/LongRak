/**
 * GET /api/ai-check/jobs/:id — progress of a check this browser started (polled by /ai-check).
 * Ownership: the session secret from the httpOnly cookie. Anything else ⇒ 404.
 */
export default defineEventHandler(async (event) => {
  const id = getRouterParam(event, 'id') ?? ''
  const secret = jobSecret(event, id)
  if (!secret) throw createError({ statusCode: 404, statusMessage: 'not_found', data: { code: 'not_found' } })
  const res = await strapiCall<{ processing_state: string; error_code: string | null }>(event, `/longrak/ai/jobs/${id}`, { token: false, secret })
  if (res === null) throw createError({ statusCode: 503, statusMessage: 'not_configured', data: { code: 'not_configured' } })
  if (!res.ok) throw createError({ statusCode: res.status === 404 ? 404 : 502, statusMessage: res.status === 404 ? 'not_found' : 'provider_unavailable', data: { code: res.status === 404 ? 'not_found' : 'provider_unavailable' } })
  setResponseHeader(event, 'cache-control', 'no-store')
  return { job_public_id: id, processing_state: res.data.processing_state, error_code: res.data.error_code ?? null }
})
