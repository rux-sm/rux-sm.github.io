#!/usr/bin/env node
//
// Is a wrapper the reference ALWAYS renders simply missing from our markup?
//
// THE DEFECT THIS EXISTS FOR. modal's close button rendered in the flow under
// the heading, left-aligned, with a 3rem gutter empty beside it, because the
// fragment had no `modal-close-button` — the element carrying
// `position: absolute; inset-block-start: 0; inset-inline-end: 0`, which is the
// whole of how Carbon pins that X to the corner. Nothing caught it:
//   * check-tags asks which ELEMENT TYPE a class sits on. The button was a
//     <button>, which is correct.
//   * check-compound asks which classes Carbon writes together ON ONE ELEMENT.
//     A wrapper is a different element, so it is a different question.
//   * diff-fragment says in its own header that it reports nesting that
//     DISAGREES, not nesting that is ABSENT, because an unclassed parent on our
//     side cannot be told apart from a missing one.
// A wrapper that is simply not there was invisible to all three, and the README
// has now been right three times that only looking finds this class of defect.
//
// THE RULE, and it is deliberately the strongest one available. For class X,
// take every occurrence of X across all 642 captures and intersect their sets
// of classed ancestors. What survives is the set of classes Carbon puts above X
// WITHOUT EXCEPTION — not usually, not in the story we happened to copy. If one
// of those is absent from X's ancestors here, that is the finding.
//
// Intersection rather than union is what keeps this quiet. A wrapper that only
// some variants use — an AI decorator, a tooltip on one story's button — drops
// out on the first occurrence that lacks it, so the gate never demands a
// composition Carbon treats as optional.
//
// A CLASS MUST BE CORROBORATED BEFORE ITS ANCESTRY IS A RULE. Intersecting one
// occurrence yields that occurrence's whole chain, which is a description of one
// story rather than a requirement: `tooltip__trigger` appears once, inside a
// fluid form's password input, and the first draft of this gate duly demanded
// `password-input-wrapper` above every tooltip trigger in the sink. Ancestors are
// only trusted for a class seen in at least MIN_STORIES distinct captures, where
// coincidental wrappers have had a chance to drop out.
//
// A MODIFIER ON AN ANCESTOR WE ALREADY HAVE IS NOT A MISSING WRAPPER, and
// conflating the two was most of this gate's first run. Carbon renders menu items
// only while the menu is open, so every capture of `menu-item` sits inside
// `menu--open menu--shown` and the intersection duly required both — of a sink
// whose menu starts closed on purpose. Same for `list-box--expanded` over dropdown
// options, `number--helpertext`, `tabs--dismissable`, and
// `data-table--visible-overflow-menu` over every expansion row. In each the BLOCK
// is already an ancestor and only the modifier is absent, which is a question about
// state or variant rather than structure — check-tags and check-co-classes own
// that ground. This gate asks one thing: is an ELEMENT missing.
//
// TWO EXCLUSIONS, both of them structural rather than tuning:
//   * Storybook chrome (`layout`, `layout-constraint--*`, `sb-*`) wraps every
//     capture and would be required above everything.
//   * An ancestor owned by a component the manifest does not compile can never
//     be satisfied — `decorator` and `ai-label` are cut, and the keep-core rule
//     forbids removing their hooks from the components that ship. Demanding
//     them would leave the gate permanently red with no action available, which
//     is the same reasoning check-coverage gives for skipping stripped rows.
//
// Everything else that is deliberate goes in KNOWN, with its reason, on
// check-tags' precedent — it was promoted from diagnostic to gate only after
// every finding of its first full run had been adjudicated.
//
//   node tools/check-ancestry.mjs            gate: fail on anything not in KNOWN
//   node tools/check-ancestry.mjs --all      show KNOWN entries too
//
import { readFileSync } from 'node:fs';
import { markupFiles } from './lib/sources.mjs';
import { owner, compiled } from './lib/ownership.mjs';

const REF_PATHS = [
  'docs/carbon-react-dom.json',
  'docs/carbon-ibm-products-dom.json',
  'docs/carbon-react-states.json',
  'docs/carbon-ibm-products-states.json',
];
const PREFIX = /^(?:cds|c4p)--/;
const CHROME = /^(layout|layout-constraint--.*|sb-.*)$/;
const VOID = new Set(['area', 'base', 'br', 'col', 'embed', 'hr', 'img', 'input',
  'link', 'meta', 'param', 'source', 'track', 'wbr',
  'use', 'path', 'circle', 'rect', 'polygon', 'stop', 'ellipse', 'line']);

