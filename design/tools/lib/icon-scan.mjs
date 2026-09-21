//
// WHICH SYMBOLS A PAGE ACTUALLY NAMES, and a sprite cut down to them.
//
// Every page inlines the sprite, because a <use> pointing at another file draws
// nothing in Safari or over file://. Inlining ALL of it meant a Notes page
// naming four icons carried 78 -- 23 KB, 11% of the page -- and meant a second
// icon family would be paid for by every page that had no use for it.
//
// WHAT COUNTS AS NAMING ONE. The literal text `#i-name` or `#m-name`, in the
// page's own markup and in every local script it loads. A page's icons are not
// all in its HTML: the scheduler's board builds its bars in data.js, which
// holds 90 of them. Every reference in this project is a literal, checked --
// none is assembled from a variable -- which is what makes reading the source
// enough. A name that WERE assembled would be missed here and its symbol left
// out, so the rule is that an icon name is written whole, and check-app fails a
// page referencing a symbol its own block does not carry.
//
// A TEMPLATE KEEPS THE WHOLE SPRITE. It is a starting point to copy, not a page
// that ships, and the next icon someone adds to their copy should already be
// there. A page that ships carries what it names.
//
import { readFileSync, existsSync } from 'node:fs';
import { dirname, join, resolve } from 'node:path';

const SPRITE_BLOCK = /<!-- SPRITE:BEGIN[\s\S]*?<!-- SPRITE:END -->/;
const NAME = /#((?:i|m)-[a-z0-9-]+)/g;

// The local scripts a page loads, resolved. A root-absolute src is the site's,
// so it needs the site root; an external one is nobody's to read.
function scriptsOf(html, pagePath, root) {
  const out = [];
  for (const m of html.matchAll(/<script[^>]+src=["']([^"']+)["']/g)) {
    const src = m[1];
    if (/^(https?:)?\/\//.test(src)) continue;
    const at = src.startsWith('/')
      ? join(root, src.slice(1))
      : resolve(dirname(pagePath), src);
    if (existsSync(at)) out.push(at);
  }
  return out;
}

/* The symbol ids a page needs, sorted. `root` is the site root a `/…` src is
   resolved against; it defaults to the page's own directory, which is right
   for a page that loads only its neighbours. */
export function symbolsFor(pagePath, root = dirname(pagePath)) {
  const html = readFileSync(pagePath, 'utf8');
  // Without the sprite itself: its symbols are `id="i-…"` with no hash, so they
  // would not match anyway, but reading a page's own sprite to decide what its
  // sprite should hold is a loop worth not writing.
  const sources = [html.replace(SPRITE_BLOCK, '')];
  for (const js of scriptsOf(html, pagePath, root)) sources.push(readFileSync(js, 'utf8'));
  const names = new Set();
  for (const text of sources) for (const m of text.matchAll(NAME)) names.add(m[1]);
  return [...names].sort();
}

/* The sprite carrying only `names`, with its header kept. `names` of null is
   the whole sprite, which is what a template takes. */
export function subset(svg, names) {
  if (!names) return svg;
  const want = new Set(names);
  const head = svg.slice(0, svg.indexOf('<symbol'));
  const symbols = [...svg.matchAll(/<symbol id="([^"]+)"[\s\S]*?<\/symbol>/g)]
    .filter(m => want.has(m[1]))
    .map(m => m[0]);
  return `${head}${symbols.join('\n')}\n</svg>`;
}
