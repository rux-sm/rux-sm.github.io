#!/usr/bin/env node
//
// SHELL DRIFT — what a project's pages carry in their shell that the pinned
// template does not, and the reverse. Roadmap §4.13 step 3. It PRINTS AND
// BLOCKS NOTHING: a page is the project's own, and this is the report that
// says a shell change upstream has not reached it, which nothing said before.
//
//   node tools/drift.mjs <project-dir>     run by tools/new-project.sh after
//                                          every pin move; runnable alone
//
// WHY IT EXISTS. The pin move of 2026-09-02 (v0.1.1 → v0.1.2) changed no css
// or js byte and still needed a hand edit on every module: Plex had gone to
// font-display: optional behind two <link rel="preload"> lines the templates
// carry and the pages did not. A face discovered late under optional is a
// face never shown, nothing measured it, and a person noticed. Markup is not
// vendored — a page is copied once and then it is the project's — so what a
// template gains after the copy reaches a page only if someone compares.
//
// WHAT IT COMPARES. Two things, both against vendor/rux-ds/templates/app-shell.html
// -- or, for an app that links /rux-ds/ and vendors nothing, against
// <DS>/templates/app-shell.html (DS=<dir>, default ../rux-ds):
//   head    the <link> and <script> resources by file name — a preload, a
//           stylesheet, a module — in order
//   shell   the SKELETON of <header>…</header>: each tag with its classes and
//           the attributes that carry behaviour (id, aria-expanded,
//           aria-controls, aria-current, hidden, type, name), with the side
//           nav's subtree and the switcher's items left out because those are
//           the app's own, and text, comments and product-specific values
//           (aria-label, href, src, for, value, placeholder) dropped
// A page is anything *.html at the project root and one directory down,
// skipping vendor/, node_modules/, build/ and .git/. Pages with the same
// result are reported once.
//
// WHAT IT CANNOT SEE. A template change outside <head> resources and the
// header — the content inset <style>, the scrim, a footer — and any change
// of VALUE in an attribute it drops. Head resources compare by FILE NAME, so
// a page linking vendor/rux-ds/css/rux-theme.css and its own rux-theme.css
// reads as one extra rux-theme.css, and their order is invisible. It says "differs", never "wrong": a
// module that deliberately omits the notifications glyph shows as a missing
// button every time, and that is the report being honest, not a failure.
//
import { readFileSync, readdirSync, existsSync } from 'node:fs';
import { join, basename, relative } from 'node:path';

const DIR = process.argv[2];
if (!DIR) { console.error('usage: node tools/drift.mjs <project-dir>'); process.exit(2); }
// The template is the vendored one when the app vendors, else rux-ds's own
// (DS=<dir>, default the sibling ../rux-ds) for an app that links /rux-ds/
// -- roadmap §8.4, 2026-09-09.
const VENDORED = join(DIR, 'vendor/rux-ds/templates/app-shell.html');
const DS = process.env.DS ?? join(DIR, '..', 'rux-ds');
const TEMPLATE = existsSync(VENDORED) ? VENDORED : join(DS, 'templates/app-shell.html');
const AGAINST = existsSync(VENDORED) ? 'vendor/rux-ds/templates/app-shell.html' : TEMPLATE;
if (!existsSync(TEMPLATE)) { console.log(`  drift: no vendor/rux-ds/ under ${DIR} and no rux-ds at ${DS} (set DS=<dir>); nothing to compare`); process.exit(0); }

const SKIP = new Set(['vendor', 'node_modules', 'build', '.git']);
const pages = [];
for (const e of readdirSync(DIR, { withFileTypes: true })) {
  if (e.isFile() && e.name.endsWith('.html')) pages.push(join(DIR, e.name));
  else if (e.isDirectory() && !SKIP.has(e.name))
    for (const f of readdirSync(join(DIR, e.name))) if (f.endsWith('.html')) pages.push(join(DIR, e.name, f));
}

const VOID = new Set(['link', 'meta', 'input', 'hr', 'br', 'img', 'use', 'path', 'source']);
const KEEP = ['id', 'aria-expanded', 'aria-controls', 'aria-current', 'hidden', 'type', 'name'];
const strip = html => html.replace(/<!--[\s\S]*?-->/g, '');

function headResources(html) {
  const head = strip(html).match(/<head[\s\S]*?<\/head>/i)?.[0] ?? '';
  const out = [];
  for (const m of head.matchAll(/<(link|script)\b([^>]*)>/g)) {
    const attrs = m[2];
    const src = attrs.match(/(?:href|src)="([^"]*)"/)?.[1];
    if (!src) continue;
    const rel = attrs.match(/rel="([^"]*)"/)?.[1] ?? '';
    out.push(`${m[1]}${rel ? '[' + rel + ']' : ''} ${basename(src)}`);
  }
  return out;
}

