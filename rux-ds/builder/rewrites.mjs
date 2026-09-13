// The page builder's transformations — the ONE place a template becomes a
// page. Pure ES module, no imports, so the browser (builder/builder.js) and
// node (tools/check-parity.mjs) run the same code. Roadmap §4.12, creator 3.
//
// exportPage() MUST REPRODUCE the page-writing region tools/new-project.sh
// itself carries — tools/check-parity.mjs extracts it by anchor rather than
// by line number, because a line number written here would go stale the
// first time either file grew a line above it, which is exactly what
// happened once (roadmap §8.6) — BYTE FOR BYTE, including sed's semantics: an
// expression without /g replaces the FIRST match on each line, one with /g
// replaces every match, and `^` anchors a line. The awk step prints the two
// project stylesheet links after EVERY line matching rux-ds's own overrides
// link — templates carry one, so one pair is inserted; the loop mirrors awk
// rather than assuming. check-parity runs the script and diffs; when the two
// disagree, someone decides which is right, and that is the point of having
// the check rather than a promise.
//
// SINCE 2026-09-10 (roadmap §8.4 diff C) A PAGE LINKS /rux-ds/, NOT
// vendor/rux-ds/: nothing of rux-ds is copied into a project any more. Both
// sides changed together in the same commit that removed the copy.
//
// previewPage() is the same page pointed at this repository's own css/, js/,
// assets/ and brand/ (builder.html sits at the root, so `../` would climb
// out; and the preview is a blob: document with no path of its own, so a
// relative reference does not merely climb out — it fails to resolve), with
// one preview-only script placed BEFORE js/theme.js: it sandboxes the
// rux.profile key so the preview shows the theme being configured rather than
// whatever the reader last chose in the sink — js/theme.js writes the stored
// theme over data-theme before first paint, and a same-origin iframe shares
// that storage. The export never carries the shim.

// Every marker line an inserted block gets, and the provenance comment above
// it, are composed by the builder; nothing here invents markup.

const firstPerLine = (lines, from, to) => lines.map(l => l.replace(from, to));
const everywhere = (lines, from, to) => lines.map(l => l.split(from).join(to));

// The five content substitutions the script makes, steps 6–10.
//
// EVERY REPLACEMENT IS A FUNCTION, and that is not a style choice. A STRING
// replacement expands $$, $&, $` and $' — so a product name of `A$&B` inserted
// the whole matched text, and `A$'B` inserted the rest of the line, duplicating
// a close tag. The script escapes its answers with esc() and hands them to sed,
// where a replacement has no such expansion, so the two disagreed on any answer
// carrying those pairs. Worse, the aria-label below has always used
// split().join(), which IS literal: one answer produced two different strings
// on one page, and the header's visible name disagreed with its accessible one.
// Found by tools/check-parity.mjs on its first run, 2026-09-05, not by reading.
//
// This makes the substitution literal. IT DOES NOT ESCAPE HTML, and neither
// does the script: an answer carrying " < > or & still lands unescaped in
// element text and in an attribute value. check-parity says so in its own
// words, builder.html warns, and the decision is rux's — roadmap §4.12.
function content(lines, a) {
  const P = a.prefix ?? 'Rux', N = a.name ?? 'DS', T = a.title ?? `${P} ${N}`, theme = a.theme ?? 'white';
  const gc = a.grid === 'full' ? ' rux--css-grid--full-width' : '';
  return lines.map(l => {
    if (l.startsWith('<html lang="en" data-theme="white">')) l = l.replace('<html lang="en" data-theme="white">', () => `<html lang="en" data-theme="${theme}">`);
    l = l.replace(/<title>[^<]*<\/title>/, () => `<title>${T}</title>`);
    l = l.replace('name--prefix">Rux</span>&nbsp;DS', () => `name--prefix">${P}</span>&nbsp;${N}`);
    l = l.split('aria-label="Rux DS"').join(`aria-label="${P} ${N}"`);
    // The grid's width. Anchored on the two-space indent every template's
    // outer grid opens at, so a nested `rux--css-grid-column` is never touched;
    // the optional group keeps wizard-page's `--with-row-gap`. With `gc` empty
    // the line is rewritten to itself, which is what keeps a capped page
    // byte-identical to the script's -- the same shape as its sed.
    l = l.replace(/^  <div class="rux--css-grid( [^"]*)?">/, (m, g1) => `  <div class="rux--css-grid${g1 ?? ''}${gc}">`);
    return l;
  });
}

