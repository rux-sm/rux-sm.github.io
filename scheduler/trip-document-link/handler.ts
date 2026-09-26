// What `trip-document-link` answers, with no imports, so it runs the same in
// the Edge runtime and under Node's own test runner. A page without a log-in
// sends a trip document's id and gets back a link to the file that stops
// working after ten minutes. The id stays the only secret, as it is on the
// link pages today; the bucket itself is closed to everyone but staff.

export const LINK_SECONDS = 600

export type Found = { file_path: string; file_name?: string | null }

export type Deps = {
  // The document's file, or null when no document has that id.
  find(id: string): Promise<Found | null>
  // A link to the file signed for `seconds`, or null when storage has none.
  sign(path: string, seconds: number): Promise<string | null>
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
    const url = await deps.sign(found.file_path, LINK_SECONDS)
    if (!url) return reply(404, { error: 'not-found' })
    return reply(200, { url, file_name: found.file_name ?? null })
  } catch {
    return reply(502, { error: 'unavailable' })
  }
}
