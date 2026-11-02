// The Edge Function `driver-form`: a driver's answers and drawn signature in,
// the form's own PDF filled in and filed on their profile out. It works as the
// service role because the link has no log-in and every table it touches is
// staff only; what it answers is `handler.ts`.

// Each import names one exact version, as check-connector.mjs holds it to;
// supabase-js is the version the site's pages load.
import 'jsr:@supabase/functions-js@2.116.0/edge-runtime.d.ts'

import { createClient } from 'npm:@supabase/supabase-js@2.116.0'
import { PDFDocument, StandardFonts, rgb } from 'npm:pdf-lib@1.17.1'
import { handle, type Form, type Op } from './handler.ts'

const admin = createClient(
  Deno.env.get('SUPABASE_URL')!,
  Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!,
  { auth: { persistSession: false, autoRefreshToken: false } },
)

// Ink the colour of a pen, so a printed copy reads as filled in.
const INK = rgb(0.04, 0.12, 0.4)

// "Alex Moreno" as "alex-moreno", as file-names.js names a file's parts.
const slug = (s: string) => s.normalize('NFD').replace(/\p{M}/gu, '').toLowerCase()
  .replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '')

Deno.serve(req => handle(req, {
  async share(token) {
    const { data, error } = await admin.rpc('driver_share_by_token', { p_token: token })
    if (error) throw error
    if (!data?.id) return null
    const { data: driver, error: e2 } = await admin.from('drivers').select('name').eq('id', data.driver_id).single()
    if (e2) throw e2
    return { id: data.id, driver_id: data.driver_id, driver_name: driver.name ?? '' }
  },

  async form(id, driverId) {
    const { data: rows, error } = await admin.rpc('driver_forms_for', { p_driver_id: driverId })
    if (error) throw error
    if (!(rows ?? []).some((r: { form_id: string; waiting: boolean }) => r.form_id === id && r.waiting)) return null
    const { data, error: e2 } = await admin.from('driver_forms')
      .select('id, kind_id, title, version, blank_path, yearly, fields').eq('id', id).is('retired_at', null).maybeSingle()
    if (e2) throw e2
    return data as Form | null
  },

  async fill(blankPath, ops: Op[], signature) {
    const { data, error } = await admin.storage.from('driver-forms').download(blankPath)
    if (error) throw error
    const pdf = await PDFDocument.load(await data.arrayBuffer())
    const font = await pdf.embedFont(StandardFonts.Helvetica)
    const sig = await pdf.embedPng(signature)
    const pages = pdf.getPages()
    for (const op of ops) {
      const page = pages[op.page]
      if (!page) continue
      if (op.kind === 'signature') {
        // The drawn signature kept in its own proportions, inside its box,
        // sitting on the line.
        const scale = Math.min(op.w / sig.width, op.h / sig.height)
        page.drawImage(sig, { x: op.x, y: op.y, width: sig.width * scale, height: sig.height * scale })
        continue
      }
      // A box wraps its words to its width and stops at its height.
      const lines: string[] = []
      for (const para of op.text.split('\n')) {
        if (!op.w) { lines.push(para); continue }
        let line = ''
        for (const word of para.split(/\s+/)) {
          const next = line ? `${line} ${word}` : word
          if (line && font.widthOfTextAtSize(next, op.size) > op.w) { lines.push(line); line = word } else line = next
        }
        lines.push(line)
      }
      const lead = op.size * 1.25
      const fit = op.h ? Math.max(1, Math.floor(op.h / lead)) : lines.length
      lines.slice(0, fit).forEach((text, i) =>
        page.drawText(text, { x: op.x, y: op.y - i * lead, size: op.size, font, color: INK }))
    }
    return await pdf.save()
  },

  async save(s) {
    const id = crypto.randomUUID()
    const fileName = `${s.signedOn}_${slug(s.form.title)}_${slug(s.share.driver_name) || 'driver'}.pdf`
    const path = `${id}/${fileName}`
    const up = await admin.storage.from('company-documents').upload(path, s.pdf, { contentType: 'application/pdf', upsert: false })
    if (up.error) throw up.error
    const doc = await admin.from('company_documents').insert({
      id, kind_id: s.form.kind_id, driver_id: s.share.driver_id, ends_on: s.endsOn,
      note: `Signed on the driver's link, form version ${s.form.version}.`,
      file_name: fileName, file_path: path, file_size: s.pdf.length, created_by: null,
    })
    if (doc.error) {
      await admin.storage.from('company-documents').remove([path]).catch(() => {})
      throw doc.error
    }
    const signing = await admin.from('driver_form_signings').insert({
      form_id: s.form.id, driver_id: s.share.driver_id, document_id: id, share_id: s.share.id,
      ip: s.ip, user_agent: s.userAgent, flagged: s.flagged,
    })
    if (signing.error) throw signing.error
  },

  today: () => new Intl.DateTimeFormat('en-CA', { timeZone: 'America/Chicago' }).format(new Date()),
}))