// Adjudicated divergences. `fragment:class` -> [ancestors we decline, reason].
// A reason is required: an entry without one is a defect with a lid on it.
// The icon-tooltip the sink declines EVERYWHERE. Carbon gives most icon-only
// buttons a hover hint built from a popover, and that popover is positioned by
// floating-ui — Phase 5 behaviour the sink has not written. Declining it is a
// standing decision with its own note in overflow-menu.html, combo-button and
// the table's overflow trigger; this is the same call, listed once.
const TOOLTIP_REASON = 'the icon-tooltip the sink declines throughout';
const TOOLTIP_CHROME = ['popover-container', 'popover--caret', 'popover--high-contrast',
  'popover--top', 'popover--bottom', 'popover--left', 'tooltip', 'icon-tooltip',
  'tooltip-trigger__wrapper'];

// Adjudicated divergences. `fragment:class` -> [ancestors declined, reason].
// A REASON IS REQUIRED: an entry without one is a defect with a lid on it, and
// two of this gate's first-run findings — modal's close button and pagination's
// control buttons — were exactly that, sitting behind notes that named the
// optional wrapper and never mentioned the load-bearing one.
// EVERY card story mounts its cards in a css-grid, so the intersection hands
// every card class the grid as a required ancestor. Measured 2026-08-31: 17 of
// 17 stories that render a card do it inside `cds--css-grid`, and NO rule in
// css/rux.css scopes any card class to the grid or to a column. It is the
// `links:link--disabled` shape — a sampling artifact of how the component is
// demoed upstream, not an anatomy Carbon requires. The sink lays its cards out
// with `ks-grid`, the harness class every other fragment uses.
const CARD_STORY_GRID = ['css-grid', 'css-grid--with-row-gap', 'sm:col-span-4',
  'md:col-span-4', 'lg:col-span-4', 'lg:col-span-8', 'css-grid-column'];
const CARD_GRID_REASON = 'the story layout, not the component. All 17 card stories mount '
  + 'the card in a css-grid column, so the intersection keeps the grid above every card '
  + 'class; nothing in css/rux.css scopes one to it. Same shape as links:link--disabled.';

