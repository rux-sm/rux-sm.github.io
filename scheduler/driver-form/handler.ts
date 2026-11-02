// What `driver-form` answers, with no imports, so it runs the same in the Edge
// runtime and under Node's own test runner. A driver's link posts a form's
// answers and the drawn signature; this checks the link, checks every answer
// the form asks for, works out what is written where on the blank PDF, and
// hands that to `fill` and the signing to `save`. The page draws the form from
// the same fields and shows the problems this answers with.
//
// A FIELD is one of these, in the order the page shows them. `en` and `es` are
// its words; `at` is where on the PDF it is written, in points from the page's
// bottom left, page 0 first.
//   heading, text   words shown, nothing asked
//   read            a policy shown in full, signed for as a whole
//   yes_no          Yes or No; `marks.yes` and `marks.no` say where the X goes;
//                   `flag: 'yes'` flags the signing to the office on a Yes
//   line            a line of text, `prefill` naming what the profile holds
//   box             a box of text, `at` with `w` and `h`
//   date            a date, MM/DD/YYYY
//   signature       the drawn signature, `at` with `w` and `h`
//   signed_on       the day of signing, written in, nothing asked
// A field with `when: { any: [ids], is: 'yes' }` is shown and asked only while
// one of those fields is answered that way.

export type At = { page: number; x: number; y: number; w?: number; h?: number; size?: number }
export type Field = {
  id?: string
  type: 'heading' | 'text' | 'read' | 'yes_no' | 'line' | 'box' | 'date' | 'signature' | 'signed_on'
  en?: string
  es?: string
  prefill?: string
  optional?: boolean
  flag?: 'yes' | 'no'
  when?: { any: string[]; is: string }
  marks?: { yes: At; no: At }
  at?: At
}
export type Form = { id: string; kind_id: string; title: string; version: string; blank_path: string; yearly: boolean; fields: Field[] }
export type Share = { id: string; driver_id: string; driver_name: string }
// What is drawn on the blank: words, or the signature's picture.
export type Op =
  | { kind: 'text'; page: number; x: number; y: number; size: number; text: string; w?: number; h?: number }
  | { kind: 'signature'; page: number; x: number; y: number; w: number; h: number }
export type Signing = {
  share: Share; form: Form; pdf: Uint8Array; signedOn: string; endsOn: string | null;
  flagged: boolean; ip: string | null; userAgent: string | null
}

export type Deps = {
  // The live link behind a token, or null.
  share(token: string): Promise<Share | null>
  // A current form, while it waits for this driver; null otherwise.
  form(id: string, driverId: string): Promise<Form | null>
  // The blank PDF, drawn on with `ops` and the signature PNG.
  fill(blankPath: string, ops: Op[], signature: Uint8Array): Promise<Uint8Array>
  // Files the signed PDF and records the signing.
  save(signing: Signing): Promise<void>
  // Today on the office's calendar, YYYY-MM-DD.
  today(): string
}

export const MAX_TEXT = 4000
export const MAX_SIGNATURE = 400_000

// The fields asked of the driver, given the answers so far.
export const asks = (f: Field) => !!f.id && ['yes_no', 'line', 'box', 'date'].includes(f.type)
export function shown(field: Field, answers: Record<string, unknown>): boolean {
  if (!field.when) return true
  return field.when.any.some(id => answers[id] === field.when!.is)
}

const DATE = /^(0[1-9]|1[0-2])\/(0[1-9]|[12]\d|3[01])\/(19|20)\d{2}$/

// Every field id the answers leave wrong: missing, not Yes or No, not a date,
// or too long. A field not shown is never asked.
export function problems(fields: Field[], answers: Record<string, unknown>): string[] {
  const out: string[] = []
  for (const f of fields) {
    if (!asks(f) || !shown(f, answers)) continue
    const v = answers[f.id!]
    const text = typeof v === 'string' ? v.trim() : ''
    if (f.type === 'yes_no') { if (v !== 'yes' && v !== 'no') out.push(f.id!); continue }
    if (!text) { if (!f.optional) out.push(f.id!); continue }
    if (text.length > MAX_TEXT) out.push(f.id!)
    else if (f.type === 'date' && !DATE.test(text)) out.push(f.id!)
  }
  return out
}

// Whether an answer flags the signing to the office.
export const flagged = (fields: Field[], answers: Record<string, unknown>) =>
  fields.some(f => f.type === 'yes_no' && f.flag && answers[f.id!] === f.flag)

