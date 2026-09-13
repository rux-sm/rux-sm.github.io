# Screen-reader pass — the last thing blocking §4.5

`tools/check-a11y.js` reads attributes. This reads what a person hears. They are not
the same check and nothing automated substitutes: §4.5's exit is "keyboard and
screen-reader passes on every interactive component", the keyboard half ran on
2026-08-28, and this is the other half.

**The keyboard half has since grown, so four things are settled and finding one again
is not a finding.** Tab ORDER was swept end to end on 2026-08-30 — forward and reverse,
all seven pages, 0 divergence from DOM order. Arrow keys inside composites were swept
the same day: tablist arrows rove, select and skip the disabled tab, a vertical list
declines the horizontal arrows, radio arrows move and check, menu arrows rove and
Escape restores focus to the trigger. Focus rings were measured on 164 controls in both
themes on 2026-08-28. `check-a11y` reports 0 findings on seven of the eight pages.

Budget 45-60 minutes. Rushing produces a green tick that means nothing, which is the
failure this repository keeps a gate ledger to avoid.

**Fill in the "heard" column as you go.** A blank row is not a pass. Record what was
actually said, not whether it seemed fine — the wording is the finding.

## Setup

1. `npm run serve`, open <http://localhost:8642> in **Safari**. VoiceOver and Safari
   are the pairing Apple tests; Chrome differs enough to produce findings that are
   Chrome's, not ours.
2. Start VoiceOver with **⌘F5**. Turn it off the same way.
3. The window must have real focus — the same condition `check-a11y.js` refuses to run
   without. Click the page once before starting.

Keys, which is all you need:

|                      |                                                       |
|----------------------|-------------------------------------------------------|
| `VO`                 | Control + Option, held together                       |
| `VO` + A             | read continuously from here                           |
| `VO` + → / ←         | move through everything, including text               |
| Tab / Shift-Tab      | move between focusable controls only                  |
| `VO` + Space         | activate the thing VoiceOver is on                    |
| `VO` + U             | rotor — headings, links, form controls; Escape closes |
| `VO` + Shift + ↓ / ↑ | step into / out of a group (tables, toolbars)         |
| Control              | stop it talking, without turning it off               |

## What a pass sounds like

Three things per control, and a missing one is a finding: **role**, **name**, and
**state**. "Submit, button" is a pass. "Button" alone is not — no name. "Overview,
selected, tab, 1 of 4" is a pass; "Overview" alone means the tab role never reached
the AT.

State must be announced when it CHANGES, not only on first landing. An accordion that
says "collapsed" on arrival and stays silent when you open it has failed the row even
though the attribute is correct — that is exactly the gap `check-a11y` cannot see.

## Two things that are NOT bugs

**Six deliberate specimens**, already reported as notes rather than findings by
`check-a11y`: four `menu` density demos (3, 2, 2, 2 items), `overflow-menu`'s open
options list (2), and `list-box`'s expanded menu (3). They have no trigger and no tab
stop because what they demonstrate is the CSS.

**One known false positive.** `progress-indicator`'s step button reports "no visible
focus change" because Carbon draws that ring on `:focus-visible` on the LABEL and sets
`outline: none` on plain `:focus`. Adjudicated 2026-08-29, re-confirmed 2026-08-30.

## Start here — four things to check first

These came out of preparing for the pass on 2026-08-30 by reading what the page
declares. Each is specific, and **none can be reached with Tab**, which is why no sweep
so far has caught them. Do these before the table; if one is real it is worth knowing
early.

**1. ~~Four buttons in `tabs` with no accessible name.~~ WITHDRAWN 2026-08-30 — my
error, and it cost four recordings.** All four carry `aria-label="Close tab"`
(`sink/tabs.html:69, 77, 85, 93`). The claim came from a browser query that printed the
PARENT's `aria-label` and the button's `textContent` and never read the button's own
`aria-label` — a check that could not have found the name it was looking for. The
structure is Carbon's as well: `div.cds--tabs__nav-item--close--hidden` holding
`button.cds--visually-hidden.cds--tabs__nav-item--close-icon--selected` is attested in
fourteen tab stories.

