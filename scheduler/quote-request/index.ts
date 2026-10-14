// The Edge Function `quote-request`: the company website's quote form posts
// here, with no log-in. It writes with the service role, because no table is
// open to a page without one; what it answers is `handler.ts`.
//
// Its one secret, TURNSTILE_SECRET, is the site's Turnstile widget's, set in
// the dashboard. It also keys the hash an address is kept as.

// Each import names one exact version, as check-connector.mjs holds it to;
// supabase-js is the version the site's pages load.
import 'jsr:@supabase/functions-js@2.116.0/edge-runtime.d.ts'

import { createClient } from 'npm:@supabase/supabase-js@2.116.0'
import { handle } from './handler.ts'

const SECRET = Deno.env.get('TURNSTILE_SECRET') ?? ''

const admin = createClient(
  Deno.env.get('SUPABASE_URL')!,
  Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!,
  { auth: { persistSession: false, autoRefreshToken: false } },
)

const key = crypto.subtle.importKey(
  'raw', new TextEncoder().encode(SECRET), { name: 'HMAC', hash: 'SHA-256' }, false, ['sign'],
)

Deno.serve(req => handle(req, {
  async verify(token, ip) {
    if (!SECRET || !token) return false
    const form = new FormData()
    form.append('secret', SECRET)
    form.append('response', token)
    if (ip) form.append('remoteip', ip)
    const r = await fetch('https://challenges.cloudflare.com/turnstile/v0/siteverify', { method: 'POST', body: form })
    if (!r.ok) throw new Error(`siteverify ${r.status}`)
    return (await r.json())?.success === true
  },
  async sender(ip) {
    if (!ip) return null
    const mac = await crypto.subtle.sign('HMAC', await key, new TextEncoder().encode(ip))
    return [...new Uint8Array(mac)].map(b => b.toString(16).padStart(2, '0')).join('')
  },
  async recent(sender) {
    const since = new Date(Date.now() - 3600_000).toISOString()
    const { count, error } = await admin.from('quote_requests')
      .select('id', { count: 'exact', head: true }).eq('sender', sender).gte('created_at', since)
    if (error) throw error
    return count ?? 0
  },
  async add(request, task) {
    const { data, error } = await admin.rpc('quote_request_add', { request, task }).single()
    if (error) throw error
    return (data as { number: number }).number
  },
  today: () => new Date().toLocaleDateString('en-CA', { timeZone: 'America/Chicago' }),
}))
