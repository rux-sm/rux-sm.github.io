// What `quote-request` answers, with no imports, so it runs the same in the
// Edge runtime and under Node, where scheduler/tools/check-quote-request.mjs
// sends it sample requests. The company website's quote form posts here; a
// request that passes is stored with a number of its own and a New quote row
// on the board's Tasks, both or neither, and the number goes back to the page.
//
// IT STOPS THREE KINDS OF SPAM: a Turnstile token Cloudflare must vouch for, a
// hidden field a person never fills, and a limit on requests from one address
// in an hour. The address is kept only as a keyed hash, for that limit.
//
// THE OFFICE READS ENGLISH, so the Tasks row is in English whatever language
// the request came in, and says which, so the office answers in it.

export const LIMIT_PER_HOUR = 3

export type QuoteRequest = {
  lang: 'en' | 'es'
  first_name: string
  last_name: string
  phone: string
  email: string
  organization: string | null
  purchase_order: 'yes' | 'no' | 'unsure'
  trip_type: 'round' | 'oneway'
  pickup: string
  destination: string
  leave_on: string
  leave_at: string | null
  return_on: string | null
  return_at: string | null
  passengers: number
  wheelchair_lift: boolean
  details: string | null
  sender: string | null
}

// The Tasks row; `{number}` in its detail becomes the request's number when
// the database gives it one.
export type Task = { who: string; body: string; detail: string; due_on: string }

export type Deps = {
  // Whether Cloudflare vouches for this Turnstile token.
  verify(token: string, ip: string | null): Promise<boolean>
  // The address as a keyed hash, or null with no address.
  sender(ip: string | null): Promise<string | null>
  // How many requests that sender made in the last hour.
  recent(sender: string): Promise<number>
  // Stores the request and its Tasks row together; returns the number.
  add(request: QuoteRequest, task: Task): Promise<number>
  // Today in McAllen, as YYYY-MM-DD.
  today(): string
}

// The pages that post: the site at its GitHub address, at the company's
// address with and without www, and its local server.
const ORIGINS = new Set([
  'https://rux-sm.github.io',
  'https://escamillatourbuses.com',
  'https://www.escamillatourbuses.com',
  'http://localhost:8645',
])

function headers(origin: string | null): Record<string, string> {
  return {
    'Access-Control-Allow-Origin': origin && ORIGINS.has(origin) ? origin : 'https://rux-sm.github.io',
    'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
    'Access-Control-Allow-Methods': 'POST, OPTIONS',
    'Vary': 'Origin',
    'Cache-Control': 'no-store',
  }
}

const DATE = /^\d{4}-\d{2}-\d{2}$/
const TIME = /^\d{2}:\d{2}$/
const EMAIL = /^[^\s@]+@[^\s@]+\.[^\s@]+$/

const text = (v: unknown, max: number): string => (typeof v === 'string' ? v.trim().slice(0, max) : '')
const realDate = (v: string): boolean => DATE.test(v) && !Number.isNaN(Date.parse(`${v}T00:00:00Z`)) &&
  new Date(`${v}T00:00:00Z`).toISOString().startsWith(v)
const realTime = (v: string): boolean => TIME.test(v) && Number(v.slice(0, 2)) < 24 && Number(v.slice(3)) < 60

// The form's fields, checked as the page checks them; the names of the
// fields that fail, or the request.
export function requestFrom(body: Record<string, unknown>, today: string): { fields: string[] } | { request: QuoteRequest } {
  const fields: string[] = []
  const first = text(body.first, 80)
  const last = text(body.last, 80)
  const phone = text(body.phone, 40)
  const email = text(body.email, 254)
  const org = text(body.org, 160)
  const po = text(body.po, 10)
  const trip = text(body.trip, 10)
  const from = text(body.from, 300)
  const to = text(body.to, 300)
  const leaveDate = text(body.leave_date, 10)
  const leaveTime = text(body.leave_time, 5)
  const returnDate = text(body.return_date, 10)
  const returnTime = text(body.return_time, 5)
  const people = text(body.people, 6)
  const details = text(body.details, 2000)
  const round = trip !== 'oneway'

  if (!first) fields.push('first')
  if (!last) fields.push('last')
  if (phone.replace(/\D/g, '').length < 10 || phone.replace(/\D/g, '').length > 15) fields.push('phone')
  if (!EMAIL.test(email)) fields.push('email')
  if (!['yes', 'no', 'unsure'].includes(po)) fields.push('po')
  if (!['round', 'oneway'].includes(trip)) fields.push('trip')
  if (!from) fields.push('from')
  if (!to) fields.push('to')
  if (!realDate(leaveDate) || leaveDate < today) fields.push('leave_date')
  if (leaveTime && !realTime(leaveTime)) fields.push('leave_time')
  if (round && (!realDate(returnDate) || returnDate < leaveDate)) fields.push('return_date')
  if (round && returnTime && !realTime(returnTime)) fields.push('return_time')
  // A trip back the same day it leaves is back after it leaves, when both
  // times are given; a later day may be back at any hour.
  else if (round && returnTime && leaveTime && returnDate === leaveDate && returnTime <= leaveTime) fields.push('return_time')
  if (!/^\d+$/.test(people) || Number(people) < 1 || Number(people) > 1000) fields.push('people')
  if (fields.length) return { fields }

  return {
    request: {
      lang: body.lang === 'es' ? 'es' : 'en',
      first_name: first,
      last_name: last,
      phone,
      email,
      organization: org || null,
      purchase_order: po as QuoteRequest['purchase_order'],
      trip_type: trip as QuoteRequest['trip_type'],
      pickup: from,
      destination: to,
      leave_on: leaveDate,
      leave_at: leaveTime || null,
      return_on: round ? returnDate : null,
      return_at: round ? returnTime || null : null,
      passengers: Number(people),
      wheelchair_lift: body.lift === 'yes' || body.lift === true,
      details: details || null,
      sender: null,
    },
  }
}