function skeleton(html) {
  const header = strip(html).match(/<header\b[\s\S]*?<\/header>/i)?.[0] ?? '';
  const out = [];
  let depth = 0, skipUntil = -1;          // depth at which a skipped subtree closes
  const stack = [];
  for (const m of header.matchAll(/<(\/?)([a-zA-Z][\w-]*)([^>]*?)(\/?)>/g)) {
    const [, close, tag, attrs, self] = m;
    if (close) {
      depth--;
      stack.length = depth;
      if (skipUntil === depth) skipUntil = -1;
      continue;
    }
    const classes = (attrs.match(/class="([^"]*)"/)?.[1] ?? '').split(/\s+/).filter(Boolean).sort();
    const skipping = skipUntil >= 0;
    const isVoid = VOID.has(tag) || !!self;
    if (!skipping) {
      const parentSwitcher = stack[stack.length - 1] === 'ul.rux--switcher';
      // Subtrees that are the app's own, or pictures: named once, not walked.
      // The side nav and the header nav are choices (docs/choices.md); the
      // switcher's entries are filled from the root; an svg is a mark or an
      // icon, and its paths say nothing about the shell.
      const own = classes.includes('rux--side-nav') ? 'nav.rux--side-nav …(the app\'s own)'
        : classes.includes('rux--header__nav') ? 'nav.rux--header__nav …(the app\'s own)'
        : tag === 'li' && parentSwitcher ? 'li …(the switcher\'s entries, filled from the root)'
        : tag === 'svg' ? 'svg …' : null;
      if (own) {
        out.push(`${'  '.repeat(depth)}${own}`);
        if (!isVoid) skipUntil = depth;
      } else {
        const attr = k => new RegExp(`(?<![\\w-])${k}(?:="([^"]*)")?(?=\\s|$|/)`);
        const kept = KEEP.filter(k => attr(k).test(attrs))
          .map(k => { const v = attrs.match(attr(k))?.[1]; return v === undefined ? k : `${k}=${v}`; });
        out.push(`${'  '.repeat(depth)}${tag}${classes.length ? '.' + classes.join('.') : ''}${kept.length ? ' [' + kept.join(' ') + ']' : ''}`);
      }
    }
    if (!isVoid) { depth++; stack.push(`${tag}${classes.includes('rux--switcher') ? '.rux--switcher' : ''}`); }
    if (!isVoid && stack.length > depth) stack.length = depth;
  }
  return out;
}

// Plain LCS diff on short token lists: '-' is in the template and not the page,
// '+' is in the page and not the template.
function diff(a, b) {
  const n = a.length, m = b.length, L = Array.from({ length: n + 1 }, () => new Array(m + 1).fill(0));
  for (let i = n - 1; i >= 0; i--) for (let j = m - 1; j >= 0; j--)
    L[i][j] = a[i] === b[j] ? L[i + 1][j + 1] + 1 : Math.max(L[i + 1][j], L[i][j + 1]);
  const out = []; let i = 0, j = 0;
  while (i < n && j < m) {
    if (a[i] === b[j]) { i++; j++; }
    else if (L[i + 1][j] >= L[i][j + 1]) out.push('- ' + a[i++]);
    else out.push('+ ' + b[j++]);
  }
  while (i < n) out.push('- ' + a[i++]);
  while (j < m) out.push('+ ' + b[j++]);
  return out;
}

const t = readFileSync(TEMPLATE, 'utf8');
const tHead = headResources(t), tShell = skeleton(t);
const groups = new Map();   // result text -> pages
for (const p of pages) {
  const h = readFileSync(p, 'utf8');
  const lines = [];
  const dh = diff(tHead, headResources(h)); if (dh.length) lines.push('  head resources:', ...dh.map(l => '    ' + l));
  const ds = diff(tShell, skeleton(h)); if (ds.length) lines.push('  shell skeleton:', ...ds.map(l => '    ' + l));
  const key = lines.join('\n');
  if (!groups.has(key)) groups.set(key, []);
  groups.get(key).push(relative(DIR, p));
}

console.log(`\n  drift against ${AGAINST} · ${pages.length} page(s)`);
for (const [key, ps] of groups) {
  const who = ps.length > 3 ? `${ps.slice(0, 2).join(', ')} and ${ps.length - 2} more` : ps.join(', ');
  if (!key) { console.log(`  ${who}: shell and head resources match the template`); continue; }
  console.log(`  ${who}:\n${key}`);
}
console.log('  "-" is in the template and not the page, "+" the reverse. This says what DIFFERS,');
console.log('  not what is wrong: a page that leaves a shell part out on purpose shows it every time.\n');
