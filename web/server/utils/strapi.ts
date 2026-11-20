import { createHash } from 'node:crypto'
import type { H3Event } from 'h3'

/**
 * Server-to-server calls to the LongRak Strapi API (server/), using a "Custom" API token that
 * only has: Lead → submit, Analysis-session → record. Never exposed to the browser.
 *
 * Returns null when Strapi isn't configured (NUXT_STRAPI_URL / NUXT_STRAPI_TOKEN empty),
 * so callers can tell "not connected" apart from "failed".
 */
export async function strapiPost<T = unknown>(event: H3Event, path: string, body: unknown): Promise<{ ok: true; data: T } | { ok: false; status: number; code: string } | null> {
  const { strapiUrl, strapiToken } = useRuntimeConfig(event)
  if (!strapiUrl || !strapiToken) return null
  try {
    const data = await $fetch<T>(`${strapiUrl.replace(/\/$/, '')}/api${path}`, {
      method: 'POST',
      body: body as Record<string, unknown>,
      headers: { Authorization: `Bearer ${strapiToken}` },
      timeout: 15000,
      retry: 1,
    })
    return { ok: true, data }
  }
  catch (err: unknown) {
    const e = err as { statusCode?: number; data?: { error?: { message?: string } } }
    // log status/code only — never the payload (it contains contact data)
    console.error(`[strapi] POST ${path} failed status=${e.statusCode ?? '-'} code=${e.data?.error?.message ?? '-'}`)
    return { ok: false, status: e.statusCode ?? 502, code: e.data?.error?.message ?? 'strapi_unavailable' }
  }
}

/** Salted hash of the visitor IP for consent receipts / abuse checks — the raw IP is never stored. */
export function ipHash(event: H3Event) {
  const { ipHashSalt, strapiToken } = useRuntimeConfig(event)
  const ip = getRequestIP(event, { xForwardedFor: true }) ?? 'unknown'
  return createHash('sha256').update(`${ipHashSalt || strapiToken || 'longrak'}:${ip}`).digest('hex')
}

/** Path the request came from (for lead.created_from / session.source_page) */
export function refererPath(event: H3Event) {
  const ref = getRequestHeader(event, 'referer')
  try {
    return ref ? new URL(ref).pathname.slice(0, 200) : undefined
  }
  catch {
    return undefined
  }
}
