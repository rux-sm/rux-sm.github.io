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

Deno.serve(req => handle(req, {
  async find(id) {
    const { data, error } = await admin.from('trip_documents')
      .select('file_path, file_name').eq('id', id).maybeSingle()
    if (error) throw error
    return data
  },
  async sign(path, seconds) {
    const { data, error } = await admin.storage.from(BUCKET).createSignedUrl(path, seconds)
    // A row whose file was removed from storage is a missing document, not a fault.
    if (error && /not.?found/i.test(error.message)) return null
    if (error) throw error
    return data?.signedUrl ?? null
  },
}))
