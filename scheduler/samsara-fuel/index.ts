// The Edge Function `samsara-fuel`: each bus's miles per gallon and tank
// gallons, worked out from Samsara's last 90 days and kept in
// `bus_fuel_profiles`; what it answers is `handler.ts`. The `samsara-fuel`
// schedule calls it once a night with SAMSARA_NIGHT_KEY, the key the
// samsara-night schedule sends samsara-miles, and it reads and saves on the
// service role, which Supabase gives every function. SAMSARA_API_TOKEN is
// the read-only key samsara-now uses; the fuel and energy report needs its
// Fuel & Energy permission.

// Each import names one exact version, as check-connector.mjs holds it to;
// supabase-js is the version the site's pages load.
import 'jsr:@supabase/functions-js@2.116.0/edge-runtime.d.ts'

import { createClient } from 'npm:@supabase/supabase-js@2.116.0'
import { handle, type Burn, type Point, type Profile, type Vehicle } from './handler.ts'

const TOKEN = Deno.env.get('SAMSARA_API_TOKEN') ?? ''
const NIGHT_KEY = Deno.env.get('SAMSARA_NIGHT_KEY') ?? ''
const SAMSARA = 'https://api.samsara.com'

// Every page of a Samsara list, as samsara-now asks.
async function samsara<T>(path: string, params: Record<string, string>): Promise<T[]> {
  const rows: T[] = []
  let after = ''
  do {
    const q = new URLSearchParams({ ...params, ...(after ? { after } : {}) })
    const r = await fetch(`${SAMSARA}${path}?${q}`, { headers: { Authorization: `Bearer ${TOKEN}` } })
    if (!r.ok) {
      console.warn(`samsara ${path} ${r.status} ${(await r.text()).slice(0, 300)}`)
      throw new Error(`samsara ${path} ${r.status}`)
    }
    const body = await r.json()
    rows.push(...(Array.isArray(body?.data) ? body.data : body?.data ? [body.data] : []))
    after = body?.pagination?.hasNextPage ? body.pagination.endCursor ?? '' : ''
  } while (after)
  return rows
}

Deno.serve(req => {
  const db = createClient(Deno.env.get('SUPABASE_URL')!, Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '', {
    auth: { persistSession: false, autoRefreshToken: false },
  })
  return handle(req, {
    keyed: !!TOKEN,
    now: () => Date.now(),
    async buses() {
      const { data, error } = await db.from('buses').select('id,number').eq('status', 'active')
      if (error) throw error
      return data ?? []
    },
    async vehicles() {
      const rows = await samsara<Vehicle>('/fleet/vehicles', { limit: '512' })
      return rows.map(v => ({ id: String(v.id), name: String(v.name ?? '') }))
    },
    async fuel(vehicleIds, from, to) {
      const out = new Map<string, Point[]>()
      if (!vehicleIds.length) return out
      const rows = await samsara<{ id: string; fuelPercents?: Point[] }>('/fleet/vehicles/stats/history',
        { vehicleIds: vehicleIds.join(','), types: 'fuelPercents', startTime: from, endTime: to })
      // A vehicle's history can run across pages, so its points are joined.
      for (const r of rows) out.set(String(r.id), [...(out.get(String(r.id)) ?? []), ...(r.fuelPercents ?? [])])
      return out
    },
    async burn(vehicleId, from, to) {
      const rows = await samsara<{ vehicleReports?: Burn[] }>('/fleet/reports/vehicles/fuel-energy',
        { vehicleIds: vehicleId, startDate: from, endDate: to })
      return rows[0]?.vehicleReports?.[0] ?? null
    },
    async save(rows: Profile[]) {
      const { error } = await db.from('bus_fuel_profiles').upsert(rows, { onConflict: 'bus_id' })
      if (error) throw error
    },
  }, NIGHT_KEY)
})
