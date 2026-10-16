// A PDF's text, page by page, for `read_trip_document`. It reads the text a
// PDF carries and nothing more: a scanned page has none, and is said to have
// none rather than guessed at.

// One exact version, as check-connector.mjs holds every import to.
import { extractText, getDocumentProxy } from 'npm:unpdf@1.8.1'

// The most text one answer carries, so a long file cannot swamp the reader.
const MOST = 120_000

export type PdfText =
  | { readable: false; why: string }
  | { readable: true; pages: number; text: { page: number; text: string }[]; no_text: number[]; cut?: string }

/** Whether the bytes start as a PDF does, whatever the file is called. */
export function isPdf(bytes: Uint8Array) {
  return new TextDecoder().decode(bytes.subarray(0, 1024)).includes('%PDF-')
}

/** Each page's text, its runs of spaces closed up, and the pages with none. */
export async function pdfText(bytes: Uint8Array): Promise<PdfText> {
  if (!isPdf(bytes)) return { readable: false, why: 'It is not a PDF, and only a PDF is read.' }
  let pages: string[], total: number
  try {
    const pdf = await getDocumentProxy(bytes)
    const read = await extractText(pdf, { mergePages: false })
    pages = read.text as string[]
    total = read.totalPages
  } catch (e) {
    return { readable: false, why: `The PDF could not be opened: ${(e as Error).message}` }
  }
  const tidy = pages.map((p) => p.split('\n').map((l) => l.replace(/[ \t]+/g, ' ').trim()).filter(Boolean).join('\n'))
  const no_text = tidy.flatMap((p, i) => (p ? [] : [i + 1]))
  const text: { page: number; text: string }[] = []
  let used = 0, cut: string | undefined
  for (const [i, p] of tidy.entries()) {
    if (!p) continue
    if (used + p.length > MOST) {
      cut = `Only pages 1 to ${i} are given; the file runs to ${total} pages and the rest is too long for one answer.`
      break
    }
    used += p.length
    text.push({ page: i + 1, text: p })
  }
  return { readable: true, pages: total, text, no_text, ...(cut ? { cut } : {}) }
}
