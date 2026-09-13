#!/usr/bin/env node
//
// Write docs/component-docs.json: one reference per compiled component, for the
// component index Phase 7 asks for (roadmap §4.7).
//
// WHY THIS IS A COMMITTED FILE AND NOT A LOOKUP AT BUILD TIME. It is derived
// from carbon-website/, which is a QUARRY: gitignored, cloned on no machine by
// default, and the operating card is explicit that nothing in `npm run verify`
// reads it. A generator that needed it would fail on every clone that had not
// cloned IBM's docs site. So this runs where the quarry is, the OUTPUT is
// committed, and everything downstream reads the output -- the same shape as
// docs/carbon-*.json, which are captures for the same reason.
//
// WHY A COMPONENT CAN POINT AT ANOTHER COMPONENT'S PAGE. Carbon's docs are per
// PAGE, not per compiled component, and the two sets are not the same size:
// 77 components compile here against 40 pages in IBM's own nav. Combo box,
// multiselect and list box are all documented on the dropdown page; every
// fluid-* variant is documented on its base control's page; time picker is on
// date picker. Each alias below carries the evidence it was chosen on -- a
// count of how many times the humanised name occurs in each page's own .mdx --
// so the choice can be re-checked rather than believed. THE COUNTS ARE
// EVIDENCE, NOT PROOF: "card" occurs 34 times on the menu-buttons page and
// means the noun, which is why an alias is authored here and not inferred.
//
// WHY SOME COMPONENTS GET A STORY AND NOT A PAGE. Carbon 1.114 absorbed eight
// components out of ibm-products (src/app.scss records the same event), and
// carbondesignsystem.com documents none of them. For those the honest reference
// is the Storybook story the repository already captured, on the site AGENTS.md
// already names as the provenance for docs/carbon-ibm-products-*.json. A story
// is not usage guidance and this file says so in `kind`, so a reader is never
// told a specimen is documentation.
//
//   node tools/build-component-docs.mjs
//
import fs from 'node:fs';
import path from 'node:path';
import { compiled } from './lib/ownership.mjs';

const QUARRY = 'carbon-website';
const NAV = `${QUARRY}/src/data/nav-items.yaml`;
const PAGES = `${QUARRY}/src/pages/components`;
const OUT = 'docs/component-docs.json';

if (!fs.existsSync(NAV)) {
  console.error(`no quarry at ${QUARRY}/ -- this tool reads IBM's docs site and`);
  console.error(`is not part of npm run verify. Clone it into ${QUARRY}/, where`);
  console.error(`.gitignore already hides it:`);
  console.error(`  git clone https://github.com/carbon-design-system/carbon-website`);
  process.exit(1);
}

// The nav is the authority on which pages EXIST and what IBM calls them. The
// directory listing is not: it carries pages the nav has dropped (overflow-menu
// is there and unlisted), and a link to one of those is a link into a redirect.
const nav = new Map();
{
  const lines = fs.readFileSync(NAV, 'utf8').split('\n');
  let inComponents = false, title = null;
  for (const line of lines) {
    if (/^- title: /.test(line)) inComponents = line.trim() === '- title: Components';
    if (!inComponents) continue;
    const t = line.match(/^\s+- title: (.+)$/);
    if (t) { title = t[1].trim(); continue; }
    const p = line.match(/^\s+path: \/components\/([^/]+)\/usage\/?$/);
    if (p && title) nav.set(p[1], title);
  }
}

// Every .mdx a page owns, lowercased, for the evidence counts below.
const prose = {};
for (const slug of nav.keys()) {
  const dir = path.join(PAGES, slug);
  if (!fs.existsSync(dir)) continue;
  prose[slug] = fs.readdirSync(dir).filter(f => f.endsWith('.mdx'))
    .map(f => fs.readFileSync(path.join(dir, f), 'utf8').toLowerCase()).join('');
}
const mentions = phrase => Object.entries(prose)
  .map(([slug, text]) => [slug, text.split(phrase).length - 1])
  .filter(([, n]) => n > 0).sort((a, b) => b[1] - a[1]);

// ALIASES, authored. The key is a compiled component with no page of its own;
// the value is the page IBM documents it on. Each is checked below against the
// evidence count, and the check FAILS the run if the target page has vanished.
const ALIAS = {
  'combo-box': 'dropdown', 'multiselect': 'dropdown', 'list-box': 'dropdown',
  'fluid-combo-box': 'dropdown', 'fluid-multiselect': 'dropdown',
  'fluid-list-box': 'dropdown', 'fluid-dropdown': 'dropdown',
  'combo-button': 'menu-buttons', 'menu-button': 'menu-buttons',
  'copy-button': 'code-snippet',
  'dialog': 'modal',
  'time-picker': 'date-picker', 'fluid-time-picker': 'date-picker',
  'fluid-date-picker': 'date-picker',
  'fluid-number-input': 'number-input',
  'fluid-search': 'search',
  'fluid-select': 'select',
  'text-area': 'text-input', 'fluid-text-area': 'text-input',
  'fluid-text-input': 'text-input',
  'pagination-nav': 'pagination',
  'treeview': 'tree-view',
  'ui-shell': 'UI-shell-header',
};

