---
exchange: {kind: requests, from: rux-scheduler, to: rux-ds}
---

# Requests to rux-ds

What this app has asked the design system for, and why. `AGENTS.md`: a missing
component, rule or icon is a request to rux-ds with invented content, never a
local rule. This file is the record so a request is not re-argued from scratch
the next time it comes up, and so what was declined stays declined for a reason.

Open requests are listed first. A request that lands is moved to **Settled**
with the tag that carried it.

**Since 2026-09-12 this is a record, not a queue.** A gap is fixed in rux-ds
in the same session, with invented content; what is still open is listed in
the hub's `docs/status.md`, one line each, pointing back here for the
reasoning.

---

## Open — a toast is compiled with no way to place it, 2026-09-11

**Asked for:** a positioned region for toast notifications — a compiled
`rux--toast-region` or equivalent, carrying the `position: fixed`, the inset,
the stacking and the z-index that Carbon's guidance describes but its CSS does
not ship. Whatever shape rux-ds prefers; the point is that it exists once.

**Why:** `rux--toast-notification` and `rux--actionable-notification--toast` are
both compiled, and between them they set an 18rem width, `flex-wrap` and a drop
shadow — the card's APPEARANCE and nothing else. Neither carries `position`,
`inset`, `z-index` or any stacking rule. So the first thing every consumer that
wants a toast must do is invent where toasts go, and the second is invent how
two of them sit together.

**AND CARBON'S OWN GUIDANCE IS SPECIFIC ABOUT BOTH**, which is what makes this a
gap rather than a deliberate omission.
`carbon-website/src/pages/components/notification/usage.mdx`, vendored in this
very repository, says: "Toast notifications slide in and out from the top right
of the screen. They stack with `$spacing-03` in-between. New toast notifications
should appear at the top of the list, with older notifications being pushed down
until they are dismissed." That is a placement, a gap token and a stacking
order — three compilable facts, none of them compiled.

**WHAT THIS APP DID INSTEAD, so the cost is concrete.** `sch.css` owns
`.sch-toast`: fixed, a gutter, a z-index, a below-md override because the 18rem
minimum would otherwise decide a 375px phone's layout, and a `:has()` rule
lifting it clear of the side panel's action bar. None of that is scheduler
business and all of it will be rewritten, differently, by the next app that
wants a toast. **This app also placed it BOTTOM right rather than top**, and that
part is genuinely ours: measured at 1440×950, Carbon's top-right lands on this
board's toolbar buttons. A shipped region should make its default placement
overridable rather than assume nobody has chrome in that corner.

**Not blocking.** The local rule works and is commented. This is a request to
stop every consumer paying for it separately.

---

## Open — a toggle's tap target is under both platforms' minimums, 2026-09-11

**Asked for:** a toggle whose interactive surface meets 44px (iOS) / 48px
(Android) at touch widths — as a compiled variant, a rule on
`.rux--toggle__label`, or whatever shape rux-ds prefers. Not a bigger SWITCH:
the graphic is the right size, the thing you press is not.

**Why:** the scheduler's Billing tab has three toggles a dispatcher works on a
phone. rux asked whether to go up a size and the answer measured out as no,
because the size variants do not move the number that matters.

**WHAT IS ACTUALLY PRESSED.** `.rux--toggle__button` is `position: absolute`
and **1×1** — visually hidden, as intended. The hit area is the `<label>`, and
with no `__label-text` in it the label collapses onto the switch graphic.
Measured in rux-ds's own `kitchen-sink.html#toggle`, five stylesheets loaded:

| | switch graphic | label box (sink, with text) |
| --- | --- | --- |
| default | **48 × 24** | 74 × 60 |
| `--sm` | **32 × 16** | 90 × 52 |

And in this app, where the toggles carry `aria-label` and no visible text, the
label box IS the target: **56 × 21** at default and **40 × 21** at `--sm`.

**THE SIZE VARIANT IS NOT THE FIX, which is the point of filing this.** Going
from `--sm` to default buys 16px of WIDTH (32 → 48) and 8px of height
(16 → 24). The target stays 21px tall in the labelless form either way — under
half of iOS's 44 and Android's 48. A consumer reaching for the bigger switch to
get a bigger target spends panel width and gets nothing.

**IT BITES THE LABELLESS FORM HARDEST, and that is the common one.** A toggle
with `__label-text` inherits a 52–60px label box from its own text, so it
happens to clear the minimum. A settings row that names the control in its own
heading — which is what `.rux--contained-list__header` and
`.sch-panel-section__head` do — gets the 21px box. The accessible name is fine
either way; the thumb target is not.

**Related, and already this app's position:** `sch.css` records the toolbar's
40px `size-md` as "still under iOS's 44 and Android's 48", and
`feat(schedule): Make the board usable on a phone` (`ea6d7e9`) moved the
control module to 48 below md for exactly this reason. The toggle is the same
question one component over.

**Not worked around locally.** `AGENTS.md` forbids `sch.css` carrying a rule on
a `rux--*` class at all, and a `sch-` class is not a way to restyle a Carbon
part. An interim override belongs in `rux-overrides.css` at Carbon's own
specificity, and that file is in the middle of another pass's responsive work,
so nothing has been written yet. The scheduler ships the 21px target today.

---

## Open — `date-picker.js` says a `hidden` input needs no CSS, and it does, 2026-09-11

**Asked for:** either a rule that lets `hidden` work on
`.rux--date-picker__input`, or a correction to the module header that says a
consumer must hide it themselves.

