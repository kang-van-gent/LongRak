/**
 * GET /api/ai-check/jobs/:id/report — the validated report of a completed check.
 * The report JSON is re-validated here against the website contract (shared/utils/aiReport.ts).
 */
import { normalizeReport } from '#shared/utils/aiReport'

export default defineEventHandler(async (event) => {
  const id = getRouterParam(event, 'id') ?? ''
  const secret = jobSecret(event, id)
  const notFound = () => createError({ statusCode: 404, statusMessage: 'not_found', data: { code: 'not_found' } })
  if (!secret) throw notFound()
  const res = await strapiCall<{ report: unknown; document_read_status: string | null }>(event, `/longrak/ai/jobs/${id}/report`, { token: false, secret })
  if (res === null) throw createError({ statusCode: 503, statusMessage: 'not_configured', data: { code: 'not_configured' } })
  if (!res.ok) {
    if (res.status === 404) throw notFound()
    if (res.status === 409) throw createError({ statusCode: 409, statusMessage: 'report_not_ready', data: { code: 'report_not_ready' } })
    throw createError({ statusCode: 502, statusMessage: 'provider_unavailable', data: { code: 'provider_unavailable' } })
  }
  const report = normalizeReport(res.data.report)
  if (!report) throw createError({ statusCode: 502, statusMessage: 'invalid_report', data: { code: 'invalid_report' } })
  setResponseHeader(event, 'cache-control', 'no-store')
  // saved: the check lives in Strapi with the email (claimable from the app later)
  return { ...report, analysis_id: id, saved: true }
})
