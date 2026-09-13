//
// The markup files a gate reads PER FILE, in one definition.
//
// Two notions of "source" exist here and they are not the same thing:
//
//   assembled   check-classes, check-co-classes and check-coverage read
//               kitchen-sink.html plus templates/, because they ask what the
//               finished page contains and a fragment on its own is not a page.
//   per file    check-tags, check-ancestry and check-icons read the fragments
//               and templates themselves, because their findings name a file to
//               EDIT — and kitchen-sink.html is generated, so naming it would
//               send the reader to a file the next `npm run sink` overwrites.
//
// This is the second one. `name` is what a finding prints and what an ignore
// list keys on, so a template is `templates/app-shell` and not `app-shell`:
// nothing stops a template and a fragment sharing a basename later, and a
// KNOWN entry that silently covered both would be worse than a duplicate.
//
// sink/deferred/ is EXCLUDED. Those fragments are not compiled, not shipped and
// deliberately carry markup for components the keep-set dropped; gating them
// would be red on purpose. README calls restoring one a three-line operation,
// and re-gating it is the fourth.
//
import { readdirSync, existsSync, readFileSync } from 'node:fs';
import { join } from 'node:path';

export const ROOTS = ['sink', 'templates'];

// ---------------------------------------------------------------------------
// The ASSEMBLED targets — the other notion named at the top of this file.
//
// WHY THIS IS DISCOVERED AND NOT A LIST. Four gates carried
// `['kitchen-sink.html', 'portal.html', 'templates']` as a literal, so a page
// at the repository root that nobody had typed into four files was read by
// none of them. `npm run verify` exited 0 and said NOTHING about it.
//
// That is this project's own recorded defect arriving from a new direction:
// a check never run against a target is indistinguishable from a check that
// passed. §4.6's fifth exit attempt hit it directly -- a fresh agent building a
// consumer page had to re-implement four gates in scratch to get any answer,
// and the fourth attempt's `dashboard.html` was never gated at all.
//
// A consumer page is the artefact Phase 6 exists to make possible, and it was
// the one thing nothing checked. Now every `*.html` at the root is a target the
// moment it exists.
//
// NOT EXTENDED TO THE PER-FILE GATES, deliberately. `check-provenance` would
// demand a PROVENANCE label from a consumer page that owes none, and
// `check-ancestry`'s KNOWN is keyed by file, so a root page re-earns every
// finding already adjudicated for the template it was copied from. Those need
// a decision about how a consumer page records its own declines; this does not.
export function pageFiles(extra = []) {
  const rootPages = readdirSync('.')
    .filter(f => f.endsWith('.html'))
    .sort();
  return [...extra, ...rootPages, 'templates'];
}

// ---------------------------------------------------------------------------
// Root pages that carry their own icon sprite, for `npm run icons` to refresh
// and for check-icons to check for drift.
//
// A PAGE OPTS IN BY CARRYING THE MARKERS, and that is not a convenience — it is
// what keeps the GENERATED pages out. kitchen-sink.html and portal.html have no
// SPRITE:BEGIN block at all: build-sink and build-portal inline assets/icons.svg
// directly as they assemble, so those pages cannot drift and nothing else may
// write to them. A hand-authored consumer page is the opposite case — copied
// rather than assembled, so it carries a frozen copy that goes stale silently.
//
// THAT SILENCE IS THE WHOLE POINT. `npm run icons` rewrote templates/*.html and
// nothing else, so dashboard.html's sprite was frozen at the day it was written
// and §4.6's fifth exit attempt had to splice one by hand. A page with an
// out-of-date sprite is fully styled and simply missing icons, in whichever
// engines the stale symbols happen not to cover.
export function spritePages() {
  return readdirSync('.')
    .filter(f => f.endsWith('.html'))
    .sort()
    .filter(f => readFileSync(f, 'utf8').includes('<!-- SPRITE:BEGIN'))
    .map(f => ({ name: f.replace(/\.html$/, ''), path: f, root: '.' }));
}

// [{ name, path, root }] — sorted, sink first, so output order is stable.
export function markupFiles(roots = ROOTS) {
  const out = [];
  for (const root of roots) {
    if (!existsSync(root)) continue;
    for (const f of readdirSync(root).filter(f => f.endsWith('.html')).sort()) {
      const stem = f.replace(/\.html$/, '');
      out.push({ name: root === 'sink' ? stem : `${root}/${stem}`, path: join(root, f), root });
    }
  }
  return out;
}
