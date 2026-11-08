// The Edge Function `samsara-share`: a link a customer can open to watch one
// bus on Samsara's map, made for a trip bar's Copy tracking link; what it
// answers is `handler.ts`. Samsara's API refuses calls from a web page and its
// key must never reach the public site, so the board asks here.
//
// The bus is read on the caller's own log-in, so only staff get a link. Its
// one secret, SAMSARA_API_TOKEN, is the key samsara-now uses, which needs
// Samsara's Write Live Sharing Links permission for this.

// Each import names one exact version, as check-connector.mjs holds it to;
// supabase-js is the version the site's pages load.
import 'jsr:@supabase/functions-js@2.116.0/edge-runtime.d.ts'

import { createClient } from 'npm:@supabase/supabase-js@2.116.0'
import { handle, type ShareBody, type Shared, type Vehicle } from './handler.ts'

const TOKEN = Deno.env.get('SAMSARA_API_TOKEN') ?? ''
const SAMSARA = 'https://api.samsara.com'
const SUPABASE_URL = Deno.env.get('SUPABASE_URL')!

// Samsara's answer, or an error carrying its status, whose words go to the
// function's log, which says why, such as a key without the permission.
async function samsara<T>(method: string, path: string, params: Record<string, string>, body?: unknown): Promise<T> {
  const q = new URLSearchParams(params)
  const r = await fetch(`${SAMSARA}${path}${q.size ? `?${q}` : ''}`, {
    method,
    headers: { Authorization: `Bearer ${TOKEN}`, ...(body ? { 'Content-Type': 'application/json' } : {}) },
    ...(body ? { body: JSON.stringify(body) } : {}),
  })
  if (!r.ok) {
    console.warn(`samsara ${method} ${path} ${r.status} ${(await r.text()).slice(0, 300)}`)
    throw Object.assign(new Error(`samsara ${path} ${r.status}`), { status: r.status })
  }
  return await r.json()
}

Deno.serve(req => {
  // The caller's own session, with the page's publishable key it sent.
  const db = createClient(SUPABASE_URL, req.headers.get('apikey') ?? Deno.env.get('SUPABASE_ANON_KEY') ?? '', {
    global: { headers: { Authorization: req.headers.get('authorization') ?? '' } },
    auth: { persistSession: false, autoRefreshToken: false },
  })
  return handle(req, {
    keyed: !!TOKEN,
    now: () => Date.now(),
    async bus(id) {
      const { data, error } = await db.from('buses').select('id,number').eq('id', id).maybeSingle()
      if (error) throw error
      return data ?? null
    },
    async vehicles() {
      const rows: Vehicle[] = []
      let after = ''
      do {
        const body = await samsara<{ data?: Vehicle[]; pagination?: { hasNextPage?: boolean; endCursor?: string } }>(
          'GET', '/fleet/vehicles', { limit: '512', ...(after ? { after } : {}) })
        rows.push(...(body.data ?? []).map(v => ({ id: String(v.id), name: String(v.name ?? '') })))
        after = body.pagination?.hasNextPage ? body.pagination.endCursor ?? '' : ''
      } while (after)
      return rows
    },
    async share(link: ShareBody) {
      return (await samsara<{ data?: Shared }>('POST', '/live-shares', {}, link)).data ?? {}
    },
  })
})