**Why:** `js/date-picker.js`'s header states, under "THE INPUT MAY BE `hidden`,
AND THAT NEEDS NO CSS — measured, not reasoned": *"Writing `hidden` on
`.rux--date-picker__input` computes `display: none` and a 0x0 box on the built
page."* That paragraph names this app as the consumer that asked for it.

**MEASURED HERE, AND IT IS THE OPPOSITE.** On the scheduler's week picker the
input carries the `hidden` attribute, computes **`display: block`** and boxes
at **288×40**. Enumerating every rule in every sheet that matches the element
and sets `display` returns exactly one: `.rux--date-picker__input
{ display: block }` in `css/rux.css` — a single class at **normal** priority.
An author declaration beats a UA declaration regardless of specificity, so the
UA's `[hidden]` never gets a say.

**The header's own correction note is also wrong.** It says the UA sheet
declares `[hidden] { display: none !important }` and that this is why the
CALENDAR container needs detaching. If that were so, an important UA
declaration would beat this normal author one and the input WOULD be hidden.
The detach design is still right for the other reason the note gives — React
mounts the container only while open — but the `!important` claim cannot
explain both behaviours at once.

**Worked around locally** in `rux-overrides.css`:
`#sch-week-picker .rux--date-picker-container { display: none }`, scoped by id
so the trip editor's visible date fields are untouched. A consumer that follows
the header literally gets 40px of empty row and a visible ISO date beside a
formatted one — which is the exact thing the header says the hidden input
exists to prevent.

---

## Withdrawn — the side panel's close button has no `lg` size, 2026-09-11,
withdrawn 2026-09-12

**Asked for:** a compiled `.rux--side-panel .rux--btn--lg.rux--side-panel__close-button`
at `3rem`, alongside the `--md` that already exists.

**Why it was asked:** Carbon compiles exactly two sizes for that control —
`.rux--side-panel .rux--btn.rux--side-panel__close-button` at 2rem
(`css/rux.css:24069`) and `.rux--side-panel .rux--btn--md.rux--side-panel__close-button`
at 2.5rem (`css/rux.css:24089`). There is no `lg`. Every other button in this
app was `rux--layout--size-lg`, 48px, so the panel's close was the one control
still at 40 — and `rux--btn--lg` could not be put in the markup instead,
because it is compiled nowhere in `rux.css` (0 occurrences against 6 for
`--md`), which `check.mjs` catches and `AGENTS.md` forbids. A local rule pinned
`3rem` at Carbon's own specificity as the interim.

**WHY IT IS WITHDRAWN: the app moved to 40 and the gap closed from the other
side.** rux asked for a 40px first row over a 32px second on 2026-09-12, so
every region head and every control in one came down to `size-md` — which is
exactly what `rux--btn--md` already compiles for this button. The local rule is
deleted, the markup states the size again like every other button, and there is
nothing left for an `lg` variant to fix.

**Nothing upstream was needed and nothing upstream changed.** Recorded as
withdrawn rather than deleted, because the measurement that produced it is
still true — Carbon really does compile no `lg` for this control — and the next
app that makes its heads 48 will find the same hole and should find this entry
rather than rediscover it.

---

## Open — a contained-list header action ignores the header's own padding, 2026-09-11

**Asked for:** `padding-inline` on `.rux--contained-list__action` matching the
header's own `--rux-layout-density-padding-inline-local`, so the header's
control ends where the header's label begins rather than at the band's border
edge.

**Why:** `.rux--contained-list__header` sets
`padding-inline: var(--rux-layout-density-padding-inline-local)`
(`css/rux.css:10556-10565`), and `__action` is `position: absolute` with
`inset-inline: 0` (`css/rux.css:10752-10760`) — absolute insets resolve
against the padding box's edges, not the content box, so the action lands
16px outside the text it is aligned with. The label starts at the content
edge; the button ends at the border edge. Same rule set as the row-action
entry below, and the same cause: the component positions its actions against
the box it pads.

**MEASURED IN THIS APP, and the consequence is worse than misalignment here.**
A `contained-list` in a 320px side panel is pulled out by the panel body's own
`spacing-05` so Carbon's 16px lands the header text on the same left as every
field (`.sch-panel-section--bleed`). That puts the band's border edge 16px
outside the panel, so the action is outside the panel too: the add button
measured **x 1036–1068 against a panel ending at 1052** — half of a 32px
control clipped, on the payments list as it shipped 2026-09-10 and on both
lists added 2026-09-11.

**What this app is doing meanwhile:** its own element inside the action slot
(`.sch-list-action` in `sch.css`) carries
`padding-inline-end: var(--rux-layout-density-padding-inline-local)` — the
same variable the header reads, so the two cannot drift, and no rule of ours
touches a `rux--*` class. That box also gives the slot a flex row with
`align-items: center`, which is what lets a 24px toggle and a 32px button
share the band; `__action` has no height of its own to centre anything in.
Both go away if the component pads and centres its own action.

**Not asked for:** a change to the absolute positioning itself. It is what
lets the action overlay a full-width label, and `__label` is
`inline-size: 100%` by design.

---

## Open — a contained-list row action never centres, 2026-09-10

**Asked for:** `inset-block: 0` and `align-items: center` on
`.rux--contained-list-item__action`, so the row's control sits in the middle
of the row rather than at one end of it.

**Why:** the rule is `position: absolute` with `inset-block-start: 0`, no
`inset-block-end` and no `align-items` (`css/rux.css:10752-10760`). The
action box is therefore as tall as its own content and pinned to the top, so
the row's height never reaches it. Any list whose rows are taller than its
action control shows the control off-centre.