**Kept rather than deleted, because the failure mode is the lesson.** Three passes were
recorded hunting this, each missing it for a different real reason — Tab cannot reach a
`tabindex="-1"` element, and arrow keys inside a tablist visit `[role="tab"]` only — and
all three reasons were true and none of them mattered, because there was nothing to
find. A prediction drawn from a query is worth no more than the query.

**2. Eleven live regions in `notification`,** 6 `role="alert"` and 5 `role="status"`,
all present at load. See the known-awkward note below before filing anything.

**3. Eight hidden strings reading "Beginning of notification" / "End of notification".**
Four pairs, for readers only. Confirm they are announced AND that they land either side
of the content rather than mid-sentence.

**4. `pagination` carries the hidden string "Page of 9 pages"** — the current number is
meant to come from the `<select>` between those words. If you hear "Page, of 9 pages"
with nothing in the gap, the label is broken for readers and invisible to everyone else.

## The pass

Twelve modules own the interactive set. Sections not listed here are static specimens.

| #  | Section       | Do this                   | Should hear                                              | Heard                                                                                                                                                                             |
|----|---------------|---------------------------|----------------------------------------------------------|-----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------|
| 1  | buttons       | Tab across                | name + "button"; disabled says "dimmed"                  | "Primary, button" … disabled: "on a button. This item is dimmed." PASS                                                                                                            |
| 2  | links         | Tab across                | name + "link"                                            | TAB PASS: "Default link" — still no "link" role heard. Open.                                                                                                                      |
| 3  | text-input    | Tab in, type              | label + "edit text"; invalid reads its error             | labels/helpers each read separately; field itself only "on a text field". Name not heard — re-do with Tab.                                                                        |
| 4  | textarea      | Tab in                    | label + "edit text, multiline"                           | "on a text area."; "Character count" announced with NO number                                                                                                                     |
| 5  | select        | Tab in, ↓                 | label + "pop up button", option on change                | "on a pop up button" x5, no name heard. Markup HAS label for= on all five, so re-do with Tab before filing.                                                                       |
| 6  | checkbox      | Tab, Space                | name + "checkbox" + state ON TOGGLE                      | "Unchecked, unchecked, checkbox"; "Indeterminate, MIXED, checkbox"; "Required, INVALID DATA unchecked, checkbox" PASS. Disabled ones not landed on.                               |
| 7  | radio         | Tab, ↓                    | "radio button, N of M" + group name                      | "radio button, 2 of 3"; "3 of 3. This item is dimmed." Position + dimmed both PASS                                                                                                |
| 8  | toggle        | Tab, Space                | "switch" not "checkbox", + state on flip                 | **"On On, on, switch" — NAME DOUBLED.** FIXED 2026-08-31, finding 1                                                                                                                             |
| 9  | search        | Type, then clear          | field name; clear button has its own name                | "Search records Search..., search text field, search" PASS                                                                                                                        |
| 10 | number        | Tab, ↑↓                   | "spin button" + value on each step                       | ......                                                                                                                                                                            |
| 11 | tile          | Tab, Space                | clickable = link/button; selectable = checked            | "Cluster status ... button"; selectable tiles read as checkbox PASS                                                                                                               |
| 12 | notification  | —                         | announced without moving focus? (live region)            | "Error, and 2 more items, ALERT, Close, button"; "Upload failed, and 3 more items, alert" — role announced. 11 close buttons all say only "Close, button". See finding 4          |
| 13 | tabs          | Tab in, ←→, then `VO`+→   | "tab, selected, N of M"; panel on change; + prediction 1 | "Overview, selected, tab, 1 OF 4, Tabs example, tab group"; "main, Overview, tab panel"; "Close Report A, button". PASS. Prediction 1 NOT answered — Tab cannot reach those four. |
| 14 | table         | `VO`+Shift+↓, arrow cells | column AND row header per cell; sort on headers          | "Select all rows, MIXED, checkbox, table, 4 columns, 3 rows"; "Collapse row, expanded, button". Headers say only "Service, button" — NO SORT STATE. See finding 3                 |
| 15 | dropdown      | Tab, Enter, ↓             | "combo box", "expanded", option + position               | "Option A, Choose an option, list box pop up collapsed, COMBO BOX"; "invalid data"; "Read-only, dimmed" PASS                                                                      |
| 16 | list-box      | same                      | same                                                     | ......                                                                                                                                                                            |
| 17 | modal         | Open it                   | dialog + title on open; focus inside; page behind silent | not reached on this pass                                                                                                                                                          |
| 18 | popover       | Open it                   | content read on open, not before                         | not reached on this pass                                                                                                                                                          |
| 19 | tooltip       | Focus trigger             | description reaches you without moving focus             | "Defined term, collapsed, button" PASS                                                                                                                                            |
| 20 | menu          | Open, arrow               | "menu", item + position, submenu state                   | "Open menu, menu pop up, button"; "More actions, OPEN, menu pop up, button" PASS                                                                                                  |
| 21 | overflow-menu | same                      | trigger has a name that is not just "button"             | "More actions, menu pop up, button" PASS                                                                                                                                          |
| 22 | accordion     | Tab, Enter                | "expanded"/"collapsed" ON TOGGLE, not just arrival       | "Expanded section, EXPANDED, button"; "Collapsed section, collapsed, button" PASS                                                                                                 |
| 23 | pagination    | Tab across                | page field, prev/next names, range; + prediction 4       | "10, Items per page:, pop up button"; "1 , Page of 9 pages, pop up button" — prediction 4 CLEARED, the number is there                                                            |
| 24 | ui-shell      | Tab from the top          | skip link FIRST; hamburger state; nav as a list          | "Close menu, expanded, button"; "Documents, expanded, button, LIST 4 ITEMS"; "Reports, collapsed, button" PASS — and see finding 5                                                |