// What tools/new-project.sh writes for a template and these answers.
export function exportPage(templateHtml, answers = {}) {
  let lines = templateHtml.split('\n');
  lines = firstPerLine(lines, '"../css/rux.css"', '"/rux-ds/css/rux.css"');
  lines = firstPerLine(lines, '"../css/rux-theme.css"', '"/rux-ds/css/rux-theme.css"');
  lines = firstPerLine(lines, '"../css/rux-overrides.css"', '"/rux-ds/css/rux-overrides.css"');
  // brand/ is the PROJECT'S, not rux-ds's: the script seeds logo.svg beside
  // the page and never overwrites it, so the path must not point at
  // /rux-ds/, which is never the project's to keep a file under. Placed here
  // because that is where the script's own -e sits, and this function
  // reproduces it line for line.
  lines = everywhere(lines, '"../brand/', '"brand/');
  lines = everywhere(lines, '"../assets/', '"/rux-ds/assets/');
  lines = everywhere(lines, '"../js/', '"/rux-ds/js/');
  lines = content(lines, answers);
  const out = [];
  for (const l of lines) {
    out.push(l);
    if (l.includes('href="/rux-ds/css/rux-overrides.css"')) {
      out.push('<link rel="stylesheet" href="rux-theme.css">', '<link rel="stylesheet" href="rux-overrides.css">');
    }
  }
  return out.join('\n');
}

// The storage sandbox, inline, before js/theme.js. Only the profile key is
// intercepted; everything else the page might store behaves as it would.
const SHIM = `<script>/* preview only — not in the export */(()=>{const K='rux.profile',m=new Map(),P=Storage.prototype,g=P.getItem,s=P.setItem,r=P.removeItem;P.getItem=function(k){return k===K?(m.has(K)?m.get(K):null):g.call(this,k)};P.setItem=function(k,v){k===K?m.set(K,String(v)):s.call(this,k,v)};P.removeItem=function(k){k===K?m.delete(K):r.call(this,k)}})();</script>`;

// The same page, served from this repository, for the preview iframe.
// `root` is '' for a srcdoc preview (relative to builder.html's own URL) or an
// absolute URL prefix for a Blob-URL one.
export function previewPage(templateHtml, answers = {}, root = '') {
  let lines = templateHtml.split('\n');
  lines = firstPerLine(lines, '"../css/rux.css"', `"${root}css/rux.css"`);
  lines = firstPerLine(lines, '"../css/rux-theme.css"', `"${root}css/rux-theme.css"`);
  lines = firstPerLine(lines, '"../css/rux-overrides.css"', `"${root}css/rux-overrides.css"`);
  lines = everywhere(lines, '"../brand/', `"${root}brand/`);
  lines = everywhere(lines, '"../assets/', `"${root}assets/`);
  lines = everywhere(lines, '"../js/', `"${root}js/`);
  lines = content(lines, answers);
  const out = [];
  for (const l of lines) {
    if (l.includes(`src="${root}js/theme.js"`)) out.push(SHIM);
    out.push(l);
  }
  return out.join('\n');
}

// Just the composed body, for pasting into a page that already has a shell.
export function bodyOnly(pageHtml) {
  const m = pageHtml.match(/<main\b[\s\S]*?<\/main>/);
  return m ? m[0] : '';
}

// A template with each slot's interior rebuilt from its record and the blocks
// named in it — unedited, this is the template itself, which is what the
// round trip proves. `byName` maps block name → { open, html, close }.
export function compose(templateHtml, slots, byName) {
  let html = templateHtml;
  // Replace from the last slot backwards so earlier offsets stay valid.
  for (const s of [...slots].sort((a, b) => b.start - a.start)) {
    const built = s.pre + s.blocks.map((n, i) => (i ? s.gaps[i - 1] : '') + byName[n].open + byName[n].html + byName[n].close).join('') + s.post;
    html = html.slice(0, s.start) + built + html.slice(s.end);
  }
  return html;
}

// ──────────────────────────────────────────────────────────────────────────
// TEXT FIELDS — which text in a block a person may edit, and how an edit is
// written back. Pure string logic with no DOM dependency, so the browser and
// node run it identically, like everything else here.
//
// WHY A TOKENIZER AND NOT A REGEX. A flat `<tag>TEXT</tag>` match is lossless
// on write but has no idea what a comment, a <script>/<style> body or SVG
// descendant text is — and this repository's own comments routinely contain
// literal tag examples. Those would be offered as editable fields, and worse,
// would shift the recorded offsets of the real ones. So the string is walked
// once with an explicit open-element stack, and the ancestor test below is a
// real ancestor walk rather than a fixed-width lookback.
//
// LIMITATION, stated rather than guarded: an attribute value is assumed to
// carry no literal `>`. tools/lib/blocks.mjs's own marker regex already makes
// the same simplifying assumption about this corpus's attested markup.

