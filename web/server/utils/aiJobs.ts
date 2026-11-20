import type { H3Event } from 'h3'

/**
 * Which AI-check jobs this browser started, with the secret that proves it — kept in an
 * httpOnly cookie, so page JavaScript never sees the secret. Only the last few jobs are kept.
 */
const COOKIE = 'lr_ai_jobs'
const MAX = 5
const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i

type Entry = { j: string; k: string }

function read(event: H3Event): Entry[] {
  try {
    const v = JSON.parse(getCookie(event, COOKIE) ?? '[]')
    return Array.isArray(v) ? v.filter((e) => typeof e?.j === 'string' && typeof e?.k === 'string').slice(0, MAX) : []
  }
  catch {
    return []
  }
}

export function rememberJob(event: H3Event, jobId: string, secret: string, maxAgeSeconds: number) {
  const entries = [{ j: jobId, k: secret }, ...read(event).filter((e) => e.j !== jobId)].slice(0, MAX)
  setCookie(event, COOKIE, JSON.stringify(entries), {
    httpOnly: true,
    secure: !import.meta.dev,
    sameSite: 'strict',
    path: '/api/ai-check',
    maxAge: maxAgeSeconds,
  })
}

/** The secret for a job this browser started, or null (⇒ the routes answer 404). */
export function jobSecret(event: H3Event, jobId: string): string | null {
  if (!UUID_RE.test(jobId)) return null
  return read(event).find((e) => e.j === jobId)?.k ?? null
}
