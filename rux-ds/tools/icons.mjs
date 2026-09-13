#!/usr/bin/env node
//
// Builds assets/icons.svg — an SVG sprite of just the icons this system uses.
//
// @carbon/styles ships no icons, and components whose visual identity IS an icon
// render blank without them: dropdown chevrons, checkbox ticks, progress steps, the
// two-handle slider thumbs (roadmap §4.1.3). @carbon/icons is 123 MB / 2,828 files
// and is NOT a dependency (§3) — it is quarried here, and the 5 KB sprite is committed.
//
// Carbon ships only 68 icons at 16px and 18 unsized; the full set is at 32px. SVG
// scales, so each icon is taken from the smallest available source and the viewBox
// normalises it. Add an icon by adding its name below and re-running.
//
import { readFileSync, writeFileSync, existsSync, readdirSync } from 'node:fs';
import { spritePages } from './lib/sources.mjs';

const SRC = 'node_modules/@carbon/icons/svg';
const SIZES = ['16', '20', '32', ''];   // preference order; '' is the unsized root

const ICONS = [
  'chevron--down', 'chevron--left', 'chevron--right', 'chevron--up',
  'caret--down', 'caret--up', 'caret--left', 'caret--right',
  'checkmark', 'checkmark--filled', 'checkmark--outline',
  'close', 'close--filled',
  'warning--filled', 'warning--alt--filled', 'error--filled',
  'information', 'information--filled',
  'circle-dash', 'incomplete', 'radio-button',
  'calendar', 'time', 'search', 'add', 'subtract',
  'overflow-menu--vertical', 'overflow-menu--horizontal',
  'copy', 'menu', 'notification', 'user--avatar',
  'view', 'view--off', 'arrow--right', 'arrow--up',
  // data-table/sort: the sorted column shows arrow--down (CSS rotates it for
  // ascending), an unsorted one the double-headed arrows--vertical
  'arrow--down', 'arrows--vertical',
  'document', 'folder', 'edit', 'trash-can',
  // shape-indicator: Carbon maps each status to a distinct SHAPE, so colour is not
  // the only signal (web-components/shape-indicator.js:55-65)
  'critical', 'critical-severity', 'caution', 'diamond-fill', 'low-severity',
  'circle-fill', 'circle-stroke',
  // icon-indicator status set (web-components/icon-indicator.js:50-97)
  'warning--alt-inverted--filled', 'undefined--filled', 'in-progress',
  'pending--filled', 'unknown--filled', 'warning-square--filled',
  // state demos in the sink: the icon-only content switcher and a disabled menu item
  'list', 'grid', 'location', 'download',
  // EQUIPMENT ON A VEHICLE, asked for by rux-scheduler 2026-09-06: a bus row
  // says what the bus HAS, and the sprite had no way to say it. `accessibility`
  // is Carbon's own wheelchair mark, the one every product uses for a lift or a
  // ramp; `hotel` is its bed, which is what a sleeper coach is. Neither is
  // scheduler-specific -- any app with a row of equipment flags needs them --
  // so they belong here rather than spliced into one app's page.
  'accessibility', 'hotel',
  // AN APP TILE'S ICON, asked for by rux 2026-09-07. Rux Home's grid gives each
  // app a 32px glyph until drawn marks exist, and the design system's tile had
  // no honest candidate in the sprite: `grid` is what the header's app-switcher
  // button already is, so the same shape would have meant two things on one
  // screen. `color-palette` is Carbon's own mark for a palette. It is not
  // referenced by any page HERE -- it is used by rux-sm.github.io, which inlines
  // this sprite -- which is why check-icons counts it among the symbols nothing
  // points at rather than failing on it.
  'color-palette',
  // A GROUP OF PEOPLE, asked for by rux-scheduler 2026-09-07. A roster control
  // sitting in a toolbar Carbon draws as icons had to be a text button, because
  // the sprite held exactly one person in 62 -- `user--avatar`, which the shell's
  // Account button already uses on the same screen. `events` was asked for beside
  // this one, to be judged at 16 by LOOKING, and is DECLINED ON THE PIXELS:
  // rasterised at 16 device px its front figure smears into its own shoulders
  // while the two behind stay rings, so it reads as noise under two circles.
  // `user--multiple` keeps a whole ring and a shoulder arc in front and a legible
  // partial behind, at 16 and at 32. `events--alt` was tried unasked and is worse
  // than either. Both candidates are 32-unit drawings shown at 16 -- Carbon draws
  // no multi-person glyph among its 68 sixteens, which is its own judgement about
  // this same risk, and the reason the ask was for two and not one.
  'user--multiple',
];

