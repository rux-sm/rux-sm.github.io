// What `trip-document-link` answers, with no imports, so it runs the same in
// the Edge runtime and under Node's own test runner. A page without a log-in
// sends a trip document's id and gets back a link to the file that stops
// working after ten minutes. The id stays the only secret, as it is on the
// link pages today; the bucket itself is closed to everyone but staff.
//
// A DOCUMENT'S ADDRESS ENDS WITH ITS TRIP: two days after the trip's last day,
// on the office's calendar, or once the trip is cancelled, it answers 410, so
// a link sent for one trip does not open its files for ever. Someone signed
// in as staff still opens it.

export const LINK_SECONDS = 600
// The days after a trip's last day its documents still open without a log-in.
export const GRACE_DAYS = 2

// `ends` is the trip's last day, YYYY-MM-DD, and `cancelled` whether it was.
export type Found = { file_path: string; file_name?: string | null; ends?: string | null; cancelled?: boolean }

export type Deps = {
  // The document's file, or null when no document has that id.
  find(id: string): Promise<Found | null>
  // A link to the file signed for `seconds`, or null when storage has none.
  sign(path: string, seconds: number): Promise<string | null>
  // Today on the office's calendar, YYYY-MM-DD.
  today(): string
  // Whether the caller is signed in as staff.
  staff(): Promise<boolean>
}

// A day some days after another, both YYYY-MM-DD.
export function dayAfter(day: string, days: number): string {
  const [y, m, d] = day.split('-').map(Number)
  return new Date(Date.UTC(y, m - 1, d + days)).toISOString().slice(0, 10)
}

// Whether a document's address has ended with its trip.
export function ended(found: Found, today: string): boolean {
  if (found.cancelled) return true
  return !!found.ends && /^\d{4}-\d{2}-\d{2}/.test(found.ends) && today > dayAfter(found.ends.slice(0, 10), GRACE_DAYS)
}

// The pages that ask: the site, and rux-ui under it, and the two local servers.
const ORIGINS = new Set([
  'https://rux-sm.github.io',
  'http://localhost:8641',
  'http://localhost:8642',
])

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i

function headers(origin: string | null): Record<string, string> {
  return {
    'Access-Control-Allow-Origin': origin && ORIGINS.has(origin) ? origin : 'https://rux-sm.github.io',
    'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
    'Access-Control-Allow-Methods': 'POST, OPTIONS',
    'Vary': 'Origin',
    'Cache-Control': 'no-store',
  }
}

export async function handle(req: Request, deps: Deps): Promise<Response> {
  const base = headers(req.headers.get('origin'))
  const reply = (status: number, body: unknown) =>
    new Response(JSON.stringify(body), { status, headers: { ...base, 'Content-Type': 'application/json' } })

  if (req.method === 'OPTIONS') return new Response(null, { status: 204, headers: base })
  if (req.method !== 'POST') return reply(405, { error: 'method' })

  let id = ''
  try {
    const body = await req.json()
    id = typeof body?.id === 'string' ? body.id.trim() : ''
  } catch {
    // A body that is not JSON carries no id, and is answered as one.
  }
  if (!UUID.test(id)) return reply(400, { error: 'no-id' })

  try {
    const found = await deps.find(id)
    if (!found?.file_path) return reply(404, { error: 'not-found' })
    if (ended(found, deps.today()) && !(await deps.staff().catch(() => false))) return reply(410, { error: 'ended' })
    const url = await deps.sign(found.file_path, LINK_SECONDS)
    if (!url) return reply(404, { error: 'not-found' })
    return reply(200, { url, file_name: found.file_name ?? null })
  } catch {
    return reply(502, { error: 'unavailable' })
  }
}