**IT IS INVISIBLE AT `size-sm` AND ONLY THERE.** A 32px row holding a 32px
button has nowhere to be off-centre, which is why this survives: `size-sm` is
the common case. It appears the moment a list is sized up.

**MEASURED ON BOTH SERVED PAGES, including rux-ds's own sink:**

| page | list size | row | control | above | below |
|---|---|---|---|---|---|
| `/rux-scheduler/` Billing, payments | `md` | 44px | 32px icon button | **0** | 12 |
| `/rux-ds/sink/contained-list.html` | `lg` | 40px | 22px text button | **19** | 0 |

The sink's own `--on-page` list shows it too, at the opposite end of the row —
so the component's demo does not display the alignment the component implies,
and the direction of the error is not even stable between the two.

**What this app did meanwhile:** the two declarations above, in
`rux-overrides.css`, on the same one-class selector Carbon uses, so the
cascade settles it and no `!important` is involved. It should be deleted once
the component centres its own action. The header's action is left alone —
that band is 32px around a 32px button, so there is nothing to centre.

**Not asked for:** any change to `justify-content: flex-end` or to the
`pointer-events` pairing, both of which are correct as they stand.

---

## Open — `contained-list__label` has no typography, 2026-09-10

**Asked for:** a `font` declaration on `.rux--contained-list__label` — most
simply `font: inherit`, so the label takes the `__header` typography the
variant rules already set. Alternatively, change the sink's markup and say in
the docs which element the label must be.

**Why:** `.rux--contained-list__label` sets `inline-size: 100%` and nothing
else (`css/rux.css:10566`). The font is set one level up, on the header —
`--on-page` gives it `heading-compact-01` (`:10616`), `--disclosed` gives it
`label-01` (`:10635`). Neither reaches the text, because the label element's
own rule beats the inherited value. rux-ds ships a bare
`h3 { font-size: var(--rux-heading-04-font-size, 1.75rem) }`, so an `<h3>`
label renders at **28px** — and `sink/contained-list.html:26` uses exactly
that markup, so the component's own demo does not show the typography the
component defines.

**MEASURED ON BOTH SERVED PAGES.** Computed values, workspace server:

| page | element | computed | what the variant asks for |
|---|---|---|---|
| `/rux-scheduler/` Billing tab | `h3.rux--contained-list__label` | 28px / 400 | 14px / 600 |
| same, its `__header` | `.rux--contained-list__header` | 14px / 600 | 14px / 600 |
| `/rux-ds/sink/contained-list.html` | `h3` label, `--on-page` | 18.72px / 700 | 14px / 600 |
| same, its `__header` | `.rux--contained-list__header` | 16px / 400 | 14px / 600 |

The sink's own header at 16px/400 rather than 14px/600 is a second finding
inside the first, and not one this app can explain from outside.

**What this app did meanwhile:** used a `<div class="rux--contained-list__label"
role="heading" aria-level="3">` instead of an `<h3>`, which inherits correctly
and keeps the heading in the accessibility tree. That is a change of element in
app markup, not a rule on a `rux--*` class, so it stays inside `AGENTS.md`. It
should be reverted to an `<h3>` once the label carries its own font. At 28px
the heading matched the `big-number` value beside it and was 2.3x every other
section title on the tab, which is how it was noticed.

---

## Open — no icon in the sprite says "money", 2026-09-10

**Asked for:** four glyphs in `assets/icons.svg`, enough to tell payment
methods apart at 16px — a card, a bank, a note or coin, and a cheque. Carbon
ships `credit-card`, `bank`, `money`, `currency--dollar` and `receipt`; any
four of those would do. Or a ruling that payment methods are text-only, so
this app stops asking.

**Why:** the trip editor's Billing tab now records payments, each with a
method — Cash, Check, Card, ACH, Zelle, Other, the six rux-ui writes into
`trip_payments.method`. Carbon's `contained-list` has a `--with-icon`
variant built for exactly this shape, and rux asked for it by name after
seeing Carbon's own live demo of it.

**THE SPRITE HAS 63 SYMBOLS AND NONE OF THEM IS MONEY.** Counted, not
guessed: `grep -c '<symbol' assets/icons.svg` is 63, and a search across
their ids for `money|card|cash|bank|currency|wallet|receipt|payment|dollar`
returns nothing. The nearest things in it are `i-document`, `i-copy` and
`i-checkmark`, none of which mean a payment method — pressing one of those
into service would be a glyph that lies, which is worse than no glyph.

**WHAT THIS APP IS DOING MEANWHILE — updated 2026-09-10.** First the method
was a WORD in a coloured `rux--tag`: `Check · 09/10/2026 · $200 · deposit`.
That wrapped onto a second line in a 288px panel, which is the measurement
that moved it on. It is now a THREE-LETTER CODE in that tag — CSH, CHK, CRD,
ACH, ZLE, OTH — at rux's suggestion, sized like the glyph that will replace
it, with the full method name on the tag's `title` and in the row's
`aria-label` so the abbreviation is never the only name. Rows are a single
32px line at every method and reference length.

**THAT MAKES THE REQUEST STRONGER, NOT WEAKER,** and this entry said the
opposite before it was tested. It argued the word "needs no learning" where
an icon set does — true, but the word did not fit, and what fits is `CHK`,
which needs exactly as much learning as a cheque glyph and carries less
meaning at a glance. The panel width is fixed at 320px, measured from an
800px viewport to a 1500px one, so this does not come back at a larger
window. Weigh it as a legibility request now rather than a polish one.