// The standard PDF fonts write Windows-1252 only, so a phone's curly quotes
// and dashes become their plain forms and anything else outside it a '?'.
export function plain(s: string): string {
  return s.replace(/[\u2018\u2019\u201A\u2032]/g, "'").replace(/[\u201C\u201D\u201E\u2033]/g, '"')
    .replace(/[\u2013\u2014\u2212]/g, '-').replace(/\u2026/g, '...').replace(/\r\n?/g, '\n')
    .replace(/[^\n\x20-\x7E\xA0-\xFF]/gu, '?')
}

// "11/02/2026" from "2026-11-02".
export const usDate = (iso: string) => `${iso.slice(5, 7)}/${iso.slice(8, 10)}/${iso.slice(0, 4)}`

// What is written where: each answer, the day, and the signature.
export function ops(fields: Field[], answers: Record<string, unknown>, signedOn: string): Op[] {
  const out: Op[] = []
  for (const f of fields) {
    if (f.type === 'yes_no') {
      const at = f.marks?.[answers[f.id!] as 'yes' | 'no']
      if (at) out.push({ kind: 'text', page: at.page, x: at.x, y: at.y, size: at.size ?? 14, text: 'X' })
    } else if (f.type === 'signature' && f.at) {
      out.push({ kind: 'signature', page: f.at.page, x: f.at.x, y: f.at.y, w: f.at.w ?? 180, h: f.at.h ?? 36 })
    } else if (f.type === 'signed_on' && f.at) {
      out.push({ kind: 'text', page: f.at.page, x: f.at.x, y: f.at.y, size: f.at.size ?? 11, text: usDate(signedOn) })
    } else if (asks(f) && f.at && shown(f, answers)) {
      const text = plain(String(answers[f.id!] ?? '').trim())
      if (text) out.push({ kind: 'text', page: f.at.page, x: f.at.x, y: f.at.y, size: f.at.size ?? 11, text, w: f.at.w, h: f.at.h })
    }
  }
  return out
}

// A day a year on, for a yearly form's copy.
export function yearAfter(day: string): string {
  const [y, m, d] = day.split('-').map(Number)
  return new Date(Date.UTC(y + 1, m - 1, d)).toISOString().slice(0, 10)
}

// The signature as the page sends it, a PNG data URL, as bytes.
export function png(dataUrl: unknown): Uint8Array | null {
  if (typeof dataUrl !== 'string' || dataUrl.length > MAX_SIGNATURE) return null
  const m = /^data:image\/png;base64,([A-Za-z0-9+/=]+)$/.exec(dataUrl)
  if (!m) return null
  const bytes = Uint8Array.from(atob(m[1]), c => c.charCodeAt(0))
  // The PNG signature, so nothing else is drawn onto the form.
  return bytes.length > 8 && bytes[0] === 0x89 && bytes[1] === 0x50 && bytes[2] === 0x4e && bytes[3] === 0x47 ? bytes : null
}

// The pages that ask: the site and the two local servers.
const ORIGINS = new Set(['https://rux-sm.github.io', 'http://localhost:8641', 'http://localhost:8642'])
const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i
const TOKEN = /^[0-9a-f]{16,64}$/i

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

  let body: Record<string, unknown> = {}
  try { body = (await req.json()) ?? {} } catch { /* answered as an empty body */ }
  const token = typeof body.token === 'string' ? body.token.trim().toLowerCase() : ''
  const formId = typeof body.formId === 'string' ? body.formId : ''
  const answers = body.answers && typeof body.answers === 'object' && !Array.isArray(body.answers)
    ? body.answers as Record<string, unknown> : {}
  if (!TOKEN.test(token) || !UUID.test(formId)) return reply(400, { error: 'bad-request' })

  try {
    const share = await deps.share(token)
    if (!share) return reply(410, { error: 'link' })
    const form = await deps.form(formId, share.driver_id)
    if (!form) return reply(409, { error: 'not-waiting' })
    const wrong = problems(form.fields, answers)
    const signature = png(body.signature)
    if (!signature) wrong.push('signature')
    if (wrong.length) return reply(422, { error: 'problems', fields: wrong })

    const signedOn = deps.today()
    const pdf = await deps.fill(form.blank_path, ops(form.fields, answers, signedOn), signature!)
    await deps.save({
      share, form, pdf, signedOn,
      endsOn: form.yearly ? yearAfter(signedOn) : null,
      flagged: flagged(form.fields, answers),
      ip: (req.headers.get('x-forwarded-for') ?? '').split(',')[0].trim() || null,
      userAgent: (req.headers.get('user-agent') ?? '').slice(0, 400) || null,
    })
    return reply(200, { signed: signedOn })
  } catch {
    return reply(502, { error: 'unavailable' })
  }
}