const KNOWN = {
  // BATCH 1 OF §4.9, 2026-09-01 — the seven admissions below share two reasons
  // that this list already records elsewhere: a story's own grid is not the
  // component, and a class every capture renders but no rule styles is not
  // written (§4.1.12).
  'aspect-ratio:aspect-ratio': [['css-grid', 'css-grid-column'],
    "the story's layout: every aspect-ratio story mounts its boxes in a css-grid "
    + 'column to show several at once. The ratio box is the component; the fragment '
    + 'lays its examples out with the sink grid. Recorded in the fragment.'],
  'aspect-ratio:aspect-ratio--16x9': [['css-grid', 'sm:col-span-4', 'md:col-span-4', 'lg:col-span-4', 'css-grid-column', 'card'],
    'the same story layout, intersected with the five card stories that put a 16x9 '
    + 'image box inside a card column. Nothing in the CSS scopes the ratio to a card.'],
  'file-uploader:file__state-container': [['file-container-item'],
    'attested in every item capture and styled by no rule in @carbon/styles, so on '
    + 'the §4.1.12 precedent the wrapper div is present and the class is not written. '
    + 'check-classes rejected it on the first run.'],
  'file-uploader:file-close': [['file-container-item'],
    'the same unstyled wrapper as file__state-container above.'],
  // BATCH 5 OF §4.9, 2026-09-01.
  //
  // action-set is captured ONLY inside an open side panel, mounted in the
  // story's `.content` shell; the standalone fragment demos the component
  // alone and sink/side-panel.html shows it in place. Same shape as the
  // aspect-ratio declines: the story's mount is not the component.
  'action-set:action-set': [['content', 'side-panel', 'side-panel--open'],
    'every capture mounts the set in an open side panel inside the story shell; the '
    + 'fragment demos the set alone, and side-panel.html carries it in place.'],
  'action-set:action-set--row-single': [['content', 'side-panel', 'side-panel--open'], 'as action-set above.'],
  'action-set:action-set--md': [['content', 'side-panel', 'side-panel--md', 'side-panel--open'], 'as action-set above.'],
  'action-set:action-set__action-button': [['content', 'side-panel', 'side-panel--open', 'side-panel__actions-container'], 'as action-set above.'],
  'action-set:action-set__action-button--expressive': [['content', 'side-panel', 'side-panel--open', 'side-panel__actions-container'], 'as action-set above.'],
  // The AI label's popover is `auto-align` in every capture: floating-ui
  // placement this system has no JS for. The fragment fixes `--bottom` instead,
  // the call sink/ai-label.html and the side-panel decorator already record.
  'ai-label:ai-label__button--xs': [['popover--auto-align', 'autoalign'],
    'floating-ui auto-alignment the fragment replaces with a fixed --bottom; recorded in the fragment.'],
  'ai-label:ai-label__button--sm': [['popover--auto-align', 'autoalign'], 'as ai-label__button--xs above.'],
  'ai-label:ai-label__button--md': [['popover--auto-align', 'autoalign'], 'as ai-label__button--xs above.'],
  'ai-label:ai-label__button--inline': [['popover--auto-align', 'autoalign'], 'as ai-label__button--xs above.'],
  'side-panel:ai-label__button--xs': [['popover--auto-align', 'autoalign'], 'as ai-label__button--xs above.'],
  'dialog:dialog__close': [TOOLTIP_CHROME,
    'the icon-tooltip the sink declines throughout; the POSITIONING wrapper, dialog__header-controls, is present.'],
  // BATCH 3 OF §4.9, 2026-09-01. The code snippet's copy button and the
  // pagination nav's arrows are icon-tooltips in every capture; the sink
  // declines that chrome throughout and names each site.
  'code-snippet:snippet--inline': [TOOLTIP_CHROME,
    'the inline snippet IS a copy button wrapped in an icon-tooltip; the tooltip is '
    + 'the story\'s hover hint and the sink declines it throughout.'],
  'code-snippet:copy': [TOOLTIP_CHROME, 'the same icon-tooltip around the copy button.'],
  'code-snippet:copy-btn': [TOOLTIP_CHROME, 'the same icon-tooltip around the copy button.'],
  // BATCH 2 OF §4.9, 2026-09-01: the fluid multiselect in sink/fluid.html,
  // declined for the reason its base records three entries below.
  'fluid:multi-select': [['multi-select__wrapper'],
    'the unstyled attested wrapper, as for multiselect below; list-box__wrapper--fluid '
    + 'is the styled one and is present.'],
  'fluid:list-box__field--wrapper': [['multi-select__wrapper'],
    'the same unstyled wrapper.'],
  'fluid:multi-select--filterable': [['multi-select__wrapper', 'multi-select--filterable__wrapper'],
    'both wrappers attested and unstyled, as sink/multiselect.html records.'],
  'multiselect:multi-select': [['multi-select__wrapper'],
    'rendered by all 46 captures and styled by no rule in @carbon/styles — the '
    + '§4.1.12 call sink/dropdown.html already records for dropdown__wrapper. The '
    + 'styled wrapper, list-box__wrapper, is present.'],
  'multiselect:list-box__field--wrapper': [['multi-select__wrapper'],
    'the same unstyled wrapper as multi-select above.'],
  'multiselect:multi-select--selected': [['multi-select__wrapper'],
    'the same unstyled wrapper as multi-select above.'],
  'multiselect:multi-select--filterable': [['multi-select__wrapper', 'multi-select--filterable__wrapper'],
    'both wrappers are attested and unstyled; the filterable variant is still '
    + 'undiffed beyond this, as the fragment records.'],
  'card:btn--icon-only': [TOOLTIP_CHROME,
    'the icon-tooltip the sink declines throughout. The reference wraps each '
    + '`card__action` button in one; the fragment demos the component rather than the '
    + "story's hover hint, on the combo-button precedent."],
  'buttons:btn--expressive': [['content', 'btn-set', 'side-panel', 'side-panel--open', 'action-set', 'side-panel__actions-container'],
    'the sink demos a standalone expressive button. `btn-set` contributes only '
    + '`max-inline-size: 20rem` to buttons inside a group, and `content` is the shell '
    + 'page region every capture is mounted in. Since batch 5 admitted side-panel, the '
    + 'only stories rendering btn--expressive are its action sets, so the panel classes '
    + 'joined the intersection; nothing in the CSS scopes the size to a panel.'],
  'buttons:inline-loading__animation': [['inline-loading'],
    'already recorded in the fragment: NO story renders `btn--loading` at all, so '
    + 'there is no sampled composition to match. The pairing follows the CSS, which '
    + 'scopes btn--loading to `.rux--btn-set .rux--btn.rux--btn--loading`.'],
  'dropdown:list-box__invalid-icon': [['dropdown__wrapper'],
    '@carbon/styles defines `dropdown__wrapper` only in its --inline form, so outside '
    + 'that variant it styles nothing; `list-box__wrapper` is the styled wrapper and is '
    + 'present. Recorded in the fragment (roadmap §4.1.12).'],
  'list-box:list-box__invalid-icon': [['dropdown__wrapper', 'dropdown'],
    'same as dropdown: the wrapper class is unstyled outside --inline, and this '
    + 'fragment demos the list-box on its own rather than as a dropdown.'],
  'links:link--disabled': [['data-table-container', 'data-table-content', 'data-table'],
    'a sampling artifact rather than a rule. Every capture that disables a link '
    + 'happens to be a table cell, so the intersection keeps the table above it — but '
    + 'nothing in the CSS scopes `link--disabled` to a table.'],
  'modal:modal-close': [TOOLTIP_CHROME,
    'the icon-tooltip the sink declines throughout. The POSITIONING wrapper, '
    + 'modal-close-button, is present — dropping that one was the defect this gate '
    + 'was written for.'],
  'modal:modal-close__icon': [[...TOOLTIP_CHROME, 'btn', 'btn--primary', 'btn--icon-only'],
    'the tooltip chrome as everywhere else, plus the btn classes on the close button. '
    + 'Those are declined on measurement: `modal-close` sets its own 3rem box, '
    + 'transparent background and padding, and is emitted after `button` in the '
    + 'manifest, so they add nothing but a chance for the cascade to move on a bump. '
    + 'The POSITIONING wrapper, modal-close-button, is present — dropping that one was '
    + 'the defect this gate was written for.'],
  'combo-button:combo-button__trigger': [TOOLTIP_CHROME,
    'the icon-tooltip the sink declines throughout. The trigger is the component; the '
    + 'hover hint is the story. sink/tooltip.html records the standing call.'],
  'fluid:number-input__divider': [['number--helpertext'],
    '`number--helpertext` is the one ancestor class not written, and it is the §4.1.12 call '
    + 'sink/number.html already records: the reference puts it on the root when helper text is '
    + 'present, @carbon/styles defines NO rule for it, so check-classes would reject it. The two '
    + 'ancestors that DO carry rules, `number` and `number--md`, are both present.'],
  'pagination:pagination__button': [TOOLTIP_CHROME,
    'the icon-tooltip the sink declines throughout. `pagination__control-buttons`, the '
    + 'STYLED wrapper the same note used to omit, is present as of 2026-08-28.'],
  'table:toolbar-action': [['popover-container'], 'the icon-tooltip the sink declines throughout'],
  // Restored 2026-08-29. Carbon only ever renders a badge on an icon button
  // that also carries a hover hint, so all four captures wrap the pair in the
  // tooltip chrome. The fragment declines it for the reason the sink declines it
  // everywhere — the popover is positioned by floating-ui, which is Phase 5
  // behaviour this project has not written — and says so in its own comment.
  'badge-indicator:badge-indicator': [TOOLTIP_CHROME,
    'the badge sits inside the same declined icon-tooltip; the BUTTON that gives it its '
    + 'containing block is present, which is the ancestor that positions it'],
  'badge-indicator:badge-indicator--count': [TOOLTIP_CHROME,
    'as badge-indicator — the count variant is the same element with a number in it'],
  'table:btn--icon-only': [TOOLTIP_CHROME, 'the icon-tooltip the sink declines throughout'],
  'table:overflow-menu__icon': [[...TOOLTIP_CHROME, 'btn', 'btn--ghost', 'btn--icon-only'],
    'the icon-tooltip the sink declines throughout, plus the btn classes declined on '
    + 'measurement — see the note above overflow-menu:overflow-menu__icon'],
  // THE BTN CLASSES ON AN OVERFLOW-MENU TRIGGER, declined on the same grounds as
  // modal-close__icon above and measured rather than argued. `.overflow-menu`
  // runs button-reset, component-reset and a focus-outline reset, then sets its
  // own flex box, its size from the layout size, its :focus outline and its
  // :hover background — the whole of a ghost icon button — and app.scss emits
  // overflow-menu (line 92) after button (line 37), so it wins the collisions
  // anyway. Compared live 2026-08-29 against components-overflowmenu--default:
  // background, 40x40 box, zero border, zero padding and the icon's
  // rgb(22,22,22) fill are IDENTICAL with the btn classes absent. The one
  // difference is the button's `color` — link-primary there, black here — and it
  // paints nothing, because the trigger holds no text and the glyph's fill now
  // comes from overflow-menu__icon rather than from currentColor.
  'overflow-menu:overflow-menu__icon': [[...TOOLTIP_CHROME, 'btn', 'btn--ghost', 'btn--icon-only'],
    'the icon-tooltip the sink declines throughout, plus the btn classes declined on '
    + 'measurement — see the note above this entry'],
  // Same call as ui-shell's, made once more where it is load-bearing: these
  // are the header actions of a page TEMPLATE, not a specimen. The name is
  // carried by aria-label, so a screen reader is served; what the decline
  // costs is the hover label a sighted pointer user would get from Carbon.
  'templates/app-shell:btn--icon-only': [TOOLTIP_CHROME, 'the icon-tooltip the sink declines throughout; aria-label carries the name'],
  // THE SAME DECLINE, SIXFOLD, because KNOWN is keyed per file and the table
  // page is the first file to hold all of these at once. Every entry below is
  // the icon-tooltip chrome, already declined for the sink under pagination:,
  // table: and overflow-menu:. `--no-index` additionally wants
  // `icon-tooltip--disabled`, which is the same wrapper in its disabled form.
  'templates/form-page:btn--icon-only': [TOOLTIP_CHROME, 'the icon-tooltip the sink declines throughout'],
  'templates/schedule-page:btn--icon-only': [TOOLTIP_CHROME, 'the icon-tooltip the sink declines throughout — the shell header\'s buttons, inherited with the frame'],
  'templates/table-page:btn--icon-only': [TOOLTIP_CHROME, 'the icon-tooltip the sink declines throughout'],
  'templates/detail-page:btn--icon-only': [TOOLTIP_CHROME, 'the icon-tooltip the sink declines throughout'],
  'templates/empty-state:btn--icon-only': [TOOLTIP_CHROME, 'the icon-tooltip the sink declines throughout'],
  'templates/error-state:btn--icon-only': [TOOLTIP_CHROME, 'the icon-tooltip the sink declines throughout'],
  'templates/wizard-page:btn--icon-only': [TOOLTIP_CHROME, 'the icon-tooltip the sink declines throughout'],
  'templates/dashboard-page:btn--icon-only': [TOOLTIP_CHROME, 'the icon-tooltip the sink declines throughout'],
  'templates/settings-page:btn--icon-only': [TOOLTIP_CHROME, 'the icon-tooltip the sink declines throughout'],
  // THE FIRST TEMPLATE TO CARRY A MODAL, so these two declines arrive in
  // templates/ for the first time. Both are the sink's own, verbatim: see
  // modal:modal-close and modal:modal-close__icon above for the measurement
  // the second one rests on. The POSITIONING wrapper, modal-close-button, is
  // present here — dropping that one is the defect this gate was written for.
  'templates/wizard-page:modal-close': [TOOLTIP_CHROME,
    'the icon-tooltip the sink declines throughout, exactly as modal:modal-close.'],
  'templates/wizard-page:modal-close__icon': [[...TOOLTIP_CHROME, 'btn', 'btn--primary', 'btn--icon-only'],
    'the tooltip chrome as everywhere else, plus the btn classes on the close button, '
    + 'declined on the measurement recorded at modal:modal-close__icon.'],
  'templates/table-page:toolbar-action': [['popover-container'], 'the icon-tooltip the sink declines throughout'],
  'templates/table-page:overflow-menu': [TOOLTIP_CHROME, 'the icon-tooltip the sink declines throughout'],
  'templates/table-page:overflow-menu__icon': [[...TOOLTIP_CHROME, 'btn', 'btn--ghost', 'btn--icon-only'],
    'the icon-tooltip the sink declines throughout, plus the btn classes declined on '
    + 'measurement — see the note above overflow-menu:overflow-menu__icon'],
  'templates/table-page:pagination__button': [[...TOOLTIP_CHROME, 'popover--top'],
    'the icon-tooltip the sink declines throughout'],
  'templates/table-page:pagination__button--no-index': [[...TOOLTIP_CHROME, 'popover--top', 'icon-tooltip--disabled'],
    'the icon-tooltip the sink declines throughout, in its disabled form'],
  // THE SECOND TEMPLATE TO CARRY A PAGINATION BAR, 2026-09-10. Both entries are
  // templates/table-page's verbatim, because the markup is: the icon-tooltip
  // chrome, declined here for the reason it is declined everywhere — the hint
  // is positioned by floating-ui and that behaviour was never written.
  // `pagination__control-buttons`, the STYLED wrapper the pagination: note used
  // to omit, IS present. Dropping THAT one is the defect this gate was written
  // for, and neither entry below declines it.
  'templates/search-results-page:pagination__button': [[...TOOLTIP_CHROME, 'popover--top'],
    'the icon-tooltip the sink declines throughout'],
  'templates/search-results-page:pagination__button--no-index': [[...TOOLTIP_CHROME, 'popover--top', 'icon-tooltip--disabled'],
    'the icon-tooltip the sink declines throughout, in its disabled form'],
  'tooltip:tooltip__trigger': [['form-item', 'text-input-wrapper', 'password-input-wrapper',
    'text-input__field-outer-wrapper', 'text-input__field-wrapper', 'popover--high-contrast',
    'popover--bottom-end', 'toggle-password-tooltip', 'icon-tooltip', 'tooltip-trigger__wrapper'],
    'the only captures of a bare `tooltip__trigger` are the password-visibility toggle '
    + 'inside a fluid text input, so the intersection returns that one composition '
    + 'whole. It is a description of where Carbon happens to demo the class, not a '
    + 'requirement on it; this fragment demos the trigger on its own.'],
};