**What it is not:** not a request for a status or badge icon, and not a
request to change `contained-list`. Only sprite entries.

---

## Open — no combo box that filters, 2026-09-09

**Asked for:** the filtering half of `rux--combo-box` in `js/list-box.js` -- a
text field that narrows a list as it is typed and reports the chosen row -- or
a statement that the combo box is select-only in this system, so a consumer
needing search knows to look elsewhere.

**Why:** the trip editor picks a booking contact out of **196 rows**, and
first names repeat, so the field has to search and has to show enough to tell
two people apart.

**THE MODULE SAYS SO ITSELF.** `js/list-box.js` lists among what is NOT
reimplemented: "multiselect selection itself, the selection-count tag, and
filtering", and closes with "NOT VERIFIED: the multiselect and combo-box
forms... a combo box has a text input and its own filtering, and nothing here
should be read as covering it." 38 rules of `rux--combo-box` are compiled, so
the CSS is there and the behaviour is not.

**What this app did in the meantime, and why it is not a workaround.** It uses
a native `<datalist>` on a `rux--text-input`. That is not a Carbon component
wearing the wrong behaviour -- it is the platform's own control, it filters and
announces itself with no script of ours, and the input is a Carbon text input
used exactly as intended. Writing the filtering over `rux--combo-box` markup
would have been implementing a component rux-ds owns, which `AGENTS.md` makes a
request rather than a local rule.

**What it costs, so the trade is on the record.** A datalist cannot carry a
value separate from its label, so the app builds one string per contact and
matches it back to find the id; and it cannot be styled, so the dropdown is the
browser's rather than Carbon's. Both are acceptable for one field and neither
would be for a form of them.

---

## Open — the date picker's input format is fixed to ISO, 2026-09-09

**Asked for:** let a consumer choose what the `--next` date picker DISPLAYS in
its input -- mm/dd/yyyy for a US product -- while the module keeps whatever
internal value it wants. Or say that ISO in the field is deliberate, so a
product wanting Carbon's own presentation knows not to expect it.

**Why:** rux compared this app against Carbon's `range-with-calendar` story,
where the inputs read `09/08/2026`, and asked for that format everywhere dates
appear. Everywhere this app renders a date ITSELF it now does. The picker's own
fields cannot follow.

**THE FORMAT IS HARD-CODED IN TWO DIRECTIONS.** `js/date-picker.js` reads with
`parse()`, whose regex is `^(\d{4})-(\d{2})-(\d{2})$` and which returns null
for anything else (`:184`). It writes with `pick()`, which assigns the ISO
`dateStr` straight into the field at four places (`:329`, `:338`, `:343`,
`:344`). So a field showing mm/dd/yyyy is a field the module cannot read: no
calendar position, no range arithmetic, and the first pick overwrites the
display anyway.

**LINE NUMBERS CORRECTED 2026-09-10, and the reason is a trap worth naming.**
This section first cited `:126` and `:257`–`:272`. Those are real lines with
exactly that code -- in `m/guided/vendor/rux-ds/js/date-picker.js`, the
VENDORED copy. The module a consumer actually loads is `js/date-picker.js` at
the repository root, where the same code sits at the numbers above; `:126`
there is a sentence in the header comment. Anyone opening the cited line in
the live file finds prose and concludes the report is stale. The claims were
never wrong, only the addresses.

**RE-VERIFIED 2026-09-10 against `js/date-picker.js`, and the read is wider
than "range arithmetic" made it sound.** The field's value is the module's
whole state, and it is parsed back in three more places than the pick path:

    :226   var view   = parse(inputs[0].value) || today
    :228   var cursor = parse(inputs[0].value) || today
    :232   inputs.map(function (i) { return parse(i.value); })

Which month the calendar OPENS on, where the keyboard cursor starts, and which
days draw as selected or in-range are all decided by re-reading the input. A
mm/dd/yyyy field does not degrade to "the display is right and the internals
lag" -- it opens on today's month with nothing highlighted, on a trip in
September.

**THERE IS NO HOOK TO USE INSTEAD.** No `data-rux-*` is consulted for a format
-- the only dataset read in the module is `ruxDate` on the day buttons.
`.rux--date-picker--short` is a WIDTH, `inline-size: 5.7rem` on the input
(`rux.css:14594`), not a format. And Carbon's own reference clearly separates
the two, since its story shows mm/dd/yyyy in the field while the component
still works.

**What this app did in the meantime.** Nothing to the picker. `mdy()` formats
the dates this app renders itself -- the Billing tab's payments list today --
and the picker's inputs are left in ISO rather than fought with. Writing a
display layer over a module that owns the field is the shape of workaround
`AGENTS.md` forbids.

**THE SURFACE GREW, 2026-09-10.** When this was filed the trip editor showed
two ISO fields. It shows four: `Drop-off start`/`end` and `Pick-up start`/`end`
on Details -- the return pair moved up beside the outbound one the same day --
plus `Date paid` on Billing. Every date a person can EDIT in this product is
now one the module owns and prints in ISO, while every date the product prints
itself is American. rux asked again on 2026-09-10 and was told no local fix
would be honest; this entry is what that answer rests on.

**THE LOCAL VERSION WAS COSTED, so the trade is on the record rather than
re-derived.** It is a hidden ISO input per picker for the module to own, a
visible mm/dd/yyyy text input for the person, two-way sync between them, and
`FIELDS` getters pointed at the hidden twin -- four fields' worth. That is two
places that must agree about one number, which `docs/log.md` records an
afternoon of under `fitPanelRoom`. Declined on that basis, not on effort.

