// The Edge Function `samsara-now`: each bus's engine, speed and drivers right
// now, by Samsara; what it answers is `handler.ts`. Samsara's API refuses
// calls from a web page and its key must never reach the public site, so the
// board asks here.
//
// The buses and drivers are read on the caller's own log-in, so only staff get
// an answer, as through the connector. Its one secret, SAMSARA_API_TOKEN, is
// the read-only key samsara-miles uses; the drivers' hours also need its
// Compliance hours permission.

// Each import names one exact version, as check-connector.mjs holds it to;
// supabase-js is the version the site's pages load.
import 'jsr:@supabase/functions-js@2.116.0/edge-runtime.d.ts'

import { createClient } from 'npm:@supabase/supabase-js@2.116.0'
import { handle, type Clock, type Stat, type Vehicle } from './handler.ts'

const TOKEN = Deno.env.get('SAMSARA_API_TOKEN') ?? ''
const SAMSARA = 'https://api.samsara.com'
const SUPABASE_URL = Deno.env.get('SUPABASE_URL')!

// Every page of a Samsara list.
async function samsara<T>(path: string, params: Record<string, string>): Promise<T[]> {
  const rows: T[] = []
  let after = ''
  do {
    const q = new URLSearchParams({ ...params, ...(after ? { after } : {}) })
    const r = await fetch(`${SAMSARA}${path}?${q}`, { headers: { Authorization: `Bearer ${TOKEN}` } })
    if (!r.ok) {
      // Samsara's status and words go to the function's log, which says why a
      // list did not come, such as a key without the permission it needs.
      console.warn(`samsara ${path} ${r.status} ${(await r.text()).slice(0, 300)}`)
      throw new Error(`samsara ${path} ${r.status}`)
    }
    const body = await r.json()
    rows.push(...(body?.data ?? []))
    after = body?.pagination?.hasNextPage ? body.pagination.endCursor ?? '' : ''
  } while (after)
  return rows
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
    async buses() {
      const { data, error } = await db.from('buses').select('id,number')
      if (error) throw error
      return data ?? []
    },
    async drivers() {
      const { data, error } = await db.from('drivers').select('id,name')
      if (error) throw error
      return data ?? []
    },
    async vehicles() {
      const rows = await samsara<Vehicle>('/fleet/vehicles', { limit: '512' })
      return rows.map(v => ({ id: String(v.id), name: String(v.name ?? '') }))
    },
    stats(vehicleIds) {
      return samsara<Stat>('/fleet/vehicles/stats', { types: 'engineStates,gps', vehicleIds: vehicleIds.join(',') })
    },
    clocks() {
      return samsara<Clock>('/fleet/hos/clocks', { limit: '512' })
    },
  })
})
