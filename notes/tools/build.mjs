#!/usr/bin/env node
//
// Generate every page in this project from `data/atlas/*.json`.
//
// WHY BUILD-TIME, DECIDED 2026-08-31. README's "Undecided" carried this as an
// open question and `renderer-brief.md` §4 argued build-time, then retracted
// both of its arguments as Design-specific: the 90 KB budget was Design's own,
// and the gates it named "do not run on the consuming project unless it
// deliberately adopts them". That retraction was written when this project had
// no gates. It has since adopted three, and that is what settles it.
//
// `check-classes.mjs` and `check-structure.mjs` read the HTML as TEXT. A
// runtime renderer commits a shell whose `main` is empty, so both would find a
// handful of resolving shell classes and exit 0 -- green because there was
// nothing in the file to look at. That is `smoke.html`'s failure with a
// different cause, and walkthroughs are expected to change often, so it is a dice
// roll taken weekly rather than once.
//
// Two smaller reasons, both concrete:
//   * A malformed walkthrough throws HERE, before the commit, with a stack trace --
//     rather than in a reader's browser, on one walkthrough out of thirty.
//   * A runtime fetch of data/atlas/*.json is blocked over file://, silently,
//     which is the exact failure `inline-sprite.mjs` exists to prevent. The way
//     out is inlining the JSON, which is build-time wearing a different hat.
//
// THE OUTPUT IS COMMITTED, and that is half the decision rather than a detail.
// Written to a gitignored `build/` the pages would be invisible to the gates
// and to the pre-commit hook, which puts the vacuous-green problem back by
// another route. Committing generated output is also what this repository
// already does deliberately with `data/` and `vendor/`, and what Design does
// with `css/rux.css`.
//
//   node tools/build.mjs
//
import { readFileSync, writeFileSync, readdirSync, mkdirSync, rmSync, existsSync, copyFileSync } from 'node:fs';
import { execFileSync } from 'node:child_process';
import { join, dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { CATEGORY_NAME } from './build-tile-looks.mjs';

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..');
// THE PUBLIC BUILD READS data/atlas/ AND WRITES pages/, AND NOTHING ELSE
// MAY. The two overrides exist for one caller: tools/sync-internal.sh, which
// renders atlas's INTERNAL tier -- gaps, stamps, issue ids, the notes under
// every phase, the concept pages that have no published tier -- into the
// git-ignored build/ directory for a viewer only its author uses. With neither
// variable set every path below is what it always was, and the public pages
// come out byte-identical; `git status` after a build is the proof.
const PRIVATE = Boolean(process.env.LN_DATA || process.env.LN_OUT);
const DATA = process.env.LN_DATA ? resolve(process.env.LN_DATA) : join(ROOT, 'data/atlas');
const OUT_DIR = process.env.LN_OUT ? resolve(process.env.LN_OUT) : join(ROOT, 'pages');
const INDEX = PRIVATE ? join(OUT_DIR, '..', 'index.html') : join(ROOT, 'index.html');

// ---------------------------------------------------------------- escaping

// EVERY STRING FROM THE DATA GOES THROUGH THIS. The walkthroughs are prose written by
// people and contain `&`, `<` and quotes; one unescaped `&` is an invalid
// entity and one unescaped `<` swallows the rest of a cell. Neither shows up as
// a broken page -- text simply goes missing, which no gate here can see.
const esc = s => String(s)
  .replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
  .replace(/"/g, '&quot;').replace(/'/g, '&#39;');

// ---------------------------------------------------------------- tokens

// THE PAYLOAD KEY IS NOT ALWAYS `v`, AND THIS TABLE IS THE WHOLE REASON THIS
// FILE HAS ONE. README's bite 3: a renderer reaching for `token.v` uniformly
// blanks 212 of 4,405 tokens -- about 5% -- WITHOUT ERRORING, because `text` is
// 2,905 of them and reads correctly throughout, so a spot check passes. Five
// types keep their text elsewhere and `pencil` has none at all.
//
// Measured against all seven walkthroughs on 2026-08-31, which is what these counts
// are: session/code 117, button/label 50, command/route 39, path/route 5,
// image/alt+src 1, link/v+href 9, pencil none 134.
const PAYLOAD = {
  session: 'code', button: 'label', command: 'route', path: 'route',
};

// Filled before any rendering happens; the `link` case below needs to know
// which ids are real so it can tell a cross-reference from a dead one.
const PAGE_IDS = new Set();

// A walkthrough link is written relative to pages/, where every walkthrough page sits.
// The home page renders the map outside that folder, so it sets the base
// while it does.
let PAGE_BASE = '';
const withPageBase = (base, render) => {
  PAGE_BASE = base;
  try { return render(); } finally { PAGE_BASE = ''; }
};

// FOUR REGISTERS, NOT SEVEN TAG COLOURS. Replaces the colour map on
// 2026-09-10, and the reason is density rather than taste.
//
// SEVEN TYPES USED TO RENDER AS `rux--tag`, differing only in hue: chip blue,
// session cyan, field cool-gray, literal gray, value warm-gray, status teal,
// button purple. Counted over the seven walkthroughs that is 1003 of 3775 tokens --
// 27% of everything on a page was a coloured pill. Three of the seven hues are
// near-identical greys, there was no legend anywhere, and a reader was being
// asked to learn seven colours to read a sentence. Every gate stayed green
// throughout: the classes resolve, the compounds are intact, and DENSITY is
// not a rule any check here expresses.
//
// And it asked the tag to mean seven things. In Carbon a tag means a state or
// a category; it was carrying "press this", "a field label", "type this
// exactly", "a code" and "a panel name" as well.
//
// THE READER ASKS FOUR QUESTIONS, so there are four registers, and SHAPE and
// FONT FAMILY carry the meaning instead of hue:
//
//   press  what do I click            button                    37 tokens
//   named  what is it called          chip, field              481
//   exact  what do I type exactly     literal, value, session  413
//   state  what should I see          status                    72
//
// 72 pills instead of 1003. The tag survives only where it means what Carbon
// means by a tag.
//
// `named` IS THE BULK, SO IT IS THE QUIETEST. It does its work with COLOUR
// rather than weight alone -- body copy is secondary, a named thing is primary
// -- because three semibold phrases in a row shout, and cells carrying three
// are common.
//
// `exact` IS NOT `rux--snippet--inline`, WHICH WAS THE OBVIOUS CANDIDATE.
// Carbon renders that on a <button> in 14 of 14 captures with `cursor:
// pointer`: ~400 tab stops in one document. That is the same trap Design
// rejected `tag-label-tooltip` for, and checking the captures first is the
// habit that ruling taught. `rux--type-code-01`'s family, with no interaction
// attached, is the clean instrument.
const REGISTER = {
  button: 'press',
  chip: 'named', field: 'named',
  literal: 'exact', value: 'exact', session: 'exact',
  status: 'state',
};

// `command` AND `path` ARE A ROUTE, and the route's own ` \u2794 ` is the
// separator. Not a tag, and -- since 2026-09-10 -- not a breadcrumb either.
//
// THE TAG WAS RULED OUT ON MEASUREMENT. `.rux--tag` caps at 13rem and
// `.rux--tag__label` ellipsises, so a menu route measured 324px against a 192px
// label and was silently cut, and a route is the single thing a reader most
// needs whole. SEND-DS.md section 2 then guessed `.rux--tag-label-tooltip`,
// Carbon's own answer, and Design REJECTED that on evidence: every capture
// pairs it with an *interactive* tag, so it would make a tab stop of every
// route on a page carrying dozens, and the text would still be cut on paper and
// on touch. A tooltip is a route's second copy, not its first.
//
// THE BREADCRUMB WAS BUILT AND THEN REVERTED, THE SAME DAY. Design ruled that a
// route is a breadcrumb, measured on running Carbon: `cds--breadcrumb` has no
// cap and wraps where the tag clips. That is true, and it is not the whole
// question. Three things the ruling could not see, found by rendering all 138
// and then looking at them:
//
//   1. IT ANSWERS THE WRONG QUESTION FOR `command`. The contract calls a
//      `command` "a menu route you run" -- an ACTION -- and a `path` "a
//      navigation path" -- a LOCATION. A breadcrumb says "here is where you
//      are". Rendering both alike made a sequence of presses wear a location's
//      clothes, and put it in the same idiom as the page's own header
//      breadcrumb while divorcing it from `button`, which is the same act.
//   2. THE SEPARATOR IS A `::after`, SO IT CANNOT WRAP. Two routes wrapped and
//      both left a dangling "/" welded to the end of the line above. A text
//      separator travels with its segment; a pseudo-element does not.
//   3. "/" COLLIDES WITH A SEGMENT NAME. One menu segment is itself named with
//      a slash, so its route rendered with three visible separators of which
//      two were separators.
//
// What is given up by staying plain is real and is the reason the question was
// asked twice: a route has no visual distinction from the prose around it,
// where the other seven types do. The answer to that is not a component around
// the route -- it is that 27% of this document's tokens are pills and the
// register a route needs does not exist yet. That is the open design question,
// and it is not answered by wrapping this one type in something.
const ROUTED = new Set(['command', 'path']);

function token(t) {
  const key = PAYLOAD[t.t] ?? 'v';
  const raw = t[key];

  switch (t.t) {
    case 'text': return esc(raw);
    case 'strong': return `<strong>${esc(raw)}</strong>`;
    case 'em': return `<em>${esc(raw)}</em>`;

    // A PENCIL CARRIES NO TEXT AND MUST NOT BE DROPPED. The contract calls it
    // "the step yields a value worth writing down"; 127 of them exist. An early
    // filter on the producing side tested only `v` and `label`, read every
    // token that keys its text differently as empty, and silently deleted 33
    // menu commands and 242 session codes with the sweep still green.
    // Rendered as a glyph with a real accessible name, never as nothing.
    case 'pencil':
      // THE LABEL IS THE TOKEN'S WHOLE MEANING, so it moved when the meaning
      // did. It read "produces a run record value" and named a section that no
      // longer exists -- a screen reader would have been sent looking for it.
      // The mark now says the step yields something worth writing down, which
      // is what a reader keeping their own notes needs from it.
      return `<svg class="notes-pencil" width="16" height="16" viewBox="0 0 32 32" fill="currentColor" role="img" aria-label="worth noting down"><use href="#i-edit"/></svg>`;

    // A LINK BETWEEN PAGES ARRIVES AS A `.md` FILENAME, because that is what the
    // document is called in atlas: a walkthrough, map, review or experiment, and
    // on the private tier a concept. Emitted verbatim each would be a dead link
    // — and a dead link looks exactly like a live one, so nothing on the page
    // would say so. `check-links` reads hrefs; `check-classes` and
    // `check-structure` cannot see one at all.
    //
    // The rewrite is narrow: `<id>.md` where `<id>` is a page we are
    // generating. Anything else is left alone, and a `.md` naming a page that
    // does NOT exist stops the build rather than shipping a 404.
    case 'link': {
      let href = t.href;
      const md = /^(.+)\.md$/.exec(href);
      if (md) {
        if (!PAGE_IDS.has(md[1])) {
          // INTERNAL TIER: a walkthrough may point at a session file, a test sheet
          // or a concept. Whatever is rendered in this build is linkable;
          // anything else keeps its words and loses its href, because a page
          // only its author reads should not stop over a file the site was
          // never going to carry.
          if (PRIVATE) return `<span class="notes-unlinked">${esc(t.v)}</span>`;
          throw new Error(`link to "${href}" names no walkthrough in data/atlas/`);
        }
        href = `${PAGE_BASE}${md[1]}.html`;
      }
      return `<a class="rux--link" href="${esc(href)}">${esc(t.v)}</a>`;
    }

    // A TIMESTAMPED QUOTATION. The timestamp is data, so it renders as a real
    // <cite> beside the speech rather than as three characters inside the
    // sentence -- which is what it was before atlas tokenised it, and what a
    // renderer would otherwise have to parse back out.
    //
    // `q` supplies its own quotation marks in every engine, so the token's
    // value must NOT carry them: atlas strips them and doubling them here
    // would show ""like this"".
    case 'quote':
      return `<q class="notes-quote-inline">${esc(t.v)}</q>`
        + `<cite class="notes-at">${esc(t.at)}</cite>`;

    // THE IMAGE TOKEN RETIRED AT CONTRACT 7. A diagram used to arrive as an
    // SVG copied beside the walkthrough; both diagrams are `diagram` blocks now, so
    // nothing emits this token and nothing copies a file. `.notes-figure` goes
    // with it.

    // A CITATION IS ONE TOKEN. Since atlas f092fb1 the name rides beside the
    // code and the brackets are gone: how the two are presented is this side's
    // decision (export-json.md). A session with no `name` is the code alone.
    case 'session':
      return t.name ? `${reg('chip', t.name)} ${reg('session', t.code)}` : reg('session', t.code);

    // INTERNAL TIER MARKERS, payload-less by design: the marker is the whole
    // token and the sentence that follows it is separate text. The export tier
    // never carries them -- atlas removes a marker and its sentence as a unit
    // -- so these three reach the page only through tools/sync-internal.sh.
    // `rux--layout--size-sm` for the same reason the token tags below carry
    // it: these three sit inside a sentence as well.
    case 'gap':
      return `<span class="rux--tag rux--tag--red rux--layout--size-sm"><span class="rux--tag__label">GAP</span></span>`;
    case 'internal':
      return `<span class="rux--tag rux--tag--gray rux--layout--size-sm"><span class="rux--tag__label">INTERNAL</span></span>`;
    case 'branch':
      return `<span class="rux--tag rux--tag--green rux--layout--size-sm"><span class="rux--tag__label">BRANCH</span></span>`;

    default: {
      if (raw == null) {
        // LOUD, NOT SILENT. An unknown type with no payload is the exact shape
        // of the bug this file is built to avoid, so it stops the build rather
        // than rendering an empty span nobody notices.
        throw new Error(`token type "${t.t}" has no payload under "${key}": ${JSON.stringify(t)}`);
      }
      if (ROUTED.has(t.t)) return route(raw);
      if (!REGISTER[t.t]) throw new Error(`no rendering for token type "${t.t}": ${JSON.stringify(t)}`);
      return reg(t.t, raw, t.location ? `${raw} (${t.location})` : undefined);
    }
  }
}

// THE FULL TEXT IS IN `title` ON EVERY TAG. Four long field names still
// truncate visually; carrying the whole string means the loss is visual and
// not informational.
//
// `rux--layout--size-sm` SINCE 2026-09-10, AND IT IS A LINE-BOX FIX. A token
// tag sits INSIDE a sentence, and at the default size it is 24px tall in a
// 20px line box: measured in the page, every line carrying one was forced
// taller than the pure-text lines around it, so a `do` reading "[New], then
// Sold-to Business Partner ... then [Save] -> {Free}" had no consistent
// rhythm and crowded the lines above and below. 18px fits, and the fix is a
// class Design already compiles on the same size axis the header's buttons
// use -- not a line-height this side invents, which would have left Carbon's
// type scale, where size and line-height are one paired style.
//
// EVERY TOKEN TAG ON EVERY PAGE, not the diagram panel's alone. Scoping it to
// one component would render the same token 24px in a walkthrough and 18px in the
// panel -- one token with two appearances, which is worse than either size.
// The standalone badge rows (a page's status, "7 phases", "Updated ...") are
// NOT changed: they are not inside a sentence and have no line box to fit.
// `state` KEEPS THE TAG, AND KEEPS `rux--layout--size-sm` WITH IT. That class
// is a line-box fix: a tag inside a sentence is 24px tall in a 20px line box,
// and every line carrying one was forced taller than the pure-text lines
// around it. 18px fits. The three registers that are no longer tags do not
// need it -- they ARE text and sit in the line box already, which is most of
// the point.
//
// THE `title` ATTRIBUTE IS GONE EXCEPT WHERE IT SAYS SOMETHING NEW. It used to
// ride every tag because `.rux--tag__label` ellipsises and four long field
// names truncated, so the full string had to survive somewhere. Nothing
// truncates now: `named` and `exact` are text and wrap like text. A title
// repeating text already fully visible is noise to a screen reader, which
// announces both. `button` keeps one, because `location` -- header, line or
// dialog -- is information the label does not carry.
const REG = {
  press: (text, title) =>
    `<span class="notes-t-press"${title ? ` title="${esc(title)}"` : ''}>${esc(text)}</span>`,
  named: text => `<span class="notes-t-named">${esc(text)}</span>`,
  exact: text => `<span class="notes-t-exact">${esc(text)}</span>`,
  state: text =>
    `<span class="rux--tag rux--tag--teal rux--layout--size-sm"><span class="rux--tag__label">${esc(text)}</span></span>`,
};

const reg = (type, text, title) => REG[REGISTER[type]](text, title);

// A ROUTE IS PLAIN TEXT WITH ITS OWN ARROW, and the last segment is weighted
// because that segment is the thing you press. The separator is a real
// character in a real span, not a `::after`: a pseudo-element cannot wrap, and
// when a route broke across lines it left the separator welded to the end of
// the line above. Split on the arrow alone, never on "/", because the only
// other slash in the data is inside a segment's own name.
const ROUTE_SEP = ' \u2794 ';
const route = raw => {
  const seg = raw.split(ROUTE_SEP);
  return `<span class="notes-t-route">${seg.map((x, i) => (i ? `<span class="sep">\u2794</span>` : '')
    + (i === seg.length - 1
      ? `<span class="dest">${esc(x)}</span>`
      : `<span>${esc(x)}</span>`)).join('')}</span>`;
};

// TWO ADJACENT TAGS NEED A SEPARATOR AND THE DATA DOES NOT CARRY ONE. Cells
// like `ADNA02` `RAW MATERIALS` are two tokens with no `text` between them, so
// joining on '' butts the pills flush and they read as one control. Sixteen
// pairs did this on the hand-built page; the generator reintroduced it.
//
// The space goes ONLY between two tag-rendered neighbours. Joining everything
// on ' ' instead would insert spaces inside ordinary prose runs and before
// punctuation, which is a worse bug and a silent one.
const isTag = t => t && !ROUTED.has(t.t) && !!REGISTER[t.t];

const tokens = ts => {
  const list = ts ?? [];
  return list.map((t, i) => {
    const html = token(t);
    return i > 0 && isTag(t) && isTag(list[i - 1]) ? ' ' + html : html;
  }).join('');
};

// ---------------------------------------------------------------- callouts

// CONTRACT 2 HAS NO `callout` BLOCK KIND, so a callout arrives as a `prose`
// block whose TOKEN STREAM begins with the blockquote marker:
//
//     {t:"text", v:"> "}  {t:"strong", v:"Warning"}  {t:"text", v:" > …"}
//
// Rendering that faithfully puts a literal "> Warning >" on the page, which
// reads as a bug. Rendering it as a callout means recognising the shape.
//
// THE RULE IS STRUCTURAL AND ITS REACH IS MEASURED, which is the difference
// between this and an exception list. It matches on token POSITION and TYPE --
// not by parsing markers out of a string, which is the marker contract's job
// and never this renderer's. Across all seven walkthroughs it matches exactly 15 of
// 48 prose blocks, in three levels: Warning, Note, Prerequisite. The other 33
// are untouched, and `assertCalloutReach` below fails the build if that count
// moves without someone looking.
//
// THIS SHOULD STOP BEING INFERENCE. `REVIEW-SHAPE.md` already told atlas that
// `callout` is one of four block kinds missing from contract 2. When it ships,
// delete this function and branch on `kind` instead.
const LEVEL = {
  Warning: { variant: 'warning', icon: 'i-warning--filled' },
  Note: { variant: 'info', icon: 'i-information--filled' },
  Prerequisite: { variant: 'info', icon: 'i-information--filled' },
};

function asCallout(block) {
  const ts = block.tokens ?? [];
  if (ts.length < 3) return null;
  if (ts[0].t !== 'text' || ts[0].v !== '> ') return null;
  if (ts[1].t !== 'strong') return null;
  const level = LEVEL[ts[1].v];
  if (!level) return null;
  if (ts[2].t !== 'text' || !ts[2].v.startsWith(' > ')) return null;

  // The third token keeps its text; only the " > " separator is dropped.
  const body = [{ ...ts[2], v: ts[2].v.slice(3) }, ...ts.slice(3)];
  return { label: ts[1].v, level, body };
}

// NO `role="status"` AND NO CLOSE BUTTON, both deliberate deviations from
// `sink/notification.html` and both recorded rather than quiet.
//
// Carbon's inline notification announces an EVENT. These are static document
// callouts present at load, and a live region that is present at load makes a
// screen reader announce all fifteen of them for no reason. The close button
// goes for a plainer reason: `js/dismiss.js` would make a Warning dismissible,
// and a warning a reader can delete from a procedure is worse than none.
//
// LOW CONTRAST, WHICH IS A CHOICE BETWEEN TWO SHIPPED STATES RATHER THAN A
// DEVIATION. Carbon's DEFAULT inline notification is the high-contrast one --
// #393939 on the white theme -- and `sink/notification.html` records that both
// are real. The default is built to interrupt; these are Prerequisite and Note
// blocks sitting inside a procedure, fifteen of them across seven walkthroughs, and
// a page of dark slabs reads as fifteen alarms.
//
// Everything else is the captured markup unchanged.
function callout({ label, level, body }) {
  return `<div class="rux--inline-notification rux--inline-notification--${level.variant} rux--inline-notification--low-contrast">
  <div class="rux--inline-notification__details">
    <svg class="rux--inline-notification__icon" width="20" height="20" viewBox="0 0 32 32" fill="currentColor" aria-hidden="true"><use href="#${level.icon}"/></svg>
    <div class="rux--inline-notification__text-wrapper">
      <div class="rux--inline-notification__title">${esc(label)}</div>
      <div class="rux--inline-notification__subtitle">${tokens(body)}</div>
    </div>
  </div>
</div>`;
}

// ---------------------------------------------------------------- blocks

// BRANCH ON THE KEYS PRESENT, NEVER ON `kind`. README's bite 1 has two mouths:
// a `prose` block has no `rows`, so iterating uniformly throws -- and in
// `sections` the same trap bites again, because `runrecord` arrives
// token-shaped 15 times and row-shaped 7 across these seven walkthroughs. One kind,
// two shapes. `kind` cannot tell them apart and the keys can.
const isRows = b => Array.isArray(b.rows);

function table(block, { numbered = false } = {}) {
  const cols = block.columns ?? [];
  const head = cols.map(c =>
    `<th scope="col"><div class="rux--table-header-label">${esc(c)}</div></th>`).join('');

  const body = (block.rows ?? []).map(row => {
    const cells = (row.cells ?? []).map((cell, i) => {
      const inner = tokens(cell.tokens);
      // The step id is the first column and is a row header, not data: it
      // labels the row for anyone navigating the table by cell.
      if (numbered && i === 0) return `<th scope="row" class="notes-step-id">${inner}</th>`;
      // THE LAST COLUMN OF A NUMBERED TABLE IS WHAT THE SCREEN ANSWERS, and it
      // gets a rule so the two halves of a step read as two halves. Structural
      // and not a name match: all 50 numbered tables across the seven walkthroughs
      // are exactly ('#', 'Do this', 'You should see'), so "the last column of
      // a numbered table" and "You should see" are the same set -- and if a
      // future table has four columns this still marks the answer column
      // rather than failing to find a heading it knows.
      const last = numbered && i === (row.cells ?? []).length - 1 && i > 1;
      // A STEP THAT YIELDS A VALUE GETS SOMEWHERE TO WRITE IT, IN PLACE.
      // `produces` is the same fact the pencil carries inline, and 99 rows
      // across the seven walkthroughs have it. The field goes in the answer column
      // of that row rather than in a panel at the foot, because a reader is
      // AT the step when the value appears and should not have to carry it
      // down the page. The row id is the storage key; it is authored data,
      // stable across a rebuild, and unique within a document.
      const writeHere = last && row.produces && row.id
        ? `<div class="rux--form-item notes-note">
              <label class="rux--label" for="n-${esc(row.id)}">Write it down</label>
              <div class="rux--text-area__wrapper">
                <textarea id="n-${esc(row.id)}" class="rux--text-area" rows="1" data-notes-note="${esc(row.id)}" placeholder="The value you saw"></textarea>
              </div>
            </div>` : '';
      return `<td${last ? ' class="notes-see"' : ''}>${inner}${writeHere}</td>`;
    }).join('');
    // `produces` marks a step that yields a value worth noting. It is the same
    // fact the `pencil` token carries inline; the attribute lets the row be
    // styled without a class the stylesheet has never heard of.
    const flags = [
      row.produces ? ' data-produces="true"' : '',
      row.optional ? ' data-optional="true"' : '',
    ].join('');
    return `<tr${flags}>${cells}</tr>`;
  }).join('\n          ');

  return `<div class="rux--data-table-container">
        <div class="rux--data-table-content">
          <table class="rux--data-table rux--data-table--md">
            <thead><tr>${head}</tr></thead>
            <tbody>
          ${body}
            </tbody>
          </table>
        </div>
      </div>`;
}

// --------------------------------------------------------- prose documents

// THE SIX BLOCK KINDS REVIEWS AND EXPERIMENTS CARRY, four of which a walkthrough never does.
// A walkthrough's blocks are identified by `kind` meaning something else entirely
// (`prose`, `steps`, `runrecord`), so this dispatches on the review vocabulary
// and never falls through to `block()` -- REVIEW-SHAPE.md section 2 named them
// and atlas emits exactly these.
function rblock(b) {
  switch (b.kind) {
    case 'prose':
      // A blockquote that is not a callout. Both in the six are pull quotes of
      // speech, and the framing is the point of them.
      return b.quoted
        ? `<blockquote class="notes-quote">${tokens(b.tokens)}</blockquote>`
        : `<p class="notes-prose-measure">${tokens(b.tokens)}</p>`;

    case 'list': {
      // NO BARE `rux--list`. Carbon compiles the modifier and the item and
      // NOT the base, so `rux--list` resolves against nothing -- check-classes
      // caught it the first time this was written, which is the whole reason
      // that gate reads the vendored stylesheet rather than a list of names.
      const tag = b.ordered ? 'ol' : 'ul';
      const cls = b.ordered ? 'rux--list--ordered' : 'rux--list--unordered';
      const items = (b.items ?? []).map(i =>
        `<li class="rux--list__item">${tokens(i.tokens)}</li>`).join('\n          ');
      return `<${tag} class="${cls}">\n          ${items}\n        </${tag}>`;
    }

    case 'callout': {
      // A review's callout NESTS BLOCKS and cannot be flattened to a string
      // the way a walkthrough's is -- the longest runs two paragraphs with its own
      // citation and a dated correction inside it. That is why `callout()`
      // above is not reused: it takes tokens, this takes blocks.
      // ONE MAP FOR BOTH VOCABULARIES. A walkthrough's callout arrives labelled
      // `Warning`, a review's as `variant: "warning"`; the rendering is the
      // same component and a second map would drift from this one. `i-warning`
      // is NOT a symbol in the sprite -- `i-warning--filled` is -- so an
      // invented icon name here would be a blank 20px box and no gate would
      // see it.
      const label = b.variant[0].toUpperCase() + b.variant.slice(1);
      const level = LEVEL[label];
      if (!level) throw new Error(`no callout level for variant "${b.variant}"`);
      const body = (b.blocks ?? []).map(rblock).join('\n      ');
      return `<div class="rux--inline-notification rux--inline-notification--${level.variant} rux--inline-notification--low-contrast">
  <div class="rux--inline-notification__details">
    <svg class="rux--inline-notification__icon" width="20" height="20" viewBox="0 0 32 32" fill="currentColor" aria-hidden="true"><use href="#${level.icon}"/></svg>
    <div class="rux--inline-notification__text-wrapper">
      <div class="rux--inline-notification__title">${esc(label)}</div>
      <div class="rux--inline-notification__subtitle">${body}</div>
    </div>
  </div>
</div>`;
    }

    case 'source':
      return `<p class="notes-source">${tokens(b.tokens)}</p>`;

    case 'code':
      // MUST SCROLL, NEVER WRAP. All three are ASCII pegging trees, the widest
      // is 96 characters, and wrapping one destroys the only thing it conveys.
      return `<div class="notes-code-scroll"><pre class="rux--type-code-01"><code>${esc(b.text)}</code></pre></div>`;

    case 'table':
      return table(b);

    // CONTRACT 5. A reference is the first document class atlas emits with
    // `###` in it, and it arrives as a block rather than as prose so this side
    // never parses a marker. Only level 3 exists: `##` is already a topic, and
    // atlas's prose.md allows no fourth level.
    case 'heading':
      return `<h3>${esc(b.n != null ? `${b.n} ${b.title}` : b.title)}</h3>`;

    default:
      throw new Error(`no rendering for review block kind "${b.kind}"`);
  }
}

function rsection(id, heading, blocks) {
  if (!blocks || !blocks.length) return '';
  return `<section class="rux--stack-vertical rux--stack-scale-5" aria-labelledby="${id}">
          <h2 id="${id}">${esc(heading)}</h2>
          ${blocks.map(rblock).join('\n          ')}
        </section>`;
}

function block(b, opts) {
  if (isRows(b)) return table(b, opts);
  const c = asCallout(b);
  if (c) return callout(c);
  return `<p class="notes-prose-measure">${tokens(b.tokens)}</p>`;
}

// ---------------------------------------------------------------- sections

// SECTIONS ARE A FLAT ORDERED ARRAY AND CARRY NO TITLE. The heading comes from
// `kind`, and a run of sections sharing a kind is ONE section with several
// blocks in it -- `runrecord` is a sentence, then a table, then the fill-in
// line. Emitting a heading per entry would put "Run record" on the page three
// times running.
const HEADING = {
  glance: 'At a glance',
  runrecord: 'Run record',
  troubleshooting: 'Troubleshooting',
  variants: 'Variants',
  downstream: 'What this unlocks',
  reference: 'Reference',
  other: 'Reference',
  prose: null,      // no heading -- prose belongs to whatever precedes it
  // INTERNAL TIER ONLY. The export tier drops these four structurally; they
  // reach this table through tools/sync-internal.sh and nowhere else.
  sources: 'Sources',
  notes: null,
  superseded: 'Superseded',
  walked: 'Walked',
};

// WHERE THE PHASES GO, WHICH THE DATA DOES NOT SAY. A walkthrough arrives as two
// independent top-level arrays -- `phases` and `sections` -- with nothing
// relating them, so the renderer chooses. Printing all of `sections` and then
// all of `phases` puts Troubleshooting, Run record and Variants AHEAD of the
// work they belong to: the troubleshooting rows are keyed by phase number and
// the run record opens "Fill in as you go", so a reader meets the fix-it table
// before the instructions. That shipped on all seven pages and no gate saw it,
// because none of them reads document order.
//
// The boundary is THE FIRST SECTION OF A SET, not a named kind. It was
// `runrecord` until that section was removed from the format on 2026-09-01,
// and the anchor went with it: every walkthrough put its phases last again, and
// `check-order` reported twenty-one misplaced sections across seven pages.
// That is the gate doing its job, and the lesson is that keying a structural
// rule to ONE kind makes the rule only as durable as that kind.
//
// A set survives any one member leaving. Troubleshooting, Variants and What
// this unlocks are the sections that refer BACK to work already done -- the
// troubleshooting rows are keyed by phase number -- so the first of them opens
// the back matter. Everything before introduces the walkthrough.
//
// `reference` is deliberately not in the set: it sits in front matter in one
// walkthrough and back matter in another, so it floats to wherever it was authored
// rather than dragging the boundary with it. Checked across all seven: front
// matter always holds `glance` and never holds a back-matter kind.
const BACK_MATTER = new Set(['troubleshooting', 'variants', 'downstream', 'runrecord']);

function splitSections(list) {
  const all = list ?? [];
  const i = all.findIndex(s => BACK_MATTER.has(s.kind));
  return i === -1 ? { front: all, back: [] } : { front: all.slice(0, i), back: all.slice(i) };
}

function sections(list) {
  const out = [];
  let open = null;   // the kind whose heading is already on the page

  for (const s of list ?? []) {
    const heading = HEADING[s.kind];
    if (heading === undefined) throw new Error(`unknown section kind "${s.kind}"`);

    if (heading && s.kind !== open) {
      if (open !== null) out.push('</section>');
      const id = 's-' + s.kind;
      out.push(`<section class="rux--stack-vertical rux--stack-scale-5" aria-labelledby="${id}">`);
      out.push(`<h2 id="${id}">${esc(heading)}</h2>`);
      open = s.kind;
    }
    out.push(block(s));
  }
  if (open !== null) out.push('</section>');
  return out.join('\n      ');
}

// ---------------------------------------------------------------- phases

function phase(p) {
  // THE ROUTE IS THE THING A READER MOST NEEDS WHOLE, so it is a definition
  // list beside the heading rather than a tag: see the note on ROUTED above.
  const where = [
    p.route ? `<div class="notes-meta-row"><dt>Route</dt><dd>${esc(p.route)}</dd></div>` : '',
    p.session ? `<div class="notes-meta-row"><dt>Session</dt><dd>${esc(p.session)}${
      p.sessionCode ? ` <span class="rux--type-code-01">${esc(p.sessionCode)}</span>` : ''}</dd></div>` : '',
    // The evidence stamp travels only in the internal tier; a client never
    // sees it and the generated `verification` sentence stands in for it.
    p.stamp ? `<div class="notes-meta-row"><dt>Evidence</dt><dd>${esc(p.stamp)}</dd></div>` : '',
  ].filter(Boolean).join('');

  // INTERNAL TIER: a phase's notes arrive as `notes` blocks after its steps.
  // They are collapsed on the source page too, so they are grouped under one
  // disclosure here rather than printed as unlabelled paragraphs.
  const open = (p.blocks ?? []).filter(b => b.kind !== 'notes');
  const notes = (p.blocks ?? []).filter(b => b.kind === 'notes');
  const notesHtml = notes.length ? `<details class="notes-notes"><summary>Notes on phase ${esc(p.n)}</summary>
        ${notes.map(b => block(b)).join('\n        ')}
        </details>` : '';

  // AN h3, NOT AN h2. Each phase sits inside the "Phases" section, so an h2
  // here makes the outline read as fourteen siblings — "Phases", then "Phase 0"
  // at the same level as the thing containing it. Someone navigating by heading
  // gets no nesting to move through, which is the same class of defect as
  // Design's metric row putting bare numbers in the outline.
  return `<section class="rux--stack-vertical rux--stack-scale-5" aria-labelledby="p-${p.n}">
        <h3 id="p-${p.n}">Phase ${esc(p.n)} — ${esc(p.title)}</h3>
        ${where ? `<dl class="notes-meta">${where}</dl>` : ''}
        ${[...open.map(b => block(b, { numbered: true })), ...(notesHtml ? [notesHtml] : [])].join('\n        ')}
      </section>`;
}

// ---------------------------------------------------------------- the shell

// ONE DEFINITION OF THE NAV, WHICH IS THE POINT OF GENERATING AT ALL. Eight
// pages carry this markup; hand-authoring meant eight copies with nothing
// keeping them in step, and walkthroughs are expected to be added and removed often.
function nav(site, activeId) {
  const link = (d) => {
    const current = d.id === activeId ? ' aria-current="page"' : '';
    return `          <li class="rux--side-nav__menu-item"><a class="rux--side-nav__link" href="${
      activeId === null ? 'pages/' : ''}${d.id}.html"${current}><span class="rux--side-nav__link-text">${esc(d.title)}</span></a></li>`;
  };
  const items = site.walkthroughs.map(link).join('\n');
  const practice = site.experiments.map(link).join('\n');
  // SUMMARIES ARE THE LISTED CATEGORY, reviews are reached from them. The
  // agreement was walkthroughs and meeting summaries; the full reviews are
  // deferred rather than refused, and listing twelve documents under one
  // heading would present them as one category when they are two.
  const meetings = site.summaries.map(link).join('\n');

  const guidesOpen = site.walkthroughs.some(g => g.id === activeId);
  const practiceOpen = site.experiments.some(e => e.id === activeId);
  const meetingsOpen = [...site.reviews, ...site.summaries].some(d => d.id === activeId);
  // CONCEPTS ARE NOT A PUBLISHED CATEGORY. atlas's concept-rules.md section 5
  // gives them no tier, its emitter refuses them at export, and this group
  // renders only when the data carries them -- which is the private build.
  const concepts = (site.concepts ?? []).map(link).join('\n');
  const conceptsOpen = (site.concepts ?? []).some(d => d.id === activeId);
  const references = (site.references ?? []).map(link).join('\n');
  const referencesOpen = (site.references ?? []).some(d => d.id === activeId);
  const referencesGroup = references ? `
      <li class="rux--side-nav__item${referencesOpen ? ' rux--side-nav__item--active' : ''}">
        <button class="rux--side-nav__submenu" type="button" aria-expanded="${referencesOpen}">
          <span class="rux--side-nav__submenu-title">Reference</span>
          <div class="rux--side-nav__icon rux--side-nav__submenu-chevron"><svg width="20" height="20" viewBox="0 0 16 16" fill="currentColor" aria-hidden="true"><use href="#i-chevron--down"/></svg></div>
        </button>
        <ul class="rux--side-nav__menu"${referencesOpen ? '' : ' hidden'}>
${references}
        </ul>
      </li>
` : '';
  const conceptsGroup = concepts ? `
      <li class="rux--side-nav__item${conceptsOpen ? ' rux--side-nav__item--active' : ''}">
        <button class="rux--side-nav__submenu" type="button" aria-expanded="${conceptsOpen}">
          <span class="rux--side-nav__submenu-title">Concepts</span>
          <div class="rux--side-nav__icon rux--side-nav__submenu-chevron"><svg width="20" height="20" viewBox="0 0 16 16" fill="currentColor" aria-hidden="true"><use href="#i-chevron--down"/></svg></div>
        </button>
        <ul class="rux--side-nav__menu"${conceptsOpen ? '' : ' hidden'}>
${concepts}
        </ul>
      </li>
` : '';
  const home = activeId === null ? './' : '../';

  // NO LEADING ICONS, AND THAT IS WHAT SETS THE CHILD INDENT. Carbon binds
  // `__link`'s padding-inline-start to the icon: 72px with
  // `__item--icon`, 32px without. Both are real variants -- Design records
  // both in data/carbon-react-spacing.json under `cds--side-nav__link` --
  // so the indent is not independently adjustable without leaving Carbon.
  // Measured 2026-09-01 on carbondesignsystem.com, which runs the component
  // itself: 14 `__item`s, 0 carrying `__item--icon`, submenu buttons holding
  // a title and a chevron and nothing else, `__link` computing 32px. The two
  // icons that used to sit here (#i-document, #i-list) bought a wider indent
  // than the labels needed and distinguished only two sections.
  return `  <nav class="rux--side-nav__navigation rux--side-nav rux--side-nav--ux rux--side-nav--hidden" aria-label="Side navigation">
    <ul class="rux--side-nav__items">

      <!-- ORDER IS \`order\` FROM THE DATA, NOT ALPHABETICAL. Contract 2 derives
           it and it sorts as a curriculum would -- build the family, plan, buy,
           make, move, ship, then the end-to-end run. Atlas got there by reading
           Prerequisite callouts as dependency edges; on Downstream rows alone
           the walkthrough that builds the test data came fourth. -->
      <li class="rux--side-nav__item${guidesOpen ? ' rux--side-nav__item--active' : ''}">
        <button class="rux--side-nav__submenu" type="button" aria-expanded="${guidesOpen}">
          <span class="rux--side-nav__submenu-title">Walkthroughs</span>
          <div class="rux--side-nav__icon rux--side-nav__submenu-chevron"><svg width="20" height="20" viewBox="0 0 16 16" fill="currentColor" aria-hidden="true"><use href="#i-chevron--down"/></svg></div>
        </button>
        <ul class="rux--side-nav__menu"${guidesOpen ? '' : ' hidden'}>
${items}
        </ul>
      </li>

${PRIVATE ? '' : `      <!-- THE WALK PAGE, the owner's alone: hidden until js/online.js finds the
           owner's log-in. The private preview has its own walk form instead. -->
      <li class="rux--side-nav__item" data-notes-owner hidden>
        <a class="rux--side-nav__link" href="${activeId === null ? 'pages/' : ''}walk.html"${activeId === 'walk' ? ' aria-current="page"' : ''}><span class="rux--side-nav__link-text">Walk a walkthrough</span></a>
      </li>

`}      <!-- EXPERIMENTS COMPOSE WALKTHROUGHS; they do not repeat their procedures. They
           get their own group because a learner opens one to predict, record
           and explain, not to perform an SOP-like runbook. -->
      <li class="rux--side-nav__item${practiceOpen ? ' rux--side-nav__item--active' : ''}">
        <button class="rux--side-nav__submenu" type="button" aria-expanded="${practiceOpen}">
          <span class="rux--side-nav__submenu-title">Experiments</span>
          <div class="rux--side-nav__icon rux--side-nav__submenu-chevron"><svg width="20" height="20" viewBox="0 0 16 16" fill="currentColor" aria-hidden="true"><use href="#i-chevron--down"/></svg></div>
        </button>
        <ul class="rux--side-nav__menu"${practiceOpen ? '' : ' hidden'}>
${practice}
        </ul>
      </li>

      <!-- THE MEETING CONTENT GROUP lists summaries rather than full reviews.
           The agreement is walkthroughs and meeting summaries; the six full
           reviews render and are reached from their summary rather than listed
           beside it, because putting twelve documents under one heading
           presents two categories as one. -->
      <li class="rux--side-nav__item${meetingsOpen ? ' rux--side-nav__item--active' : ''}">
        <button class="rux--side-nav__submenu" type="button" aria-expanded="${meetingsOpen}">
          <span class="rux--side-nav__submenu-title">Meeting summaries</span>
          <div class="rux--side-nav__icon rux--side-nav__submenu-chevron"><svg width="20" height="20" viewBox="0 0 16 16" fill="currentColor" aria-hidden="true"><use href="#i-chevron--down"/></svg></div>
        </button>
        <ul class="rux--side-nav__menu"${meetingsOpen ? '' : ' hidden'}>
${meetings}
        </ul>
      </li>
${referencesGroup}${conceptsGroup}
    </ul>
  </nav>`;
}

const SCRIPTS = [
  'overlay', 'popover', 'menu', 'list-box', 'date-picker', 'copy-button', 'tabs',
  'accordion', 'data-table', 'form-controls', 'ui-shell', 'dismiss', 'tile', 'modal',
  'profile',
];

// THE REVISION ON THE PAGE, READ FROM THE PIN AT BUILD TIME. data/atlas/PIN
// already names the atlas commit that produced the data and check-data holds
// the bytes to it; until 2026-09-06 no page carried it, so a reader looking
// at a published procedure could not say which library state it came from
// without cloning this repository. Seven characters of the commit and the
// contract number, nothing else: no date, so a rebuild from the same PIN is
// byte-identical and pages.yml's stale-page check still holds. The internal
// viewer builds from a directory with no PIN and says so rather than naming
// atlas HEAD, which is a working tree and not a revision.
const REVISION = (() => {
  const pin = join(DATA, 'PIN');
  if (!existsSync(pin)) return PRIVATE ? 'internal tier, unpinned working tree' : null;
  const text = readFileSync(pin, 'utf8');
  const commit = /^commit\s+([0-9a-f]{7,40})/m.exec(text)?.[1];
  const contract = /^contract\s+(\d+)/m.exec(text)?.[1];
  if (!commit) throw new Error('data/atlas/PIN names no commit -- run sh tools/sync-export.sh');
  return `atlas ${commit.slice(0, 7)}${contract ? ` · contract ${contract}` : ''}`;
})();
const revisionLine = () => REVISION
  ? `<p class="rux--type-caption-01 notes-revision">Built from ${esc(REVISION)}</p>`
  : '';
// The whole commit, for what the owner sends from a page: a review or a walk
// records the build it was made on, and atlas resolves it as a commit.
const PIN_COMMIT = (() => {
  const pin = join(DATA, 'PIN');
  return existsSync(pin) ? /^commit\s+([0-9a-f]{40})/m.exec(readFileSync(pin, 'utf8'))?.[1] ?? null : null;
})();

// THE REVIEW BOX, at the foot of every document page and hidden. js/online.js
// shows it to the owner alone; for everyone else, and on a page with no
// log-in, it stays hidden, so it is inert markup. `hidden` sits on a plain
// wrapper because a stack class sets its own display.
const reviewBox = () => `
        <div data-notes-owner data-notes-review hidden>
        <section class="rux--stack-vertical rux--stack-scale-5" aria-labelledby="h-review">
          <h2 id="h-review" class="rux--type-productive-heading-03">Review</h2>
          <p class="rux--type-body-compact-01" data-notes-review-last>Reading the last review</p>
          <form id="notes-review-form">
            <div class="rux--stack-vertical rux--stack-scale-5">
              <div class="rux--form-item">
                <fieldset class="rux--radio-button-group rux--radio-button-group--label-right">
                  <legend class="rux--label">Decision</legend>
                  <div class="rux--radio-button-wrapper">
                    <input id="notes-review-approve" class="rux--radio-button" type="radio" name="notes-review-decision" value="approve">
                    <label for="notes-review-approve" class="rux--radio-button__label">
                      <span class="rux--radio-button__appearance"></span>
                      <span class="rux--radio-button__label-text">Approve</span>
                    </label>
                  </div>
                  <div class="rux--radio-button-wrapper">
                    <input id="notes-review-changes" class="rux--radio-button" type="radio" name="notes-review-decision" value="changes">
                    <label for="notes-review-changes" class="rux--radio-button__label">
                      <span class="rux--radio-button__appearance"></span>
                      <span class="rux--radio-button__label-text">Request changes</span>
                    </label>
                  </div>
                </fieldset>
              </div>
              <div class="rux--form-item">
                <div class="rux--text-area__label-wrapper">
                  <label class="rux--label" for="notes-review-feedback">What should change</label>
                </div>
                <div class="rux--text-area__wrapper">
                  <textarea id="notes-review-feedback" class="rux--text-area" rows="3"></textarea>
                  <span class="rux--text-area__counter-alert" role="alert"></span>
                </div>
                <div class="rux--form__helper-text">Needed to request changes. The page changes only once a session applies it.</div>
              </div>
              <div>
                <button type="submit" class="rux--btn rux--btn--primary" id="notes-review-send" disabled>Send review</button>
              </div>
              <p class="rux--form__helper-text" id="notes-review-status" role="status"></p>
            </div>
          </form>
        </section>
        </div>`;

// SINCE 2026-09-10 EVERY Design RESOURCE IS
// ABSOLUTE, `/design/…`, regardless of a page's own depth -- this project
// vendors no copy. `up` still governs this project's OWN relative paths:
// brand/, the two delta stylesheets, and a page's own scripts.
// `doc` is the document a page shows, which is what a review names; a page
// that is not one document, like the walk page, passes null and gets no box.
function page({ title, site, activeId, body, depth, scripts = [], doc = activeId }) {
  const up = depth ? '../' : '';
  return `<!doctype html>
<html lang="en" data-theme="white">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>${esc(title)}</title>
<script src="/funnel.js"></script>
<style>html:not([data-rux-unlocked]){visibility:hidden}</style>
<!-- PLEX FIRST, THEN rux.css, WHICH IS THE ORDER Design USES IN ITS OWN
     TEMPLATES. rux.css names IBM Plex Sans sixty-seven times and declares no
     @font-face; the faces live here. Linking the stylesheet without this one
     renders every page in the system sans while every gate stays green --
     the class resolves, the reference exists, and the page looks built. -->
<link rel="icon" href="${up}brand/favicon.svg" type="image/svg+xml">
<link rel="preload" as="font" type="font/woff2" crossorigin href="/design/assets/fonts/IBMPlexSans-Regular-Latin1.woff2">
<link rel="preload" as="font" type="font/woff2" crossorigin href="/design/assets/fonts/IBMPlexSans-SemiBold-Latin1.woff2">
<!-- MONO, UNCONDITIONALLY: a "code" content block and sessionCode both
     render rux--type-code-01 (below), and both are walkthrough DATA -- which
     pages carry either is not fixed, so every page preloads the same way
     it preloads Sans, rather than only the pages that happen to need it
     today. Found missing entirely, 2026-09-10: 14 of 28 pages already
     rendered code text in the browser's fallback monospace and could
     never swap under font-display: optional. -->
<link rel="preload" as="font" type="font/woff2" crossorigin href="/design/assets/fonts/IBMPlexMono-Regular-Latin1.woff2">
<link rel="stylesheet" href="/design/assets/fonts/plex.css">
<link rel="stylesheet" href="/design/css/rux.css">
<link rel="stylesheet" href="/design/css/rux-theme.css">
<link rel="stylesheet" href="/design/css/rux-overrides.css">
<link rel="stylesheet" href="${up}theme.css">
<link rel="stylesheet" href="${up}overrides.css">
<script src="/design/js/custom-themes.js"></script>
<script src="/design/js/theme.js"></script>
<style>
/* GENERATED by tools/build.mjs. Do not edit this file -- the next build
   overwrites it, and the fix belongs in the generator. */

/* NO OFFSET FOR THE NAV, BECAUSE THE NAV IS NOT THERE UNTIL IT IS ASKED FOR.
   Switched 2026-09-10 from the persistent shell (nav permanently \`--ux\`,
   content padded 18rem past 66rem) to the collapsible one: the nav now also
   carries \`rux--side-nav--hidden\`, so it is 0 at every width until the
   hamburger's own \`--expanded\` opens it to 16rem over the page. \`.rux--content\`
   is only ever indented by a SIBLING side nav, and this nav lives inside the
   header, so none of Carbon's three offset rules ever matched it -- the 18rem
   padding this replaces was clearing a nav that, after this change, is not
   there to clear. */

/* A WRAPPING TAG ROW. Design's README records sixteen tag pairs sitting flush
   in this project's first page: an unattested composition inherits no spacing,
   so a tag beside another gets a 4px word space and nothing else.
   \`stack-horizontal\` is NOT the fix -- it cannot wrap, and it truncates its
   children in a narrow column. Plain class, not a \`rux--\` one: check-classes
   ignores non-rux-- names, so an invented \`rux--\` one would be unpoliced. */
.notes-tag-row { display: flex; flex-wrap: wrap; gap: .5rem; }

/* THE WALK PAGE. The form keeps a reading width, and the step comes before the
   progress list so a phone shows the step first; from lg the list moves to the
   step's left. */
.notes-walk-form { max-inline-size: 40rem; }
.notes-walk-run { display: grid; gap: 2rem; grid-template-columns: minmax(0, 40rem); }
@media (min-width: 66rem) {
  .notes-walk-run { grid-template-columns: 16rem minmax(0, 40rem); }
  .notes-walk-progress { grid-column: 1; grid-row: 1; }
  .notes-walk-step { grid-column: 2; grid-row: 1; }
}

/* EQUAL-HEIGHT CARDS WITH THEIR ACTIONS ON ONE LINE, and it takes both rules.
   Making the grid cell a flex parent is NOT enough on its own -- measured on
   the page: \`.rux--card\` computes \`display: block\`, so stretching the card
   left every footer at its own content height, 16px and 32px apart within one
   row. The card becomes a flex column and the footer takes the slack. */
.notes-card-cell { display: flex; }
.notes-card-cell > .rux--card { inline-size: 100%; display: flex; flex-direction: column; }
.notes-card-cell .rux--card__footer { margin-block-start: auto; }

/* A step cell holds prose with tags in it, so the tags need to sit ON the text
   baseline rather than as blocks. \`.rux--tag\` is inline-flex already; this
   only stops a tag from setting the line height of a row it shares with text. */
.rux--data-table td .rux--tag,
.rux--data-table th .rux--tag { vertical-align: middle; max-inline-size: 100%; }

/* AND THEN IT SAT LOW, EVERYWHERE A TAG IS IN A SENTENCE. \`middle\` aligns a
   box to the baseline plus half the parent's X-HEIGHT, and IBM Plex Sans's
   x-height is well under half its em box, so an 18px chip lands below the
   optical centre of the text around it. Measured 2026-09-10 in the step list,
   as the gap between the chip's centre and the text's em-box centre:

     middle 1.64px low · baseline 0.75 · text-bottom 0.25 · 0.05em 0.16

   \`.05em\` rather than a pixel because the correction is a fraction of the
   type it sits in, and this runs at three sizes. It is an optical correction,
   arrived at by measuring the alternatives rather than by taste, and it is
   worth exactly the 1.5px it moves -- which was visible enough to be reported.

   SCOPED TO THE SIZE CLASS, WHICH IS EXACTLY THE INLINE SET. Every token tag
   carries \`rux--layout--size-sm\` and no standalone badge row does, so this
   reaches tags that sit in prose and leaves a page's status badges alone. */
.rux--tag.rux--layout--size-sm { vertical-align: .05em; }

/* The step id column carries "1.10"-style ids and should not wrap or stretch. */
.notes-step-id { inline-size: 4rem; white-space: nowrap; }

/* A step that yields a value worth writing down. The pencil token says the same
   thing inline; this is the row-level view of it. */
/* ---- THE FOUR REGISTERS -------------------------------------------------
   Replaced seven tag colours on 2026-09-10. Shape and font family carry the
   meaning; hue is spent only where it means a state. See the note above
   REGISTER for the counts and the reasoning. */

/* PRESS IT -- a control you act on. Bordered, because it IS a button, and at
   37 tokens site-wide it is rare enough to afford the strongest treatment. */
.notes-t-press { font-weight: 600; color: var(--rux-text-primary, #161616);
  border: 1px solid var(--rux-border-strong, #8d8d8d); border-radius: 2px;
  padding: .05em .4em; white-space: nowrap; }

/* NAMED ON SCREEN -- a tab, panel, field or column label. 481 tokens, the
   bulk, so this is the quietest treatment that still reads as a proper noun.
   It leans on COLOUR, not weight alone: body copy is secondary and a named
   thing is primary. Three semibold phrases in a row shout, and cells carrying
   three of them are common. */
.notes-t-named { font-weight: 600; color: var(--rux-text-primary, #161616); }

/* EXACT STRING -- type or match it character for character. The mono family
   says that on its own, with no colour and no box. Carbon pairs size and
   line-height as one style, so this takes code-01's family and leaves the
   line box to the prose around it. */
.notes-t-exact { font-family: var(--rux-code-01-font-family, 'IBM Plex Mono', ui-monospace, monospace);
  font-size: .8125rem; color: var(--rux-text-primary, #161616); white-space: nowrap; }

/* A ROUTE -- plain text, its own arrow, the destination weighted because that
   segment is the thing you press. white-space: normal is deliberate: a long
   route SHOULD wrap, and it wraps whole because every segment is inline. */
.notes-t-route { white-space: normal; }
.notes-t-route .sep { color: var(--rux-text-placeholder, #a8a8a8); padding: 0 .3em; }
.notes-t-route .dest { font-weight: 600; color: var(--rux-text-primary, #161616); }

/* ON A PHONE A TOKEN MAY BREAK. A control, an exact string or a route that
   holds together on a desktop is wider than a phone's column, and unbroken it
   widened a callout past the screen; below the md width each breaks where it
   has to. */
@media (max-width: 41.98rem) {
  .notes-t-press, .notes-t-exact, .notes-t-route { white-space: normal; overflow-wrap: anywhere; }
}

/* THE READING MEASURE IS CAPPED, NOT SPANNED. A column span is proportional,
   so the same layout gives 81 characters a line at this width and grows
   without limit on a wide display -- the error Design caught in its own
   document template and corrected. A cap holds 75 characters at any width.
   Tables, diagrams and code keep the column's full width; only prose is
   capped, because only prose is read a line at a time. */
.notes-prose-measure { max-inline-size: 38rem; color: var(--rux-text-secondary, #525252); }

/* PROSE IS SECONDARY SO THAT A NAMED THING CAN BE PRIMARY. This is the half of
   the named register that does the work, and it was missing when the registers
   first landed: measured on the built page, body copy and .notes-t-named were the
   SAME colour, leaving weight alone to carry the distinction -- the thing the
   whole change set out to avoid, since cells carrying three named phrases in a
   row are common. Table cells were already secondary, so only paragraphs
   needed it. 10.6:1 against the page, well clear of AA. */

/* THE TWO STEP COLUMNS DO DIFFERENT JOBS -- left is what you do, right is what
   the screen answers -- and nothing was saying so. */
.rux--data-table td.notes-see { border-inline-start: 1px solid var(--rux-border-subtle, #e0e0e0); }

.notes-note { margin-block-start: .5rem; max-inline-size: 18rem; }
.notes-note .rux--label { font-size: .6875rem; }
.notes-notepad { margin-block-start: 3rem; max-inline-size: 38rem; }
.notes-notepad-actions { display: flex; gap: .5rem; flex-wrap: wrap; margin-block-start: 1rem; }

.notes-key { margin-block-start: 3rem; padding: 1.5rem;
  background: var(--rux-layer, #f4f4f4); border-radius: 4px; }
.notes-key-grid { display: grid; grid-template-columns: repeat(auto-fit, minmax(14rem, 1fr));
  gap: 1rem 2rem; margin: 1rem 0 0; }
.notes-key-grid dt { margin-block-end: .2rem; }
.notes-key-grid dd { margin: 0; color: var(--rux-text-secondary, #525252); font-size: .875rem; }

.notes-pencil { vertical-align: text-bottom; opacity: .65; margin-inline-start: .25rem; }

/* Route and session, above a phase's steps. A definition list rather than
   prose because they are labelled facts, and \`display: flex\` keeps each
   label with its value instead of Carbon's default dt/dd block stacking. */
/* REVIEW ELEMENTS. None of these is a Carbon component -- Design compiles no
   blockquote, no source attribution and no inline citation -- so they are
   local rules on local class names, which is why they are ln- and not
   rux--. A rux-- class invented here would resolve against nothing and
   check-classes would say so. */

/* A pull quote of speech. Both in the six reviews are quotations, so the rule
   is a quiet left rail rather than a decorative blockquote. */
.notes-quote {
  margin: 0;
  padding-inline-start: 1rem;
  border-inline-start: 2px solid var(--rux-border-subtle-01, #e0e0e0);
  color: var(--rux-text-secondary, #525252);
}

/* The source attribution, 17 of them. Small and muted, and attached to the
   thing above it rather than floating between two blocks. */
.notes-source {
  margin-block-start: -0.5rem;
  font-size: 0.75rem;
  color: var(--rux-text-secondary, #525252);
}

/* A timestamped quotation. q supplies its own quotation marks, so the token
   value must not carry them -- atlas strips them for exactly this reason. */
.notes-quote-inline { font-style: italic; }
.notes-at {
  margin-inline-start: 0.25rem;
  font-size: 0.75rem;
  font-style: normal;
  color: var(--rux-text-secondary, #525252);
}

/* SCROLLS, NEVER WRAPS. All three fenced blocks are ASCII pegging trees and
   the widest is 96 characters; wrapping one destroys the only thing it
   conveys. The container scrolls so the page itself never does -- a page that
   scrolls sideways is the defect this repo measured for. */
.notes-code-scroll { overflow-x: auto; max-inline-size: 100%; }
.notes-code-scroll pre { margin: 0; white-space: pre; }

/* A WORKSHEET ANSWER CELL NEEDS VISIBLE SPACE even before it has an answer.
   Empty table cells otherwise collapse to one text line and the published
   experiment looks complete while leaving nowhere to write. Scoped to experiment
   pages so ordinary walkthrough and review tables remain dense. */
.notes-experiment .rux--data-table td:empty::after {
  content: '';
  display: block;
  min-block-size: 3rem;
}

.notes-revision { color: var(--rux-text-secondary); margin: 0; }
/* THE EXPERIMENT PAGE IS A WORKSHEET. Two columns on a wide viewport -- the
   work, and a rail that stays put holding progress, notes and the export --
   one column otherwise. Local layout classes, because Carbon's css-grid is
   already the page's outer frame and a nested one would re-derive the shell's
   16-column arithmetic for a two-column split. */
.notes-ex { display: grid; grid-template-columns: minmax(0, 1fr); gap: 2rem; align-items: start; }
@media (min-width: 88rem) {
  .notes-ex { grid-template-columns: minmax(0, 1fr) 20rem; }
  .notes-ex-rail { position: sticky; inset-block-start: 4rem; }
}
.notes-ex-status { margin-inline-start: .75rem; vertical-align: middle; }
.notes-q-list { display: grid; gap: .75rem; }
.notes-q { display: grid; gap: .75rem; }
.notes-q-check { margin-block-start: -.25rem; }
.notes-q-head { display: grid; gap: .5rem; }
.notes-q-label { margin: 0; font-weight: 600; }
.notes-q-fields { display: grid; gap: .75rem; }
@media (min-width: 66rem) {
  .notes-q-fields[data-cols="2"], .notes-q-fields[data-cols="3"] {
    grid-template-columns: repeat(auto-fit, minmax(14rem, 1fr));
  }
}
/* Carbon sizes a text area by its \`cols\`; a worksheet space is as wide as
   its item. Measured 2026-09-06: 12rem by default, three words per line. */
.notes-ex .rux--form-item, .notes-ex .rux--text-area__wrapper, .notes-ex .rux--text-area { inline-size: 100%; }
.notes-q .rux--text-area { min-block-size: 3.25rem; resize: vertical; }
.notes-q-reveal { margin-block-start: .25rem; }
/* \`hidden\` alone loses to Carbon's \`.rux--tile { display: block }\`, which
   is more specific than the UA rule; measured 2026-09-06 with every key
   open on first paint. */
.notes-q-key { margin-block-start: .5rem; }
.notes-q-key[hidden] { display: none; }
.notes-q-key p { margin: 0; }
.notes-pass .rux--checkbox-label-text { font-weight: 400; }
.notes-ex-work { display: grid; gap: 1rem; }
.notes-ex-work h3 { margin: 0; }
.notes-ex-progress { margin: 0; color: var(--rux-text-secondary); }
.notes-ex-actions { display: flex; flex-wrap: wrap; gap: .5rem; }
.notes-meta { margin: 0; }
.notes-meta-row { display: flex; flex-wrap: wrap; gap: .5rem; }
.notes-meta dt { font-weight: 600; min-inline-size: 4.5rem; }
.notes-meta dd { margin: 0; }


/* THE DIAGRAM. Lane and stage arrive as coordinates, so placement is a grid
   lookup and nothing here measures or solves anything. Only grid-column and
   grid-row are written inline, because they ARE the data; every dimension and
   colour is a token below. Tiles are sized by kind, never by their text --
   condition 3.1 of the diagram reply -- and the name is capped upstream.

   THE FIGURE IS A \`rux--tile\`, added 2026-09-10 so the diagram reads as one
   surface rather than sitting flush on the page background, the way \`notes-q\`
   and \`notes-ex-work\` already wrap the worksheet in one elsewhere on this site.
   That is also why the node boxes below are \`notes-dg-node\`, not \`notes-tile\` --
   they used to be, and nesting a real \`rux--tile\` around a same-named custom
   class read as one thing wrapping itself. Columns were cut from 13rem to
   7rem the same day, once the collapsible shell (see the header) gave the
   diagram the width back; the title shrinks to .75rem with them so a
   two-line name still reads as a title and not a wrapped sentence. */
/* THE FIGURE IS A ONE-COLUMN GRID SO ITS CAPTION IS AS WIDE AS ITS TABLE. A
   \`<figcaption>\` is a block child of a scroll container, so it is laid out at the
   VISIBLE width while \`.notes-dg-grid\` sizes to \`max-content\` and sets the scroll
   width -- measured, 796px of caption under 1138px of table. No width on the
   caption can fix that, because its containing block is the frame and not the
   content.

   One column of \`minmax(max-content, 1fr)\` fixes both cases at once: every
   child stretches to the column, the track cannot shrink below the table's own
   max-content, and the \`1fr\` lets it grow to fill a frame that is wider. So the
   caption spans the table when the figure scrolls and the frame when it does
   not, which is the rule the closing gridline already follows.

   \`minmax(100%, max-content)\` WAS TRIED FIRST AND DOES NOT WORK: a track with a
   definite available space is clamped to it, so the column stayed at the frame's
   692px under 1138px of table and the caption did not move.

   THE FIGURE NO LONGER INSETS ITS CONTENTS, 2026-09-11. \`rux--tile\` brings
   16px of padding, which held the grid 16px clear of the surface on every side
   and stopped every lane rule 16px short of the edge -- a table whose rules do
   not reach its sides reads as a drawing of a table. The padding moves inward to
   the cells, which is where Carbon's data table puts it: the rule spans the
   table, the padding is inside the cell.

   THE TILE STAYS. The decision it was added for on 2026-09-10 still holds -- the
   figure reads as one surface rather than sitting flush on the page -- and that
   is the background, not the padding. */
.notes-dg { margin: 0; overflow-x: auto; padding: 0;
  display: grid; grid-template-columns: minmax(max-content, 1fr); }
/* EACH COLUMN AS WIDE AS ITS OWN CONTENT, 2026-09-11. It was
   \`minmax(7rem, 1fr)\` -- every column the same width, and every one of them
   stretching to fill the figure. That made the width of the single widest tile
   the width of every tile on the page: measured on the session map, ten tracks
   of 275px each, because one tile somewhere needed 275. The map was 2750px of
   figure in a 1312px frame.

   \`max-content\` DOES NOT NARROW A SINGLE TILE BELOW ITS OWN CONTENT, which is
   why this costs no height at all. The column that needed 275 still gets 275;
   the others fall to 114, 203, 119, 210, 165, 129 and 256. Nothing wraps, no
   tile grows, and the map scrolls 1807px instead of 2750. Tiles within a column
   are still all one width -- a cell stretches its tiles to the track -- so what
   changed is the SCOPE of "widest", from the whole grid to the column.

   WHAT IS GIVEN UP IS THE EVEN LATTICE, and the empty stage column with it. The
   figure reads as a compact table with columns of different widths rather than a
   regular grid, and a stage carrying no tiles shrinks to the width of its own
   heading -- the map's undrawn Cash column goes from 275px to about 60px. It is
   still drawn and still labelled, which is what section 8 of that map argues
   for, but it no longer holds a full column of space to make the point. Chosen
   by rux on the specimen, against a 12rem and a 10rem cap that keep the lattice
   and pay for it in wrapped names.

   THE 7rem FLOOR IS GONE WITH THE \`minmax\`. It existed to stop a \`1fr\` column
   collapsing; under \`max-content\` a column is never narrower than what it holds,
   so the floor only ever applied to a column holding almost nothing. */
/* THE TRAILING \`1fr\` IS NOT A COLUMN, it is the leftover. With every real
   column sized to its content the tracks no longer add up to the figure: the
   overview's come to 1114px inside a 1280px grid, and a lane rule spanning
   \`1 / -1\` stopped 166px short of the right edge with the figure's ground
   showing past it. An empty track at the end takes the slack, so the rules reach
   the edge exactly as they did when every column stretched. It holds nothing,
   and on a figure that overflows -- the session map -- there is no slack and it
   computes to zero. */
.notes-dg-grid { display: grid; grid-template-columns: repeat(var(--dg-cols), max-content) 1fr;
  gap: .5rem; align-items: start; min-inline-size: max-content; }
/* THE STAGE ROW IS A TABLE HEADER, 2026-09-11. Carbon's data table gives its
   header its own ground, and this row had none: the stage names sat on the same
   surface as the tiles under them, distinguished by case and weight alone. The
   band is a grid item spanning every column rather than a background on each
   heading, because the grid's .5rem gap would otherwise cut the ground into six
   pieces -- a header band with gaps in it is not a header band. Emitted before
   the headings so it paints behind them. */
/* THE HEADER IS THE DESIGN SYSTEM'S OWN, not an impression of one. Every value
   below was read out of \`design/css/rux.css\` rather than recalled: a row is
   \`block-size: 3rem\`, a \`th\` is \`background-color: var(--rux-layer-accent)\` with
   \`color: var(--rux-text-primary)\`, and \`thead\` is \`heading-compact-01\` --
   .875rem, weight 600, line-height 1.28572, letter-spacing .16px.

   \`--rux-layer-accent\` RATHER THAN \`-01\`, AND THEY ARE THE SAME PAINT. Measured
   in all four themes: identical everywhere. The unsuffixed one is what the
   compiled \`th\` uses, so it is the one named here -- the collision with the
   transfer band and the Result ground is not solved by the swap and is recorded
   in the commit that introduced it.

   THE MONO UPPERCASE IS GONE. A stage read \`1 · PREPARE\` in the same register as
   the lane labels beside it; a table header is sans and sentence case, and the
   stage now renders as atlas authored it. The lane label keeps the mono register,
   which is the right split: a column header and a row label are different things.

   NO INLINE PADDING, WHICH IS A DEPARTURE AND DELIBERATE. Carbon gives \`th\` and
   \`td\` the same \`padding-inline: 1rem\` so they align. Here the cell content is a
   tile that sits flush to its track, so 1rem on the heading alone would push every
   stage name a centimetre right of the tiles it names. Alignment with the column
   beats matching the rule. */
.notes-dg-head { grid-column: 1 / -1; grid-row: 1; align-self: stretch;
  background: var(--rux-layer-accent, #e0e0e0); }
.notes-dg-stage { grid-row: 1; block-size: 3rem; display: flex; align-items: center;
  font-size: var(--rux-heading-compact-01-font-size, .875rem);
  font-weight: var(--rux-heading-compact-01-font-weight, 600);
  line-height: var(--rux-heading-compact-01-line-height, 1.28572);
  letter-spacing: var(--rux-heading-compact-01-letter-spacing, .16px);
  color: var(--rux-text-primary, #161616); }

/* THE INSET THE FIGURE GAVE UP. A lane name flush against the surface edge is
   the cost of rules that reach it, so the label takes the padding instead --
   the cell holds the space, the rule spans the table. The grid keeps a little
   at the foot so the last lane's tiles do not sit on the edge. */
.notes-dg-grid { padding-block-end: 1rem; }
.notes-dg-stage--boundary { color: var(--rux-text-error, #da1e28); }

/* THE LANE RULE, 2026-09-11 -- a line across the whole grid at the top of every
   lane. It is not decoration: measured on both documents at 1440, two tiles
   stacked INSIDE a lane sit 8px apart, and where two lanes each have a tile in
   the same column they sit 8px apart too -- overview column 6 twice, session map
   columns 7 and 8. Nothing said whether the next tile down was the rest of this
   lane or the start of the next one. The same boundary reads as 543px in the
   map's columns 3 and 9, where the lanes between are empty, so the gap could not
   be read as a signal even by someone counting pixels.

   IT REPLACES THE UNDERLINE THE STAGE HEADINGS CARRIED, which is why
   \`.notes-dg-stage\` lost its \`border-block-end\` above. That line was drawn per
   column, so it broke at every gap; the first lane's rule is continuous, sits in
   the same place, and does the same job better. One line under the headings, not
   two 10px apart.

   IT IS A REAL ELEMENT AND NOT A \`::after\` ON THE LABEL, and that is a
   measurement rather than a preference. The specimen drew it both ways: the
   pseudo-element works only while the lane label is unpositioned, because
   \`position: sticky\` on the label makes it a containing block and the rule
   collapses from the width of the grid to the width of the label. A variant that
   holds the lane name in place while the map is scrolled would do exactly that.
   A grid item spanning \`1 / -1\` cannot collapse.

   THE CELLS GAINED THE GAP AND THE LABELS KEPT THEIR ALIGNMENT. A tile sat flush
   on the rule before this, because \`align-items: start\` puts it at the row's top
   and so is the line. Both the cell and the lane label take the same .5rem, so
   the label text still lines up with the first tile's title exactly as it did --
   the pair moved together rather than one of them moving. */
.notes-dg-rule { grid-column: 1 / -1; align-self: start; block-size: 1px;
  background: var(--rux-border-subtle-01, #e0e0e0); }

/* THE TRANSFER BOUNDARY, drawn from the stage's own \`boundary\` flag. The band
   gives it width, so it reads as a place the chain passes THROUGH; the rule on
   its trailing edge is where planning ends and the first real document begins.
   Both sit under the tiles -- the band is emitted first and carries no z-index,
   so an opaque node paints over it and the tint shows in the gaps. The colour
   is the one this diagram already spends on the transfer: the boundary heading
   and every \`--transfer\` node carry it too.

   \`align-self\` IS LOAD-BEARING: the grid sets \`align-items: start\` so a tile
   sits at the top of its lane row, and an empty band inherits that and computes
   to ZERO height. Measured 2026-09-10 before the fix -- 295px wide, 0px tall. */
.notes-dg-band { align-self: stretch; background: var(--rux-layer-accent-01, #e0e0e0);
  border-inline-end: 2px solid var(--rux-support-error, #da1e28);
  margin-block: -.25rem; margin-inline: -.25rem; }
/* A LANE NAME WRAPS RATHER THAN SETTING THE COLUMN ALONE. \`Enterprise Planning\`
   measured 155px against a 183px first column, so one label of six was deciding
   the width for all of them. Wrapped, the column falls to 134 and the figure
   from 1138 to about 1089.

   8.5rem IS THE LONGEST UNBREAKABLE WORD PLUS ITS PADDING. \`Manufacturing\` is
   106px of text and the label carries 28px of padding-inline, so 134px is the
   floor this column cannot go under -- and \`max-inline-size\` is a BORDER-box
   limit here, which is the part worth writing down. 7rem was tried first: 112px
   of box is 84px of content, so \`Manufacturing\` overflowed its cell by 22px and
   \`Master Data\` wrapped for nothing at 90px. Both were visible only on
   measurement; the overflow reads as a label drifting toward the tiles.

   At 8.5rem exactly one label wraps, which is the one that was setting the
   width.

   \`min-content\` WAS THE TIDIER RULE AND IS WRONG. It wraps at the longest word
   unconditionally, so \`Master Data\` -- 90px, comfortably inside the column
   \`Manufacturing\` already requires -- would stack for no saving at all. Three
   labels breaking to buy nothing is worse than one breaking to buy 49px.

   THE NAME IS NOT SHORTENED, AND THAT IS NOT THIS SIDE'S CALL ANYWAY. The lanes
   are LN's module vocabulary: atlas's session documents carry
   \`module: Enterprise Planning\` in their frontmatter, so a map calling that lane
   "Planning" would disagree with every session behind its tiles. Wrapping is
   presentation; renaming is atlas's field and a memo. */
.notes-dg-lane { grid-column: 1; font: 600 .75rem/1.4 var(--rux-code-01-font-family, ui-monospace, monospace);
  letter-spacing: .08em; text-transform: uppercase; color: var(--rux-text-secondary, #525252);
  padding-block-start: 1.1rem; padding-inline: 1rem .75rem;
  max-inline-size: 8.5rem; }
.notes-dg-cell { display: flex; flex-direction: column; gap: .5rem; padding-block-start: .5rem; }

/* A NODE IS <details>, so the disclosure needs no script and keyboard and
   screen-reader behaviour are the platform's. */
/* KIND IS ONE CUSTOM PROPERTY, READ IN TWO PLACES. The tile's accent rule and
   the panel's kind badge are the same fact, so the kind sets \`--dg-accent\` once
   and both read it -- the badge inherits it because the panel is inside the
   node. Before this the accent existed only as a border colour, which meant a
   yellow bar on Item Order Plan and nothing anywhere naming it a gate. */
.notes-dg-node { position: relative; --dg-accent: var(--rux-border-strong-01, #8d8d8d);
  border: 1px solid var(--dg-accent); background: transparent; }
/* THE NUMBER TAKES A ROW, NOT A COLUMN. It sat in a 1.25rem gutter until
   2026-09-10, which cost every tile that width for a two-character label and
   left the name a narrower column than the tile it is in. One column, one child
   per row, and the name gets the whole width back. */
.notes-dg-node > summary { cursor: pointer; padding: .4rem .5rem; display: grid; }
.notes-dg-node > summary::marker { content: ""; }
/* A tile off the walk has no number, so the row names its category instead. */
.notes-dg-node-n { font: 600 .75rem/1.4 var(--rux-code-01-font-family, ui-monospace, monospace);
  color: var(--rux-text-secondary, #525252); text-transform: uppercase; letter-spacing: .06em; }
.notes-dg-node-name { font-size: .75rem; font-weight: 600; line-height: 1.3; }
.notes-dg-node-code { font-size: .6875rem; color: var(--rux-text-secondary, #525252); }

/* WHERE THE READING ORDER BREAKS, on the face of the node it breaks at. Only
   a node carrying an off-sequence edge gets one -- two of the twenty-four here,
   six of the overview's seventeen -- so this is a mark on an exception rather
   than a third line on every tile. (It read "the three nodes" until 2026-09-10;
   three is the count of EDGES, and the two branches share one source. The
   replacement first said "seven of the overview's" and made the same mistake
   the other way: seven SPANS on six nodes, because one node both splits and
   needs. Both counts are \`diagram.*.nodes-marked\` in MEASURED now.) Its key reuses
   \`notes-dg-key\`, so "SPLITS" here and "SPLITS" in the open detail are one
   typographic thing. */
.notes-dg-node-link { display: block; font-size: .6875rem;
  color: var(--rux-text-secondary, #525252); margin-block-start: .15rem; }
.notes-dg-node-link .notes-dg-key { color: var(--rux-text-primary, #161616); }
.notes-dg-node[open] { background: var(--rux-layer-02, #ffffff); z-index: 5; }

/* THE OPEN DETAIL IS A PANEL ON THE RIGHT, AND THAT IS A LAYOUT FIX BEFORE IT
   IS A STYLE. In flow it is a grid item's content, so its longest prose line
   set the column's max-content width -- and because the stage columns are
   \`1fr\`, they are equal, so ONE open tile inflated ALL of them. Measured
   2026-09-10: the grid went 2312px to 11966px and every column 260px to 1467px
   on a single click. D1 settled the two-line tile so the detail would not
   compete with the shape; in flow it did not compete with it, it destroyed it.

   OUT OF FLOW IS THE WHOLE MECHANISM: a fixed box contributes nothing to
   intrinsic sizing, so the column cannot see it, and it also escapes \`.notes-dg\`'s
   scroll container -- \`overflow-x: auto\` computes \`overflow-y\` to auto too, so
   an in-flow panel was clipped at the figure's edges. Fixed has neither problem.

   THE RIGHT EDGE RATHER THAN THE CENTRE. A centred dialog covers the map, and
   the map is the thing the panel is read against -- section 2's three takeaways
   are all about the shape. The rail leaves it on screen. It also needs no scrim
   and no focus trap to be correct, which a modal would, and \`modal.js\` would
   have made the disclosure depend on a script.

   BELOW 8000, WHICH IS THE SHELL'S. The header and the side nav are both fixed
   at z-index 8000 in rux.css, so the panel sits under them and the nav opens
   over it rather than under it.

   \`max-inline-size: 100%\` stops 22rem overflowing a viewport narrower than
   352px -- a fixed panel resolves a percentage against the initial containing
   block. Measured 2026-09-10 at a 933px viewport: the panel is 385px, which is
   22rem plus its padding and its border, so the cap does not bind and the width
   is the one asked for. It first appeared to collapse the panel to 30px, and an
   earlier \`80vw\` guard appeared to do the same; both readings were taken
   against a preview pane with no server behind it, which reported a zero-width
   viewport to script and to fixed-position layout alike. The CSS was never the
   problem, and neither reading was evidence about it. */
.notes-dg-detail { position: fixed; inset-block: 3rem 0; inset-inline-end: 0;
  inline-size: 22rem; max-inline-size: 100%; overflow-y: auto; z-index: 6000;
  padding: var(--rux-spacing-05, 1rem); background: var(--rux-layer-02, #ffffff);
  border-inline-start: 1px solid var(--rux-border-strong-01, #8d8d8d);
  box-shadow: -2px 0 8px rgba(0, 0, 0, .3); }

/* THE PANEL SAYS WHICH NODE IT IS. Anchored under its tile the summary above it
   was the title; on the right edge the tile can be scrolled out of sight, so the
   name and code are repeated here or the panel is five unlabelled fields. */
.notes-dg-detail-head { margin: 0 0 var(--rux-spacing-05, 1rem);
  padding-block-end: var(--rux-spacing-03, .5rem);
  border-block-end: 1px solid var(--rux-border-subtle-01, #e0e0e0); }
.notes-dg-detail-n { font: 600 .75rem/1.4 var(--rux-code-01-font-family, ui-monospace, monospace);
  color: var(--rux-text-secondary, #525252); margin-inline-end: var(--rux-spacing-03, .5rem); }
.notes-dg-detail-name { font-weight: 600; }
.notes-dg-detail-code { display: block; font-size: .75rem; color: var(--rux-text-secondary, #525252); }

/* THE CATEGORY, NAMED RATHER THAN ONLY DRAWN. The canvas teaches the five with
   form; the panel is where the word for it lives, and where a reader who has
   not learned the form yet finds out what they are looking at. It reads the
   same \`--dg-accent\` the tile's edge does, so the badge and the bar are
   visibly one thing -- which is now only ever grey or, on a Checkpoint, the one
   yellow.

   THE KIND FOLLOWS IT, QUIETER. \`planned\`, \`real\`, \`outcome\` and \`terminal\` are
   all Results and the difference between them is real -- a proposal is not an
   order -- but it is a distinction for the one place with room to state it,
   not a sixth thing to encode on a tile. Nine kinds in the panel, five
   categories on the canvas, four of them drawn. */
.notes-dg-kind { display: inline-block; vertical-align: middle;
  margin-inline-start: var(--rux-spacing-02, .25rem);
  padding: 0 var(--rux-spacing-02, .25rem);
  border-inline-start: 3px solid var(--dg-accent);
  font: 600 .6875rem/1.5 var(--rux-code-01-font-family, ui-monospace, monospace);
  text-transform: uppercase; letter-spacing: .06em;
  color: var(--rux-text-secondary, #525252); background: var(--rux-layer-01, #f4f4f4); }
.notes-dg-kind-fine { display: inline-block; vertical-align: middle;
  margin-inline-start: var(--rux-spacing-02, .25rem);
  font: .6875rem/1.5 var(--rux-code-01-font-family, ui-monospace, monospace);
  color: var(--rux-text-secondary, #525252); }

/* THREE ZONES, BECAUSE THE FIVE FIELDS ARE NOT FIVE EQUAL THINGS. Section 5
   gives each a different job and a different budget: Route is where to go, Does
   and Do are the work, Leaves is the result. A rule between zones does more for
   scanning than more space between every field would. */
.notes-dg-zone { padding-block-end: var(--rux-spacing-04, .75rem);
  margin-block-end: var(--rux-spacing-04, .75rem);
  border-block-end: 1px solid var(--rux-border-subtle-01, #e0e0e0); }

/* \`LEAVES\` IS THE FIELD THAT EARNS THE MAP -- section 5 says so outright, and
   section 2 says the handovers are where a run stalls. Styled flat it was the
   fourth of five identical paragraphs. This is the one place the panel breaks
   its own uniformity, and the document is the reason. */
.notes-dg-zone--leaves { border-inline-start: 3px solid var(--rux-border-strong-01, #8d8d8d);
  padding-inline-start: var(--rux-spacing-04, .75rem);
  background: var(--rux-layer-01, #f4f4f4); padding-block: var(--rux-spacing-03, .5rem); }

/* THE STEPS. A number per step is the whole gain -- section 5's "1-3 lines"
   budget becomes a count of steps rather than a guess about where a line wraps.
   The list is Design's compiled ordered list and ONLY the rhythm between items
   is this project's, because a step is a clause and not a paragraph.

   NO \`list-style\` HERE, AND THAT WAS A REAL BUG. Design draws the marker
   itself -- \`.rux--list--ordered:not(.rux--list--nested) > .rux--list__item::before\`
   is \`counter(item) "."\` off a counter the \`ol\` resets -- so adding
   \`list-style: decimal\` put the browser's marker beside Design's and every
   step rendered "11.", "22.", "33.". Nothing in the build could see it: both
   markers are real, the class resolves, and the duplication exists only drawn.

   THE INDENT IS NOT DECORATION, IT IS WHERE THE MARKER LIVES. That \`::before\`
   is \`position: absolute; inset-inline-start: -1.5rem\`, and Design supplies
   the room for it only on \`--list--nested\` (\`margin-inline-start: 2rem\`) -- a
   top-level list is left to the consumer. Without it the marker renders 1.5rem
   outside this panel's content box and the steps read as three unnumbered
   lines with a stray full stop. 1.5rem here is the marker's own offset, not a
   number that looked right. */
.notes-dg-steps { padding-inline-start: var(--rux-spacing-06, 1.5rem); }
.notes-dg-steps > .rux--list__item + .rux--list__item { margin-block-start: var(--rux-spacing-03, .5rem); }

/* A STRIP SITS ON THE TILE IT PROVES, so it is drawn as something attached to
   the outcome rather than as a sixth field. It is the one thing in the panel
   that names a DIFFERENT session from the one the panel is about, which is why
   it carries its own heading. */
.notes-dg-strip { margin-block-start: var(--rux-spacing-04, .75rem);
  padding: var(--rux-spacing-03, .5rem);
  border: 1px dashed var(--rux-border-strong-01, #8d8d8d);
  background: var(--rux-layer-02, #ffffff); }
.notes-dg-strip-head { margin: 0 0 var(--rux-spacing-02, .25rem); font-size: .8125rem; font-weight: 600; }
.notes-dg-strip-code { font-size: .75rem; font-weight: 400; color: var(--rux-text-secondary, #525252); }
.notes-dg-strip-line + .notes-dg-strip-line { margin-block-start: var(--rux-spacing-02, .25rem); }

/* WALKTHROUGH IS PROVENANCE, NOT INSTRUCTION, so it reads as a footnote. It was the
   heaviest thing on the panel -- the tag it carries is wide and dark -- while
   being the one field a reader following the steps never needs. */
.notes-dg-foot { font-size: .75rem; color: var(--rux-text-secondary, #525252); }
.notes-dg-foot .notes-dg-field { font-size: inherit; }

/* THE CLOSE BUTTON IS BUILT BY js/diagram.js AND NEVER SHIPPED IN THE MARKUP.
   Without the script the panel still opens and closes from its own tile, so the
   page is whole; with it there is a way out that does not require finding a
   tile that may have been scrolled off. A button in the markup with no handler
   behind it would be an affordance that lies, which is the same rule the shell
   applies to its own sign-in button. */
.notes-dg-close { position: absolute; inset-block-start: var(--rux-spacing-03, .5rem);
  inset-inline-end: var(--rux-spacing-03, .5rem);
  display: flex; align-items: center; justify-content: center;
  inline-size: 1.75rem; block-size: 1.75rem; padding: 0; cursor: pointer;
  border: 0; background: transparent; color: var(--rux-text-primary, #161616); }
.notes-dg-close:hover { background: var(--rux-layer-hover-02, #e8e8e8); }
.notes-dg-field { margin: 0; font-size: .8125rem; }
.notes-dg-field + .notes-dg-field { margin-block-start: var(--rux-spacing-04, .75rem); }
.notes-dg-key { font-weight: 600; text-transform: uppercase; letter-spacing: .06em;
  font-size: .6875rem; color: var(--rux-text-secondary, #525252);
  margin-inline-end: var(--rux-spacing-02, .25rem); }

/* THE KEY IS A BLOCK IN THE PANEL AND INLINE EVERYWHERE ELSE. See \`field()\` in
   the generator: inline, the label indented only the first line of a value, so
   a three-line \`Do\` had one edge under the label and two against the panel. */
.notes-dg-detail .notes-dg-key { display: block; margin: 0 0 var(--rux-spacing-01, .125rem); }
.notes-dg-note { font-size: .8125rem; color: var(--rux-text-secondary, #525252); margin-block-start: .75rem; }

/* THE LEGEND, 2026-09-11, AND IT REVERSES §4 OF THE PLAN. That section declined
   a key outright -- "if three forms need one, they are the wrong three" -- and
   the forms do measure out at four looks on the overview and five on the map
   with nothing colliding. The reversal is rux's, asked for directly, and the
   reason it is not simply a climbdown is §1's own finding: these five words
   appear NOWHERE on the page except inside a tile's panel, one click away. A
   reader who never opens a tile has four unlabelled looks and one unexplained
   colour. The forms carry the distinctions; the legend supplies the nouns.

   EVERY SWATCH IS A REAL TILE AND NOT A DRAWING OF ONE. It carries
   \`notes-dg-node\` and the same \`notes-dg-cat--*\` class the canvas uses, so it takes
   its border, its ground, its stripe and its italic from the rules above and
   CANNOT drift from them. A hand-drawn key that says "dashed" while the tiles
   turn solid is worse than no key, and it is the failure mode a legend invites.

   ONE EXEMPTION, AND IT IS WHY \`notes-dg-key-tile\` EXISTS. A swatch carries no
   session code, so the not-a-session rule would draw the Step swatch without
   its stripe -- the single thing that swatch is there to show. The exemption is
   a \`:not()\` on that rule rather than an override after it, so the specificity
   trap §7 records cannot re-form: the rule is (0,3,0) and nothing competes. */
/* \`notes-dg-legend\`, AND THE NAME IS THE WHOLE POINT OF THIS COMMENT. It was
   \`notes-dg-key\` for a day, which is this project's class for the NEEDS and SPLITS
   marks on a tile face -- see the note above \`.notes-dg-node-link\`. Two rules
   defined one class, and the legend silently inherited the mark's
   \`text-transform: uppercase\`, \`font-weight: 600\` and letter-spacing: every gloss
   shipped shouting. Nothing caught it. \`check-classes\` validates \`rux--*\` names
   and says nothing about this project's own, and \`tile-looks\` reads tiles and
   never the legend.

   THE SWATCH IS THE LABEL NOW. The glosses are gone: five categories, five
   words, and the words were the only thing §4's no-legend argument was ever
   missing -- the forms teach themselves and the panel spells the category out in
   full when a tile is opened. One line instead of two. */
.notes-dg-legend { display: flex; flex-wrap: wrap; gap: .25rem 1rem;
  margin-block-start: .75rem; padding: 0; list-style: none; }
/* \`inline-block\`, AND ITS ABSENCE IS WHY THE FIRST CUT OF THIS BROKE. A swatch
   is a \`<span>\` wearing \`notes-dg-node\`, which is a tile's class and expects a
   block box; the name inside is \`display: block\`. While the \`li\` was a flex
   container the swatch was blockified as a flex item and none of that mattered.
   Dropping the glosses dropped the \`li\` rule with them, the span went back to
   inline, the block name broke out of it, and every swatch collapsed to a sliver
   with its label sitting outside the box it was meant to be in. */

/* AN EDGE WRAPS, ITS TWO ENDS DO NOT. \`nowrap\` on the whole span was free
   while an address was "7 → 8"; an address is a session name where a document
   numbers nothing, and “Bill of material and routing → Generate Order Planning
   (Item), what MRP explodes” held on one line overflows the figure. Only the
   arrow and the two names it joins must stay together. */
.notes-dg-edge { display: inline-block; }
.notes-dg-ends { white-space: nowrap; }

/* THE FIVE CATEGORIES, DECIDED 2026-09-10. Until then \`kind\` chose a HUE, five
   of them, on a page with no legend -- and \`decision\` and \`outcome\` chose
   nothing at all, so nine of the overview's seventeen tiles carried three
   meanings in one appearance. atlas's own export-json.md §5 rules the axis the
   other way: colour says what to do with a thing, form says what kind of thing
   it is. docs/diagram.md is the reasoning; this is the result.

   A reader at a screen with the map open asks five questions, so there are
   five categories, and THREE INDEPENDENT SIGNALS carry them rather than five
   colours:

     container   on the route, or beside it   solid tile / dashed card, inset
     name style  act on it, or take it in     upright / italic
     stripe      what you can reach           grey / none / the one yellow

   Each signal means ONE thing everywhere it appears -- italic is a state you
   take in whether it sits on a Result, a Checkpoint or a Reading -- which is
   what makes five categories learnable from four looks with no legend.

   ALL FIVE SHIP. The first cut of this shipped four and claimed the fifth was
   not derivable -- see the note on \`read\` in \`categories()\` for why that was
   wrong and what the signal is. Nothing is asked of atlas. */

/* 1 STEP -- on the route, you do it. The default: a solid tile, grey stripe,
   upright name. A run of these read left to right IS the route, so every other
   category is defined by how it departs from this one. */

/* 2 PREREQUISITE and 3 READING -- beside the route. A dashed card with no fill,
   because it is not on the line. FULL WEIGHT, not
   faint: the planning cluster row is the difference between an item planning
   can see and one it silently cannot, and a treatment that whispered it would
   be drawing the wrong conclusion. No stripe -- there is no sequence position
   to mark. The doubled class is deliberate: the not-a-session rule below uses
   \`:has()\`, which takes its argument's specificity, and a single class loses
   to it -- measured, when the two setup items that are not sessions kept the
   wrong treatment.

   THE INDENT WAS DROPPED, AND THAT IS A MEASUREMENT RATHER THAN A CHANGE OF
   MIND. The specimen set these cards in .75rem from the column edge, which
   reads well and is what the design was described as. Built, it took the
   overview's columns from 207px to 217px -- every column, because they are all
   \`1fr\` and one wide tile widens all of them -- and a figure that fitted its
   container at 1272 spilled to 1324 and grew a scrollbar. §5 item 3 of the plan
   says neither may grow, and it was written before there was anything to break
   it. The dashed border with no fill already says "off the line"; the indent
   was saying it a second time, for 52px of horizontal scroll. */
.notes-dg-node.notes-dg-cat--config,
.notes-dg-node.notes-dg-cat--info { border-style: dashed; }
.notes-dg-node.notes-dg-cat--config .notes-dg-node-name { font-style: normal; }
/* Setup is magenta, not purple: purple and the Lookup blue merge under
   red-green colour blindness, and the two share the dashed border. */
.notes-dg-node.notes-dg-cat--config { --dg-accent: var(--rux-tag-color-magenta, #9f1853); }
.notes-dg-node.notes-dg-cat--config .notes-dg-node-name,
.notes-dg-node.notes-dg-cat--config .notes-dg-node-code { color: var(--rux-tag-color-magenta, #9f1853); }
.notes-dg-node.notes-dg-cat--info { --dg-accent: var(--rux-tag-color-blue, #0043ce); }
.notes-dg-node.notes-dg-cat--info .notes-dg-node-name,
.notes-dg-node.notes-dg-cat--info .notes-dg-node-code { color: var(--rux-tag-color-blue, #0043ce); }
.notes-dg-node.notes-dg-cat--info .notes-dg-node-name { font-style: italic; }

/* 4 RESULT -- on the route, and what now exists because of the step before.
   Three departures from a Step, all saying one thing: there is nothing here to
   open and nothing to do. The MISSING STRIPE is the loudest, because the stripe
   is what says "a box you open". This is the category the diagram never had,
   and it is 10 of the 41 nodes: a planned purchase order was drawn as a box
   exactly like a step, so it read as something to go and perform. */
.notes-dg-cat--result { --dg-accent: var(--rux-tag-color-green, #0e6027); }
.notes-dg-cat--result .notes-dg-node-name,
.notes-dg-cat--result .notes-dg-node-code { color: var(--rux-tag-color-green, #0e6027); }
.notes-dg-cat--result .notes-dg-node-name { font-style: italic; font-weight: 500; }

/* 5 CHECKPOINT -- the only colour left in the figure. Italic because you do not
   perform a checkpoint; it passes or it quietly does not, and three of the four
   produce no message at all. It keeps the yellow WHEREVER IT STANDS, on the
   route or beside it: a silent failure is the one thing no layout can show, and
   §2 of the session map is written around it. */
.notes-dg-cat--check { --dg-accent: var(--rux-support-warning, #f1c21b); }
.notes-dg-cat--check .notes-dg-node-name { color: var(--rux-support-warning, #f1c21b);
  font-style: italic; font-weight: 500; }

/* NOT A SESSION, AND ONLY WHERE THE CATEGORY HAS NOT ALREADY DECIDED ITS OWN
   INLINE START. A tile with no code has nothing behind it to open, so it loses
   the stripe -- but that is a statement about a STEP. Prerequisite and Reading
   draw a dashed card, Result draws no stripe at all and Checkpoint draws the
   yellow; all four have said what their inline start is, and this rule has
   nothing left to refine. So it is keyed on Step, which is the only category
   whose stripe is the plain grey default.

   IT WAS KEYED ON EVERY TILE TWICE, AND BOTH TIMES IT TOOK SOMETHING THAT WAS
   NOT A STRIPE. First it ate one SIDE of a Prerequisite's dashed card -- the
   bill of material and the planning cluster row shipped as three-sided boxes,
   open on the left, found on the live site and fixed at 63094e5 by excluding
   the two categories drawn beside the route. That fix added two \`:not()\`s,
   which took this rule from (0,2,0) to (0,4,0) and so past
   \`.notes-dg-cat--check:not(:has(...))\` at (0,2,0) -- the rule that existed to keep
   a codeless Checkpoint's accent. Every gate on the overview is codeless, so
   the one hue the design kept was invisible on the page whose content is mostly
   gates: exactly the defect the specimen caught once already, back by
   specificity. Measured in the browser before the fix: 0px none on all three.
   An exclusion list that has to grow is the wrong shape; naming the one
   category the rule is about cannot drift into another one's treatment. */
/* THE FILL SAYS THERE IS A SCREEN BEHIND IT, 2026-09-12. A tile with a session
   code is filled; one without is an outline. That is the signal the 3px accent
   stripe used to carry -- grey for an ordinary screen, none for nothing to open
   -- moved to a property that can hold it while colour takes the role. It costs
   nothing to derive: \`:has(.notes-dg-node-code)\` is the test the stripe rule
   already used.

   NOT \`layer-01\`, WHICH IS THE FIGURE'S OWN GROUND. A neutral fill drawn with it
   is invisible -- measured 57,57,57 on 57,57,57 in g90, in the specimen, before
   this shipped. The gray tag pair is the neutral that differs from the surface.

   THE LEGEND SWATCHES TAKE THE FILL TOO. A swatch carries no code, so it would
   otherwise show every category in its unfilled form and teach the wrong half of
   a two-state system. */
.notes-dg-node:has(.notes-dg-node-code), .notes-dg-legend-tile {
  background: var(--rux-tag-background-gray, #e0e0e0); }
.notes-dg-node:has(.notes-dg-node-code) .notes-dg-node-name,
.notes-dg-node:has(.notes-dg-node-code) .notes-dg-node-code,
.notes-dg-legend-tile .notes-dg-node-name { color: var(--rux-tag-color-gray, #161616); }
.notes-dg-cat--info:has(.notes-dg-node-code), .notes-dg-legend-tile.notes-dg-cat--info {
  background: var(--rux-tag-background-blue, #d0e2ff); }
.notes-dg-cat--info:has(.notes-dg-node-code) .notes-dg-node-name,
.notes-dg-cat--info:has(.notes-dg-node-code) .notes-dg-node-code,
.notes-dg-legend-tile.notes-dg-cat--info .notes-dg-node-name { color: var(--rux-tag-color-blue, #0043ce); }
.notes-dg-cat--config:has(.notes-dg-node-code), .notes-dg-legend-tile.notes-dg-cat--config {
  background: var(--rux-tag-background-magenta, #ffd6e8); }
.notes-dg-cat--config:has(.notes-dg-node-code) .notes-dg-node-name,
.notes-dg-cat--config:has(.notes-dg-node-code) .notes-dg-node-code,
.notes-dg-legend-tile.notes-dg-cat--config .notes-dg-node-name { color: var(--rux-tag-color-magenta, #9f1853); }
.notes-dg-cat--result:has(.notes-dg-node-code), .notes-dg-legend-tile.notes-dg-cat--result {
  background: var(--rux-tag-background-green, #a7f0ba); }
.notes-dg-cat--result:has(.notes-dg-node-code) .notes-dg-node-name,
.notes-dg-cat--result:has(.notes-dg-node-code) .notes-dg-node-code,
.notes-dg-legend-tile.notes-dg-cat--result .notes-dg-node-name { color: var(--rux-tag-color-green, #0e6027); }
.notes-dg-cat--check:has(.notes-dg-node-code), .notes-dg-legend-tile.notes-dg-cat--check {
  background: color-mix(in srgb, var(--rux-support-warning, #f1c21b) 25%, var(--rux-layer-01, #f4f4f4)); }
/* A dashed tile's fill stops inside its border, so the gaps between dashes show
   the ground: on a filled dark tile the dash and the fill are 1.24 apart and the
   card reads solid. After the fills, because their \`background\` shorthand resets
   the clip. */
.notes-dg-node.notes-dg-cat--config,
.notes-dg-node.notes-dg-cat--info { background-clip: padding-box; }

/* THE LEGEND IS THE FIGURE'S CAPTION, and until now the figure had none. It is
   a \`<figcaption>\` rather than a loose \`<ul>\`: it is literally a caption for the
   figure, it is the last child so it is valid there, and a screen reader
   announces it as the figure's caption instead of as four list items with no
   stated relationship to anything.

   IT WAS THE ONLY THING IN THE FIGURE TOUCHING THE EDGE. Measured: the legend
   started at 0 while every lane label starts at 16px, so it read as falling out
   of the table rather than belonging to it. Same 1rem now, so it lines up with
   the column of labels directly above it.

   AND IT HAD NO SEPARATOR, so it read as one more body row. The header has its
   own ground and the lanes have rules; this had neither. The rule on top uses
   \`--rux-border-subtle-01\`, the same token the lane rules use, which closes the
   table and marks this as its foot -- where Carbon puts a table's toolbar and
   footer bars.

   \`KEY\` IS IN THE LANE LABELS' REGISTER because that is what it is: a row label.
   Mono, uppercase, secondary -- the same voice as MASTER DATA and SALES above it.

   ITS SPACING LIVES BELOW THE CATEGORY RULES ON PURPOSE. It sat above them and
   lost: \`.notes-dg-node.notes-dg-legend-tile\` and \`.notes-dg-node.notes-dg-cat--config\` are
   both two classes, so the later won and Setup kept \`padding-inline-start: 0\`
   while its neighbours took .5rem. Source order fixes it without a third class;
   escalating specificity is what armed the trap §7 of \`docs/diagram.md\` records,
   and it is not spent on a legend.

   TWO GLOSSES, ONE PER AXIS THAT CANNOT SPEAK FOR ITSELF. Yellow cannot say
   "this decides on its own and can stop without telling you", so Checkpoint
   keeps its sentence. And since 2026-09-12 the fill carries a second axis
   entirely -- filled means there is a screen behind the tile -- which the
   swatches cannot teach, because every swatch is filled. A legend that teaches
   one of two axes is the half-key this one was built to avoid. */
/* THE CLOSING RULE IS THE GRID'S, NOT THE CAPTION'S, and that is a fact about
   scrolling rather than a preference. \`.notes-dg\` scrolls on the inline axis, so a
   block child of it -- which is what a \`<figcaption>\` is -- is laid out at the
   VISIBLE width while the grid inside sizes to \`max-content\` and sets the scroll
   width. A border on the caption therefore stops wherever the frame happens to
   end and cannot reach the far side of the table. Measured: the line crossed
   about a third of the surface.

   So the rule moves to \`.notes-dg-grid\`, which already spans the whole table, and
   the caption keeps only its padding. The line now closes the table at the same
   width every lane rule runs. */
.notes-dg-grid { border-block-end: 1px solid var(--rux-border-subtle-01, #e0e0e0); }

/* THE LINK SHARES THE CAPTION'S ROW, pushed to the far side. A legend on the
   left and the way onward on the right is one line where it was three, and it
   puts the link on the surface it belongs to rather than loose underneath it.
   \`space-between\` with \`flex-wrap\` so a narrow frame drops it below rather than
   crushing the swatches. */
/* \`margin-inline-start: auto\` ON THE LINK, NOT \`space-between\` ON THE ROW. The
   row has three children -- the KEY label, the swatches, the link -- and
   \`space-between\` spreads all three, which pushed the swatches 117px off the
   label they belong to and dropped the link onto a line of its own. Measured
   before the fix. The auto margin keeps label and swatches together on the left
   and takes only the link to the far side. */
.notes-dg-legend { display: flex; align-items: baseline; flex-wrap: wrap;
  gap: .5rem 1rem; margin: 0; padding: .75rem 1rem; }
.notes-dg-legend-link { font-size: .8125rem; margin-inline-start: auto;
  white-space: nowrap; }
.notes-dg-legend-label { font: 600 .75rem/1.4 var(--rux-code-01-font-family, ui-monospace, monospace);
  letter-spacing: .08em; text-transform: uppercase;
  color: var(--rux-text-secondary, #525252); }
.notes-dg-legend-list { display: flex; align-items: center; flex-wrap: wrap;
  gap: .25rem .75rem; margin: 0; padding: 0; list-style: none; }
.notes-dg-legend-list li { display: flex; align-items: center; gap: .5rem; }
.notes-dg-legend-gloss { font-size: .75rem; color: var(--rux-text-secondary, #525252); }
.notes-dg-node.notes-dg-legend-tile { display: inline-flex; align-items: center;
  justify-content: center; min-block-size: 1.5rem; padding-inline: .5rem;
  padding-block: 0; vertical-align: middle;
  font-size: var(--rux-label-01-font-size, .75rem);
  line-height: var(--rux-label-01-line-height, 1.33333);
  letter-spacing: var(--rux-label-01-letter-spacing, .32px);
  color: var(--rux-text-primary, #161616); }
.notes-dg-legend-tile .notes-dg-node-name { display: inline; }

/* THE HEADER IS \`position: fixed\` AND 48px TALL, so every in-page anchor
   lands its target underneath it. Measured: jumping to a phase put the
   heading at viewport top 0, behind the header, with the first thing visible
   being the middle of its own table. This is not cosmetic on these pages --
   the side nav links to #summaries and every phase carries an id.
   3rem clears the header; the extra 1rem is so the heading does not sit
   flush against it. */
h1, h2, h3 { scroll-margin-block-start: 4rem; }
</style>
</head>
<body>
<!-- GENERATED by tools/build.mjs from data/atlas/. Do not edit by hand. -->

<!-- SPRITE:BEGIN -->
<!-- SPRITE:END -->

<header class="rux--header" data-theme="g100" aria-label="Rux Notes">
  <a class="rux--skip-to-content" href="#main-content">Skip to main content</a>

  <!-- THE COLLAPSIBLE SHELL, matching Scheduler's: no __hidden on this
       button, so it stays on screen at every width rather than disappearing
       above 66rem. js/ui-shell.js toggles \`--expanded\` on the nav below and
       keeps aria-expanded, the glyph and this label in step; nothing here
       needs a script of its own. Ships closed -- the nav carries
       \`rux--side-nav--hidden\` -- and "Open menu" is the half of the label
       pair ui-shell.js swaps to "Close menu" on open, so it has to start as
       exactly that string. -->
  <button type="button" class="rux--header__action rux--header__menu-trigger rux--header__menu-toggle" aria-label="Open menu" aria-expanded="false"><svg width="20" height="20" viewBox="0 0 16 16" fill="currentColor" aria-hidden="true"><use href="#i-menu"/></svg></button>

  <!-- The logo is brand/logo.svg, one file, this project's own. Swap it and
       every page here picks it up on reload: no rebuild, no markup edit.
       It is an img, not inline SVG, which is what makes that swap
       free and costs nothing: the shell header is #161616 with #f4f4f4 text
       in all four themes, so one colourway serves every theme. Sized by
       HEIGHT so the file's own aspect governs, and nothing overwrites a logo
       you replaced. -->
  <a class="rux--header__name" href="${up || './'}"><img src="${up}brand/logo.svg" alt="" style="height:1.5rem;width:auto;margin-right:.5rem;flex:none"><span class="rux--header__name--prefix">Rux</span>&nbsp;Notes</a>

  <!-- NO __nav: one product. __global carries the two actions every app has
       since Design v0.1.3 (§4.13): the Account action and the switcher, each
       opening its own header panel through aria-controls
       (Design's js/ui-shell.js). NO NOTIFICATIONS GLYPH, here or on the
       hub since 2026-09-03: an icon-only button with no handler is an
       affordance that lies, and nothing notifies yet. Carbon's captured
       header has one and templates/ keeps it; a module drops it until it
       means something. The switcher panel ships Home and this app as its
       entries; /switcher.js at the account root replaces them with the
       shared list in switcher.json and marks the app you are on. Served
       alone -- a local tools/serve.mjs, or offline -- the shipped entries
       stay. Both paths are root-absolute by decision: the root
       is rux-sm.github.io and this site sits under it at
       /notes/. The account panel is the standard one from Design's
       template, verbatim: the local profile (js/profile.js) under the key
       every app on the origin shares, so a theme chosen here is the theme
       the hub opens in. -->
  <div class="rux--header__global">
    <button type="button" class="rux--header__action rux--btn rux--layout--size-lg rux--btn--ghost rux--btn--icon-only" aria-label="Account" aria-expanded="false" aria-controls="rux-account-panel"><svg width="20" height="20" viewBox="0 0 16 16" fill="currentColor" aria-hidden="true"><use href="#i-user--avatar"/></svg></button>
    <button type="button" class="rux--header__action rux--btn rux--layout--size-lg rux--btn--ghost rux--btn--icon-only" aria-label="App switcher" aria-expanded="false" aria-controls="rux-switcher-panel"><svg width="20" height="20" viewBox="0 0 32 32" fill="currentColor" aria-hidden="true"><use href="#i-grid"/></svg></button>
  </div>
  <div class="rux--header-panel" id="rux-switcher-panel">
    <ul class="rux--switcher" aria-label="Applications">
    <li class="rux--switcher__item"><a class="rux--switcher__item-link" href="/">Home</a></li>
    <li><hr class="rux--switcher__item--divider"></li>
    <li class="rux--switcher__item"><a class="rux--switcher__item-link" href="/notes/" aria-current="page">Notes</a></li>
  </ul>
  </div>
  <!-- THE ACCOUNT PANEL: the same header panel, opened by the Account action
       through aria-controls (js/ui-shell.js), holding the profile every app
       keeps — a display name and the theme, saved in this browser under one
       key shared by every app on the origin (js/theme.js, js/profile.js).
       The panel is captured (--header-w-actions-and-right-panel); what is IN
       it is a product's own, composed from the sink's text input and vertical
       radio group. The sign-in button ships hidden and shows only once
       something registers a handler for it, because a button with no handler
       is an affordance that lies. -->
  <div class="rux--header-panel" id="rux-account-panel">
    <div class="rux--layer-two rux--stack-vertical rux--stack-scale-5">
      <div class="rux--form-item rux--text-input-wrapper">
        <div class="rux--text-input__label-wrapper">
          <label class="rux--label" for="rux-profile-name">Display name</label>
        </div>
        <div class="rux--text-input__field-outer-wrapper">
          <div class="rux--text-input__field-wrapper">
            <input id="rux-profile-name" class="rux--text-input" type="text" autocomplete="nickname" placeholder="Saved in this browser">
          </div>
        </div>
      </div>
      <div class="rux--form-item">
        <fieldset class="rux--radio-button-group rux--radio-button-group--label-right rux--radio-button-group--vertical" id="rux-profile-theme">
          <legend class="rux--label">Theme</legend>
          <div class="rux--radio-button-wrapper">
            <input id="rux-theme-white" class="rux--radio-button" type="radio" name="rux-theme" value="white" checked>
            <label for="rux-theme-white" class="rux--radio-button__label">
              <span class="rux--radio-button__appearance"></span>
              <span class="rux--radio-button__label-text">White</span>
            </label>
          </div>
          <div class="rux--radio-button-wrapper">
            <input id="rux-theme-g10" class="rux--radio-button" type="radio" name="rux-theme" value="g10">
            <label for="rux-theme-g10" class="rux--radio-button__label">
              <span class="rux--radio-button__appearance"></span>
              <span class="rux--radio-button__label-text">Gray 10</span>
            </label>
          </div>
          <div class="rux--radio-button-wrapper">
            <input id="rux-theme-g90" class="rux--radio-button" type="radio" name="rux-theme" value="g90">
            <label for="rux-theme-g90" class="rux--radio-button__label">
              <span class="rux--radio-button__appearance"></span>
              <span class="rux--radio-button__label-text">Gray 90</span>
            </label>
          </div>
          <div class="rux--radio-button-wrapper">
            <input id="rux-theme-g100" class="rux--radio-button" type="radio" name="rux-theme" value="g100">
            <label for="rux-theme-g100" class="rux--radio-button__label">
              <span class="rux--radio-button__appearance"></span>
              <span class="rux--radio-button__label-text">Gray 100</span>
            </label>
          </div>
          <div class="rux--radio-button-wrapper">
            <input id="rux-theme-geist" class="rux--radio-button" type="radio" name="rux-theme" value="geist">
            <label for="rux-theme-geist" class="rux--radio-button__label">
              <span class="rux--radio-button__appearance"></span>
              <span class="rux--radio-button__label-text">Geist</span>
            </label>
          </div>
          <div class="rux--radio-button-wrapper">
            <input id="rux-theme-linear" class="rux--radio-button" type="radio" name="rux-theme" value="linear">
            <label for="rux-theme-linear" class="rux--radio-button__label">
              <span class="rux--radio-button__appearance"></span>
              <span class="rux--radio-button__label-text">Linear</span>
            </label>
          </div>
          <div class="rux--radio-button-wrapper">
            <input id="rux-theme-ant-dark" class="rux--radio-button" type="radio" name="rux-theme" value="ant-dark">
            <label for="rux-theme-ant-dark" class="rux--radio-button__label">
              <span class="rux--radio-button__appearance"></span>
              <span class="rux--radio-button__label-text">Ant Dark</span>
            </label>
          </div>
          <div class="rux--radio-button-wrapper">
            <input id="rux-theme-spotify" class="rux--radio-button" type="radio" name="rux-theme" value="spotify">
            <label for="rux-theme-spotify" class="rux--radio-button__label">
              <span class="rux--radio-button__appearance"></span>
              <span class="rux--radio-button__label-text">Spotify</span>
            </label>
          </div>
        </fieldset>
      </div>
      <button type="button" class="rux--btn rux--btn--tertiary" id="rux-profile-sign-in" hidden>Sign in</button>
    </div>
  </div>

  <div class="rux--side-nav__overlay"></div>

${nav(site, activeId)}
</header>

<main id="main-content" class="rux--content"${doc ? ` data-notes-page="${esc(doc)}"` : ''}${PIN_COMMIT ? ` data-notes-commit="${PIN_COMMIT}"` : ''}>
  <div class="rux--css-grid">
    <div class="rux--css-grid-column rux--col-span-100">
      <div class="rux--stack-vertical rux--stack-scale-7">
${body}
${doc ? reviewBox() : ''}
${revisionLine()}
      </div>
    </div>
  </div>
</main>

${SCRIPTS.map(s => `<script src="/design/js/${s}.js"></script>`).join('\n')}
${scripts.map(s => `<script src="${up}${s}"></script>`).join('\n')}
<script src="/switcher.js"></script>
<script src="https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2.116.0/dist/umd/supabase.js" integrity="sha384-iLddHTLokph6Omwoyid4XKxHaWa6w41BnoEj0q5oOrzmYPpHIKt1wyjReA7s//pP" crossorigin="anonymous"></script>
<script src="/account.js"></script>
<script src="${up}js/online.js"></script>
</body>
</html>
`;
}

// ---------------------------------------------------------------- pages

// A DRAFT IS LABELLED, NEVER WITHHELD. README's decision: six of the seven are
// drafts, so withholding them leaves a site with one page on it. Contract 2
// carries `status` in the export tier, so the badge is data rather than prose
// to be mined.
const statusTag = s => s === 'approved'
  ? `<span class="rux--tag rux--tag--green"><span class="rux--tag__label">Approved</span></span>`
  : `<span class="rux--tag rux--tag--teal"><span class="rux--tag__label">Draft</span></span>`;

// OPEN ISSUES ARE A COUNT AND NEVER A LIST. Atlas emits `openIssues` as a bare
// integer at the export tier -- the ids themselves were authored out upstream,
// which is why the ask was for a count in the first place -- so there is
// nothing here to link to and a reader is told how much is unresolved, not
// what. Absent and zero both render nothing: a walkthrough with no open issue says
// nothing rather than claiming a clean bill, because `openIssues` counts what
// atlas has recorded, not what exists.
//
// `magenta` rather than `red`: red is GAP, which marks a hole in the document
// itself, and an open issue is a question against a walkthrough that otherwise
// stands. The title carries the long form, since the label is two words.
const issuesTag = n => n > 0
  ? `<span class="rux--tag rux--tag--magenta" title="${n} open issue${n === 1 ? '' : 's'} recorded against this document"><span class="rux--tag__label">${n} open</span></span>`
  : '';

// THE DIAGRAM THE HOME PAGE LEADS WITH, settled with rux 2026-09-11. The site is
// built around one diagram now -- `docs/diagram.md` opens with what it is for --
// and a reader landing here should meet it before a list of documents. The
// session map is kept and frozen, so this is named rather than inferred from
// "the reference that has a diagram", which would match both.
//
// IT IS NOT FINISHED AND IT LEADS ANYWAY, which is rux's call. Shipping is one
// tile, planning has two steps of six nodes, there is no Inquiry on it at all
// and four branches are drawn where the library knows of more it cannot yet
// source -- all four are atlas's to author and tracked in
// `exchange/SEND-ATLAS-5.md`. A map that shows its own shape early is worth more
// than one that appears when it is complete.
//
// ABSENT IS NOT FATAL. If a sync ever stops emitting it the home page loses the
// figure and keeps everything else, rather than failing the build: a home page
// is not the place to discover that upstream dropped a document.
const HOME_DIAGRAM = 'order-to-shipment-overview';

function indexPage(site) {
  const { references } = site;
  const home = (references ?? []).find(r => r.id === HOME_DIAGRAM && r.diagram);

  // THE HOME PAGE IS THE MAP AND NOTHING ELSE, at rux's direction 2026-09-11.
  //
  // WHAT WAS REMOVED AND WHY IT COST NOTHING. Four sections stood under the
  // figure -- walkthroughs and practice as cards, reference and summaries as
  // lists -- and every one of them was a second route to a document the side nav
  // already reaches. Measured before cutting rather than assumed: the nav links
  // 19 documents, the sections linked the same 19, and the two sets differ by
  // nothing in either direction. No document lost its only way in.
  //
  // THE CARD BUILDERS WENT WITH THEM. Roughly 120 lines that built walkthrough cards,
  // experiment cards and summary cards are deleted rather than left unreferenced:
  // a generator carrying markup nothing emits is markup no gate checks and no
  // reader sees, and `check-classes` would have gone on validating it forever.
  // `git show` has them if a future index wants them back.
  //
  // WHAT IS LEFT IS ONE SECTION. The route as the heading, the figure, and the
  // one line linking the document it is drawn from -- which is the only thing
  // here the nav also reaches, and it stays because it is the caption explaining
  // what a tile holds rather than a list entry.
  const lead = home ? `
        <section class="rux--stack-vertical rux--stack-scale-5" aria-labelledby="h-map">
          <h1 id="h-map">Demand to shipment</h1>
          ${withPageBase('pages/', () => diagramFigure(home.diagram, { notes: false,
            link: `<a class="rux--link notes-dg-legend-link" href="pages/${esc(home.id)}.html">Read the whole document</a>` }))}
        </section>
` : `
        <div class="rux--stack-vertical rux--stack-scale-5">
          <h1>Notes</h1>
          <p class="rux--type-body-02">The map is not in this build. Every document is
             in the navigation.</p>
        </div>
`;

  return page({ title: 'Notes', site, activeId: null, body: lead, depth: 0,
    scripts: home ? ['js/diagram.js'] : [] });
}

// A REVIEW AND A SUMMARY ARE ONE PAGE BUILDER WITH TWO SLOT LISTS. They share
// the topics model and nothing else, which is REVIEW-SHAPE.md section 5's
// finding -- a summary is not a truncated review. Rendering them from one
// function keeps the shell, the nav and the topic rendering identical while
// the slots differ, which is the actual relationship between them.
const REVIEW_SLOTS = [
  ['objective', 'Objective'],
  ['attendees', 'Attendees'],
  ['__topics', 'Key topics discussed'],
  ['decisions', 'Decisions made'],
  ['actions', 'Action items'],
  ['questions', 'Open questions'],
  ['methodology', 'Methodology and process notes'],
  ['sessions', 'Sessions referenced'],
];

const SUMMARY_SLOTS = [
  ['covered', 'What this covered'],
  ['__topics', 'Topics'],
  ['decided', 'What was decided'],
  ['takeaways', 'Key takeaways'],
];

function topicsSection(r) {
  const heading = r.kind === 'summary' ? 'Topics' : 'Key topics discussed';
  const items = (r.topics ?? []).map(t => {
    // A review numbers its topics `3.n`; a summary's are titled and
    // unnumbered. The id has to be stable either way, so it falls back to the
    // index rather than emitting `id="t-undefined"` six times on one page.
    const label = t.n ? `${t.n} ${t.title}` : t.title;
    const id = `t-${(t.n ?? t.title).replace(/[^A-Za-z0-9.]+/g, '-').toLowerCase()}`;
    return `<section class="rux--stack-vertical rux--stack-scale-5" aria-labelledby="${id}">
            <h3 id="${id}">${esc(label)}</h3>
            ${(t.blocks ?? []).map(rblock).join('\n            ')}
          </section>`;
  }).join('\n        ');
  if (!items) return '';
  return `<section class="rux--stack-vertical rux--stack-scale-7" aria-labelledby="h-topics">
          <h2 id="h-topics">${esc(heading)}</h2>
          ${items}
        </section>`;
}

function reviewPage(r, site) {
  const slots = r.kind === 'summary' ? SUMMARY_SLOTS : REVIEW_SLOTS;

  // THE ONLY ROUTE TO A FULL REVIEW, so it is not decoration. Six review pages
  // render and the nav lists summaries alone -- deliberately, because walkthroughs
  // and summaries are the two agreed categories. Without this link the reviews
  // are six pages at URLs nothing points at, and `check-links` says in its own
  // header that a page nobody links to is exactly what it cannot see.
  //
  // The id is the relationship: atlas emits `<review-id>_summary`, and the
  // pairing is asserted against the loaded set rather than assumed, so a
  // summary whose review is missing drops the link instead of writing a 404.
  const pairId = r.kind === 'summary' ? r.id.replace(/_summary$/, '') : `${r.id}_summary`;
  const pair = [...site.reviews, ...site.summaries].find(d => d.id === pairId);
  const pairLink = pair ? `
          <p class="rux--type-body-01"><a class="rux--link" href="${esc(pair.id)}.html">${
            r.kind === 'summary' ? 'Read the full review' : 'Read the summary'}</a></p>` : '';
  const body = `        <div class="rux--stack-vertical rux--stack-scale-5">
          <h1>${esc(r.title)}</h1>
          <div class="notes-tag-row">
            ${statusTag(r.status)}
            <span class="rux--tag rux--tag--gray"><span class="rux--tag__label">${r.kind === 'summary' ? 'Summary' : 'Review'}</span></span>
            <span class="rux--tag rux--tag--outline"><span class="rux--tag__label">Updated ${esc(r.updated)}</span></span>
          </div>${pairLink}
        </div>

      ${slots.map(([slot, heading]) => slot === '__topics'
        ? topicsSection(r)
        : rsection(`s-${slot}`, heading, r[slot])).filter(Boolean).join('\n\n      ')}`;

  return page({ title: `${r.title} — Notes`, site, activeId: r.id, body, depth: 1 });
}

// AN EXPERIMENT IS ORDERED PRACTICE, not walkthrough phases. The prose block vocabulary
// is shared with reviews, while the top-level shape is an intro followed by the
// numbered assignments the learner completes.
// ---------------------------------------------------------------- experiment

// A STABLE ID FOR A QUESTION, so an answer saved in the browser survives a
// rebuild and a re-sync. Keyed by the section number and the question's own
// text rather than its position: a row inserted above it must not hand it
// someone else's answer. A reworded question orphans its answer, which is the
// honest outcome -- the answer was to the old wording.
const djb2 = (str) => {
  let h = 5381;
  for (let i = 0; i < str.length; i++) h = ((h << 5) + h + str.charCodeAt(i)) >>> 0;
  return h.toString(36);
};

// A CHECKBOX, exactly as Carbon renders one: wrapper, input, label, text.
const checkbox = ({ id, text, attrs = '', cls = '' }) =>
  `<div class="rux--form-item rux--checkbox-wrapper ${cls}">
            <input id="${id}" class="rux--checkbox" type="checkbox"${attrs}>
            <label for="${id}" class="rux--checkbox-label"><div class="rux--checkbox-label-text">${text}</div></label>
          </div>`;

// A TABLE WITH ANSWER SPACES IS A LIST OF QUESTIONS, NOT A GRID. The source
// draws it as a table because Markdown has nothing else; on the page each row
// is one item -- what is asked, what is given, then one text area per answer
// column, and beneath an answer that has a key, the control that reveals it.
// The data says which columns are which (`answers`, `check`); nothing here
// guesses from an empty cell.
function answerList(block, n) {
  const cols = block.columns ?? [];
  const answers = new Set(block.answers ?? []);
  const check = block.check ?? null;
  const fixed = cols.map((_, i) => i).filter(i => !answers.has(i) && i !== check);
  const labelCol = fixed[0];
  const single = answers.size === 1;

  const items = (block.rows ?? []).map((row, r) => {
    const cells = row.cells ?? [];
    const labelText = cells[labelCol]?.text ?? `row ${r + 1}`;
    const rowId = `${n}:${djb2(labelText)}`;
    const keys = new Map((row.key ?? []).map(k => [k.col, k]));
    const meta = fixed.slice(1).filter(i => (cells[i]?.tokens ?? []).length).map(i =>
      `<div class="notes-meta-row"><dt>${esc(cols[i])}</dt><dd>${tokens(cells[i].tokens)}</dd></div>`).join('');
    const fields = [...answers].map(i => {
      const qid = `${rowId}:${i}`;
      const fid = `f-${djb2(qid)}`;
      const key = keys.get(i);
      const given = cells[i]?.text ?? '';
      const label = single
        ? `<label class="rux--label rux--visually-hidden" for="${fid}">${esc(cols[i])}</label>`
        : `<label class="rux--label" for="${fid}">${esc(cols[i])}</label>`;
      const reveal = key ? `
              <button type="button" class="rux--btn rux--btn--ghost rux--btn--sm notes-q-reveal" data-notes-reveal="${fid}-key" aria-controls="${fid}-key" aria-expanded="false" disabled>Reveal answer</button>
              <div class="rux--tile notes-q-key" id="${fid}-key" hidden><p>${tokens(key.tokens)}</p></div>` : '';
      return `<div class="rux--form-item notes-q-field">
              ${label}
              <div class="rux--text-area__wrapper">
                <textarea id="${fid}" class="rux--text-area" rows="2" data-notes-answer="${qid}" data-notes-given="${esc(given)}" placeholder="${single ? esc(cols[i]) : ''}">${esc(given)}</textarea>
              </div>${reveal}
            </div>`;
    }).join('\n            ');
    const box = check !== null
      ? checkbox({ id: `c-${djb2(rowId)}`, text: 'Done', attrs: ` data-notes-check="${rowId}"`, cls: 'notes-q-check' })
      : '';
    return `<div class="rux--tile notes-q" data-notes-row="${rowId}">
          <div class="notes-q-head">
            <p class="notes-q-label" id="l-${djb2(rowId)}">${tokens(cells[labelCol]?.tokens ?? [])}</p>
            ${meta ? `<dl class="notes-meta">${meta}</dl>` : ''}
          </div>
          ${answers.size ? `<div class="notes-q-fields" data-cols="${answers.size}">
            ${fields}
          </div>` : ''}
          ${box}
        </div>`;
  }).join('\n        ');

  return `<div class="notes-q-list">\n        ${items}\n        </div>`;
}

// THE PASS CONDITION IS A BOX THE LEARNER TICKS. It arrives as its own block
// kind since contract 4, so this branches on `kind` and never on a paragraph
// that happens to open with the words.
const passItem = (b, n) => checkbox({
  id: `p-${n}`, attrs: ` data-notes-pass="${n}"`, cls: 'notes-pass',
  text: `<strong>Pass condition:</strong> ${tokens(b.tokens)}`,
});

const eblock = (b, n) => {
  if (b.kind === 'pass') return passItem(b, n);
  // A tick column alone -- a checklist of captures to hand in -- is a list
  // of items too, each with its box and no space to write in.
  if (b.kind === 'table' && ((b.answers ?? []).length || b.check != null)) return answerList(b, n);
  return rblock(b);
};

function exercisePage(e, site) {
  const sections = (e.assignments ?? []).map(a => {
    const id = `a-${a.n}`;
    return `<section class="rux--stack-vertical rux--stack-scale-5" aria-labelledby="${id}" data-notes-section="${a.n}">
          <h2 id="${id}">${esc(a.n)}. ${esc(a.title)} <span class="rux--tag rux--tag--gray notes-ex-status" data-notes-status>Not started</span></h2>
          ${(a.blocks ?? []).map(b => eblock(b, a.n)).join('\n          ')}
        </section>`;
  }).join('\n        ');

  // THE RAIL. Progress, a notepad, and the way out. Everything a learner
  // types stays in this browser's storage until they export it -- there is no
  // server behind this page and the helper text says so. The export is the
  // report-back the experiment already asks for, as a file.
  const rail = `<aside class="notes-ex-rail" aria-label="Your work">
          <div class="rux--tile notes-ex-work">
            <h3 class="rux--type-heading-compact-02">Your work</h3>
            <p class="rux--type-body-compact-01 notes-ex-progress" data-notes-progress>Nothing answered yet</p>
            <div class="rux--form-item">
              <label class="rux--label" for="notes-notes">Notes</label>
              <div class="rux--text-area__wrapper">
                <textarea id="notes-notes" class="rux--text-area" rows="6" data-notes-notes placeholder="Anything worth writing down as you go"></textarea>
              </div>
              <div class="rux--form__helper-text" data-notes-sync>Saved in this browser only, with your answers. Export to keep or send them.</div>
            </div>
            <div class="notes-ex-actions">
              <button type="button" class="rux--btn rux--btn--primary rux--btn--sm" data-notes-export>Export answers</button>
              <button type="button" class="rux--btn rux--btn--tertiary rux--btn--sm" data-notes-copy>Copy</button>
              <button type="button" class="rux--btn rux--btn--danger--ghost rux--btn--sm" data-notes-clear>Clear</button>
            </div>
          </div>
        </aside>`;

  const body = `        <div class="notes-ex notes-experiment" data-notes-doc="${esc(e.id)}">
        <div class="rux--stack-vertical rux--stack-scale-5">
          <h1>${esc(e.title)}</h1>
          <div class="notes-tag-row">
            ${statusTag(e.status)}
            <span class="rux--tag rux--tag--gray"><span class="rux--tag__label">Homework</span></span>
            <span class="rux--tag rux--tag--outline"><span class="rux--tag__label">${e.assignments.length} assignments</span></span>
            <span class="rux--tag rux--tag--outline"><span class="rux--tag__label">Updated ${esc(e.updated)}</span></span>${e.keyed ? `
            <span class="rux--tag rux--tag--blue"><span class="rux--tag__label">Answer key</span></span>` : ''}
          </div>
          ${(e.intro ?? []).map(rblock).join('\n          ')}
          ${sections}
        </div>
        ${rail}
        </div>`;

  return page({ title: `${e.title} — Notes`, site, activeId: e.id, body, depth: 1, scripts: ['js/experiment.js'] });
}

function conceptPage(c, site) {
  const topics = (c.topics ?? []).map(t => {
    const label = t.n != null ? `${t.n}. ${t.title}` : t.title;
    const id = `t-${String(t.n ?? t.title).replace(/[^A-Za-z0-9.]+/g, '-').toLowerCase()}`;
    return `<section class="rux--stack-vertical rux--stack-scale-5" aria-labelledby="${id}">
          <h2 id="${id}">${esc(label)}</h2>
          ${(t.blocks ?? []).map(rblock).join('\n          ')}
        </section>`;
  }).join('\n        ');
  const terms = (c.terms ?? []).map(t =>
    `<span class="rux--tag rux--tag--outline"><span class="rux--tag__label">${esc(t)}</span></span>`).join('\n            ');
  const body = `        <div class="rux--stack-vertical rux--stack-scale-5">
          <h1>${esc(c.title)}</h1>
          <div class="notes-tag-row">
            <span class="rux--tag rux--tag--gray"><span class="rux--tag__label">Concept</span></span>
            <span class="rux--tag rux--tag--outline"><span class="rux--tag__label">Updated ${esc(c.updated)}</span></span>
          </div>
          <div class="notes-tag-row">
            ${terms}
          </div>
          ${(c.intro ?? []).map(rblock).join('\n          ')}
        </div>
        ${topics}`;
  return page({ title: `${c.title} — Notes`, site, activeId: c.id, body, depth: 1 });
}


// THE DIAGRAM, CONTRACT 6. atlas sends lanes, stages, nodes and edges and no
// geometry at all -- exchange/diagram-as-data.md section 3 draws that line and
// this side owns everything below it. Lane and stage are coordinates, so
// placement is a lookup and there is no solver, no auto-layout and nothing
// that can surprise us; section 2 of the reply is the argument for taking it.
//
// A TILE IS <details>, SO THE DISCLOSURE NEEDS NO SCRIPT. Clicking a tile
// opens its route, what it does, how to do it and what it leaves. With
// scripting off every tile still opens, which is this project's rule for
// behaviour: a page with the script gone is still the whole document.
//
// SIZED BY KIND, NOT BY TEXT -- condition 3.1. The tile's width comes from the
// grid and its name is capped upstream at diagram.budget.session, so nothing
// here measures a string and nothing is clipped.
//
// CONNECTORS ARE NOT DRAWN, and that is a stated limit rather than an
// oversight. The stages read left to right and the tiles carry their reading
// order, so the sequence is legible; the edges that do NOT follow it -- the
// branches and the one feed -- are named under the figure instead. Drawing
// lines between grid cells needs absolute geometry this side would have to
// invent, which is the auto-layout trap the reply warned about.
// WHICH OF THE FIVE A NODE IS, decided 2026-09-10 and derived rather than
// declared. atlas sends nine `kind`s and no category, and all five fall out of
// what it already sends -- nothing is asked of it. (This paragraph said the
// fifth was asked for and folded into `config` until it arrived; it shipped
// that way for one commit, and the note on `read` below is why it was wrong.)
//
// BESIDE THE ROUTE IS AN EDGE FACT, NOT A KIND. A node with no `flow` edge, in
// or out, is one the sequence never enters or leaves -- it has to be true for
// the route to run and you go and make it true somewhere else. Measured over
// both documents it lands on exactly the right nodes and no others: the
// overview's whole Master Data lane, and the map's three parameter and
// inventory checks. It needs no lane to be named and no new field.
//
// AND IT CUTS ACROSS `kind`, WHICH IS WHY `kind` COULD NEVER HAVE SHOWN IT.
// `Items and groups` is a `step` beside the route; `Bill of material and
// routing` is an `outcome` beside it; `Finished item into stock` is an
// `outcome` ON it. Same kind, opposite role.
const RESULT_KINDS = ['planned', 'real', 'outcome', 'terminal'];
function categories(dg) {
  const walked = new Set();
  for (const e of dg.edges ?? []) if (e.kind === 'flow') { walked.add(e.from); walked.add(e.to); }
  return new Map((dg.nodes ?? []).map(n => [n.id,
    (n.kind === 'gate' || n.kind === 'decision') ? 'check'
      // READING IS `read`, AND SAYING OTHERWISE WAS THIS SIDE'S MISTAKE. The
      // first cut of this shipped four categories and told atlas nothing
      // separated a Prerequisite from a Reading -- because it was trying to
      // split the three `read` nodes, having classed two of them as
      // configuration. They are not. A Prerequisite is set up once and is then
      // ready; a Reading is opened to find out what is true now, and
      // `Production Order Parameters` is read to learn what the later tiles
      // will do, exactly as `Inventory 360` is read to learn the on-hand. All
      // three are Readings, and the Prerequisites are the other four -- the
      // items, the purchase item, the bill of material and the cluster row,
      // none of them `read`. The kind has answered it all along.
      //
      // IT IS TESTED BEFORE THE PATH, because a Reading need not sit beside the
      // route: checking stock mid-sequence is still a Reading, and it would
      // then take the solid container the path gives it and keep the italic
      // name that says "take this in". The signals stay independent.
      : n.kind === 'read' ? 'info'
      : !walked.has(n.id) ? 'config'
      : RESULT_KINDS.includes(n.kind) ? 'result'
      : 'step']));
}

// THE WORD FOR A CATEGORY, which the panel prints beside atlas's own kind. The
// form on the canvas teaches the category; the panel names it, and keeps the
// finer kind after it -- `planned`, `real` and `terminal` are all Results and
// the difference is worth a word in the one place there is room for it.
// THE READER-FACING NAME OF A CATEGORY, settled with rux 2026-09-11 and changed
// from Prerequisite and Reading. `Setup` and `Inquiry` are rux's own words for
// what those two are; the other three were already right. `Checkpoint` is
// PROVISIONAL -- it folds atlas's `gate` and `decision` into one reader-facing
// word and whether the domain has a name for "a condition LN evaluates on its
// own" is a question for atlas, asked in exchange/SEND-ATLAS-4.md.
//
// A NAME HERE IS PRESENTATION AND NOT CONTRACT. `kind` is atlas's; how a
// category is worded is this side's, and this object is the only place it is
// worded -- the legend and the panel badge both read it, so they cannot drift.
// `Inquiry` appears nowhere in atlas, which is recorded in that memo rather
// than hidden: until it answers, a tile and its source document use different
// words for the same thing.
// Moved to tools/build-tile-looks.mjs 2026-09-12, imported above; see the note there.

// `notes` IS FALSE ON THE HOME PAGE, and that is a judgement about audience
// rather than a saving. The reading-order line described a loose grid and the
// figure reads as a table now -- left to right and down is what a table already
// promises. The off-sequence edge list is a second rendering of what the tiles
// already carry: every node with one prints NEEDS or SPLITS on its face, 6 of
// this document's 17. Both stay on the document page, where reference detail
// belongs; the home page is the map at a glance. The legend is on both, because
// it is the key to what is drawn rather than a note about it.
function diagramFigure(dg, { notes: withNotes = true, link = '' } = {}) {
  const stages = dg.stages ?? [], lanes = dg.lanes ?? [];
  const cat = categories(dg);
  const col = new Map(stages.map((s, i) => [s.n, i + 2]));
  const row = new Map(lanes.map((l, i) => [l.name, i + 2]));

  const heads = stages.map(s =>
    `<div class="notes-dg-stage${s.boundary ? ' notes-dg-stage--boundary' : ''}" style="grid-column:${col.get(s.n)}">${
      esc(`${s.n} · ${s.name}`)}</div>`).join('\n          ');

  const laneLabels = lanes.map(l =>
    `<div class="notes-dg-lane" style="grid-row:${row.get(l.name)}">${esc(l.name)}</div>`).join('\n          ');

  // ONE RULE PER LANE, SPANNING EVERY COLUMN. Emitted after the bands so it
  // paints over the transfer tint rather than disappearing into it, and before
  // the cells so a tile is never underneath a line. Why it exists and why it is
  // an element rather than a pseudo-element is above `.notes-dg-rule` in the
  // stylesheet. It is decoration in the accessibility tree's sense -- an empty
  // div with no text and no role -- and the lane it belongs to is already named
  // beside it.
  // THE FIRST LANE HAS NO RULE. It used to draw one directly under the stage
  // headings, which was right while the header had no ground of its own and is a
  // doubled edge now that it has: the band ends, the body begins, and a line on
  // top of that boundary is the second thing saying it. Carbon separates a
  // header from a body by the header's fill, not by a border. Every other lane
  // keeps its rule -- those boundaries have nothing else marking them.
  const laneRules = lanes.slice(1).map(l =>
    `<div class="notes-dg-rule" style="grid-row:${row.get(l.name)}"></div>`).join('\n          ');

  // The header's ground, behind the stage names. See `.notes-dg-head`.
  const headBand = '<div class="notes-dg-head"></div>';

  // THE BOUNDARY IS A PLACE, AND THE RENDERER IS THE ONE THAT DRAWS IT. The
  // stage carries `boundary: true` (export-json.md section 7) precisely so this
  // side never has to recognise the word "Transfer"; until 2026-09-10 all it
  // bought was a red column heading, which makes the boundary a label rather
  // than the place section 2 of the map asks a reader to see -- everything left
  // of it re-runnable, everything right of it a real document.
  //
  // A BAND IS A GRID ITEM LIKE ANY OTHER, so this stays a lookup: the column is
  // the stage's own, and it spans every lane row plus the header. `span` is
  // counted rather than `/ -1` because the lane rows are IMPLICIT -- created by
  // the placements below -- and `-1` resolves against the explicit grid, which
  // is one row tall. It is emitted before the cells so they paint over it.
  const bands = stages.filter(s => s.boundary).map(s =>
    `<div class="notes-dg-band" style="grid-column:${col.get(s.n)};grid-row:1/span ${
      lanes.length + 1}" aria-hidden="true"></div>`).join('\n          ');

  // THE LABEL SITS ABOVE ITS VALUE, not beside it. Inline, the key indented
  // only the FIRST line: `Do` and `Leaves` both run to two and three lines and
  // every one after the first started hard against the panel's left edge, so a
  // field had two left edges and the block read as ragged. The key is a block
  // in the panel and stays inline in the at-rest strip, which is one line by
  // construction -- hence the `.notes-dg-detail` scope on that rule.
  const field = (n, key, label) => n[key]
    ? `<p class="notes-dg-field"><span class="notes-dg-key">${label}</span>${tokens(n[key].tokens ?? [])}</p>` : '';

  // `steps` AT CONTRACT 8, AND IT IS WHY THE ASK WAS MADE. Section 5 defines
  // `Do` as "the controls, in order, with the status each produces" -- a
  // sequence that used to arrive as one flat sentence, because its boundaries
  // sat inside plain `text` tokens and splitting on those is the prose-parse
  // the contract forbids. atlas now authors the boundary (export-json.md
  // section 7.2) and sends both: `steps` as the sequence and `do` as the same
  // content joined, so a renderer that reads only `do` still works.
  //
  // THIS ONE READS `steps` AND FALLS BACK. The list is the whole point of the
  // change, so it is preferred wherever it exists; `do` covers a node emitted
  // before contract 8 and the day a sync lands mid-flight. They are never both
  // drawn -- that would print the sequence twice.
  const doField = n => (n.steps ?? []).length
    ? `<div class="notes-dg-field"><span class="notes-dg-key">Do</span>
                    <ol class="rux--list--ordered notes-dg-steps">
                      ${n.steps.map(s => `<li class="rux--list__item">${tokens(s.tokens ?? [])}</li>`).join('\n                      ')}
                    </ol>
                  </div>`
    : field(n, 'do', 'Do');

  // A STRIP IS A READ DRAWN ON THE TILE IT PROVES -- section 7.3, and section
  // 5.7 of the map before it: the three Inventory 360 reads are deliberately
  // NOT tiles of their own, so that the count of numbered tiles stays the count
  // of things a reader does. It carries its own session, code and route because
  // it IS a session you open; `reads` is what it proves about the tile it sits
  // on. It goes in the outcome zone, since what it proves is what the tile left.
  const stripBlock = n => (n.strips ?? []).length
    ? n.strips.map(s => `<div class="notes-dg-strip">
                    <p class="notes-dg-strip-head"><span class="notes-dg-key">Verify</span>${esc(s.session)}${
                      s.code ? ` <code class="notes-dg-strip-code">${esc(s.code)}</code>` : ''}</p>
                    ${s.route ? `<p class="notes-dg-field notes-dg-strip-line"><span class="notes-dg-key">Route</span>${tokens(s.route.tokens ?? [])}</p>` : ''}
                    ${s.reads ? `<p class="notes-dg-field notes-dg-strip-line"><span class="notes-dg-key">Reads</span>${tokens(s.reads.tokens ?? [])}</p>` : ''}
                    ${s.walkthrough ? `<p class="notes-dg-field notes-dg-strip-line"><span class="notes-dg-key">Walkthrough</span>${tokens(s.walkthrough.tokens ?? [])}</p>` : ''}
                  </div>`).join('\n                  ')
    : '';

  // AN EMPTY ZONE IS NOT DRAWN. Every field is optional in the contract and the
  // level-1 overview proves it rather than theoretically: `leaves` and `walkthrough`
  // are absent from ALL SEVENTEEN of its nodes, and `route` and `do` from nine.
  // Rendered unconditionally the Leaves zone would be a tinted, ruled, empty
  // box on every one of them.
  const zone = (cls, inner) => inner.trim()
    ? `<div class="${cls}">
                  ${inner}
                  </div>` : '';

  // THE EDGES THAT BREAK THE READING ORDER, PUT ON THE NODE THEY CHANGE. The
  // numbers run left to right and down, so a `flow` edge needs no drawing --
  // but the two branches out of the transfer and the one feed into production
  // are exactly the handovers section 2 of the map says a reader must see, and
  // until 2026-09-10 they were a sentence UNDER the figure and nothing else.
  //
  // STILL NO CONNECTORS. Drawing a line between two grid cells needs absolute
  // geometry this side would have to invent, which is the auto-layout trap the
  // reply warned about. A node naming the numbers it splits to costs nothing
  // and answers the same question -- the numbers ARE the addresses.
  //
  // WHICH END CARRIES IT is section 6's distinction, not a symmetry: a `branch`
  // is the transfer splitting, so it belongs on the SOURCE, which is where the
  // reader chooses; a `feed` is "the thing must be true, but you do not walk
  // it", which is advice to whoever is standing on the TARGET.
  const offEdges = (dg.edges ?? []).filter(e => e.kind !== 'flow');

  // AN ADDRESS IS SOMETHING THE READER CAN LOOK UP, and until 2026-09-10 it was
  // sometimes an id. Where a document numbers its nodes the number IS the
  // address -- it is printed on the face of the tile it points at, and nothing
  // shorter can be. Where it does not, this printed `n.id` instead, which is
  // atlas's key and not a name: the level-1 overview numbers NONE of its
  // seventeen nodes, so seven of its tiles read `Needs buyfrom` and
  // `Splits ship · gate-data`, and `buyfrom`, `gate-data` and `covered` appear
  // NOWHERE ELSE on that page. An address that cannot be looked up is worse
  // than no address, because it reads as one.
  //
  // THE SESSION NAME IS THE ADDRESS THERE, for the same reason the number is
  // the address here: it is the line on the face of the target tile. The id
  // survives only for an edge naming a node that is not in `nodes` at all,
  // where there is nothing else to say and silence would hide the edge.
  const addressOf = id => {
    const t = (dg.nodes ?? []).find(x => x.id === id);
    if (!t) return id;
    return t.n != null ? String(t.n) : t.session;
  };
  const splits = new Map(), needs = new Map();
  for (const e of offEdges) {
    const [map, key] = e.kind === 'feed' ? [needs, e.to] : [splits, e.from];
    if (!map.has(key)) map.set(key, []);
    map.get(key).push(e);
  }

  // AT REST IT IS THE NUMBERS, OR NOTHING BUT THE WORD. Section 5 holds a tile
  // to its name and its code, and a label like "supply source Job Shop" on the
  // face of one would be the detail competing with the shape that D1 settled
  // against. The label is one click away with everything else.
  //
  // A NUMBER IS FREE ON THE FACE AND A NAME IS NOT, AND THAT IS MEASURED. The
  // face had the id, which is meaningless; putting `addressOf` here instead --
  // the obvious fix -- made the overview's widest face "SPLITS Advise, pick and
  // ship · Planning data exists", and every column is `1fr`, so ONE wide face
  // widens all five: 221px to 283px, and a figure that fitted its column at
  // 1272 became 1653 and grew a scrollbar. The tile heights did not move, so
  // this is the canvas D1 settled, quietly spent on text that is already on the
  // face of the tile it points at. Dropping the ids took the columns to 207px
  // and the figure back inside 1272, narrower than it ever was.
  //
  // SO THE FACE FLAGS THE EXCEPTION AND THE PANEL ADDRESSES IT. Where the ends
  // are numbered the numbers go on the face, because they cost nothing and are
  // the shortest address there is. Where they are not, the word alone says the
  // reading order breaks here -- which is the whole job of a mark on an
  // exception -- and the names are one click away in the panel, where prose
  // wraps and no column is sized by them.
  const strip = n => {
    const s = splits.get(n.id) ?? [], f = needs.get(n.id) ?? [];
    const numberedEnds = (list, end) => list
      .map(e => (dg.nodes ?? []).find(x => x.id === end(e)))
      .filter(t => t?.n != null).map(t => String(t.n));
    const one = (word, list, end) => {
      const ns = numberedEnds(list, end);
      return `<span class="notes-dg-node-link"><span class="notes-dg-key">${word}</span>${
        ns.map(esc).join(' · ')}</span>`;
    };
    return (s.length ? one('Splits', s, e => e.to) : '')
      + (f.length ? one('Needs', f, e => e.from) : '');
  };
  const linkField = n => {
    const s = splits.get(n.id) ?? [], f = needs.get(n.id) ?? [];
    const one = (word, list, end) => list.length
      ? `<p class="notes-dg-field"><span class="notes-dg-key">${word}</span>${
        list.map(e => `${esc(addressOf(end(e)))}${
          e.label ? ` — ${tokens(e.label.tokens ?? [])}` : ''}`).join(' · ')}</p>` : '';
    return one('Splits', s, e => e.to) + one('Needs', f, e => e.from);
  };

  const cells = [];
  for (const l of lanes) {
    for (const s of stages) {
      const here = (dg.nodes ?? []).filter(n => n.lane === l.name && n.stage === s.n);
      if (!here.length) continue;
      // `name` GROUPS THEM, AND THE PLATFORM DOES THE REST. One open at a time
      // is a native `<details>` behaviour since the `name` attribute -- opening
      // one closes its group -- so the panel that hangs off the right edge can
      // never be two panels. Nothing here needs a script for it, and a browser
      // too old for `name` ignores it and simply allows two open, which is the
      // behaviour this had all along.
      const tiles = here.map(n => `<details class="notes-dg-node notes-dg-node--${esc(n.kind)} notes-dg-cat--${
        esc(cat.get(n.id) ?? 'step')}" name="notes-dg-node">
                <summary><span class="notes-dg-node-n">${esc(n.n != null ? String(n.n) : CATEGORY_NAME[cat.get(n.id) ?? 'step'])}</span><span class="notes-dg-node-name">${
                  esc(n.session)}</span>${n.code ? `<code class="notes-dg-node-code">${esc(n.code)}</code>` : ''}${strip(n)}</summary>
                <div class="notes-dg-detail">
                  <p class="notes-dg-detail-head"><span class="notes-dg-detail-n">${
                    esc(n.n != null ? String(n.n) : '')}</span><span class="notes-dg-detail-name">${esc(n.session)}</span>
                    <span class="notes-dg-kind">${esc(CATEGORY_NAME[cat.get(n.id)] ?? 'Step')}</span><span class="notes-dg-kind-fine">${esc(n.kind)}</span>${
                    n.code ? `<code class="notes-dg-detail-code">${esc(n.code)}</code>` : ''}</p>
                  ${zone('notes-dg-zone', field(n, 'route', 'Route'))}
                  ${zone('notes-dg-zone', field(n, 'does', 'Does') + doField(n))}
                  ${zone('notes-dg-zone notes-dg-zone--leaves', field(n, 'leaves', 'Leaves') + linkField(n) + stripBlock(n))}
                  ${zone('notes-dg-foot', field(n, 'walkthrough', 'Walkthrough'))}
                </div>
              </details>`).join('\n              ');
      cells.push(`<div class="notes-dg-cell" style="grid-column:${col.get(s.n)};grid-row:${row.get(l.name)}">
              ${tiles}
            </div>`);
    }
  }

  // THE NOTE NAMES THE SAME ENDS THE TILES DO. It used to print `e.from` and
  // `e.to` raw while the tiles went through the lookup, which agreed by luck on
  // this map -- every id here IS its number -- and disagreed on the overview,
  // where the tiles said one thing and the note said `covered → gate-data`.
  // One function now answers both, so they cannot drift apart again.
  //
  // AND THE SENTENCE NO LONGER PROMISES NUMBERS A DOCUMENT MAY NOT HAVE. It
  // opened "down the numbers" unconditionally, which is true of this map and
  // false of the overview, where not one of the seventeen tiles carries one.
  const numbered = (dg.nodes ?? []).some(n => n.n != null);
  // THE LEGEND NAMES WHAT THE FORMS DRAW, and it lists only the categories this
  // document actually contains -- the overview has no Reading, so the overview's
  // legend has four entries and not five. A key that teaches a look the reader
  // will not meet is the beginning of the wall of text this replaced.
  //
  // THE SWATCH IS A TILE. Same `notes-dg-node`, same `notes-dg-cat--*`, so the border,
  // the ground, the stripe and the italic all come from the canvas rules and the
  // key cannot say "dashed" on a day the tiles went solid. `notes-dg-key-tile` is
  // the one thing it adds, and the stylesheet says what it is for.
  const present = new Set(cat.values());
  const GLOSS = { check: 'decides on its own, and can stop without saying so' };
  const key = `
        <figcaption class="notes-dg-legend">
          <span class="notes-dg-legend-label">Key</span>
          <ul class="notes-dg-legend-list">${['step', 'config', 'info', 'result', 'check']
    .filter(c => present.has(c)).map(c => `
            <li><span class="notes-dg-node notes-dg-legend-tile notes-dg-cat--${c}"><span class="notes-dg-node-name">${
      esc(CATEGORY_NAME[c])}</span></span>${GLOSS[c] ? `<span class="notes-dg-legend-gloss">${esc(GLOSS[c])}</span>` : ''}</li>`).join('')}
          </ul>
          <span class="notes-dg-legend-gloss">a filled tile is a screen you can open</span>${link}
        </figcaption>`;

  // THE EDGES FOLD. Nine of them on the overview and five on the map, printed as
  // one run-on paragraph, which is the wall of text the legend was asked to
  // replace. Nothing is dropped: they are the only statement anywhere on the
  // site of which edges run against the reading order, and their addresses exist
  // in no other place. A `<details>` keeps the count visible and the list one
  // click away, which is the same bargain the tiles themselves strike.
  const notes = offEdges.length ? `
        <p class="notes-dg-note">Reading order runs left to right and ${
          numbered ? 'down the numbers' : 'down the lanes'}.</p>
        <details class="notes-dg-note notes-dg-off"><summary>${offEdges.length} edge${
          offEdges.length === 1 ? '' : 's'} run${offEdges.length === 1 ? 's' : ''} against it</summary>
          <p>${offEdges.map(e => `<span class="notes-dg-edge"><span class="notes-dg-ends">${
            esc(addressOf(e.from))} → ${esc(addressOf(e.to))}</span>${
            e.label ? `, ${tokens(e.label.tokens ?? [])}` : ''} <em>(${esc(e.kind)})</em></span>`).join(' · ')}</p>
        </details>` : '';

  return `<figure class="rux--tile notes-dg" style="--dg-cols:${stages.length + 1}">
          <div class="notes-dg-grid">
            ${bands}
            ${headBand}
            ${laneRules}
            ${heads}
            ${laneLabels}
            ${cells.join('\n            ')}
          </div>${withNotes ? notes : ''}${key}
        </figure>`;
}

function referencePage(r, site) {
  // A CONCEPT'S SHAPE WITHOUT ITS TERMS. atlas serialises both from the same
  // block vocabulary, so the only differences here are the badge and the
  // absence of a term row -- a reference declares no terms.
  const topics = (r.topics ?? []).map(t => {
    const label = t.n != null ? `${t.n}. ${t.title}` : t.title;
    const id = `t-${String(t.n ?? t.title).replace(/[^A-Za-z0-9.]+/g, '-').toLowerCase()}`;
    return `<section class="rux--stack-vertical rux--stack-scale-5" aria-labelledby="${id}">
          <h2 id="${id}">${esc(label)}</h2>
          ${(t.blocks ?? []).map(rblock).join('\n          ')}
        </section>`;
  }).join('\n        ');
  const body = `        <div class="rux--stack-vertical rux--stack-scale-5">
          <h1>${esc(r.title)}</h1>
          <div class="notes-tag-row">
            <span class="rux--tag rux--tag--gray"><span class="rux--tag__label">Reference</span></span>
            ${statusTag(r.status)}
            <span class="rux--tag rux--tag--outline"><span class="rux--tag__label">Updated ${esc(r.updated)}</span></span>
            ${issuesTag(r.openIssues ?? 0)}
          </div>
          ${(r.intro ?? []).map(rblock).join('\n          ')}
        </div>${r.diagram ? `
        ${diagramFigure(r.diagram)}` : ''}
        ${topics}`;
  // js/diagram.js ONLY WHERE THERE IS A DIAGRAM, the same way js/experiment.js
  // is linked only by a worksheet. It adds the close button and Escape to the
  // panel; without it the panel still opens and closes from its own tile.
  return page({ title: `${r.title} — Notes`, site, activeId: r.id, body, depth: 1,
    scripts: r.diagram ? ['js/diagram.js'] : [] });
}

// HOW TO READ A STEP -- the legend the seven tag colours never had, and could
// not have had. Seven hues with three near-identical greys are not learnable
// and a key for them would have been an apology. Four registers are, so the
// page says once what they mean.
//
// It sits at the FOOT, not the head: a reader who already knows the
// convention should not step over it to reach the walkthrough, and a reader who
// does not will look for it after the first step confuses them. Walkthrough pages
// only -- a summary or a review carries prose, not steps.
const stepKey = () => `
      <section class="notes-key" aria-labelledby="h-key">
        <h2 id="h-key" class="rux--type-productive-heading-03">How to read a step</h2>
        <dl class="notes-key-grid">
          <dt><span class="notes-t-press">Press it</span></dt>
          <dd>A control you act on.</dd>
          <dt><span class="notes-t-named">Named on screen</span></dt>
          <dd>A tab, panel, field or column label &mdash; something you look for.</dd>
          <dt><span class="notes-t-exact">Exact string</span></dt>
          <dd>Type or match it character for character.</dd>
          <dt><span class="rux--tag rux--tag--teal rux--layout--size-sm"><span class="rux--tag__label">A state</span></span></dt>
          <dd>Confirm you see it before moving on.</dd>
          <dt><svg class="notes-pencil" width="16" height="16" viewBox="0 0 32 32" fill="currentColor" role="img" aria-label="worth noting down"><use href="#i-edit"/></svg></dt>
          <dd>The step yields a value worth writing down.</dd>
        </dl>
      </section>`;

// THE WALKTHROUGH'S OWN NOTEPAD. The pencil marks say "this step yields a value
// worth writing down" 125 times across the seven walkthroughs and until now there
// was nowhere on a walkthrough page to write. Each producing row carries its own
// field; this is the rest of it -- somewhere for what does not belong to one
// step, and the way out.
//
// IT SAYS WHERE THE TYPING GOES, beside the box and not in a policy page.
// There is no server behind this site and no account; what a reader writes is
// in their browser and nowhere else, and the only way to keep it is to take
// it with them.
//
// A WALKTHROUGH PAGE WITHOUT js/walkthrough.js IS STILL THE WHOLE WALKTHROUGH. The fields are
// inert, the export does nothing, and every step, table and phase reads as it
// does now. That is the same contract js/experiment.js holds.
const notepad = () => `
      <section class="notes-notepad" aria-labelledby="h-notes">
        <h2 id="h-notes" class="rux--type-productive-heading-03">Your notes</h2>
        <div class="rux--form-item">
          <label class="rux--label" for="notes-notes">Anything else worth keeping</label>
          <div class="rux--text-area__wrapper">
            <textarea id="notes-notes" class="rux--text-area" rows="5" data-notes-notes placeholder="What surprised you, what you would check next time"></textarea>
          </div>
          <div class="rux--form__helper-text">Saved in this browser only, with the values you noted beside the steps. There is no server and no account behind this page. Export to keep them.</div>
        </div>
        <div class="notes-notepad-actions">
          <button type="button" class="rux--btn rux--btn--primary rux--btn--sm" data-notes-export>Export notes</button>
          <button type="button" class="rux--btn rux--btn--tertiary rux--btn--sm" data-notes-copy>Copy</button>
          <button type="button" class="rux--btn rux--btn--danger--ghost rux--btn--sm" data-notes-clear>Clear</button>
        </div>
      </section>`;

function guidePage(g, site) {
  const { front, back } = splitSections(g.sections);
  const body = `        <div class="rux--stack-vertical rux--stack-scale-5">
          <h1>${esc(g.title)}</h1>
          <div class="notes-tag-row">
            ${statusTag(g.status)}
            <span class="rux--tag rux--tag--gray"><span class="rux--tag__label">${g.phases.length} phases</span></span>
            <span class="rux--tag rux--tag--outline"><span class="rux--tag__label">Updated ${esc(g.updated)}</span></span>
            ${issuesTag(g.openIssues ?? 0)}
          </div>
          <p class="rux--type-body-02">${esc(g.module)}</p>${PRIVATE ? '' : `
          <p data-notes-owner hidden><a class="rux--btn rux--btn--tertiary rux--btn--sm" href="walk.html#${esc(g.id)}">Walk this walkthrough</a></p>`}
        </div>

      ${sections(front)}

        <section class="rux--stack-vertical rux--stack-scale-7" aria-labelledby="h-phases">
          <h2 id="h-phases">Phases</h2>
          ${g.phases.map(phase).join('\n        ')}
        </section>

      ${sections(back)}${g.verification ? `

        <!-- The generated verification sentence. It is NOT a substitute for
             the status badge and README says why: one walkthrough's sentence claims
             every phase was performed against a live system and confirmed
             while the walkthrough itself is status: draft. Both are shown. -->
        <p class="rux--type-body-01">${esc(g.verification)}</p>` : ''}
      ${notepad()}
      ${stepKey()}`;

  return page({ title: `${g.title} — Notes`, site, activeId: g.id,
    body: `<div data-notes-doc="${esc(g.id)}">${body}
      </div>`, depth: 1,
    scripts: ['js/walkthrough.js'] });
}

// THE WALK PAGE, the owner's: one run of a walkthrough, one step at a time,
// saved to the account as it goes by js/walk.js. It carries the walkthroughs'
// ids and titles only; a walk reads its steps from data/atlas/ when it opens.
// Published builds only -- the private preview keeps its own walk form, which
// writes into atlas directly. The step comes before the progress list, so a
// phone shows the step first; at lg width the list moves to its left.
function walkPage(site) {
  const list = JSON.stringify(site.walkthroughs.map(g => ({ id: g.id, title: g.title })))
    .replace(/</g, '\\u003c');
  const body = `        <div class="rux--stack-vertical rux--stack-scale-5">
          <h1 id="walk-title">Walk</h1>
          <p class="rux--type-body-02" id="walk-gate">Checking your log-in</p>
          <div id="walk-message" hidden>
            <div class="rux--inline-notification rux--inline-notification--error" role="status">
              <div class="rux--inline-notification__details">
                <svg class="rux--inline-notification__icon" width="20" height="20" viewBox="0 0 32 32" fill="currentColor" aria-hidden="true"><use href="#i-error--filled"/></svg>
                <div class="rux--inline-notification__text-wrapper">
                  <div class="rux--inline-notification__title">Not saved</div>
                  <div class="rux--inline-notification__subtitle" id="walk-message-text"></div>
                </div>
              </div>
              <button type="button" class="rux--inline-notification__close-button" aria-label="Close" id="walk-message-close">
                <svg class="rux--inline-notification__close-icon" width="16" height="16" viewBox="0 0 32 32" fill="currentColor" aria-hidden="true"><use href="#i-close"/></svg>
              </button>
            </div>
          </div>
        </div>

        <div id="walk-start" hidden>
          <section class="notes-walk-form rux--stack-vertical rux--stack-scale-7" aria-labelledby="walk-start-h">
            <h2 id="walk-start-h">Start a walk</h2>
            <form id="walk-start-form">
              <div class="rux--stack-vertical rux--stack-scale-7">
                <div class="rux--form-item">
                  <div class="rux--select rux--layout--size-md">
                    <label class="rux--label" for="walk-walkthrough">Walkthrough</label>
                    <div class="rux--select-input__wrapper">
                      <select id="walk-walkthrough" class="rux--select-input" required></select>
                      <svg class="rux--select__arrow" width="16" height="16" viewBox="0 0 32 32" fill="currentColor" aria-hidden="true"><use href="#i-chevron--down"/></svg>
                    </div>
                  </div>
                </div>
                <div class="rux--form-item rux--text-input-wrapper">
                  <div class="rux--text-input__label-wrapper">
                    <label class="rux--label" for="walk-company">Company</label>
                  </div>
                  <div class="rux--text-input__field-outer-wrapper">
                    <div class="rux--text-input__field-wrapper">
                      <input id="walk-company" class="rux--text-input" type="text" required autocomplete="off" autocapitalize="off" inputmode="numeric">
                    </div>
                    <div class="rux--form__helper-text">As the LN status bar shows it.</div>
                  </div>
                </div>
                <div class="rux--form-item rux--text-input-wrapper">
                  <div class="rux--text-input__label-wrapper">
                    <label class="rux--label" for="walk-user">User</label>
                  </div>
                  <div class="rux--text-input__field-outer-wrapper">
                    <div class="rux--text-input__field-wrapper">
                      <input id="walk-user" class="rux--text-input" type="text" required autocomplete="off" autocapitalize="off" spellcheck="false">
                    </div>
                    <div class="rux--form__helper-text">As the LN status bar shows it.</div>
                  </div>
                </div>
                <div>
                  <button type="submit" class="rux--btn rux--btn--primary">Start</button>
                </div>
              </div>
            </form>
            <p class="rux--type-body-02" id="walk-stale" hidden></p>
            <div id="walk-resume-section" hidden>
              <div class="rux--stack-vertical rux--stack-scale-7">
                <h2 id="walk-resume-h">Continue a walk</h2>
                <form id="walk-resume-form">
                  <div class="rux--stack-vertical rux--stack-scale-7">
                    <div class="rux--form-item">
                      <div class="rux--select rux--layout--size-md">
                        <label class="rux--label" for="walk-resume">Today's walks</label>
                        <div class="rux--select-input__wrapper">
                          <select id="walk-resume" class="rux--select-input"></select>
                          <svg class="rux--select__arrow" width="16" height="16" viewBox="0 0 32 32" fill="currentColor" aria-hidden="true"><use href="#i-chevron--down"/></svg>
                        </div>
                      </div>
                    </div>
                    <div>
                      <button type="submit" class="rux--btn rux--btn--secondary">Continue</button>
                    </div>
                  </div>
                </form>
              </div>
            </div>
          </section>
        </div>

        <div id="walk-run" hidden>
          <div class="notes-walk-run">
            <section class="notes-walk-step" aria-labelledby="walk-step-h">
              <div class="rux--stack-vertical rux--stack-scale-7">
                <div class="rux--tile">
                  <div class="rux--stack-vertical rux--stack-scale-5">
                    <div>
                      <p id="walk-where"></p>
                      <h2 class="rux--type-heading-04" id="walk-step-h" tabindex="-1"></h2>
                    </div>
                    <div>
                      <p>Do this</p>
                      <p class="rux--type-heading-compact-02" id="walk-do"></p>
                    </div>
                    <div>
                      <p>You should see</p>
                      <p class="rux--type-heading-compact-02" id="walk-see"></p>
                    </div>
                  </div>
                </div>
                <form id="walk-step-form">
                  <div class="rux--stack-vertical rux--stack-scale-7">
                    <div class="rux--form-item">
                      <div class="rux--text-area__label-wrapper">
                        <label class="rux--label" for="walk-actual">What happened</label>
                      </div>
                      <div class="rux--text-area__wrapper">
                        <textarea id="walk-actual" class="rux--text-area" rows="3"></textarea>
                        <span class="rux--text-area__counter-alert" role="alert"></span>
                      </div>
                    </div>
                    <div class="rux--form-item">
                      <div class="rux--text-area__label-wrapper">
                        <label class="rux--label" for="walk-notes">Notes</label>
                      </div>
                      <div class="rux--text-area__wrapper">
                        <textarea id="walk-notes" class="rux--text-area" rows="3"></textarea>
                        <span class="rux--text-area__counter-alert" role="alert"></span>
                      </div>
                      <div class="rux--form__helper-text">Errors, comments, and how the map tile helped.</div>
                    </div>
                    <div class="rux--form-item rux--text-input-wrapper">
                      <div class="rux--text-input__label-wrapper">
                        <label class="rux--label" for="walk-what">What the screenshot shows</label>
                      </div>
                      <div class="rux--text-input__field-outer-wrapper">
                        <div class="rux--text-input__field-wrapper">
                          <input id="walk-what" class="rux--text-input" type="text" autocomplete="off">
                        </div>
                        <div class="rux--form__helper-text">Optional. Becomes part of the file name.</div>
                      </div>
                    </div>
                    <div class="rux--form-item">
                      <p class="rux--file--label">Screenshots</p>
                      <div class="rux--file">
                        <button type="button" class="rux--file__drop-container rux--file-browse-btn" id="walk-drop">Choose a screenshot, or drop or paste one here</button>
                        <label class="rux--visually-hidden" for="walk-file">Screenshot</label>
                        <input id="walk-file" type="file" accept="image/png,image/jpeg" class="rux--file-input rux--visually-hidden" tabindex="-1">
                      </div>
                      <ul class="rux--list--unordered" id="walk-shots" hidden></ul>
                    </div>
                  </div>
                </form>
                <p class="rux--form__helper-text" id="walk-status" role="status"></p>
                <div class="rux--btn-set">
                  <button type="button" class="rux--btn rux--btn--secondary" id="walk-back">Back</button>
                  <button type="button" class="rux--btn rux--btn--primary" id="walk-next">Next</button>
                </div>
                <div>
                  <button type="button" class="rux--btn rux--btn--ghost" id="walk-exit">Save and exit</button>
                </div>
              </div>
            </section>
            <div class="notes-walk-progress">
              <ul class="rux--progress rux--progress--vertical" id="walk-progress"></ul>
            </div>
          </div>
        </div>
        <script type="application/json" id="walk-walkthroughs">${list}</script>`;
  return page({ title: 'Walk — Notes', site, activeId: 'walk', body, depth: 1, doc: null,
    scripts: ['js/walk.js'] });
}

// ---------------------------------------------------------------- build

// NOTHING BLOCKQUOTE-SHAPED MAY REACH THE PAGE UNRENDERED.
//
// THE FIRST VERSION OF THIS CHECK ASSERTED A COUNT -- "the rule must match
// exactly 15 blocks" -- and it was wrong for the reason the project already
// knows: a rule that needs a number edited every time the data grows is
// measuring the number, not the rule. Walkthroughs are expected to be added and
// removed often, so that check would have failed on every addition and been
// bumped without being read, which is how an exception list starts. It was
// tested by adding a walkthrough, it refused the build, and that is what showed it.
//
// The invariant that does not move with the data: a prose block whose first
// token is the blockquote marker MUST have become a callout. If atlas adds a
// fourth label -- "Caution", say -- this fails and names it, rather than
// printing "> Caution > …" on the page as literal text. It cares about shape,
// not quantity, so seven walkthroughs and seventy both pass.
function assertNoRawBlockquotes(walkthroughs) {
  const raw = [];
  let found = 0, prose = 0;

  const visit = (b, where) => {
    if (isRows(b) || !b.tokens) return;
    prose++;
    if (asCallout(b)) { found++; return; }
    const t0 = b.tokens[0];
    if (t0 && t0.t === 'text' && t0.v.startsWith('> ')) {
      raw.push(`${where}: ${(b.text ?? '').slice(0, 90)}`);
    }
  };

  for (const g of walkthroughs) {
    for (const p of g.phases ?? []) for (const b of p.blocks ?? []) visit(b, `${g.id} phase ${p.n}`);
    for (const s of g.sections ?? []) visit(s, `${g.id} section ${s.kind}`);
  }

  if (raw.length) {
    throw new Error(
      `${raw.length} block(s) start with a blockquote marker the callout rule did not recognise:\n`
      + raw.map(r => `          ${r}`).join('\n')
      + '\n\n        Contract 2 has no `callout` kind, so tools/build.mjs infers one from the'
      + '\n        token stream and knows three labels: Warning, Note, Prerequisite. A new'
      + '\n        label lands here rather than printing "> Label >" on the page as text.'
      + '\n        Add it to LEVEL, or delete the rule if atlas has shipped the block kind.');
  }
  return { found, prose };
}

// FOUR PUBLISHED DOCUMENT CLASSES NOW ARRIVE, and they are told apart by `kind` rather
// than by filename. A walkthrough has no `kind` field -- it predates the second
// content type -- so its absence is what identifies one, and a document
// carrying an unknown `kind` stops the build instead of being rendered as
// whatever it least resembles.
const docs = readdirSync(DATA)
  .filter(f => f.endsWith('.json'))
  .map(f => JSON.parse(readFileSync(join(DATA, f), 'utf8')));

// THE CONTRACT IS PINNED HERE, NOT ONLY REPORTED. sync-export.sh prints the
// contract set and enforces nothing, so a renderer written for one shape could
// silently consume the next. Bump this constant when this file is updated for
// a new contract, and not before.
const CONTRACT = 10;
for (const d of docs) if (Number(d.contract) !== CONTRACT)
  throw new Error(`${d.id ?? '?'}: contract ${d.contract}, this renderer reads ${CONTRACT} -- update build.mjs for it, then this constant`);

for (const d of docs) {
  const kind = d.kind ?? 'walkthrough';
  if (!['walkthrough', 'review', 'summary', 'experiment', 'concept', 'reference'].includes(kind)) {
    throw new Error(`${d.id}: unknown kind "${kind}" -- build.mjs renders walkthrough, review, summary, experiment, concept, reference`);
  }
  if (kind === 'concept' && !PRIVATE) {
    throw new Error(`${d.id}: a concept has no published tier and cannot sit in data/atlas/`);
  }
}

const walkthroughs = docs.filter(d => !d.kind).sort((a, b) => a.order - b.order);
const reviews = docs.filter(d => d.kind === 'review')
  .sort((a, b) => String(b.updated).localeCompare(String(a.updated)));
const summaries = docs.filter(d => d.kind === 'summary')
  .sort((a, b) => String(b.updated).localeCompare(String(a.updated)));
const experiments = docs.filter(d => d.kind === 'experiment')
  .sort((a, b) => String(a.title).localeCompare(String(b.title)));
const concepts = docs.filter(d => d.kind === 'concept')
  .sort((a, b) => String(a.title).localeCompare(String(b.title)));
// A REFERENCE PUBLISHES IN BOTH TIERS, unlike a concept. atlas's
// send-back-2-reply.md section 5 admits it: a person sits down and reads it,
// and it is consulted while walking a page that does publish.
const references = docs.filter(d => d.kind === 'reference')
  .sort((a, b) => String(a.title).localeCompare(String(b.title)));

if (!walkthroughs.length) throw new Error(`no walkthroughs in ${DATA} -- run tools/sync-export.sh first`);

for (const g of walkthroughs) PAGE_IDS.add(g.id);
// Reviews, summaries and experiments publish in both tiers, so a link between
// them is linkable in both -- only a concept is PRIVATE-only (line ~1327).
for (const d of [...reviews, ...summaries, ...experiments, ...references]) PAGE_IDS.add(d.id);
if (PRIVATE) for (const d of concepts) PAGE_IDS.add(d.id);

const reach = assertNoRawBlockquotes(walkthroughs);

// REMOVAL HAS TO ACTUALLY REMOVE. A generator that only writes leaves a deleted
// walkthrough's page on disk: out of the nav, still at a URL that resolves, still
// serving content that no longer exists upstream. That is a page which looks
// fine and is wrong, which is the failure class this project cares most about.
// The directory is rebuilt rather than added to.
if (existsSync(OUT_DIR)) rmSync(OUT_DIR, { recursive: true });
mkdirSync(OUT_DIR, { recursive: true });

// ASSETS AUTHORED BESIDE THE WALKTHROUGHS ARE COPIED IN, and this is not optional
// either. An `image` token's `src` names a file sitting next to the walkthrough in
// atlas -- `order-to-shipment-flowchart.svg` is the one that exists -- so the
// page references it relative to itself and it has to actually be there. It
// arrives in `data/atlas/`, which is not where the pages are.
//
// A missing image is a broken image icon and nothing else; no gate here reads
// an `src`. Found by a link check, not by looking at the page.
//
// `PIN` is sync metadata rather than an asset, and `.json` is the data itself.
const assets = readdirSync(DATA).filter(f => f !== 'PIN' && !f.endsWith('.json'));
for (const a of assets) copyFileSync(join(DATA, a), join(OUT_DIR, a));

const site = { walkthroughs, reviews, summaries, experiments, concepts, references };

const written = [INDEX];
writeFileSync(written[0], indexPage(site));
for (const g of walkthroughs) {
  const file = join(OUT_DIR, `${g.id}.html`);
  writeFileSync(file, guidePage(g, site));
  written.push(file);
}
for (const r of [...reviews, ...summaries]) {
  const file = join(OUT_DIR, `${r.id}.html`);
  writeFileSync(file, reviewPage(r, site));
  written.push(file);
}
for (const e of experiments) {
  const file = join(OUT_DIR, `${e.id}.html`);
  writeFileSync(file, exercisePage(e, site));
  written.push(file);
}
for (const c of concepts) {
  const file = join(OUT_DIR, `${c.id}.html`);
  writeFileSync(file, conceptPage(c, site));
  written.push(file);
}
for (const r of references) {
  const file = join(OUT_DIR, `${r.id}.html`);
  writeFileSync(file, referencePage(r, site));
  written.push(file);
}
if (!PRIVATE) {
  const file = join(OUT_DIR, 'walk.html');
  writeFileSync(file, walkPage(site));
  written.push(file);
}

// The sprite is inlined by the tool that owns that job, on the files just
// written. Linking `/design/assets/icons.svg#i-name` instead is blank in
// Safari and blocked over file://, both silently.
execFileSync(process.execPath, [join(ROOT, '..', 'tools', 'inline-sprite.mjs'), ...written],
  { stdio: 'inherit' });

console.log(`\n  built ${written.length} page(s) from ${walkthroughs.length} walkthrough(s)`);
console.log(`  callouts: ${reach.found} of ${reach.prose} prose blocks matched the inferred rule`);
console.log('\n  Generated. Check them:  node tools/check-classes.mjs && node tools/check-structure.mjs\n');