const symbols = [], missing = [], from = {};
for (const name of ICONS) {
  const size = SIZES.find(s => existsSync(s ? `${SRC}/${s}/${name}.svg` : `${SRC}/${name}.svg`));
  if (size === undefined) { missing.push(name); continue; }
  const raw = readFileSync(size ? `${SRC}/${size}/${name}.svg` : `${SRC}/${name}.svg`, 'utf8');
  const viewBox = (raw.match(/viewBox="([^"]+)"/) ?? [, '0 0 32 32'])[1];
  const body = raw.replace(/^[\s\S]*?<svg[^>]*>/, '').replace(/<\/svg>\s*$/, '').trim();
  symbols.push(`<symbol id="i-${name}" viewBox="${viewBox}">${body}</symbol>`);
  from[size || 'root'] = (from[size || 'root'] ?? 0) + 1;
}

if (missing.length) console.log(`  NOT FOUND in @carbon/icons: ${missing.join(', ')}`);
const sprite = `<svg xmlns="http://www.w3.org/2000/svg" style="display:none">
<!-- Generated by tools/icons.mjs from @carbon/icons. Do not edit by hand.
     Path data: Carbon Design System, Copyright IBM Corp. 2015, 2026,
     licensed under the Apache License, Version 2.0. The sprite wrapper and
     the i- symbol naming are rux-ds. See NOTICE. -->
${symbols.join('\n')}
</svg>
`;
writeFileSync('assets/icons.svg', sprite);
console.log(`  assets/icons.svg — ${symbols.length} icons, ${(sprite.length / 1024).toFixed(1)} KB`);

// THE TEMPLATES CARRY THEIR OWN COPY, because a template is copied rather than
// assembled and cannot reference the file: WebKit has never supported a
// cross-document <use>, and file:// blocks the fetch everywhere. Both fail
// silently, with a fully styled page and no icons on it. Refreshing the copies
// here is what keeps `npm run icons` the only command anyone has to remember.
const BEGIN = /<!-- SPRITE:BEGIN[\s\S]*?-->\n/;
const END = '<!-- SPRITE:END -->';
// ROOT PAGES TOO, and they are the case this loop used to miss. It read
// templates/ and nothing else, so a consumer page at the root -- exactly the
// artefact Phase 6 exists to make possible -- carried a sprite frozen at the day
// someone spliced it by hand. dashboard.html shipped that way and §4.6's fifth
// exit attempt had to splice its own. `spritePages()` finds them by their
// markers, which keeps the GENERATED pages out: kitchen-sink.html and
// portal.html have no block, because build-sink and build-portal inline the
// sprite as they assemble and must stay the only writers.
let refreshed = 0;
const targets = [
  ...(existsSync('templates') ? readdirSync('templates') : [])
    .filter(f => f.endsWith('.html')).sort().map(f => `templates/${f}`),
  ...spritePages().map(p => p.path),
];
for (const path of targets) {
  const html = readFileSync(path, 'utf8');
  const open_ = html.match(BEGIN);
  const close = html.indexOf(END);
  if (!open_ || close === -1) continue;          // a template with no block wants none
  const head = html.slice(0, open_.index + open_[0].length);
  const next = head + sprite.trim() + '\n' + html.slice(close);
  if (next !== html) { writeFileSync(path, next); refreshed++; }
}
console.log(`  pages refreshed: ${refreshed} of ${targets.length}`);
console.log(`  sourced from: ${Object.entries(from).map(([k, v]) => `${k}px:${v}`).join('  ')}`);