const COMPILED = compiled();

// --- reference: class -> intersection of its classed-ancestor sets -----------
// LOWERING THIS TO 2 WAS TRIED AND REJECTED, 2026-09-01. It admits 148 more
// classes (550 -> 698) and produces 26 findings over 14 classes. All 26 were
// triaged and NONE is a defect; three groups are worth not rediscovering:
//
//   * `date-picker__input--invalid/--warn` wanting `form-item`. Read per FILE,
//     `components-datepicker--*` is the CLASSIC picker and wraps in form-item;
//     `preview-preview-datepicker--*` is `--next` and does not. This build ships
//     `--next`. Merging the four capture files into one map hides this, because
//     `components-datepicker--simple@invalid` exists in two of them and the
//     later silently wins -- the same classic-vs-`--next` trap README records
//     against check-spacing's calendar row.
//   * `dropdown--inline/--invalid` and `list-box--invalid` wanting
//     `dropdown__wrapper`. @carbon/styles defines that class only in its
//     `--inline` form, so the bare class has NO rule and check-classes would
//     reject it; `list-box__wrapper` is the styled wrapper and is present, and
//     the inline specimen already carries `dropdown__wrapper--inline`. Written
//     up in sink/dropdown.html and sink/fluid.html.
//   * `header__menu-item--current` wanting `header__submenu`, in all ten
//     templates and ui-shell. Carbon's two capture stories both mark the current
//     item inside a submenu, so the intersection demands it -- but css/rux.css
//     styles the modifier UNSCOPED and the submenu rules only override the
//     `::after`. Measured on templates/app-shell.html: outside any submenu the
//     indicator computes content "" at 3px tall, against `none` for a plain
//     item. A flat menu bar is the normal case and Carbon simply never captured
//     one.
//
// `overflow-menu--open` wanting `overflow-menu__wrapper` is the fourth and the
// only one where the class exists here: it is `line-height: 0` and nothing else.
// Measured on the sink, the fragment has no wrapper and the open list still sits
// flush at gap 0, which is what Carbon does. Adding one is also not free --
// the wrapper must enclose the trigger AND the surface, and wrapping only the
// button moved the open list 413px off target in the same measurement.
//
// The pattern across all 26: at 2 the corroborating captures are one or two
// stories from a single component, which describes that story rather than the
// component. 3 is doing real work.
const MIN_STORIES = 3;