**Row 6** — five of the checkboxes carry `aria-disabled`; each must say so.
**Row 8** — all six toggles are `role="switch"`, so "switch" is right and "checkbox" is
a finding.

## Two rows that are known-awkward before you start

**12 · notification.** A notification that is in the DOM at load is not announced —
live regions only fire on change. If nothing is heard, that is expected here and not a
finding; the real question is whether one added later would announce, which this sink
cannot demonstrate. Record what you hear and leave it.

**17 · modal.** The page behind must go silent. If you can `VO`+→ out of the dialog
into the sink's sections, `aria-hidden`/`inert` is not doing its job — that is a
genuine finding and a common one.

## Recording

Findings go in this file, under the table, one per line: section, what was said, what
should have been. Then §4.5 can close with the same evidence trail the keyboard half
has — a date, a tool, a number.

**Pass run:** 2026-08-30 · **VoiceOver** on macOS · **Safari** · white theme ·
`VO`+→ walk, screen-recorded with the caption panel on and transcribed from the frames
(244 announcements, 4m48s). Recording kept at `.brand/screen-reader-pass-2026-08-30.mov`,
which is gitignored.

**Two passes, both screen-recorded with the caption panel on and transcribed from the
frames.** Recordings are in `.brand/`, which is gitignored.

1. **`VO`+→ walk**, 244 announcements, 4m48s — `screen-reader-pass-2026-08-30.mov`.
   Covered rows 1-8 and stopped at `search`.
2. **Tab pass**, 244 announcements, 3m25s — `tab-pass-2026-08-30.mov`. Covered the
   whole tab cycle, which is rows 1-24 except modal and popover, since neither opens
   from a Tab stop alone.

4. **Second tabs pass plus progress re-check**, 133 announcements, 2m23s —
   `tabs-vo-pass2-2026-08-30.mov`. **The progress fix is confirmed by ear**: "First step
   Complete, button", "Second step Optional Current, button", "Third step Not started,
   button" — no "dimmed" on any of them — while "Disabled step Disabled, **dimmed**,
   button" still says it. That is a red-to-green on a defect found by listening, which
   is the first this project has.

3. **Arrow-key pass over `tabs`**, 103 announcements, 2m20s —
   `tabs-vo-pass-2026-08-30.mov`. Every tablist answered: "Details, tab, 2 of 4",
   "Disabled, **dimmed**, tab, 4 of 4", selection following focus, and each list naming
   its group — "Vertical tabs, tab group", "Icon tabs, tab group". Table cell navigation
   works too: "gateway, cell", "Service, button" inside the cell.

**ALL FOUR PREDICTIONS ARE NOW CLOSED** — three cleared by listening, and the first
withdrawn as my own error. Tabs themselves came back clean on every pass: position,
selected state, group name, panel, and "Disabled, dimmed, tab, 4 of 4".

