// The signed copy: the form's own blank PDF with each answer, the day and the
// drawn signature written onto its pages in ink the colour of a pen. It needs
// only pdf-lib, so it also runs on a real blank outside the Edge runtime.

import { PDFDict, PDFDocument, PDFName, type PDFFont, StandardFonts, rgb } from 'npm:pdf-lib@1.17.1'
import type { Op } from './handler.ts'

// Ink the colour of a pen, so a printed copy reads as filled in.
const INK = rgb(0.04, 0.12, 0.4)
// The margin of a page added for a box's overflow, an inch as a letter has.
const MARGIN = 72

// Words wrapped to a width, each paragraph on its own lines.
function wrap(text: string, font: PDFFont, size: number, width?: number): string[] {
  const lines: string[] = []
  for (const para of text.split('\n')) {
    if (!width) { lines.push(para); continue }
    let line = ''
    for (const word of para.split(/\s+/)) {
      const next = line ? `${line} ${word}` : word
      if (line && font.widthOfTextAtSize(next, size) > width) { lines.push(line); line = word } else line = next
    }
    lines.push(line)
  }
  return lines
}

// Takes off the blank's own fillable fields: an unticked box's appearance
// paints white over the X written under it, and a signed copy opens with
// nothing left to type into, as a signed paper is fixed.
function withoutFields(pdf: PDFDocument) {
  const Annots = PDFName.of('Annots'), Subtype = PDFName.of('Subtype'), Widget = PDFName.of('Widget')
  for (const page of pdf.getPages()) {
    const annots = page.node.Annots()
    if (!annots) continue
    const kept = annots.asArray().filter(ref => pdf.context.lookup(ref, PDFDict).get(Subtype) !== Widget)
    if (kept.length) page.node.set(Annots, pdf.context.obj(kept))
    else page.node.delete(Annots)
  }
  pdf.catalog.delete(PDFName.of('AcroForm'))
}

export async function signedCopy(blank: Uint8Array, ops: Op[], signature: Uint8Array): Promise<Uint8Array> {
  const pdf = await PDFDocument.load(blank)
  withoutFields(pdf)
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
    // A box wraps its words to its width. What its height cannot hold goes on
    // pages added at the end, and its last line says which, so no answer is
    // ever cut short.
    const lines = wrap(op.text, font, op.size, op.w)
    const lead = op.size * 1.25
    const fit = op.h ? Math.max(2, Math.floor(op.h / lead)) : lines.length
    const here = lines.length > fit ? lines.slice(0, fit - 1) : lines
    const rest = lines.slice(here.length)
    if (rest.length) here.push(`(Continued on page ${pdf.getPageCount() + 1}.)`)
    here.forEach((text, i) => page.drawText(text, { x: op.x, y: op.y - i * lead, size: op.size, font, color: INK }))
    if (!rest.length) continue
    const { width, height } = page.getSize()
    const room = Math.floor((height - 2 * MARGIN) / lead) - 2
    for (let i = 0; i < rest.length; i += room) {
      const more = pdf.addPage([width, height])
      more.drawText(`Continued from page ${op.page + 1}`, { x: MARGIN, y: height - MARGIN, size: op.size, font, color: INK })
      rest.slice(i, i + room).forEach((text, j) =>
        more.drawText(text, { x: MARGIN, y: height - MARGIN - (j + 2) * lead, size: op.size, font, color: INK }))
    }
  }
  return await pdf.save()
}