const required = new Map();   // class -> Set | null  (null once intersected empty)
const storyOf = new Map();    // class -> a story id that shows it
const seenIn = new Map();     // class -> Set(story id)
let stories = 0;

for (const path of REF_PATHS) {
  for (const [id, lines] of Object.entries(JSON.parse(readFileSync(path, 'utf8')))) {
    if (id.startsWith('_')) continue;           // `_meta` is provenance, not a story
    if (lines[0]?.startsWith('(')) continue;
    stories++;
    const openAt = [];   // depth -> classes on the element open at that depth
    for (const line of Object.values(lines)) {
      const depth = (line.match(/^ */)[0].length) / 2;
      const body = line.trim().replace(/\[role=[^\]]*\]/, '').replace(/\{[^}]*\}/, '');
      const classes = body.split('.').slice(1).filter(Boolean)
        .map(c => c.replace(PREFIX, '')).filter(c => !CHROME.test(c));

      // Full chain: every class on every shallower open element.
      const chain = new Set();
      for (let d = 0; d < depth; d++) for (const c of openAt[d] ?? []) chain.add(c);

      for (const c of classes) {
        if (!storyOf.has(c)) storyOf.set(c, id);
        if (!seenIn.has(c)) seenIn.set(c, new Set());
        seenIn.get(c).add(id);
        if (!required.has(c)) { required.set(c, new Set(chain)); continue; }
        const have = required.get(c);
        if (!have) continue;
        for (const a of [...have]) if (!chain.has(a)) have.delete(a);
        if (!have.size) required.set(c, null);
      }
      openAt[depth] = classes;
      openAt.length = depth + 1;
    }
  }
}