// Comments and the three opaque bodies are entered and skipped WHOLE: the
// stack is never touched and nothing inside is ever visited. Anything else
// that looks like a tag is a generic open, close or self-closing token.
const TOKEN = /<!--[\s\S]*?-->|<script\b[\s\S]*?<\/script\s*>|<style\b[\s\S]*?<\/style\s*>|<svg\b[\s\S]*?<\/svg\s*>|<\/?[a-zA-Z][^>]*>/g;

// Never pushed, whether or not written with a trailing slash. Every void
// element in this corpus is a BARE tag — `<input id="f-n1" type="checkbox">`
// (templates/form-page.html) is exactly as common as a self-closed `<use/>` —
// and pushing one would wait forever for a close that never comes, corrupting
// every ancestry and leaf test for the rest of the block.
const VOID = new Set(['area', 'base', 'br', 'col', 'embed', 'hr', 'img', 'input',
  'link', 'meta', 'param', 'source', 'track', 'wbr']);

// Text a behaviour module owns. Editing it here would either be overwritten at
// runtime or would edit something no reader can see. Traced by grepping every
// `.textContent =` assignment across js/.
const HIDDEN = /rux--visually-hidden|rux--assistive-text/;   // any ancestor
const OWNED_ANCESTOR = /rux--batch-summary__para/;           // js/data-table.js:148
const OWNED_LEAF = /rux--toggle__text|rux--list-box__label|rux--tooltip-content/;