**What it is not:** not a request to change the internal value, the calendar,
or who owns the input. Only what the person reads.

---

## Open — a toggle's words cannot be the product's, 2026-09-09

**Asked for:** let a consumer supply the two words `setToggle` writes, or say
that On/Off is deliberate and a product wanting other words should not use the
toggle.

**Why:** `js/form-controls.js` owns the toggle -- correctly, and this app hands
it the whole behaviour -- and `setToggle` hard-codes `text.textContent = on ?
'On' : 'Off'`. The Billing tab has three of them over columns whose values are
words already: `contract_status` is "Pending"/"Signed", `invoice_status` is
"Pending"/"Invoiced", both across all 751 rows. Rendering "Contract: On" says
less than the data does.

**THE FILE ALREADY RAISED THIS AGAINST ITSELF.** Its header calls the
hard-coding "worth a decision rather than a silent default", and objects in the
same breath to depending on a TRANSLATED STRING when reading `aria-label` --
"writing one is the same problem facing the other way". This is that decision
arriving with a consumer attached, not a new argument.

**What this app did in the meantime, and it is not a workaround to keep.** The
LABEL carries the meaning instead: "Contract signed", not "Contract", so On and
Off read correctly against it. That is honest and needs no override, but it
spends a word of the label on every toggle and cannot express a pair like
Invoiced/Pending where neither side is the absence of the other.

**What it is not:** not a request to change the markup, the event or who owns
the click -- all three are right and this app depends on them. Only the two
strings.

---

## Open — nothing compiles a size for header action icons, 2026-09-08

**Asked for:** a compiled size for the icon inside `.rux--header__action`, at
whatever value rux-ds judges correct. Not a change to what it looks like -- a
rule that holds it.

**Why:** rux asked for button icons to follow Carbon design-system-wide, and
every other button on this page could be made to. `.rux--btn .rux--btn__icon` is
1rem square unconditionally (`rux.css:3461`) and does not follow the button
size, so four toolbar buttons here just moved from carrying 16px in `width`/
`height` attributes to carrying `rux--btn__icon` and being governed. **The two
header actions are the one place that could not be done**, and the reason is a
gap rather than a disagreement.

**PARSED RULE BY RULE, CARBON SETS NO SIZE THERE.** Every rule in `rux.css`
whose selector names `header__action` together with `svg` or `icon` --
`:27249`, `:27254`, `:27270`, `:27284`, `:27288`, `:27292`, `:27299` -- sets
`fill`, `display` or `transform`. **Zero of them set `block-size`,
`inline-size`, `width` or `height`.** So an app's header action icon is whatever
size its own markup asserts, and two consumers following the same guidance can
disagree without either being wrong.

**WHY WE ARE NOT SOLVING IT LOCALLY, EITHER WAY.** Adding `rux--btn__icon` to
these two would take them to 16, and that is not obviously right: a header
action is a different component from a toolbar button, Carbon's own React ships
20px icons in `HeaderGlobalAction`, and its markup passes the icon as a bare
child with no `btn__icon` class -- which is exactly the shape here. So this app
keeps 20 and matches Carbon React. Writing a rule in `rux-overrides.css` to pin
it would be a local rule standing in for a missing rux-ds one, which `AGENTS.md`
forbids in as many words. Hence a request.

**What it is not:** not a claim that 20 is right and 16 wrong. If rux-ds
compiles 16 we will drop the attributes and follow; the ask is only that
something other than a consumer's markup decides.

---

## Open — `ui-shell.js` calls a shell state invented that the CSS ships three
rules for, 2026-09-08