const humanise = n => n.replace(/^fluid-/, '').replace(/([a-z])([A-Z])/g, '$1 $2')
  .replace(/-/g, ' ').toLowerCase();

// Captured stories, for what has no page at all.
const captures = {
  react: ['docs/carbon-react-dom.json', 'docs/carbon-react-states.json'],
  'ibm-products': ['docs/carbon-ibm-products-dom.json', 'docs/carbon-ibm-products-states.json'],
};
const stories = {};
for (const [site, files] of Object.entries(captures)) {
  stories[site] = [...new Set(files.flatMap(f =>
    fs.existsSync(f) ? Object.keys(JSON.parse(fs.readFileSync(f, 'utf8'))) : []))]
    .filter(id => id !== '_meta');
}
// A STATE CAPTURE'S KEY IS NOT A STORY ID. tools/extract/ records a recipe as
// `<story>@<state>` -- `components-overflowmenu--default@open` is the open
// specimen of `components-overflowmenu--default`. The suffix is this
// repository's, Storybook has never heard of it, and a URL carrying one 404s.
// The first draft of this file shipped exactly that link.
const storyId = key => key.split('@')[0];

const findStory = name => {
  const flat = name.toLowerCase().replace(/-/g, '');
  for (const site of ['ibm-products', 'react']) {
    const hits = [...new Set(stories[site].map(storyId))]
      .filter(id => id.toLowerCase().replace(/-/g, '').includes(flat));
    if (!hits.length) continue;
    // Deterministic: the default story if there is one, else the shortest id,
    // so a re-run cannot silently move the link to a different specimen.
    const def = hits.find(h => h.endsWith('--default'));
    return { story: def ?? hits.sort((a, b) => a.length - b.length || a.localeCompare(b))[0], site };
  }
  return null;
};

const SITE = {
  react: 'https://react.carbondesignsystem.com',
  'ibm-products': 'https://ibm-products.carbondesignsystem.com',
};

const inventory = JSON.parse(fs.readFileSync('docs/inventory.json', 'utf8'));
const all = Object.values(inventory.components).map(c => c.component).sort();
const on = compiled();

const out = {}, problems = [];
for (const name of all) {
  if (!on.has(name)) continue;
  const slug = nav.has(name) ? name : ALIAS[name];
  if (slug) {
    if (!nav.has(slug)) { problems.push(`${name}: alias points at ${slug}, which IBM's nav no longer lists`); continue; }
    const ev = mentions(humanise(name));
    const rank = ev.findIndex(([s]) => s === slug);
    out[name] = {
      kind: name === slug ? 'page' : 'alias',
      title: nav.get(slug),
      usage: `https://carbondesignsystem.com/components/${slug}/usage/`,
      style: `https://carbondesignsystem.com/components/${slug}/style/`,
      accessibility: `https://carbondesignsystem.com/components/${slug}/accessibility/`,
      ...(name === slug ? {} : {
        page: slug,
        evidence: ev.length
          ? `"${humanise(name)}" occurs ${ev.map(([s, n]) => `${n}× on ${s}`).slice(0, 3).join(', ')}` +
            (rank === 0 ? '' : ` — chosen over the leader, see the header`)
          : 'no page mentions it; alias authored on the component tree',
      }),
    };
    continue;
  }
  // A DIRECTORY THE NAV HAS DROPPED IS NOT A PAGE. overflow-menu still has one
  // under src/pages/components/ and IBM's nav stopped listing it; linking there
  // would be a link into whatever redirect replaced it. Recorded rather than
  // silently demoted, so the next reader does not take it for an oversight.
  const orphaned = fs.existsSync(path.join(PAGES, name)) && !nav.has(name);
  const found = findStory(name);
  out[name] = found
    ? { kind: 'story', site: found.site, story: found.story,
        specimen: `${SITE[found.site]}/iframe.html?id=${found.story}`,
        why: orphaned
          ? 'IBM’s nav no longer lists its page, though the directory survives in the quarry; a captured specimen, not usage guidance'
          : 'no page on carbondesignsystem.com; a captured specimen, not usage guidance' }
    : { kind: 'none',
        why: 'no page in IBM’s nav and no captured story: nothing to link that this repository can attest' };
}

const meta = {
  generated: new Date().toISOString().slice(0, 10),
  from: `${NAV}, ${PAGES}/, and docs/carbon-*.json`,
  pagesInNav: nav.size,
  note: 'Generated where the quarry is and committed, because carbon-website/ is gitignored and no gate reads it. Re-run tools/build-component-docs.mjs after a carbon-website pull.',
};

if (problems.length) {
  console.error('refusing to write:');
  for (const p of problems) console.error(`  ${p}`);
  process.exit(1);
}

fs.writeFileSync(OUT, JSON.stringify({ _meta: meta, components: out }, null, 2) + '\n');

const by = k => Object.values(out).filter(c => c.kind === k).length;
console.log(`  ${OUT} — ${Object.keys(out).length} compiled components · ` +
  `${by('page')} own page · ${by('alias')} documented on another · ` +
  `${by('story')} captured specimen only · ${by('none')} with nothing to link`);