const attrOf = (tag, name) => {
  const m = tag.match(new RegExp(`\\b${name}\\s*=\\s*("[^"]*"|'[^']*'|[^\\s>]+)`, 'i'));
  return m ? m[1].replace(/^["']|["']$/g, '') : '';
};

const tagName = (tok, from) => tok.slice(from).replace(/[\s/>][\s\S]*$/, '').toLowerCase();

// WHERE A FIELD SITS, so a caller can say what it IS rather than counting
// boxes. Structure only: this module reports the markup, and the page decides
// what to call it — the vocabulary is builder.js's, not a contract here.
//
// `at` IS THE GROUP IDENTITY, and it is why the chain carries offsets. A tag
// and a class cannot tell two structurally identical form items apart, and a
// cell cannot name its own row without one. `contentStart` is unique within a
// block and stable across everything this module does, so two fields sharing
// an ancestor's `at` are in the same group, by definition rather than by guess.
const contextOf = (ancestors, leaf) => ({
  chain: ancestors.map(a => ({ tag: a.name, cls: a.cls, at: a.contentStart, nth: a.nth })),
  cls: leaf.cls,
  nth: leaf.nth,
});

function excluded(ancestors, leaf) {
  if (OWNED_LEAF.test(leaf.cls)) return true;
  for (const el of [...ancestors, leaf]) {
    if (el.ariaHidden || HIDDEN.test(el.cls) || OWNED_ANCESTOR.test(el.cls)) return true;
  }
  return false;
}

// Every editable text field in `html`, in document order, as [start, end)
// offsets into that exact string, each carrying the lowercased tag name of the
// element holding it so a caller can say WHERE the text sits without parsing
// again. A field is text sitting immediately between
// an element's own open tag and its own matching close tag with NOTHING else
// in between — no nested tag, no comment, no opaque span — and non-empty once
// trimmed. That is "leaf, text-only" derived structurally rather than guessed
// at with a `[^<>]*` pattern, so mixed content (`<p>a <b>b</b> c</p>`) yields
// only the inner `<b>`, which is the known limitation, not a bug.
export function textFieldsOf(html) {
  const fields = [], stack = [], rootKids = new Map();
  TOKEN.lastIndex = 0;
  for (let m; (m = TOKEN.exec(html));) {
    const tok = m[0], top = stack[stack.length - 1];

    // A comment or an opaque body is content, not structure — but it does
    // interrupt whatever holds it, so that element is no longer text-only.
    if (tok.startsWith('<!--') || /^<(script|style|svg)\b/i.test(tok)) {
      if (top) top.interrupted = true;
      continue;
    }

    if (tok.startsWith('</')) {
      const name = tagName(tok, 2);
      let at = -1;
      for (let i = stack.length - 1; i >= 0; i--) if (stack[i].name === name) { at = i; break; }
      if (at < 0) { if (top) top.interrupted = true; continue; }   // stray close
      const el = stack[at], wasTop = at === stack.length - 1;
      stack.length = at;                                           // discard anything left open
      if (wasTop && !el.interrupted) {
        const raw = html.slice(el.contentStart, m.index);
        if (raw.trim() !== '' && !excluded(stack, el)) fields.push({ start: el.contentStart, end: m.index, raw, name: el.name, context: contextOf(stack, el) });
      }
      continue;
    }

    // An open tag. Whatever holds it now has a child, so it is not text-only.
    if (top) top.interrupted = true;
    const name = tagName(tok, 1);
    // NTH AMONG SIBLINGS OF THE SAME TAG, counted on the parent and counted
    // for EVERY element including the void ones — a void sibling is still a
    // sibling, so "Option 2" must not shift because an <input> sits between.
    const kids = top ? (top.kids ??= new Map()) : rootKids;
    const nth = kids.set(name, (kids.get(name) ?? 0) + 1).get(name);
    if (VOID.has(name) || /\/\s*>$/.test(tok)) continue;
    stack.push({
      name,
      cls: attrOf(tok, 'class'),
      ariaHidden: attrOf(tok, 'aria-hidden') === 'true',
      contentStart: m.index + tok.length,
      interrupted: false,
      nth,
      kids: null,
    });
  }
  return fields;
}

// Only `&`, `<` and `>`. Quotes are left alone: a field is text between tags,
// never inside an attribute, so escaping them would show the entity itself.
const escapeText = s => s.split('&').join('&amp;').split('<').join('&lt;').split('>').join('&gt;');

// `html` with the fields named in `edits` ({ index: text }) replaced, and every
// other byte — self-closing syntax, bare boolean attributes, the indentation
// inside an untouched multiline field — left exactly as it was. The field list
// is always read from the ORIGINAL html, so blanking field 0 can never shift
// field 1's index, and an untouched field is never spliced and so never
// re-escaped.
export function applyTextEdits(html, edits) {
  let out = '', cursor = 0;
  textFieldsOf(html).forEach((f, i) => {
    if (!Object.hasOwn(edits, i)) return;
    out += html.slice(cursor, f.start) + escapeText(String(edits[i]));
    cursor = f.end;
  });
  return out + html.slice(cursor);
}

// ──────────────────────────────────────────────────────────────────────────
// LINK TARGETS — the one editable attribute, and the order it must run in.
//
// WHERE A LINK GOES is content in the sense that matters: the reader wrote the
// words, and the words point somewhere. Every other attribute stays closed —
// alt, src, placeholder and aria-label are not offered, deliberately.
//
// NOT A FRAGMENT INTO THE BLOCK ITSELF. That href is a control relation, and
// instanceOf suffixes it when it names an id inside the block, so offering it
// as content would put two writers on one value. A fragment pointing OUTSIDE
// the block is offered, since 2026-09-06 (linksOf says why): the catalogue
// then holds twelve editable links, eleven of them fragments — the sink
// breadcrumb's three, the templates' `#main-content` Home links — against
// one non-fragment (dashboard-page/table-and-activity, "All activity" → `./`).
//
// EDITS FIRST, INSTANCING LAST — AND THEY DO NOT COMMUTE. Measured, not
// assumed, on a fixture because no shipped block has both an id and a real
// link:
//
//   edit `./` → `#target`, then instance 2:   href="#target-2"   ← what ships
//   instance 2, then edit `./` → `#target`:   href="#target"
//
// The first is right: the reader means this instance's copy. So composePage
// applies text, then links, then instanceOf, and page.mjs states the same
// order. A caller that reverses it gets the second answer, silently.
//
// A SEPARATE LIST FROM textFieldsOf, so a link neither shifts a text field's
// index nor invalidates a draft written before links existed.
const A_TAG = /^<a\b/i;
const HREF = /\bhref\s*=\s*("[^"]*"|'[^']*'|[^\s>]+)/i;
const unquote = v => (v[0] === '"' || v[0] === "'") ? v.slice(1, -1) : v;

// Attribute values need what text does NOT: a quote. escapeText leaves quotes
// alone by design, and a value can arrive double-quoted, single-quoted or bare
// — so the write emits ONE form, double-quoted, whatever the form in, and an
// apostrophe or a space in the value cannot terminate or split it.
const escapeAttr = s => s.split('&').join('&amp;').split('"').join('&quot;')
  .split('<').join('&lt;').split('>').join('&gt;');

// Every editable link in document order, as [start, end) over the WHOLE href
// attribute — name, delimiters and value — because the write replaces the
// attribute rather than splicing inside its quotes. `text` is the anchor's own
// words, flattened, for naming the field; it is never written back.
//
// A FRAGMENT HREF IS SKIPPED ONLY WHEN ITS TARGET IS INSIDE THE BLOCK. That
// one is a control relation instanceOf owns — it re-suffixes the id and the
// href together so a second copy reaches itself — and offering it would let
// an edit fight the instancing. A fragment pointing OUTSIDE the block is an
// ordinary destination: the sink breadcrumb's three `#breadcrumb` are its own
// sink section, dead on any page it is placed on, and the templates' Home
// links are `#main-content`, the page's own main. Until 2026-09-06 every `#`
// was skipped, which shipped those three dead links through a promoted
// suggestion (roadmap §4.12, stage 12's composed outputs); rux ruled to
// narrow the skip. Measured before narrowing: no block carried an in-block
// fragment at all, and none of the seven with out-of-block ones offered any
// other link, so no draft's link index moves.
export function linksOf(html) {
  const links = [];
  const ids = new Set();
  TOKEN.lastIndex = 0;
  for (let m; (m = TOKEN.exec(html));) {
    const tok = m[0];
    if (tok.startsWith('<!--') || tok.startsWith('</') || /^<(script|style|svg)\b/i.test(tok)) continue;
    const id = attrOf(tok, 'id');
    if (id) ids.add(id);
  }
  TOKEN.lastIndex = 0;
  for (let m; (m = TOKEN.exec(html));) {
    const tok = m[0];
    if (!A_TAG.test(tok)) continue;
    const hm = tok.match(HREF);
    if (!hm) continue;
    const value = unquote(hm[1]);
    if (value.startsWith('#') && ids.has(value.slice(1))) continue;
    const close = html.indexOf('</a', m.index + tok.length);
    const text = close < 0 ? '' : html.slice(m.index + tok.length, close).replace(/<[^>]*>/g, ' ').replace(/\s+/g, ' ').trim();
    links.push({ start: m.index + hm.index, end: m.index + hm.index + hm[0].length, value, text });
  }
  return links;
}

// `html` with the links named in `links` ({ index: value }) repointed, every
// other byte untouched. An UNEDITED link is never spliced, so its own quoting
// survives exactly — which is what makes normalising the edited ones safe.
export function applyLinkEdits(html, links) {
  let out = '', cursor = 0;
  linksOf(html).forEach((l, i) => {
    if (!Object.hasOwn(links, i)) return;
    out += html.slice(cursor, l.start) + `href="${escapeAttr(String(links[i]))}"`;
    cursor = l.end;
  });
  return out + html.slice(cursor);
}

// ──────────────────────────────────────────────────────────────────────────
// VARIANTS — the two things about a block that are a CHOICE, not content.
//
// How big its buttons are and how tight its table rows are. Both are class
// swaps with spellings Carbon and this repository already attest; nothing here
// invents one, and every value written is checked against css/rux.css by the
// stage's own suite.
//
// THE KEY IS AN ORDINAL, NOT AN OFFSET, and that is the whole of what rux's
// review corrected. Keying a group by its content offset breaks the moment an
// earlier text or link edit changes length: measured on templates/form-page/form,
// one longer field moved the button set from 7255 to 7289, so the stored key
// matched nothing and the reader's choice silently did not apply. Ordinals are
// what `edits` and `links` already use, and they are stable — proved over every
// block carrying a group, under a length-changing text edit, a link edit and
// instancing.
//
// THE SIZE MATRIX IS ASYMMETRIC because the stylesheet is. There is no
// rux--btn--lg and no rux--btn--xl: @carbon/styles' own _button.scss writes size
// rules for xs, sm, md and expressive only, which is why sink/buttons.html says
// "btn--xl and btn--lg stay off for the usual §4.1.12 reason: no rule in the
// CSS." Large and extra large are the layout class alone. Large is ALSO the
// unclassed default, through .rux--btn's clamp reading
// var(--rux-layout-size-height, var(--rux-layout-size-height-lg)) — so a bare
// button is already large, and choosing Large writes the class explicitly
// rather than leaving the reader to infer it (rux's call, 2026-09-05).
const SIZES = {
  xs: ['rux--btn--xs', 'rux--layout--size-xs'],
  sm: ['rux--btn--sm', 'rux--layout--size-sm'],
  md: ['rux--btn--md', 'rux--layout--size-md'],
  lg: ['rux--layout--size-lg'],
  xl: ['rux--layout--size-xl'],
};
const DENSITIES = ['xs', 'sm', 'md', 'lg', 'xl'];

// THE ONE SOURCE OF WHAT A GROUP OFFERS, derived from the tables above and
// returned on every group by variantsOf. builder.js reads it for the select and
// check-blocks reads it to validate a recommendation, so a value cannot be
// offered in one place and refused in the other.
export const valuesFor = kind => (kind === 'table' ? [...DENSITIES] : Object.keys(SIZES));

// ICON-ONLY IS EXCLUDED and the stylesheet says why: .rux--btn--icon-only sets
// inline-size AND block-size from the size token, so a swap resizes the hit
// target in both axes, and Carbon's own size rules are written
// :not(.rux--btn--icon-only). <a class="rux--btn"> is excluded too — no anchor
// carries cds--btn in any capture.
const qualifies = (name, cls) => name === 'button' && /\brux--btn\b/.test(cls) && !/\brux--btn--icon-only\b/.test(cls);
const BTN_GROUP = /\brux--btn-set\b|\brux--table-toolbar\b/;

const sizeOf = cls => (cls.match(/\brux--layout--size-(xs|sm|md|lg|xl)\b/) ?? cls.match(/\brux--btn--(xs|sm|md)\b/) ?? [, 'lg'])[1];
const densityOf = cls => (cls.match(/\brux--data-table--(xs|sm|md|lg|xl)\b/) ?? [, 'lg'])[1];

// Every swappable group in document order. `at` is here so the panel can name
// and order what it shows; it is NEVER the stored key.
export function variantsOf(html) {
  const groups = [], stack = [];
  const span = (m, tok) => {
    const a = attrsOf(tok).find(x => x.name === 'class');
    return a ? { start: m.index + a.start, end: m.index + a.end } : null;
  };
  TOKEN.lastIndex = 0;
  for (let m; (m = TOKEN.exec(html));) {
    const tok = m[0];
    if (tok.startsWith('<!--') || /^<(script|style|svg)\b/i.test(tok)) continue;
    if (tok.startsWith('</')) {
      const name = tagName(tok, 2);
      for (let i = stack.length - 1; i >= 0; i--) if (stack[i].name === name) { stack.length = i; break; }
      continue;
    }
    const name = tagName(tok, 1);
    const cls = attrOf(tok, 'class');
    const closed = VOID.has(name) || /\/\s*>$/.test(tok);
    const at = m.index + tok.length;

    if (name === 'table' && /\brux--data-table\b/.test(cls)) {
      const t = span(m, tok);
      if (t) groups.push({ kind: 'table', where: 'table', at, current: densityOf(cls), targets: [t] });
    } else if (BTN_GROUP.test(cls)) {
      // The container opens a group; its qualifying buttons join it, so one
      // choice moves the whole set rather than each button separately.
      const g = { kind: 'buttons', where: /btn-set/.test(cls) ? 'btn-set' : 'toolbar', at, current: null, targets: [] };
      groups.push(g);
      if (!closed) stack.push({ name, group: g });
      continue;
    } else if (qualifies(name, cls)) {
      const t = span(m, tok);
      const host = stack.findLast(s => s.group);
      if (t && host) { host.group.targets.push(t); host.group.current ??= sizeOf(cls); }
      else if (t) groups.push({ kind: 'buttons', where: 'lone', at, current: sizeOf(cls), targets: [t] });
    }
    if (!closed) stack.push({ name, group: null });
  }
  // A set or toolbar holding no qualifying button is not a group: the reader
  // would be offered a control that changes nothing.
  //
  // `values` IS RETURNED, NOT RE-DECLARED BY THE CALLER. Until 2026-09-05 the
  // list of offered values existed twice — SIZES and DENSITIES here, and a
  // second copy in builder.js — and stage 11's validator would have made a
  // third. rux's review: one shared source, read off this function. The caller
  // supplies only the display words.
  return groups.filter(g => g.targets.length)
    .map(g => ({ ...g, current: g.current ?? 'lg', values: valuesFor(g.kind) }));
}

const rewriteClass = (kind, cls, value) => kind === 'table'
  ? `${cls.replace(/\s*\brux--data-table--(?:xs|sm|md|lg|xl)\b/g, '')} rux--data-table--${value}`.replace(/\s+/g, ' ').trim()
  : `${cls.replace(/\s*\brux--btn--(?:xs|sm|md)\b/g, '').replace(/\s*\brux--layout--size-(?:xs|sm|md|lg|xl)\b/g, '')} ${SIZES[value].join(' ')}`.replace(/\s+/g, ' ').trim();

// `html` with the groups named in `variants` ({ index: value }) reclassed, and
// every other byte untouched. A GROUP ABSENT FROM THE MAP IS NEVER SPLICED, so
// "as attested" is byte-identical by construction rather than by care.
export function applyVariants(html, variants) {
  const groups = variantsOf(html);
  const spans = [];
  groups.forEach((g, i) => {
    if (!Object.hasOwn(variants, i)) return;
    const value = String(variants[i]);
    if (g.kind === 'table' ? !DENSITIES.includes(value) : !Object.hasOwn(SIZES, value)) return;
    for (const t of g.targets) spans.push({ ...t, value: rewriteClass(g.kind, html.slice(t.start, t.end), value) });
  });
  spans.sort((a, b) => a.start - b.start);
  let out = '', cursor = 0;
  for (const s of spans) { out += html.slice(cursor, s.start) + s.value; cursor = s.end; }
  return out + html.slice(cursor);
}

// ──────────────────────────────────────────────────────────────────────────
// INSTANCE IDENTITY — the same block twice on one page, each copy its own.
//
// A block's ids are written once, in its source. Inserted twice, every id is
// duplicated, and a duplicate id does not error — it MIS-BINDS: `<label
// for="stl-1">` resolves to the FIRST #stl-1 in the document, so the second
// copy's label drives the first copy's radio. instanceOf(html, n) gives copy n
// its own identity; it is the rewrite roadmap §4.12 declined to ship before it
// was measured. Measured 2026-09-05 over all 33 blocks: 51 ids in 9 blocks;
// every for, aria-controls and aria-labelledby (49) names an id inside its own
// block; the one data-rux-open ("wizard-cancel") and every href="#…" (52
// sprite <use>, 10 page anchors) point OUT of theirs.
//
// TWO CONDITIONS, both required, and neither alone is right:
//   1. the attribute can carry an id reference — the HTML and ARIA IDREF
//      attributes in REF_CARRYING, href and xlink:href only when the value
//      starts with `#`, and this repository's data-rux-open. Spelling alone
//      is not a reference: <input id="choice" value="choice"> must keep its
//      submitted value, so value, class and name are never candidates.
//   2. the id it names is DEFINED IN THIS BLOCK. That is what leaves
//      data-rux-open="wizard-cancel" alone (its dialog is frame, not block —
//      suffixing by attribute name alone would break the wizard's Cancel) and
//      every <use href="#i-…"> alone (the sprite is the page's), and what
//      makes an in-block anchor follow its target with no rule of its own.
// The rewrite is therefore computed per block, never a fixed list of what to
// suffix. The stated limitation: an attribute that gains reference semantics
// later must be added to REF_CARRYING, or its references stay unrewritten.
//
// ONE EXCEPTION WITH ITS OWN REASON. `name` on <input type="radio"> is not an
// idref but a document-scoped grouping key: two copies sharing name="sl" are
// ONE radio group, and checking a plan in copy two unchecks it in copy one.
// It is suffixed the same way. No other name= is touched — a text input's
// name is a submission key, and renaming it has no measured reason.
//
// THE INSTANCE NUMBER is a positive integer, allocated uniquely per occurrence
// of a source block on a page, kept when the instance moves, and not reused
// while the page holds it. Allocation is the page model's, not this function's.
// Instance 1 IS the block, byte for byte, so every page that uses a block
// once is untouched and the round trip check-blocks asserts stays exact.
// Anything that is not a positive integer throws: treating 0 or "2" as
// instance 1 would hide a caller's bug behind a block that looks fine.
//
// ALWAYS DERIVED FROM THE MANIFEST'S html, never from an already-instanced
// string: instanceOf(instanceOf(h, 2), 2) suffixes twice, by design, because
// a resolver cannot tell stl-1-2 from an id that was always spelled that way.
// The same contract applyTextEdits states, and the two commute — text edits
// touch no attribute and this touches no text — so a field's index survives.
//
// Comments, <script> and <style> bodies are opaque, as for text fields; <svg>
// is NOT, because <svg aria-labelledby="t"><title id="t"> is the accessible
// svg idiom and both halves must move together. Attribute values are read in
// the three forms attrOf accepts and, as above, assumed to carry no literal
// `>`.

const TAGS = /<!--[\s\S]*?-->|<script\b[\s\S]*?<\/script\s*>|<style\b[\s\S]*?<\/style\s*>|<\/?[a-zA-Z][^>]*>/g;
const ATTR = /([^\s=\/"'>]+)\s*=\s*(?:"([^"]*)"|'([^']*)'|([^\s>]+))/g;

const REF_CARRYING = new Set(['for', 'form', 'list', 'headers', 'popovertarget',
  'aria-activedescendant', 'aria-controls', 'aria-describedby', 'aria-details',
  'aria-errormessage', 'aria-flowto', 'aria-labelledby', 'aria-owns',
  'href', 'xlink:href', 'data-rux-open']);
const FRAGMENT = new Set(['href', 'xlink:href']);

// Every attribute of one open tag: name, value, and where the value sits in
// the tag with its quotes excluded, so a rewrite splices the value and nothing
// else.
function attrsOf(tok) {
  const out = [];
  ATTR.lastIndex = 0;
  for (let a; (a = ATTR.exec(tok));) {
    const value = a[2] ?? a[3] ?? a[4];
    const end = a.index + a[0].length - (a[4] === undefined ? 1 : 0);
    out.push({ name: a[1].toLowerCase(), value, start: end - value.length, end });
  }
  return out;
}

// Instance `n` of a block: its own ids, every in-block reference following
// them, and its radio groups its own. Instance 1 is the block itself.
export function instanceOf(html, n) {
  if (!Number.isInteger(n) || n < 1) throw new TypeError(`instanceOf: the instance must be a positive integer, got ${JSON.stringify(n)}`);
  if (n === 1) return html;

  const tags = [];
  TAGS.lastIndex = 0;
  for (let m; (m = TAGS.exec(html));) {
    const tok = m[0];
    if (tok.startsWith('<!--') || tok.startsWith('</') || /^<(script|style)\b/i.test(tok)) continue;
    tags.push({ at: m.index, tok, attrs: attrsOf(tok) });
  }
  const ids = new Set();
  for (const t of tags) for (const a of t.attrs) if (a.name === 'id') ids.add(a.value);

  const suffixed = id => `${id}-${n}`;
  let out = '', cursor = 0;
  for (const t of tags) {
    const radio = tagName(t.tok, 1) === 'input' && (t.attrs.find(a => a.name === 'type')?.value ?? '').toLowerCase() === 'radio';
    for (const a of t.attrs) {
      let next = null;
      if (a.name === 'id') { if (ids.has(a.value)) next = suffixed(a.value); }
      else if (a.name === 'name') { if (radio) next = suffixed(a.value); }
      else if (REF_CARRYING.has(a.name)) {
        // Token by token with the whitespace kept: aria-labelledby holds several.
        const fragment = FRAGMENT.has(a.name);
        next = a.value.split(/(\s+)/).map(tk => {
          const hash = tk.startsWith('#');
          if (hash !== fragment) return tk;
          const id = hash ? tk.slice(1) : tk;
          return ids.has(id) ? (hash ? '#' : '') + suffixed(id) : tk;
        }).join('');
        if (next === a.value) next = null;
      }
      if (next === null) continue;
      out += html.slice(cursor, t.at + a.start) + next;
      cursor = t.at + a.end;
    }
  }
  return out + html.slice(cursor);
}

// ──────────────────────────────────────────────────────────────────────────
// INTEGRITY — two readings of a composed page, for the status line. Not a
// transformation: nothing is changed. A duplicate id is the defect instanceOf
// exists to prevent, and an unresolved reference is what an inserted block
// leaves behind when its target was frame (the wizard's Cancel opens a
// dialog that lives outside every block) or a placeholder (a breadcrumb's
// links point at the sink section they were captured in). Both are SHOWN and
// neither is refused: the arrangement is the reader's, and a reading they
// can see is worth more than a rule they cannot. The same walker and the
// same reference-carrying set as instanceOf, so the two cannot disagree
// about what a reference is; sprite <use> resolves because <svg> is walked
// and every template inlines the sprite's <symbol id="i-…">.
export function integrity(html) {
  const seen = new Map();
  const refs = [];
  TAGS.lastIndex = 0;
  for (let m; (m = TAGS.exec(html));) {
    const tok = m[0];
    if (tok.startsWith('<!--') || tok.startsWith('</') || /^<(script|style)\b/i.test(tok)) continue;
    for (const a of attrsOf(tok)) {
      if (a.name === 'id') seen.set(a.value, (seen.get(a.value) ?? 0) + 1);
      else if (REF_CARRYING.has(a.name)) {
        const fragment = FRAGMENT.has(a.name);
        for (const tk of a.value.split(/\s+/)) {
          if (!tk || tk.startsWith('#') !== fragment) continue;
          const id = fragment ? tk.slice(1) : tk;
          if (id) refs.push({ attr: a.name, id });
        }
      }
    }
  }
  return {
    duplicateIds: [...seen].filter(([, n]) => n > 1).map(([id]) => id),
    unresolved: refs.filter(r => !seen.has(r.id)),
  };
}