// --- ours: every occurrence of a class, with its full classed ancestry -------
function occurrences(html) {
  const src = html.replace(/<!--[\s\S]*?-->/g, '');
  const out = [];
  const stack = [];
  const re = /<(\/?)([a-zA-Z][\w-]*)((?:"[^"]*"|'[^']*'|[^>"'])*?)(\/?)>/g;
  let m;
  while ((m = re.exec(src))) {
    const [, closing, rawTag, attrs, selfClose] = m;
    const tag = rawTag.toLowerCase();
    if (closing) {
      for (let i = stack.length - 1; i >= 0; i--) if (stack[i].tag === tag) { stack.length = i; break; }
      continue;
    }
    const classes = (attrs.match(/\sclass="([^"]*)"/) ?? [, ''])[1]
      .split(/\s+/).filter(c => c.startsWith('rux--')).map(c => c.slice(5));
    const chain = new Set();
    for (const entry of stack) for (const c of entry.classes) chain.add(c);
    for (const c of classes) out.push({ cls: c, chain });
    if (!(selfClose || VOID.has(tag))) stack.push({ tag, classes });
  }
  return out;
}

// DECLINES THAT ARE ABOUT THE CLASS, NOT THE FRAGMENT.
// KNOWN is keyed `fragment:class`, which is right for a judgement that turns on
// what one fragment does. These two do not: every card story mounts its cards in
// a css-grid column, and Carbon gives every icon-only button a hover hint built
// from a popover this project declines because floating-ui behaviour was never
// written. Neither fact changes with the file, and both were already being
// restated per file -- 26 entries over 21 classes, every one of them the same
// two lists.
//
// Keying them by CLASS is what makes them travel. A `fragment:class` entry
// cannot match a file this repository does not own, so `check-ancestry.mjs
// <consumer>` reported 0 declined and handed back every adjudicated divergence
// as a finding: measured on rux-ln-notes 2026-09-01, two findings whose reasons
// were already sitting in this file.
//
// A file-keyed entry still WINS, and four are kept for that reason -- modal's
// close button, pagination's control buttons and card's action button each
// record that the load-bearing wrapper IS present, which is the distinction
// this gate exists to make and is not a property of the class.
//
// WHAT THIS GIVES UP: a new fragment using one of these 21 classes inherits the
// decline instead of being adjudicated on its own. That is the trade -- the
// judgement is genuinely about the class, and restating it per file was
// producing drift, not rigour.
const CLASS_DECLINES = {
  'card': [CARD_STORY_GRID, CARD_GRID_REASON],
  'card--productive': [CARD_STORY_GRID, CARD_GRID_REASON],
  'card--expressive': [CARD_STORY_GRID, CARD_GRID_REASON],
  'card__header': [CARD_STORY_GRID, CARD_GRID_REASON],
  'card__title': [CARD_STORY_GRID, CARD_GRID_REASON],
  'card__label': [CARD_STORY_GRID, CARD_GRID_REASON],
  'card__title-text-row': [CARD_STORY_GRID, CARD_GRID_REASON],
  'card__title-text-row--truncate-multi': [CARD_STORY_GRID, CARD_GRID_REASON],
  'card__description': [CARD_STORY_GRID, CARD_GRID_REASON],
  'card__body': [CARD_STORY_GRID, CARD_GRID_REASON],
  'card__footer': [CARD_STORY_GRID, CARD_GRID_REASON],
  'card__actions': [CARD_STORY_GRID, CARD_GRID_REASON],
  'card__action': [CARD_STORY_GRID, CARD_GRID_REASON],
  'card__header-media': [CARD_STORY_GRID, CARD_GRID_REASON],
  'btn--icon-only': [TOOLTIP_CHROME, TOOLTIP_REASON],
  'overflow-menu': [TOOLTIP_CHROME, TOOLTIP_REASON],
  'badge-indicator--count': [TOOLTIP_CHROME, TOOLTIP_REASON],
  'combo-button__trigger': [TOOLTIP_CHROME, TOOLTIP_REASON],
  'badge-indicator': [TOOLTIP_CHROME, TOOLTIP_REASON],
};

const showAll = process.argv.includes('--all');

// ROOTS MAY COME FROM THE COMMAND LINE, so this gate can be pointed at a
// CONSUMER's pages without those pages ever entering this repository.
//
// WHY THAT MATTERS AND WHY IT IS NOT A CONVENIENCE. A wrapper that is simply
// absent is the defect class nothing else catches -- see the header -- and it
// is the one a consumer is most likely to introduce, because a consumer
// vendors css/, assets/ and js/ and inherits none of the enforcement. rux-ln-notes
// has hit it: a missing `__icon` class that flexbox squashed from 20px to 5px,
// which its own two gates could not see and a person found by looking.
//
// The captures are 1.8 MB and live here. Vendoring them into every consumer to
// run a second copy of a rule this repository owns is the wrong trade -- and it
// is the trade check-structure.mjs there already refused for the same reason.
// Pointing this gate at the pages instead costs one argument, and nothing
// crosses: the consumer's markup is read from disk on the same machine and
// never committed, quoted or copied here.
//
//   node tools/check-ancestry.mjs                          # sink + templates
//   node tools/check-ancestry.mjs ../rux-ln-notes/guides  # a consumer's pages
//
// This is the same fix `pageTargets()` took for the browser gates, and that
// four node gates took at 9186429: a hardcoded page list is a gate that cannot
// be asked about anything it was not written for.
const roots = process.argv.slice(2).filter(a => !a.startsWith('--'));
const findings = [], accepted = [];

for (const file of markupFiles(roots.length ? roots : undefined)) {
  const name = file.name;
  const seen = new Map();   // class -> Set(missing ancestors)
  for (const { cls, chain } of occurrences(readFileSync(file.path, 'utf8'))) {
    const need = required.get(cls);
    if (!need?.size) continue;
    if ((seenIn.get(cls)?.size ?? 0) < MIN_STORIES) continue;   // uncorroborated
    for (const a of need) {
      if (chain.has(a)) continue;
      // A modifier on an element we already have: state or variant, not structure.
      const block = a.split('--')[0];
      if (block !== a && chain.has(block)) continue;
      // Unsatisfiable: the ancestor belongs to a component we do not compile.
      const own = owner(`rux--${a}`);
      if (own && !COMPILED.has(own)) continue;
      if (!seen.has(cls)) seen.set(cls, new Set());
      seen.get(cls).add(a);
    }
  }
  for (const [cls, missing] of seen) {
    const known = KNOWN[`${name}:${cls}`] ?? CLASS_DECLINES[cls];
    const declined = new Set(known?.[0] ?? []);
    const real = [...missing].filter(a => !declined.has(a));
    const row = { name, cls, missing: [...missing], real, reason: known?.[1],
                  story: storyOf.get(cls), seen: seenIn.get(cls)?.size ?? 0 };
    if (real.length) findings.push(row); else if (known) accepted.push(row);
  }
}

for (const f of findings) {
  console.log(`\n  ${f.name}.html`);
  console.log(`      rux--${f.cls}`);
  console.log(`         missing ancestor${f.real.length > 1 ? 's' : ''}  ${f.real.map(a => `.rux--${a}`).join(' ')}`);
  console.log(`         Carbon nests it inside these in EVERY capture that renders it`);
  console.log(`         seen in ${f.seen} captures · e.g. ${f.story}`);
}
if (showAll) for (const a of accepted) {
  console.log(`\n  ${a.name}.html  rux--${a.cls}  DECLINED  ${a.missing.map(x => `.rux--${x}`).join(' ')}`);
  console.log(`         ${a.reason}`);
}

const trusted = [...required].filter(([c, r]) => r?.size && (seenIn.get(c)?.size ?? 0) >= MIN_STORIES).length;
console.log(`\n  ${stories} stories · ${trusted} classes with a corroborated required ancestry`
  + ` · ${accepted.length} declined · ${findings.length} missing`);
if (findings.length) console.log(
  '  a wrapper Carbon never omits is absent here — add it, or record it in KNOWN with a reason\n');
else console.log();
process.exit(findings.length ? 1 : 0);
