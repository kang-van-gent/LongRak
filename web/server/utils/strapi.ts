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
    return { ok: true, data: data as T }
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

type StrapiResult<T> = { ok: true; status: number; data: T } | { ok: false; status: number; body: Record<string, unknown> } | null

/**
 * General server-to-server call to Strapi that keeps the error body (the LR-W0-01 endpoints
 * answer `{ ok:false, result, reason }`). null = Strapi not configured.
 *  - `token: false` for routes authorised by the session secret instead of the API token
 *  - `secret` is sent as X-LongRak-Session-Secret
 */
export async function strapiCall<T = unknown>(
  event: H3Event,
  path: string,
  opts: { method?: 'GET' | 'POST'; body?: Record<string, unknown> | FormData; token?: boolean; secret?: string; headers?: Record<string, string> } = {},
): Promise<StrapiResult<T>> {
  const { strapiUrl, strapiToken } = useRuntimeConfig(event)
  if (!strapiUrl || !strapiToken) return null
  const res = await $fetch.raw<T>(`${strapiUrl.replace(/\/$/, '')}/api${path}`, {
    method: opts.method ?? 'GET',
    body: opts.body,
    headers: {
      ...(opts.token === false ? {} : { Authorization: `Bearer ${strapiToken}` }),
      ...(opts.secret ? { 'X-LongRak-Session-Secret': opts.secret } : {}),
      ...opts.headers,
    },
    timeout: 30000,
    retry: 0,
    ignoreResponseError: true,
  }).catch((err: unknown) => {
    console.error(`[strapi] ${opts.method ?? 'GET'} ${path} unreachable: ${(err as Error).name}`)
    return { status: 502, _data: { result: 'strapi_unavailable' } as unknown as T }
  })
  if (res.status >= 200 && res.status < 300) return { ok: true, status: res.status, data: res._data as T }
  const body = (res._data && typeof res._data === 'object' ? res._data : {}) as Record<string, unknown>
  // log status + result code only — never payloads
  console.error(`[strapi] ${opts.method ?? 'GET'} ${path.replace(/[0-9a-f-]{36}/g, ':id')} → ${res.status} ${String(body.result ?? (body.error as { message?: string })?.message ?? '')}`)
  return { ok: false, status: res.status, body }
}