### Findings

**1 · toggle announced its name twice — FIXED 2026-08-31.** Heard: "On On, on, switch" and "Off Off, off,
switch". `sink/toggle.html` puts `aria-labelledby` on the switch pointing at the whole
`<label>`, and that label holds BOTH `toggle__label-text` ("On") and the state span
`toggle__text` ("On"), so the accessible name computes to both. The reader hears the word
three times: name, name again, then the switch state.

**Settled 2026-08-31 by the re-capture, and it was ours.** Carbon renders

    span.cds--toggle__text{aria-hidden=true}

— it hides the state span from the accessibility tree, and that is what stops its own
`aria-labelledby` doubling the name. The label still holds both spans; only one of them
is readable. Ours had no `aria-hidden`, so both counted. Four spans in `sink/toggle.html`
now carry it, and the fragment records why so it is not stripped later as noise.

**This one finding is the whole case for the re-capture.** It was heard on 2026-08-30 and
could not be attributed that day, because the extractor recorded four aria attributes and
`aria-labelledby` was not one of them — the capture's silence meant nothing. Widening
that list to thirteen and re-capturing at Carbon 1.115.0 answered it in a single line of
reference data.

**2 · textarea's character count has no number.** Heard "Character count" alone. The
visually-hidden string carries the label and nothing else; whether the count reaches a
reader was not established.

**3 · every unclickable progress step announces as "dimmed".** Heard "First step
Complete, dimmed, button", "Signing Current, dimmed, button", "Configuration Current,
dimmed, button" — eight of the nine steps, including ones that are merely complete or
current rather than unavailable.

`sink/progress-indicator.html` put `aria-disabled="true"` on every unclickable button.
**Carbon puts it on exactly one.** `components-progressindicator--default` renders five
unclickable buttons; four are bare and the fifth — the step that also carries
`--progress-step--disabled` — is the only one with the attribute. Unclickable is not
disabled, and a reader was being told the whole indicator was unavailable.

**FIXED 2026-08-30**: stripped from the seven steps that are merely complete, current or
incomplete; kept on the one that is genuinely `--disabled`.

**Two wrong readings on the way to this, both recorded because the method is the
lesson.** The first check sliced the first eight lines of each story and printed only
distinct values, saw the bare form, and concluded Carbon never sets it. The second found
`{aria-disabled=true}` in the capture and concluded the opposite — that ours was correct
and the finding was mine to withdraw. Only reading every `progress-step-button` line
against its own `<li>` settled it. The fragment's own note asserted the wrong rule too,
and is corrected in place.

**4 · eleven notification close buttons are all called "Close".** Heard "Close, button"
eleven times with nothing naming which notification each one dismisses. Not obviously
ours — Carbon may do the same — but a reader moving by Tab cannot tell them apart.

**5 · the side-nav submenu fix is confirmed by ear.** Heard "Documents, expanded,
button, **list 4 items**". Before `643a20e` removed the invented `role="menu"` it would
have been a menu containing no menu items. First time this project has verified a fix by
listening to it.

**6 · sortable column headers announce no sort state.** Heard "Service, button" and
"Status, button" while the table carries `aria-sort` on two columns. `aria-sort` sits on
the `<th>`, not on the button inside it, so a Tab pass never hears it. Whether table
navigation (`VO`+Shift+↓) announces it was not tested.

### Cleared on this pass, each heard rather than assumed

- **Disabled buttons ARE announced** — "You are currently on a button. This item is
  dimmed." on all three plus the ghost link. Tab skips them because a `disabled` button is
  out of the tab order and an `<a>` with no `href` is not focusable; that is correct, and
  row 1 used to say "Tab across" while asking for something only `VO`+→ can deliver.
- **Checkboxes** announce mixed and invalid states: "Indeterminate, mixed, checkbox",
  "Required, invalid data unchecked, checkbox".
- **Radios** announce position and dimmed: "2 of 3", "3 of 3. This item is dimmed."
- **Toggles are switches**, not checkboxes — row 8's expectation was right.
- **Selects are labelled.** The captions looked nameless, but all five carry
  `<label for>`; the gap was an artefact of de-duplicating frames, not a defect.