const DAYS = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat']
const MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec']
const day = (v: string): string => {
  const d = new Date(`${v}T00:00:00Z`)
  return `${DAYS[d.getUTCDay()]}, ${MONTHS[d.getUTCMonth()]} ${d.getUTCDate()}`
}
const clock = (v: string): string => {
  const h = Number(v.slice(0, 2))
  const m = v.slice(3)
  return `${h % 12 || 12}${m === '00' ? '' : `:${m}`} ${h < 12 ? 'a.m.' : 'p.m.'}`
}
const short = (v: string, max: number): string => (v.length > max ? `${v.slice(0, max - 1)}…` : v)

// The Tasks row for a request: who it is about, its trip in a line, and its
// facts one to a line, as the office reads a New quote.
export function taskFor(r: QuoteRequest, today: string): Task {
  const name = `${r.first_name} ${r.last_name}`
  const when = r.return_on && r.return_on !== r.leave_on ? `${day(r.leave_on)} to ${day(r.return_on)}` : day(r.leave_on)
  const body = `${r.trip_type === 'round' ? 'Round trip' : 'One way'} from ${short(r.pickup, 60)} to ${short(r.destination, 60)}, ${when}, ${r.passengers} passenger${r.passengers === 1 ? '' : 's'}`
  const lines = [
    `Website request {number}${r.lang === 'es' ? ', sent in Spanish' : ''}`,
    `Name: ${name}`,
    `Phone: ${r.phone}`,
    `Email: ${r.email}`,
    ...(r.organization ? [`Organization: ${r.organization}`] : []),
    `Purchase order: ${{ yes: 'Yes', no: 'No', unsure: 'Not sure yet' }[r.purchase_order]}`,
    `Leaves: ${day(r.leave_on)}${r.leave_at ? `, ${clock(r.leave_at)}` : ''}`,
    ...(r.return_on ? [`Returns: ${day(r.return_on)}${r.return_at ? `, ${clock(r.return_at)}` : ''}`] : []),
    ...(r.wheelchair_lift ? ['Wheelchair lift: needed'] : []),
  ]
  let detail = lines.join('\n')
  if (r.details) {
    const room = 1000 - detail.length - '\nDetails: '.length
    if (room > 20) detail += `\nDetails: ${short(r.details.replace(/\s+/g, ' '), room)}`
  }
  return { who: short(r.organization ?? name, 120), body, detail, due_on: today }
}

export async function handle(req: Request, deps: Deps): Promise<Response> {
  const base = headers(req.headers.get('origin'))
  const reply = (status: number, body: unknown) =>
    new Response(JSON.stringify(body), { status, headers: { ...base, 'Content-Type': 'application/json' } })

  if (req.method === 'OPTIONS') return new Response(null, { status: 204, headers: base })
  if (req.method !== 'POST') return reply(405, { error: 'method' })

  let body: Record<string, unknown> = {}
  try {
    const parsed = await req.json()
    if (parsed && typeof parsed === 'object') body = parsed
  } catch {
    // A body that is not JSON has no fields, and is answered as one.
  }

  // A bot fills the field a person never sees; it is told it succeeded, and
  // nothing is stored.
  if (text(body.website, 200)) return reply(200, { number: null })

  const ip = (req.headers.get('x-forwarded-for') ?? '').split(',')[0].trim() || null
  try {
    const today = deps.today()
    const checked = requestFrom(body, today)
    if ('fields' in checked) return reply(400, { error: 'fields', fields: checked.fields })
    if (!(await deps.verify(text(body.token, 2048), ip))) return reply(403, { error: 'captcha' })
    const sender = await deps.sender(ip)
    if (sender && (await deps.recent(sender)) >= LIMIT_PER_HOUR) return reply(429, { error: 'limit' })
    const request = { ...checked.request, sender }
    const number = await deps.add(request, taskFor(request, today))
    return reply(200, { number })
  } catch {
    return reply(502, { error: 'unavailable' })
  }
}
