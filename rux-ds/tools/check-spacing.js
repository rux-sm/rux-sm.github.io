//
// WHAT WE COMPUTE vs WHAT CARBON COMPUTES — paste into a rendered page's console.
//
// The fourth browser tool, and the only one that compares this system against
// Carbon rather than against itself. check-classes asks whether a class resolves,
// check-tags whether it sits on the right element, check-ancestry whether its
// wrappers are there. None of them can see a gap that is missing, because the
// markup captures record structure and drop everything else on purpose.
//
// It reads `docs/carbon-react-spacing.json` — 800 class signatures harvested from
// react.carbondesignsystem.com — and for every classed element on this page asks
// whether our computed box properties match what Carbon computed for the same
// class set.
//
// THE TWO SIDES MUST BE MEASURED THE SAME WAY or the diff is noise. The property
// list and the defaults below are the same ones tools/extract/react-dom.js uses
// in its `spacing` mode; changing one without the other makes every signature
// diverge. gridTemplateColumns is absent from both because it returns the
// container's rendered width, and `min-block-size: 0px` is treated as a default
// because it is Carbon's reset rather than a fact about a component.
//
// THREE VERDICTS, and only the first is a defect.
//
//   DIVERGES      the signature is in the reference and our values match NONE of
//                 its recorded variants. The per-property difference is printed,
//                 because "row-gap 0px where Carbon has 32px" is actionable and
//                 "spacing differs" is not.
//
//   NO REFERENCE  we render a class set Carbon never renders. Not a fault: the
//                 table is keyed on exact class sets, so a combination no story
//                 produces simply is not in it. Worth reading — a set Carbon
//                 never emits may be one we invented — but it is not a failure.
//
//                 READ THIS LIST. It is the quietest output here and it has
//                 already hidden a real defect: pagination shipped
//                 `pagination__text.page-text` with no page-number select, a
//                 combination Carbon renders in NEITHER of its two shapes, and
//                 the row sat in this bucket reading as "unmeasured" while the
//                 text rendered 17px from one edge and 1px from the other. It
//                 was found by eye. The bucket cannot be promoted to a failure:
//                 triaged on one page it held 9 near-misses of which 1 was real,
//                 and the noise is the reference's own story sampling, not our
//                 markup. A rule that needs that allow-list measures the list.
//
//   MATCHES       our values equal one of the recorded variants. Counted only.
//
// A SIGNATURE WITH SEVERAL VARIANTS PASSES ON ANY ONE OF THEM. 136 of the 800
// compute more than one way, because a stack's display depends on what wraps it;
// requiring one blessed value would report Carbon disagreeing with itself.
//
// A DIVERGENCE IS A QUESTION, NOT A VERDICT, and there is no ignore list here on
// purpose — a gate with one measures the list. The first run on the kitchen sink
// reported 13, and the three that were chased down were all CONTEXT rather than
// defect:
//
//   css-grid margin 24px      the sink fragment's own inline margin-block-end.
//                             Demo layout, not the component.
//   header__name 8px vs 16px  Carbon's own rule —
//                             `.header__menu-toggle:not(.__hidden) ~ .header__name`
//                             sets 0.5rem. The sink shows the hamburger; the
//                             capture was taken where it is hidden.
//   modal-header__heading     a percentage resolving against three different
//                             modal widths. Carbon's 91.9141px is itself resolved.
//
// ALL TWELVE WERE TRIAGED ON 2026-08-28 AND NONE WAS A DEFECT. The causes, in
// order of how often they came up:
//
//   4  SAME CLASS SET, DIFFERENT ANCESTOR. This is the tool's real weakness and
//      it is structural: the table is keyed on the class set alone, so
//      `form-requirement` inside a checkbox-group and `form-requirement` in a
//      plain form are one key. Carbon's own rule zeroes the top margin in the
//      first case; the reference happened to record the second. Same for
//      table-header-label, the toast close button, and link--disabled — where
//      Carbon's plain `link` computes BOTH inline-flex and flex, and only the
//      data-table context reached the table.
//   3  THE SINK'S OWN DEMO LAYOUT. css-grid and data-table-container carry inline
//      `margin-block-end` and `display:grid` from the fragment, to lay the
//      specimen out. Not the component.
//   3  A PERCENTAGE RESOLVING. modal-header__heading against three modal widths;
//      Carbon's 91.9141px is itself a resolved percentage.
//   1  CARBON'S OWN STATE RULE. `header__menu-toggle:not(.__hidden) ~ header__name`
//      sets 0.5rem. Our hamburger is visible; the capture's was hidden.
//   1  ONE CONTEXT RECORDED. stack-horizontal at scale-6 is inline-grid in the
//      story that reached the harvest and grid on the bare class. Both are Carbon.
//
// So the honest reading of a clean-ish run: the divergences are mostly the
// REFERENCE being thin, not the system being wrong. That is worth knowing before
// anyone treats this as a gate — it belongs beside check-rendered as a diagnostic
// a person reads, not in npm run verify.
//
// PARENT SIGNATURES WERE ADDED TO THE HARVEST TO FIX THAT, AND THE COUNT DID NOT
// MOVE — still twelve. What changed is that the rows now say which comparison
// they were: eight read `context: unmatched`, meaning the reference holds no
// variant recorded under our ancestor and the comparison was context-blind. The
// four that DID match a context are the percentage and state cases above.
//
// That is worth being plain about. The parent did not make the reference cover
// our contexts; it made the tool admit when it does not. Covering them needs
// Carbon to render the combination somewhere in its own stories, which is not
// something this end can arrange.
//
// POSITION IS A THIRD DIMENSION THE KEY DOES NOT HOLD, found on 2026-08-28 by a
// row that DID match its context: `form-item.checkbox-wrapper` inside
// `checkbox-group`, ours 3px against Carbon's 6px. Both are Carbon's own —
// `.form-item.checkbox-wrapper` is 0.375rem and `:last-of-type` is 0.1875rem —
// and the page simply reported its last wrapper against a recorded non-last one.
// Neither the class set nor the parent can express "the last of its kind", so a
// context-matched row is still not proof of disagreement. Check which element in
// the run the value came from before believing it.
//
// The lesson for the next reader: check what state each side was in before
// calling anything a defect. The tool's value is that the list is short and
// investigable, not that every row is wrong.
//
// SORTING THE KEY MOVED ELEVEN SIGNATURES OUT OF NO REFERENCE, 2026-08-28. On
// the kitchen sink at 1440px: checked 262 -> 276, matched 250 -> 259,
// noReference 153 -> 142, diverges 12 -> 17. All five new divergences were
// triaged before the change landed, on check-tags' precedent, and NONE is a
// defect:
//
//   4  css-grid-column.col-span-4 / --8, against `elements-grid--overview`.
//      Carbon's reference carries min-block-size 80px and block padding; its own
//      `scss/grid/_css-grid.scss` sets neither. That is the STORY's demo styling,
//      added to make columns visible — the mirror image of the sink's own inline
//      demo margins already listed above, on Carbon's side of the comparison.
//   1  btn--tertiary.btn--sm inside a popover or tooltip, ours inline-flex against
//      a reference captured in `preview-preview-card--overview` at flex. Same
//      class set, different ancestor — cause 1 above, and the row says
//      `context: unmatched` rather than pretending otherwise. 56 buttons on the
//      page compute flex and agree; the 9 that do not are all popover triggers.
//
// The fix is a false-NEGATIVE elimination, so every row it adds is a comparison
// that should always have happened. It does not make the reference thicker.
//
// THE TEMPLATES WERE SWEPT ON 2026-08-29 — the first time — and produced 11
// divergences across the six, none of them a defect. Four causes, and only the
// last was new:
//
//   6  `content` at 288px against Carbon's 32px, once per template. That is the
//      18rem indent each template writes in its own <head> to clear a side nav
//      nested INSIDE the header, which templates/app-shell.html documents at
//      length along with the grid offset that was tried and is wrong. The
//      reference story puts no nav inside the header, so its content is not
//      indented. Ours is deliberate and theirs is a different page.
//   2  `table-header-label` and `tag--blue`, both already on this list from the
//      sink — same class set, different ancestor.
//   1  `form-item.checkbox-wrapper` at 3px against 6px, already adjudicated in
//      roadmap §4.6: both values are Carbon's own, 0.375rem for the class and
//      0.1875rem for `:last-of-type`, and the page reported its LAST wrapper
//      against a recorded non-last one. Position is the dimension the key
//      cannot hold.
//   2  NEW — `stack-vertical.stack-scale-5` with no margin-block-start against
//      Carbon's 32px, on empty-state and error-state. Checked at the source:
//      `@carbon/styles/scss/layout/_stack.scss` sets NO margin at all, and the
//      reference is a single sample from `getting-started-welcome--welcome`,
//      Storybook's own welcome page. The 32px is that page's layout, not the
//      component's — the same shape as elements-grid--overview's demo
//      min-height, and the reverse of the sink's own inline demo margins
//      already listed above. OURS IS CORRECT: a stack's rhythm is the
//      container's gap, and Carbon zeroes its children's margins deliberately.
//
// So across all seven pages — 17 on the sink, 11 on the templates — twenty-eight
// divergences and zero defects. That is worth stating plainly because the number
// looks alarming and the tool's value is that the list is short and
// investigable, not that any row is wrong.
//
// WHAT IT CANNOT SEE. Whether the value is RIGHT — only whether it matches
// Carbon. A component we and Carbon both space wrongly passes. It also says
// nothing about a class set absent from both sides, and nothing about anything
// behind an interaction: this reads the page as it settled.
//
(() => {
  const REFERENCE = '/docs/carbon-react-spacing.json';
  const request = new XMLHttpRequest();
  request.open('GET', REFERENCE + '?v=' + Date.now(), false);
  request.send();
  if (request.status !== 200) {
    console.error(`  check-spacing — cannot read ${REFERENCE} (${request.status}).`
      + ' Run this from a page served by `npm run serve`.');
    return { error: request.status };
  }
  const rawReference = JSON.parse(request.responseText);

  // THE KEY IS A SET, SO IT IS SORTED BEFORE IT IS COMPARED. Both sides build a
  // signature with `[...classList].join('.')`, which preserves the order the
  // class attribute was written in — and that order is not a fact about the
  // component. `batch-summary__cancel.btn.btn--primary` and
  // `btn.btn--primary.batch-summary__cancel` are the same element; unsorted they
  // are two keys, the lookup misses, and the element lands in NO REFERENCE where
  // it reads as "Carbon never renders this" rather than "we wrote the attribute
  // in a different order". Two elements on templates/table-page.html were
  // silently uncompared for that reason alone, found 2026-08-28 while tracing a
  // pagination defect this tool had been unable to see.
  //
  // Normalising at read time rather than re-harvesting keeps the JSON as
  // captured — it stays a record of what Carbon rendered, order included.
  const sortSig = sig => sig.split('.').filter(Boolean).sort().join('.');
  const reference = {};
  for (const [key, variants] of Object.entries(rawReference)) {
    // `_`-prefixed keys are provenance, not class signatures -- roadmap 4.8.
    if (key.startsWith('_')) continue;
    const k = sortSig(key);
    // Two raw keys can normalise onto one. Concatenate rather than overwrite:
    // a signature passes on ANY recorded variant, so more variants is correct.
    reference[k] = reference[k] ? reference[k].concat(variants) : variants;
  }

  // Identical to the extractor's, deliberately. See the header.
  const PROPS = ['display', 'gridAutoFlow', 'gridAutoColumns', 'rowGap', 'columnGap',
    'marginBlockStart', 'marginBlockEnd', 'marginInlineStart', 'marginInlineEnd',
    'paddingBlockStart', 'paddingBlockEnd', 'paddingInlineStart', 'paddingInlineEnd',
    'minBlockSize'];
  const DEFAULTS = { display: 'block', gridAutoFlow: 'row', gridAutoColumns: 'auto',
    rowGap: 'normal', columnGap: 'normal', marginBlockStart: '0px', marginBlockEnd: '0px',
    marginInlineStart: '0px', marginInlineEnd: '0px', paddingBlockStart: '0px',
    paddingBlockEnd: '0px', paddingInlineStart: '0px', paddingInlineEnd: '0px',
    minBlockSize: 'auto' };
  const ALSO_DEFAULT = { minBlockSize: '0px' };

  const valuesOf = el => {
    const c = getComputedStyle(el), out = {};
    for (const p of PROPS)
      if (c[p] && c[p] !== DEFAULTS[p] && c[p] !== ALSO_DEFAULT[p]) out[p] = c[p];
    return out;
  };
  // `rux--` is `cds--` renamed by $prefix and nothing else, which is the one rule
  // this whole project rests on. That is what makes the join legal.
  const toCarbon = sig => sig.replace(/\brux--/g, 'cds--');

  // THE PARENT NARROWS THE MATCH, and without it four of the twelve divergences
  // this tool first reported were the same class set in a different ancestor.
  // Carbon writes descendant rules — `.checkbox-group__validation-msg
  // .form-requirement` zeroes a margin the plain `.form-requirement` has — so
  // comparing on the class set alone asks a question with two right answers.
  //
  // When the reference has a variant recorded under OUR parent, only those
  // variants are compared. When it does not, every variant is compared and the
  // row says `context: unmatched` — the comparison still happened, and the reader
  // is told it was context-blind rather than left to assume it was not.
  const parentSig = el => {
    for (let n = el.parentElement; n; n = n.parentElement) {
      const sig = [...n.classList].filter(c => c.startsWith('rux--')).join('.');
      if (sig) return sortSig(toCarbon(sig));   // sorted, as the lookup key is
    }
    return '';
  };

  // THREE KINDS OF DIFFERENCE THAT ARE NOT DISAGREEMENTS, and the first run
  // reported all three as findings before this existed.
  //
  //   hidden      a box with `display: none` has no meaningful padding or gap.
  //               Carbon's capture caught several components in that state and
  //               ours renders them open, or the reverse. Comparing the two says
  //               nothing about spacing.
  //   percentage  getComputedStyle returns `25%` unresolved for a hidden element
  //               and `201px` for the same rule when it is laid out. Carbon's
  //               accordion content is recorded as 25%; ours resolves. The rule
  //               may be identical and the strings cannot match.
  //   sub-pixel   27.0469px against 27.0312px is font rounding, not a spec.
  //
  // They are counted and named, never silently dropped — a check that hides what
  // it could not answer reads as agreement it did not earn.
  const isPercent = v => typeof v === 'string' && v.endsWith('%');
  const px = v => (typeof v === 'string' && v.endsWith('px')) ? parseFloat(v) : null;
  const sameValue = (a, b) => {
    if (a === b) return true;
    const [x, y] = [px(a), px(b)];
    return x !== null && y !== null && Math.abs(x - y) < 1;
  };
  const diffOf = (ours, theirs) => {
    const keys = [...new Set([...Object.keys(ours), ...Object.keys(theirs)])].sort();
    return keys.filter(k => !sameValue(ours[k], theirs[k]))
      .filter(k => !isPercent(ours[k]) && !isPercent(theirs[k]))
      .map(k => `${k}: ours ${ours[k] ?? '—'} · Carbon ${theirs[k] ?? '—'}`);
  };


// ── KNOWN ───────────────────────────────────────────────────────────────────
//
// ADJUDICATED DIVERGENCES, EACH WITH A REASON. This follows check-tags, which
// stayed a diagnostic until every finding of its first full run had been
// triaged, and check-ancestry, which records 53 declines the same way. This tool
// had no such list, so its headline was a COUNT -- and a count is the one part
// of this output that neither travels between machines nor can be investigated.
//
// WHY THE COUNT WAS THE WRONG UNIT. The same tree measured 345 - 312 - 33 on one
// machine and 346 - 311 - 35 on another with no change to the repository: a few
// rows carry values derived from text metrics, so the integer moves while the
// SET of disagreements does not. A ledger entry reading "35 diverge" is
// therefore unfalsifiable by the next reader. With this list the headline is
// `known / unknown`, and a known row stays known whether it computes 45.87px or
// 32.27px.
//
// A KEY IS `signature|property`, DELIBERATELY. If a known signature starts
// diverging on a NEW property, that property is unknown and gets reported. An
// adjudication covers what was examined, not the class forever.
//
// NOTHING IS SUPPRESSED. Known rows stay counted and stay in the return value;
// they are only kept out of the printed table, so the short list is the one
// worth reading -- which the header above argues is this tool's whole value.
//
// THIRTEEN ROWS ARE STILL UNKNOWN and print. That is the honest state after one
// pass, not a finished job: check-tags took fifty findings to triage.

// Blockification, verified 2026-09-01. The sink lays specimens out in `.ks-row`
// and `.ks-grid`, and a flex or grid ITEM is blockified -- `inline-flex` computes
// as `flex`, `inline-grid` as `grid`. Measured: the rule for `.rux--btn` asks for
// inline-flex and the parent `.ks-row` computes `display: flex`, so the element
// this tool reads computes `flex` while Carbon, sampling it outside such a
// wrapper, recorded `inline-flex`. The stylesheets agree; the demo harness is the
// whole difference, and it is on OUR side of the comparison.
const BLOCKIFIED = 'blockified by the sink demo wrapper: declared inline-flex/inline-grid, '
  + 'computes flex/grid because .ks-row is a flex container. Stylesheets agree (2026-09-01)';

// Carbon's STORY styling, on Carbon's side. `elements-grid--mixed-gutter-modes`
// paints its columns so they are visible in the demo; @carbon/styles' own
// scss/grid/_css-grid.scss sets neither min-block-size nor block padding, grepped
// 2026-09-01 with no match. The sink's inline `padding:.5rem 0` is the same move
// on our side, which is why these rows disagree in both directions at once.
const GRID_DEMO = 'demo styling on both sides: the Carbon story adds min-block-size 80px, '
  + 'the sink adds inline padding; @carbon/styles _css-grid.scss sets neither (2026-09-01)';

// The sink writes `style="margin-block-end:1.5rem"` on its grid specimens so the
// rows do not butt together. 1.5rem is the 24px reported. sink/grid.html:37.
const GRID_MARGIN = 'the sink own inline style="margin-block-end:1.5rem" on the specimen, '
  + 'which is the 24px reported; Carbon sets none (sink/grid.html:37)';

// The reference for these is the CLASSIC picker and this fragment is `--next`.
// `components-datepicker--default` renders its calendar through flatpickr, where
// sink/date-picker.html records that `cds--date-picker__calendar` matches ZERO
// cds rules and styles nothing. Comparing our --next calendar against it compares
// two different components that happen to share a class name.
const DP_CLASSIC = 'reference is the CLASSIC flatpickr picker (components-datepicker--default) '
  + 'and this fragment is --next; those calendar classes style nothing there';

// Values derived from the TEXT BESIDE THEM, so they can only agree if the
// specimen carries Carbon story copy word for word. The close button margin is an
// auto margin following the message width, and modal-header__heading computes
// three different paddings for the three modals on this page. Measured
// 2026-09-01: serving IBM Plex moved the close button from 45.87px to 32.27px
// against Carbon's 27.03px -- closer, and still content rather than font.
const CONTENT = 'derived from the width of the text beside it, so it can only agree if the '
  + 'specimen carries Carbon story copy verbatim (2026-09-01)';


// The template indents ITSELF. `.rux--content` is only ever offset by a SIBLING
// side nav, and the shell puts the nav inside the header, so none of Carbon's
// three rules match -- each template sets breakpoint-scoped fixed padding in its
// own <head> instead, which README and templates/app-shell.html both record. The
// 288px reported is that padding; Carbon's 32px is the un-offset story. This is
// the single most common row in the set: it appears on all ten templates and on
// portal.html, and it is deliberate on our side.
const SELF_INDENT = 'the template indents itself: a nav INSIDE the header matches none of '
  + "Carbon's three .rux--content rules, so each template sets its own breakpoint-scoped "
  + 'padding (README, templates/app-shell.html)';

// POSITION IS A DIMENSION THE KEY CANNOT HOLD, and the header records the find:
// `.form-item.checkbox-wrapper` is 0.375rem and its `:last-of-type` is 0.1875rem,
// both Carbon's own. The page reported its LAST wrapper against a recorded
// non-last one -- 3px against 6px. Neither the class set nor the parent can say
// "the last of its kind", so this is a sampling artifact, not a disagreement.
const LAST_OF_TYPE = 'the page measured its :last-of-type wrapper against a recorded '
  + 'non-last one; 0.1875rem vs 0.375rem are both Carbon own, and the key cannot '
  + 'express position (check-spacing header, 2026-08-28)';

// BATCH 1 OF §4.9, 2026-09-01. Four sampling shapes, each named against the
// Carbon rule that produces our value.
const XS_TREE = 'the --xs tree: `.tree--xs .tree-node__label` sets min-block-size 1.5rem and '
  + 'padding 0 on a leaf, and the spacing harvest sampled no xs tree (sink/treeview.html)';
const ICON_PARENT = "Carbon's own `.tree-node--with-icon .tree-node { margin-inline-start: .5rem }`; "
  + 'the one sampled nested selected node sits under a parent with no icon';
const NOT_LAST_ITEM = '`.file__selected-file { margin-block-end: .5rem }` with `:last-child { 0 }`; the '
  + 'item story mounts one item, so its only sample is a last child, and the key cannot '
  + 'express position';
const INVALID_ITEM = "`.file__selected-file .file-filename-container-wrap-invalid .file-filename-tooltip "
  + "{ padding-inline-start: 1rem }` -- the INVALID item's rule; only the plain item was "
  + 'harvested for spacing';
// BATCH 3 OF §4.9, 2026-09-01.
const CONDENSED_LIST = 'the --condensed structured list: `.structured-list--condensed .structured-list-td, '
  + '.structured-list-th { padding: .5rem }`, and the harvest sampled no condensed list '
  + '(sink/structured-list.html)';
// BATCH 5 OF §4.9, 2026-09-01.
const SANDBOX = 'the dialog is `inset: 0; margin: auto`, so its margins are whatever centres it in '
  + 'its containing block; the sink mounts it in a 22rem sandbox and the story mounts it in '
  + 'the viewport (sink/dialog.html)';
const STORY_GAP = "the chat-button story spaces its siblings with a margin the component does not own; "
  + 'the sink lays its row out with a gap (sink/chat-button.html)';
const KNOWN = {
  'rux--dialog|marginBlockStart': SANDBOX,
  'rux--dialog|marginBlockEnd': SANDBOX,
  'rux--dialog|marginInlineStart': SANDBOX,
  'rux--dialog|marginInlineEnd': SANDBOX,
  'rux--btn.rux--btn--ghost.rux--btn--sm.rux--layout--size-sm.rux--btn--icon-only|display': BLOCKIFIED,
  'rux--btn.rux--btn--ghost.rux--btn--icon-only|display': BLOCKIFIED,
  'rux--chat-btn.rux--btn.rux--btn--sm.rux--layout--size-sm.rux--btn--primary|display': BLOCKIFIED,
  'rux--chat-btn.rux--btn.rux--btn--sm.rux--layout--size-sm.rux--btn--primary|marginInlineEnd': STORY_GAP,

  'rux--structured-list-th|paddingBlockStart': CONDENSED_LIST,
  'rux--structured-list-td|paddingBlockStart': CONDENSED_LIST,
  'rux--structured-list-td|paddingBlockEnd': CONDENSED_LIST,
  'rux--structured-list-td|paddingInlineStart': CONDENSED_LIST,
  'rux--structured-list-td|paddingInlineEnd': CONDENSED_LIST,
  'rux--structured-list-td.rux--structured-list-content--nowrap|paddingBlockStart': CONDENSED_LIST,
  'rux--structured-list-td.rux--structured-list-content--nowrap|paddingBlockEnd': CONDENSED_LIST,

  'rux--tree-node__label|minBlockSize': XS_TREE,
  'rux--tree-node__label|paddingBlockStart': XS_TREE,
  'rux--tree-node__label|paddingBlockEnd': XS_TREE,
  'rux--tree-node__label|paddingInlineEnd': XS_TREE,
  'rux--tree-node.rux--tree-leaf-node.rux--tree-node--selected|marginInlineStart': ICON_PARENT,
  'rux--file__selected-file.rux--file__selected-file--md|marginBlockEnd': NOT_LAST_ITEM,
  'rux--popover-container.rux--popover--caret.rux--popover--high-contrast.rux--popover--bottom.rux--tooltip.rux--file-filename-tooltip|paddingInlineStart': INVALID_ITEM,

  'rux--btn.rux--btn--danger--tertiary|display': BLOCKIFIED,
  'rux--btn.rux--btn--danger--ghost|display': BLOCKIFIED,
  'rux--btn.rux--btn--md.rux--layout--size-md.rux--btn--primary|display': BLOCKIFIED,
  'rux--btn.rux--btn--sm.rux--layout--size-sm.rux--btn--primary|display': BLOCKIFIED,
  'rux--link.rux--link--disabled|display': BLOCKIFIED,
  'rux--btn.rux--btn--sm.rux--layout--size-sm.rux--btn--ghost.rux--btn--icon-only|display': BLOCKIFIED,
  'rux--btn.rux--btn--tertiary.rux--btn--sm.rux--layout--size-sm|display': BLOCKIFIED,
  'rux--stack-horizontal.rux--stack-scale-6|display': BLOCKIFIED,

  'rux--css-grid|marginBlockEnd': GRID_MARGIN,
  'rux--css-grid.rux--css-grid--condensed|marginBlockEnd': GRID_MARGIN,
  'rux--css-grid-column.rux--col-span-4|minBlockSize': GRID_DEMO,
  'rux--css-grid-column.rux--col-span-4|paddingBlockEnd': GRID_DEMO,
  'rux--css-grid-column.rux--col-span-4|paddingBlockStart': GRID_DEMO,
  'rux--css-grid-column.rux--col-span-4|paddingInlineEnd': GRID_DEMO,
  'rux--css-grid-column.rux--col-span-4|paddingInlineStart': GRID_DEMO,
  'rux--css-grid-column.rux--col-span-8|minBlockSize': GRID_DEMO,
  'rux--css-grid-column.rux--col-span-8|paddingBlockEnd': GRID_DEMO,
  'rux--css-grid-column.rux--col-span-8|paddingBlockStart': GRID_DEMO,
  'rux--css-grid-column.rux--col-span-8|paddingInlineEnd': GRID_DEMO,
  'rux--css-grid-column.rux--col-span-8|paddingInlineStart': GRID_DEMO,
  'rux--css-grid-column.rux--col-span-8|marginInlineEnd': GRID_DEMO,
  'rux--css-grid-column.rux--col-span-8|marginInlineStart': GRID_DEMO,

  'rux--date-picker__month|marginBlockEnd': DP_CLASSIC,
  'rux--date-picker__weekdays|columnGap': DP_CLASSIC,
  'rux--date-picker__weekdays|display': DP_CLASSIC,
  'rux--date-picker__weekdays|marginBlockEnd': DP_CLASSIC,
  'rux--date-picker__weekdays|rowGap': DP_CLASSIC,
  'rux--date-picker__day|paddingBlockEnd': DP_CLASSIC,
  'rux--date-picker__day|paddingBlockStart': DP_CLASSIC,
  'rux--date-picker__day|paddingInlineEnd': DP_CLASSIC,
  'rux--date-picker__day|paddingInlineStart': DP_CLASSIC,

  'rux--toast-notification__close-button|marginInlineStart': CONTENT,
  'rux--modal-header__heading|paddingInlineEnd': CONTENT,

  'rux--content|paddingInlineStart': SELF_INDENT,
  'rux--form-item.rux--checkbox-wrapper|marginBlockEnd': LAST_OF_TYPE,
};

  const diverges = [], notComparable = [], noReference = new Map();
  const known = [];
  let matched = 0, checked = 0;
  const seen = new Set();
  for (const el of document.querySelectorAll('[class*="rux--"]')) {
    const sig = [...el.classList].filter(c => c.startsWith('rux--')).join('.');
    if (!sig) continue;
    const ours = valuesOf(el);
    if (!Object.keys(ours).length) continue;
    const key = sig + '|' + JSON.stringify(ours);
    if (seen.has(key)) continue;            // one report per distinct rendering
    seen.add(key);
    const variants = reference[sortSig(toCarbon(sig))];
    if (!variants) {
      noReference.set(sig, (noReference.get(sig) ?? 0) + 1);
      continue;
    }
    // Hidden on either side: skip, and say so.
    const hiddenHere = ours.display === 'none';
    if (hiddenHere || variants.every(v => v.values.display === 'none')) {
      notComparable.push({ class: sig, why: hiddenHere ? 'display:none here' : 'display:none in Carbon' });
      continue;
    }
    checked++;
    const mine = parentSig(el);
    const inContext = variants.filter(v => (v.parents ?? []).some(p => sortSig(p) === mine));
    const compare = inContext.length ? inContext : variants;
    if (compare.some(v => diffOf(ours, v.values).length === 0)) { matched++; continue; }
    // A PROPERTY DIVERGES ONLY IF IT DIFFERS FROM EVERY VARIANT. Reporting the
    // closest variant's diff was wrong and said so out loud: radio-button__appearance
    // has five recorded variants, one of them carrying the exact margin-inline-end
    // this page computes, and the row still named that property because no single
    // variant matched the whole set. Whole-set matching is right for deciding
    // whether to report; it is the wrong unit for saying WHAT is wrong.
    const perProperty = [...new Set(compare.flatMap(v => Object.keys(v.values))
      .concat(Object.keys(ours)))].sort()
      .filter(k => !isPercent(ours[k]) && !compare.some(v => isPercent(v.values[k])))
      .filter(k => !compare.some(v => sameValue(ours[k], v.values[k])));
    if (!perProperty.length) { matched++; continue; }   // every property matches some variant
    const row = {
      class: sig,
      where: el.closest('.ks-sec')?.id ?? '(page)',
      differs: perProperty.map(k => `${k}: ours ${ours[k] ?? '—'} · Carbon `
        + [...new Set(compare.map(v => v.values[k] ?? '—'))].join('/')).join(' · '),
      context: inContext.length ? mine || '(root)' : 'unmatched',
      variants: `${compare.length}/${variants.length}`,
      seen: compare[0].seen[0] ?? '?',
    };
    // KNOWN only when EVERY diverging property is adjudicated for this signature.
    const reasons = perProperty.map(k => KNOWN[`${sig}|${k}`]);
    if (reasons.every(Boolean)) known.push({ ...row, reason: [...new Set(reasons)].join(' · ') });
    else diverges.push(row);
  }

  console.log(`\n  check-spacing — ${checked} signatures with a reference, `
    + `${matched} matching, ${known.length} known, ${diverges.length} unknown`);
  console.log(`  KNOWN is adjudicated, not suppressed — each row carries a reason and `
    + `stays in the return value. The number to watch is UNKNOWN.`);
  console.log(`  ${noReference.size} class sets Carbon does not render, `
    + `${notComparable.length} not comparable — neither is a fault, see the header\n`);
  if (diverges.length) console.table(diverges);
  console.log('\n  NOT CHECKED: whether the value is RIGHT, only whether it matches Carbon.'
    + '\n  Anything behind an interaction is out of reach — this reads the settled page.\n');
  return { checked, matched, known, diverges, notComparable, noReference: [...noReference.keys()].sort() };
})();