**ANSWERED ON rux-ds `main` AT `a545cc1` ("docs(shell): Name both shells the CSS
supports"), IN NO TAG, told to us 2026-09-08 and verified in the clone.**
`js/ui-shell.js` now names both configurations and says the collapsible desktop
one is legitimate; the three compiled readings below are the documented doctrine
rather than a consumer's complaint. Their measurement, which ours did not make:
at 1440 with transitions off, `--ux` plus `--hidden` is 0, adding `--expanded`
gives 256 and removing it gives 0 -- so the nav does open at desktop, and the
old claim that `--expanded` changes nothing above the breakpoint holds only for
a nav without `--hidden`. **The capture half of this request is DECLINED, and
that is the useful half of the answer:** see `docs/gate-coverage.md`, where it
makes our 8px adjudication permanent rather than provisional. Stays open here
until a tag carries it and the pin moves.

**Asked for:** correct or qualify the comment in `js/ui-shell.js:7-11` — "A
template showing the button at desktop invents a state IBM's design does not
have" — or, if the state really is out of bounds, say what a consumer using the
rail shell should do instead. Either way, capture the shell with a permanent
toggle, so `check-spacing` has a reference for it.

**Why:** this app renders `--side-nav--ux --side-nav--hidden` with a
`__menu-toggle` that carries no `__hidden`, so the hamburger is visible at every
width. `check-spacing` therefore reports `rux--header__name` at 8px of inline
start where the capture has 16, on both pages, in every sweep since the first.
It is adjudicated in `docs/gate-coverage.md` as Carbon-caused and not a defect,
and it has to be re-adjudicated each time because the comment above says the
configuration causing it is not a real one. Re-arguing a settled thing is what
this file exists to stop.

**THE COMMENT IS CONTRADICTED BY THREE SEPARATE PIECES OF COMPILED CSS**, all in
`css/rux.css` at v0.1.11 and none of them ours to change.

**One — `__hidden` is markup-applied, not automatic.**
`.rux--header__menu-toggle__hidden { display: none }` exists only inside
`@media (min-width: 66rem)` (`rux.css:27317`). Nothing in the stylesheet adds
that class. "Carbon hides it above 66rem" is therefore true only of a page that
writes the class in, and is a statement about the consumer's markup rather than
about the design.

**Two — the spacing rule cannot mean what a responsive-only hamburger would need
it to mean.** `.rux--header__menu-toggle:not(.__hidden) ~ .rux--header__name`
(`rux.css:27364`) carries no media query. In a page that writes `__hidden`, the
class is present at EVERY width, so below 66rem — where that toggle is on screen
— the selector does not match and the name keeps its 16px. The one case a
"space the name while the button is beside it" rule would exist for is exactly
the case it misses. The only configuration it ever fires in is a toggle with no
`__hidden`: a permanent one.

**Three — the cascade order of the nav's own classes only pays off at desktop.**
`.rux--side-nav--hidden { inline-size: 0 }` (`:27657`) is declared AFTER
`--side-nav--ux`'s `16rem` (`:27643`) at equal specificity, so it wins; and
`--side-nav--expanded { 16rem }` (`:27661`) is declared after `--hidden`, so it
wins over that. Below 66rem `--ux` is already 0 and `--hidden` changes nothing,
so that ordering does no work at all except above 66rem — where its only use is
letting a consumer collapse and reopen a nav at desktop.

**What this is not.** Not a request to change any of those rules: they are
right, and this app depends on all three. Not a request to make the rail shell
the default, and not a claim that the persistent shell is wrong. The ask is only
that the doctrine and the stylesheet agree, and that whichever way it is settled
is written down once.

**If the comment stands and the state is declined:** this app needs to be told
what to render instead, because the alternative shipped in the pin — `--ux`
persistent at 16rem above 66rem — is a permanent 256px column on a page whose
whole argument is horizontal room for a week. See `docs/log.md` 2026-09-08: at
1440 the board is already 323px short of a week with both companions open.


## Open — `check-behaviour` cannot see a consumer app, 2026-09-08

**ANSWERED ON rux-ds `main` AT `0527a30` ("feat(gates): Scope check-behaviour to
the document"), IN NO TAG, verified in the clone.** Each case scopes to its sink
section where one exists and to the document where it does not; an absent
component is SKIPPED rather than failed, and a present root with a broken
contract still FAILS, so it retires no contract. It found a real defect on their
side before it was applied -- eleven templates carried an invented
`aria-label="Toggle navigation"` that silently disabled the name swap, fixed at
`2677d7d`. **Checked here: we are clean.** `index.html:219` carries
`aria-label="Open menu"`, the recognised pair, and driven live the label, the
glyph and `aria-expanded` all move together. Stays open until a tag carries it.

**Asked for:** scope the fixtures in `tools/check-behaviour.js` to the document
rather than to kitchen-sink section ids, or let the section id be optional.

**Why:** run against this app it reports 4 passed of 18 on both pages, and the
other 14 all say `no X on this page`. That message is not true. `index.html`
has a working shell and a two-tab tablist; the gate looks for
`#ui-shell .rux--header__menu-trigger` (`tools/check-behaviour.js:247`) and
`#tabs [role="tablist"]` (`:120`), and no consumer page carries a sink section
id. The gate is therefore unusable by consumers for 14 of its 18 cases, and it
reports that as failure rather than as absence — which reads, in a ledger, like
14 broken behaviours.

**Measured 2026-09-08 at `52efa52`, by hand, because the gate could not.** The
shell it calls absent takes the nav 0 → 256 → 0 across two clicks of the
trigger, swaps the glyph `#i-menu` → `#i-close` → `#i-menu`, sets `aria-label`
to "Close menu" while open, and sets `side-nav--expanded`. The tablist it calls
"fewer than two tabs" has two, with roving `tabindex` 0 / -1 and `aria-selected`
true / false. Both are exactly what the gate would have asserted.

**What already survives the move, and is worth keeping.** The four passing cases
are `profile` (a theme radio moves `data-theme` and stores it; a typed name is
stored) and `theme` (`apply()` puts the stored theme on `<html>`, and refuses a
value that is not a theme name). Those test module APIs rather than sink markup,
which is why they are the ones that work here.

**Not asked for:** a headless runner. Roadmap §4.8 settled that, and this is a
selector change.


## Open — two group icons for the sprite, 2026-09-07

**HALF LANDED, HALF DECLINED, on `main` at `c869d7f`, in no tag.**
`#i-user--multiple` is in `assets/icons.svg`; `#i-events` is not and will not be.
Verified in the clone: `user--multiple` 1, `events` 0.

**THE DECLINE IS REASONED AND WE ARE NOT RE-ASKING.** Judged from a
nearest-neighbour magnification of each glyph rasterised at its real device size
rather than from a screenshot -- a browser pane downscaling a 1280 viewport by
0.625 destroys exactly the detail in question, and at that scale both look fine.
At 16 device px `events` merges the front figure's head and shoulders into one
smear while the two behind stay rings. At 32 all three are legible, so a
2x-display-only reading would have admitted it; it was declined on the 1x
reading. `events--alt` was tried unasked and is worse than either. Written up in
rux-ds's `docs/log.md` ("the scheduler's sprite ask, answered by rasterising
rather than by reasoning"), in the comment above `user--multiple` in
`tools/icons.mjs`, and in `c869d7f` itself.

**WHAT IT LEAVES US.** This request asked for a pair because a toolbar button
renders its icon at 16px. With one glyph the `Drivers` toggle either goes
icon-only on `user--multiple` alone or stays text. That is a decision here and
not a request there -- rux-ds has agreed it is ours.

**Asked for:** `events` and `user--multiple`, added to
`assets/icons.svg` as `#i-events` and `#i-user--multiple`.

**Why:** the schedule toolbar's `Drivers` control is a text button. It toggles
the driver availability grid, sits beside a primary `New trip` button, and is
the only text button in a toolbar Carbon draws as icons. Carbon's own small
table toolbar — the spec rux worked from — is icon buttons flush against the
primary action, so the text button is the one thing in that row not following
the pattern.

**Why not an icon already in the sprite.** There is exactly one person in the
62: `user--avatar`, a single figure in a circle. `index.html:258` already uses
it for the shell's **Account** button, roughly 200px above the toolbar. The same
glyph in one header meaning both "your account" and "the driver roster" is worse
than the text button it would replace.

**Both, not one, and the reason is a measurement.** Carbon ships 2592 icons at
32 and only 68 at 16. The 68 are the chrome that appears small constantly —
chevrons, arrows, close, menu, search, settings, `user`, `user--avatar`. Neither
`events` nor `user--multiple` is among them, and nor is any multi-person glyph,
which reads as Carbon's own judgement that a group does not survive being
shrunk. A toolbar button renders its icon at 16px
(`.rux--btn .rux--btn__icon` is `1rem` square), so both would be 32-unit
drawings displayed at half size.

`events` is three overlapping figures; `user--multiple` is two. Three may go
muddy at 16 where two holds. That is a judgement to make by LOOKING, not from
the source, which is why the ask is for both — put them on the sink at 16px side
by side and keep whichever reads. Scaling itself is normal here: 33 of the
sprite's 62 icons are 32-unit drawings already rendered at 16 or 20.

**If neither survives:** no change. The text button works, and it is a better
answer than an unreadable glyph. This request costs nothing if it is declined
on the evidence.

**Not asked for:** a 16px redraw. Carbon has not drawn one and inventing one
here would be inventing markup, which `AGENTS.md` forbids in both repositories.

---

## Open — a date picker whose trigger is not its own input, 2026-09-07

**ANSWERED ON rux-ds `main` AT `89e14fd` ("feat(date-picker): Let a page own the
trigger"), IN NO TAG, verified in the clone.** This unblocks
`screen-inventory.md` §7 -- jumping to a date is the week LABEL's job -- which
has been undecidable rather than merely unbuilt. Nothing is built here yet: the
pin is on v0.1.11 and the work sits 42 commits past it on `main`. Stays open
until a tag carries it and the pin moves.

**Asked for:** a `--next` date picker that can be opened from an element the
consuming page supplies, or a variant with no visible input -- an icon-only
trigger whose value is read rather than shown.

**Why:** `screen-inventory.md` section 7 decided that jumping to a date is the
week LABEL's job -- "a permanent mini calendar spends standing space on an
occasional action" -- and that decision cannot be built. Paging is one week a
click, so a month away is eight of them.

**What the contract says, and it is not a gap in the module.**
`js/date-picker.js` is explicit: a `.rux--date-picker--next` containing a
`.rux--date-picker__calendar-container` is claimed on load, and "the trigger is
`.rux--date-picker__icon` inside the same root, so the markup already relates
them". That rule is the right one -- it is the same rule menu.js settled, and
it is why a picker needs no `data-rux-*`. The shape simply has no room for a
trigger the page owns.

**The three ways round it, and why each is barred here.** Putting
`rux--date-picker__icon` on this app's own label is a Carbon class repurposed
on an app element. Hiding the picker's input needs a rule on a Carbon part from
an app stylesheet, which `AGENTS.md` forbids in both repositories. Showing the
input leaves a toolbar reading "Sep 7 - 13, 2026" beside a `2026-09-07` field --
two date displays of one week -- or replaces the range readout, which is the
most-read thing in that row.

**What it is not:** a request to portal the calendar, or to change the keyboard
model. Only where the open command may come from.

**Nothing is built here in the meantime.** A date picker in the shape the
component allows would be shipped knowing it is the wrong one, and reverting it
later costs more than the eight clicks.

---

## Settled

### Four dark themes wearing white's tag colours — v0.1.21, 2026-09-10

**SETTLED BY rux-ds v0.1.21, WHICH IS LIVE.** The work is `4814f15`
("feat(theme): Add dark tag tokens to four themes"); v0.1.20 first carried
it and v0.1.21 is what is deployed at `/rux-ds/` now. This paragraph said
"IN NO TAG" when it was written a few hours earlier, which was true then and
is left visible here rather than quietly rewritten.

All 62 values are in each of the four blocks. Carbon ships only two sets
for these families — white and g10 identical for all 62, g90 and g100 for
58 — so the ask was transcription, as this entry guessed,
and the four values that are not copied are the notification surfaces, which
take each theme's own `layer-01`: geist #0a0a0a, linear #141419, ant-dark
#141414, spotify #181818.

**MEASURED ON `/rux-scheduler/` ON THE WORKSPACE SERVER, ON THE TWO GRIDS
THIS ENTRY WAS FILED FOR.** A `.sch-bar--blue` computes `#0043ce` with
`#d0e2ff` text under geist, linear, ant-dark and spotify — byte-identical to
g90 and g100, where before all four read white's `#d0e2ff` on `#0043ce`. The
availability grid follows: 51 `--busy` cells blue and 5 `--off` cells
`#a2191f`, all dark in all four. White is unmoved, still light on both grids.

**ONE CLAIM ABOVE IS WRONG AND IS LEFT STANDING BELOW RATHER THAN EDITED.**
This entry counted `status-*` at 7. It is 9, so the per-block total is 62 and
not 60. Nothing else in the report was off, and the `syntax-*`/`ai-*`
exclusion was read correctly — rux-ds left both deferred.

**WHAT IS NOT COVERED, said there and repeated here.** The three
`content-switcher-*` values are transcribed but exercised by nothing: they
only reach the `--low-contrast` variant, and no such switcher exists on
rux-ds's sink or on any page here. Nobody has looked at one.

**CLOSED ON THE LIVE SITE, NOT ON THE COMMIT.** There was no pin to move
(`AGENTS.md`, "Which rux-ds this app is on"), so this needed the deploy
rather than a tag alone. Cutting the tag IS rux-ds's roll-out, and its pages
workflow published v0.1.21 on 2026-09-10. Read back at
`https://rux-sm.github.io/rux-scheduler/`: the served
`/rux-ds/css/rux-theme.css` carries the tag values in all four dark blocks,
and with the theme set to spotify a `.sch-bar--blue` on the real board
computes `rgb(0, 67, 206)` with `rgb(208, 226, 255)` text on an
`rgb(18, 18, 18)` page — the same pair g100 draws, where before all four
themes drew white's inversion of it. 22 bars rendered, looked at, not only
measured.

**Asked for:** `tag-*`, `notification-*`, `status-*` and `content-switcher-*`
values inside the four theme blocks `css/rux-theme.css` added on 2026-09-10 —
`[data-theme="geist"]`, `[data-theme="linear"]`, `[data-theme="ant-dark"]`
and `[data-theme="spotify"]`. Or a statement that these families are deferred
in those themes the way `syntax-*` and `ai-*` already are, so a consumer knows
the light values are a decision and not an omission.

**Why:** every trip bar on the board takes its fill from Carbon's tag palette
(`sch.css:546`, ten hue classes from `:590`), and so do the busy and off cells
of the driver-availability grid (`:1234`, `:1238`) — deliberately, so the two
grids read as one system. All four of the new themes are dark. All four render
those bars pale-blue-on-black.

**MEASURED ON THE SERVED PAGE, NOT REASONED FROM THE SOURCE.** Computed values
of `<html>` under each theme, at `/rux-scheduler/` on the workspace server:

| theme | `--rux-tag-background-blue` | `--rux-tag-color-blue` |
|---|---|---|
| white | `#d0e2ff` | `#0043ce` |
| g100 | `#0043ce` | `#d0e2ff` |
| geist, linear, ant-dark, spotify | `#d0e2ff` | `#0043ce` |

The four are byte-identical to white. Each block defines 141 tokens and not one
of them is a `tag-*`; custom properties inherit, so all 40 fall through to
white's compiled `:root`.

**IT IS CARBON'S OWN TAG THAT IS WRONG, NOT THIS APP'S BAR.** Worth stating
because the first guess was that `sch-` components are the problem — an app
element that themes were never built to account for. They are not. A bare
`<div class="rux--tag rux--tag--blue">` injected into the page computes to the
same `rgb(208, 226, 255)` on `rgb(0, 0, 0)` under geist and spotify. `sch.css`
is reading the token it is supposed to read; the token behind it is light.

**FOUR FAMILIES, 60 TOKENS, AND NONE OF IT IS THIS APP'S TO INVENT.** Diffing
g100's values against `:root` for names the four blocks never mention: `tag-`
40, `notification-` 10, `status-` 7, `content-switcher-` 3. `syntax-` 88 and
`ai-` 19 are in the same position but are **not** part of this request —
`css/rux-theme.css`'s own header already records those two as deliberately
deferred, and a request that swept them in would be asking to reopen a decision
rux-ds made on purpose.

**THE VALUES LOOK DETERMINED RATHER THAN CHOSEN, which is why this is worth
asking for rather than living with.** Carbon appears to ship only two sets:
g90 and g100 are identical for all 40 `tag-*`, all 7 `status-*` and all 3
`content-switcher-*`, and white and g10 are identical to each other. Six of the
ten `notification-*` match across g90/g100 too; the four that differ are each
theme's own `layer-01`, which all four blocks already define. So the ask is
mostly transcription, not a palette design — measured here, and stated as what
it looked like from this side rather than as a finding rux-ds has to accept.

**WHAT THIS APP IS DOING MEANWHILE: nothing, and that is the point.** A
`[data-theme="geist"]` block in this repository's own `rux-theme.css` would
mean inventing ten hue ramps for a theme this app does not own, for four
themes, and it would still leave Carbon's own tags, notifications and
indicators light-on-black everywhere else on the shared origin. `AGENTS.md`:
everything under `/rux-ds/` is rux-ds's, and a missing rule is a request with
invented content, never a local rule. The bars stay wrong in those four themes
until this lands; g90, g100, white and g10 are unaffected, and the app opens in
g90.

**What it is not:** not a request to change `rux--tag`, `rux--notification` or
either indicator — no component rule is wanted, only token values. Not a
request for `syntax-*` or `ai-*`. Not a request for a fifth theme, or for
anything about the four palettes' own core tokens, which are complete.

