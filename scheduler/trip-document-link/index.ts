// The Edge Function `trip-document-link`: a trip document's id in, a
// ten-minute link to its file out, for the pages people open without a log-in.
// It reads with the service role because the bucket is closed to them; what it
// answers is `handler.ts`.

// Each import names one exact version, as check-connector.mjs holds it to;
// supabase-js is the version the site's pages load.
import 'jsr:@supabase/functions-js@2.116.0/edge-runtime.d.ts'

import { createClient } from 'npm:@supabase/supabase-js@2.116.0'
import { handle } from './handler.ts'

const BUCKET = 'trip-documents'

const admin = createClient(
  Deno.env.get('SUPABASE_URL')!,
  Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!,
  { auth: { persistSession: false, autoRefreshToken: false } },
)

// The trip's last day, the latest any of its legs starts or ends.
type TripDays = { cancelled_at: string | null; trip_legs: { start_date: string | null; end_date: string | null }[] | null }
const lastDay = (t: TripDays | null) => (t ? (t.trip_legs ?? []).flatMap(l => [l.start_date, l.end_date])
  .filter((d): d is string => !!d).sort().at(-1) ?? null : null)

Deno.serve(req => handle(req, {
  async find(id) {
    const { data, error } = await admin.from('trip_documents')
      .select('file_path, file_name, trips(cancelled_at, trip_legs(start_date, end_date))').eq('id', id).maybeSingle()
    if (error) throw error
    if (!data) return null
    const trip = (Array.isArray(data.trips) ? data.trips[0] : data.trips) as TripDays | null
    return { file_path: data.file_path, file_name: data.file_name, ends: lastDay(trip), cancelled: !!trip?.cancelled_at }
  },
  today: () => new Intl.DateTimeFormat('en-CA', { timeZone: 'America/Chicago' }).format(new Date()),
  // The caller's own session, with the page's publishable key it sent; a page
  // without a log-in sends no session and is not staff.
  async staff() {
    const auth = req.headers.get('authorization') ?? ''
    if (!/^Bearer\s+ey/i.test(auth)) return false
    const caller = createClient(Deno.env.get('SUPABASE_URL')!, req.headers.get('apikey') ?? Deno.env.get('SUPABASE_ANON_KEY') ?? '', {
      global: { headers: { Authorization: auth } },
      auth: { persistSession: false, autoRefreshToken: false },
    })
    const { data } = await caller.rpc('is_staff')
    return data === true
  },
  async sign(path, seconds) {
    const { data, error } = await admin.storage.from(BUCKET).createSignedUrl(path, seconds)
    // A row whose file was removed from storage is a missing document, not a fault.
    if (error && /not.?found/i.test(error.message)) return null
    if (error) throw error
    return data?.signedUrl ?? null
  },
}))
