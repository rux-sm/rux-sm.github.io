# Log

Every dated pass and answered decision, newest first. `AGENTS.md` is the
policy; `docs/backend-inventory.md` and `docs/screen-inventory.md` are the
two inventories the rebuild starts from.

**2026-09-11 (seventh pass) - the No bus head takes its own track's colour, and
the divider between them pays for it.** rux: "let make the No bus header match
the track color."

**THIS CELL HAS NOW BEEN BOTH, so both arguments are kept.** It was
`--rux-layer-hover-01`, the track's tint; it was changed to `--rux-layer` on the
grounds that the sticky bus column should read as one strip and this was "the
one cell in the sticky column that is not the column's colour", with the row
already told apart by its italic label and its track. That argument is about the
COLUMN. What overrules it is that the ROW is the unit being read here: Unassigned
is not a bus, its track is tinted precisely to say so, and leaving the head on
the frame's surface split that one row into two colours across the very divider
a reader crosses to ask which row this is. The column loses its single colour in
exactly one row, and it is the row that is not a bus.

**AND THE DIVIDER GOES NEARLY INVISIBLE ON THAT ROW IN ONE THEME, which is the
cost and is measured rather than left to be found.** The head's
`border-inline-end` is `border-subtle-01`, and matching the head to the track
puts the same colour on both sides of it. Contrast of the rule against the
surface it now sits on, all nine themes, rule-on-No-bus against
rule-on-a-normal-row:

    white 1.39 / 1.55    g10 1.08 / 1.32     g90 1.85 / 2.30
    g100  1.62 / 1.94    geist 1.25 / 1.31   linear 1.30 / 1.41
    rux   1.39 / 1.55    ant-dark 1.25 / 1.40  spotify 1.23 / 1.41

**g10 IS THE ONE THAT MATTERS: 1.08 is not a line.** Every other theme loses
between 0.06 and 0.45 and stays where the rule already was -- this is a subtle
border by design and reads between 1.2 and 2.3 everywhere, including on normal
rows. g10 alone drops to where the divider effectively is not drawn, so on that
theme the No bus row reads as one unbroken strip from the label to the end of
the week.

**WHICH MAY BE THE POINT RATHER THAN A DEFECT, and is left standing on that
reading.** The change asked for is that the head and its track be one thing; a
divider that disappears between them is that request taken to its conclusion,
and the italic "No bus" label still separates identity from content. It is
recorded here rather than fixed because fixing it means a heavier token on one
row in one theme, which is a rule with an exception in it.

**AND g10 WAS THEN LOOKED AT, WHICH IS HOW IT SHOULD HAVE BEEN SETTLED.** rux
accepted the change on sight -- "look ok to me" -- and the one theme neither of
us had actually rendered was opened afterwards rather than left as a ratio. The
divider is not drawn there, exactly as 1.08 predicted, and the No bus row reads
as one unbroken grey strip against the white rows above it. That is the request
taken to its conclusion rather than a defect: the row is one thing, which is
what was asked for, and the italic "No bus" label still separates identity from
content. No `border-strong-01` exception, and none wanted.

**NOT DONE.** The remaining seven themes were measured and not rendered for this
particular row; g10 was the only one whose number put it in doubt, so it is the
only one that was opened. `docs/gate-coverage.md` is still at `52efa52` and has
seen none of today's seven passes.

**2026-09-11 (sixth pass) - the day rules are back at every boundary and the
labels are centred over them, which retires two answers this same day gave.**
rux: "lets add the vertical lines back and center the dates?" Both together,
which is the only order in which either works.

**THIS IS THE THIRD ANSWER TO ONE OPEN ITEM, and the first two are now gone.**
"No weekend tint, so an empty row still cannot be counted" has been open since
2026-09-07 -- the day the six vertical day rules were REMOVED, at rux's own ask,
because they made the board a grid where Carbon's data table draws none. Today
it was answered first with a weekend FILL, which rux rejected on sight for
reading as the header band bleeding down the board; then with a single HAIRLINE
at the weekend boundary. Both are deleted. The rules answer the counting problem
at its source: an empty row now has a landmark at every column rather than one
at the week's end.

**AND THE WEEKEND LOSES ITS BODY MARK ENTIRELY, which is a consequence worth
stating rather than discovering later.** With six identical rules, a line at the
weekend boundary is not a mark -- it is one of six. So the weekend is dimmed
TEXT in the header band and nothing at all below it. `isWeekend` survives for
that one job. If the weekend needs to be distinguishable again it wants a
heavier rule or a fill, and that is a separate decision.

**SIX BOUNDARIES, 1 THROUGH 6, NAMED RATHER THAN REPEATED.** Column 0 is the
week's left edge, already drawn by the bus column's own rule; column 7 is the
right edge, drawn by the pane. A line on either doubles something. The removed
version reached the same place by insetting a `repeating-linear-gradient` "one
day from the start so it fell on days 1 to 6 and neither edge"; naming the
boundaries makes the edges explicit instead of implied. Same token and same
width as the version that went: 1px `border-subtle-01`, last carried at
`47d3903`.

**THE CENTRING DEPENDED ON THE RULES AND COULD NOT HAVE COME FIRST.** Asked on
its own earlier today, the answer was no, and the measurement was the argument:
every label sat 12px from its column's left edge and every bar's text sat at the
same 12px -- 431, 570, 709, 848, 987, 1126, 1265 against bar text at 431, 710,
848, 987, 1265, identical to the pixel. With no vertical rules, that shared line
was the ONLY thing saying where a column began. Now the boundary is drawn, the
label is free of the job, and centring costs nothing. Measured after: all seven
labels within 1px of their column's centre.

**THE ROSTER TOOK THE SAME GRID, and it needed no JavaScript at all.** Its cells
are real grid cells with a column each, so the rule is an inline-start border on
every cell but the first and `data-day` already says which that is --
`.sch-avail__cell:not([data-day="0"])`. The board has one element spanning all
seven days and no edge to hang a border on, which is the only reason it paints
stops. The weekend-boundary class and the per-render computation that fed it are
both deleted.

**HEADER BANDS STAY CLEAN, asserted rather than assumed.** rux's rule from
earlier today -- "doesnt cross into header" -- holds through this: every one of
the corner, the seven day cells and the roster's eight header cells reads zero
inline borders and no background image. The rules start below the band in both
grids.

**VERIFIED AT 1440x950.** Rules paint at 14.2857 / 28.5714 / 42.8571 / 57.1429 /
71.4286 / 85.7143 percent, which is 139 / 278 / 417 / 556 / 695 / 834px, against
column edges at 139 / 278 / 417 / 556 / 695 / 834. Exact in all six. 240 ruled
cells in the roster, first column excluded, `node tools/check.mjs` passes at
classes 359 and tokens 89.

**NOT DONE.** Not re-measured at 375 or with the week overflowing, where the
rules are painted against a `max-content` track -- the geometry is the same one
the weekend hairline was checked at, but this is more lines and was not re-run.
The bar arithmetic is still untouched: `--sch-gap` 4px and `--sch-gap-clear` 3px
differ by the one pixel the old day rule ate, and sch.css has carried a note
since 2026-09-07 saying that if the rules stay gone the two should be collapsed.
They are not gone any more, so that note is now moot rather than pending, and
nothing was changed either way. And the weekend's body mark is gone by design,
recorded above so it is not rediscovered as a regression.

**2026-09-12 - the theme sweep the last several passes kept deferring, and it
found nothing.** Every treatment added this week measured in all nine readings,
with the roster, the trip editor and the search dropdown open at once so each
surface was on screen in the same execution.

**ZERO COLLAPSES.** The roster's selected-day tint against a plain cell, and
against the busy and day-off tag colours; the search list's active option
against its plain rows; the day rules, the bus column's rule and the driver
name column's rule against the surfaces they sit on. All distinct in white,
g10, g90, g100, geist, linear, ant-dark, rux and spotify.

    theme      roster tint          ratio   day rule
    white      #e0e0e0 on #f4f4f4    1.20     1.55
    g10        #e0e0e0 on #ffffff    1.32     1.32
    g90        #525252 on #393939    1.48     2.30
    g100       #393939 on #262626    1.31     1.94
    geist      #1a1a1a on #0a0a0a    1.14     1.31
    linear     #22243a on #141419    1.21     1.41
    ant-dark   #112545 on #141414    1.21     1.40
    rux        #e0e0e0 on #f4f4f4    1.20     1.55
    spotify    #193824 on #181818    1.38     1.41

**THE FEAR WAS SPECIFIC AND IT DID NOT MATERIALISE.** Three passes carried a
NOT DONE saying `--rux-layer-selected` was unmeasured and that `layer-hover-01`
and `layer-accent-01` collapse to one value in ant-dark and spotify, so a
selection invisible in some theme was plausible. It is not: those two themes
define `layer-selected` as a HUE -- #112545 blue, #193824 green -- rather than a
grey step, which is why their ratios understate them. The pair that collapses is
not the pair in use.

**A READING THAT LOOKED WRONG AND WAS NOT, worth writing down.** The search
list's active option measured #333333 on #262626 in EVERY theme including the
light ones, which should be impossible for a rule reading `--rux-layer`. The
cause is that `.rux--header` carries its own `data-theme="g100"`: everything
inside the shell header resolves the layer tokens as g100 whatever the page is
set to, because Carbon's shell header is always dark. The search dropdown hangs
off the field, inside that header, so it is theme-invariant by design. Checked
directly -- header background #161616 and `--rux-layer` #262626 inside it while
the board's pane read #f4f4f4 in white.

**NOT DONE.** geist's roster tint is **1.14:1**, a sixteen-value step on
near-black and the weakest figure anywhere in the sweep. It passes "distinct"
and that is all; nobody has looked at it on a screen. Contrast was the only
question asked -- this says nothing about spacing, focus order or whether any of
it looks right, which is still what `docs/gate-coverage.md` is for, and that
file is still at `52efa52`.

**2026-09-12 - a 40px first row over a 32px second, and it took six rules
because a head is as tall as what it holds.** rux: "can we make the first row
for each section 40px size? keep 2nd row at 32?"

**`min-block-size` DID ALMOST NOTHING, WHICH IS THE WHOLE LESSON.** Set on the
two heads alone, the roster's went to 40 and the toolbar stayed at **48** --
its buttons are the taller thing, and a minimum cannot shrink a box below its
content. That left the roster's column band 8px above the board's, breaking the
one rule `.sch-aside__head` has always carried: it must equal the toolbar to the
pixel or the two grids' column headers stop sharing a line. Each control then
had to come down in turn, and each was found by measuring rather than by
reading the markup: the five toolbar icon buttons, `.sch-weekbtn`,
`.sch-toolbar__weekrow`, the roster's close, the panel's header padding, and
the panel's close.

**TWO RULES I WROTE LOST TO RULES ALREADY IN THE SAME FILE.** A new
`.rux--side-panel__header` rule at (0,2,0) lost to an existing
`...__header--has-title` at (0,3,0), and a new close-button rule lost to an
existing `.rux--btn--md.rux--side-panel__close-button`. Both times the computed
value was unchanged and the page looked untouched. **Appending to
rux-overrides.css is not the same as changing it** -- read what is already
there for the selector first. That is the fifth specificity miss this week and
the first where the losing rule was mine twice in one edit.

**AND THE CLOSE BUTTON'S RULE WAS DELETED RATHER THAN FLIPPED, which is the
best thing in this pass.** It existed only to force 48: the markup says
`rux--btn--md`, Carbon compiles no `lg` for that control, so 48 could come from
nowhere else. Its own comment called that "a cost rather than a preference:
every other button says its size in the markup", and it left an ask upstream.
40 is exactly what `rux--btn--md` already compiles -- so the rule goes, the
control states its own size again, and `docs/rux-ds-requests.md` marks the ask
**withdrawn**, with the measurement kept for the next app that makes its heads
48. The workspace is at 19 open asks, down one.

**MEASURED, all three regions with the roster and editor open at 1600:** first
rows 40, 40, 40 and all starting at y=80; second rows 32, 32, 32; both grids'
column bands back on one line at y=120; the panel's title not clipped; its close
40x40 and overflowing nothing. The shell header is untouched at 48 -- it is
Carbon's own band and not one of the three.

**NOT DONE.** The panel's title is `heading-03` with a 28px line box in a 40px
band, so it has about 6px of air against the 16px Carbon intends. It is the
tightest thing on the page and the first rule that breaks if the title ever
gains a subtitle or a second line; the answer then is to give that band back
its 48. Below the width where the toolbar wraps, the heads read 40, 80, 40 --
the toolbar is two rows now instead of two 48s, so the disagreement is older
than this change and no worse, but it is still a disagreement.

**2026-09-12 - `xs` panels tried and reverted, and the reason is 64px of
content.** rux: "lets tri xs panels". Both companions are 20rem today; Carbon's
side panel ships six sizes, each `clamp(16rem, <size>, 100%)` -- xs 16, sm 20,
md 30, lg 40, xl 65, 2xl 80 -- so xs is one rung down and also the floor every
other size clamps to.

**THE ROSTER CANNOT GO THERE AT ALL, and that was measured before anything was
edited.** Its seven day columns are a fixed 32px, so 224 of any 256 is spoken
for and the name column gets **32px** -- the same width as a day cell. Driven:
the grid template became `32px` eight times and **all forty driver names
truncated**. It is not a Carbon side panel anyway; `.sch-aside` is app chrome
whose width is set by what it holds.

**THE EDITOR LOOKED FINE AND WAS NOT, which is the part worth keeping.** The
first check said everything fitted: footer buttons 85px and unclipped, no field
label clipped, no input clipped, the date pair still on one line, four tabs at
64px each reporting `clipped: false`. It was applied on that reading. **The
screenshot then showed "Sche…"** -- and re-measuring against every descendant
rather than a list of likely suspects found the real state at 256px:

    rux--tabs__nav-item-label     60 in 48    "Schedule" ellipsised
    rux--side-panel__inner-content 304 in 256  clipped by overflow: hidden
    rux--tab-content               288 in 224
    rux--stack-vertical            288 in 224

The panel's fields are laid out for about 288px of content and xs gives 224. So
the editor overflows by 48 to 64px, silently, because the container that clips
is `overflow: hidden` and says nothing.

**WHY THE FIRST CHECK MISSED IT: it asked the elements I expected to break.**
Buttons, labels, inputs, the tab BUTTONS -- and the tab button does not overflow
because the ellipsis is on a span inside it, and the panel does not overflow
because it clips. Asking every descendant for `scrollWidth > clientWidth` found
all four in one pass. **That is the fourth time this week a check confirmed what
it was looking for and missed what was there**; the others are recorded below as
asserting a class rather than a computed value. Enumerate, do not audition.

**REVERTED to `--sm` and 20rem, verified: panel back to 320, "Schedule" whole at
60 in 60, zero overflowing descendants.**

**NOT DONE.** xs is reachable if the editor's content is made to fit 224px --
the stack's own inline padding is the first thing to look at, since 288 against
224 is close to `spacing-05` twice over. Not attempted; it is a change to what
the panel holds rather than to how wide it is.

**2026-09-12 - the roster's title takes the panel's type, and the three
"headers" were never three of a kind.** rux: "the inconsistent header bother me
a bit. Driver availability / date picker / Edit trip (different style). what
option do i have to unify them or make this match?"

**TWO OF THE THREE ARE HEADERS AND THE THIRD IS A CONTROL ROW**, which is the
first thing the comparison needed. The toolbar has no title at all: the week is
a BUTTON that opens the date picker, and Carbon's data table toolbar carries no
heading either. Matching it to the other two would mean inventing a title for a
toolbar so it could resemble a panel.

**AND THE FIRST MEASUREMENT OF THIS WAS WRONG, twice over.** An earlier audit
this week reported all three heads at "16px/400" and called them consistent --
it had probed the CONTAINERS, which inherit, rather than the title elements.
Read properly: the roster's title is `heading-compact-02` at 16/600, the week
label 16/600, and the editor's `heading-03` at **20/400**. A third of that audit
was measuring the wrong nodes.

**CARBON SHIPS BOTH TOKENS IN THE SAME PANEL, which is what makes this a
mismatch rather than a preference.** `.rux--side-panel__title-text` is
`heading-03`, and beside it `.rux--side-panel__collapsed-title-text` is
`heading-compact-02` -- the panel swaps to the smaller one as it scrolls. So the
roster's head was wearing the panel's COLLAPSED type, permanently, beside the
panel's expanded one.

**THE PANEL IS THE MODEL AND THE ROSTER MOVED.** `.sch-aside__title` is this
app's own markup imitating a Carbon side panel; the panel is the component
Carbon ships complete. Overriding `__title-text` to match the imitation would
have been the app overruling the design system, in the file reserved for
overruling it. One rule in sch.css instead.

**VERIFIED AT 1600 with all three panes open:** both titles read 20px/400 with a
28px line box, the title is not clipped and fits inside the 48px band, the
roster head and the toolbar are still 48 to the pixel and still start at y=80 --
which is load-bearing, because `.sch-aside__head`'s own comment says it must
equal the toolbar's "or the two grids' COLUMN headers stop landing on one line".
Both bands still start at y=128.

**NOT DONE.** Only checked where the head has room. At a pane narrow enough to
wrap the toolbar to two rows the two heads stop being equal -- measured 48
against 96 -- and the column bands fall out of line. That is true before this
change as well and is the toolbar wrapping rather than the title growing, but a
20px title in a 48px band has less slack than a 16px one if that band is ever
squeezed.

**2026-09-11 - one control, one name.** rux asked whether the Drivers button
belonged somewhere else and what the options were. It does not need moving; it
needed renaming.

**WHERE IT IS IS RIGHT, AND THE DUPLICATION IS A BREAKPOINT, NOT A MISTAKE.**
Inventoried: the toolbar carries the week, the two chevrons, Today, the toggle
and the overflow; the overflow carries New trip, Today, the toggle, the four
bar-row options and Start week on Sunday. Below md the toolbar sheds Today and
the toggle -- both menu rows carry `sch-menu-item--sm-only` -- so at 375 it is
the week, the chevrons and the overflow. Measured at both widths. One control in
two places by width.

**AND CARBON PUTS IT IN THE TOOLBAR.** The data table toolbar is "a location for
primary buttons, search, filtering" and holds "global data table controls
including search and table settings"; a companion-pane toggle is a view setting
for this screen. The alternatives were weighed and rejected on their own terms:
the shell's global bar is for "system-level functions such as profile, search,
notifications" and this is app content; the side nav navigates BETWEEN views and
this is a pane beside the current one; the pane's own header cannot host the
control that opens it when it is closed. A collapsed rail on the board's left
edge is the one idea that would read better -- the affordance sitting where the
thing appears -- and Carbon ships nothing for it, so it would be invented
chrome. Not built.

**WHAT WAS ACTUALLY WRONG IS THAT IT HAD TWO NAMES.** The toolbar button was
`aria-label="Drivers"` while the overflow row and the pane's own header both
read "Driver availability". One control under two names is a control a
screen-reader user cannot match to the thing it opens, and a second string to
search the page for. The pane's header settles it -- the button is the way to
that pane -- so the button took the pane's name. Checked after: all three read
"Driver availability".

**AND "Drivers" WAS ALREADY TAKEN THREE WAYS**, which is why the rename is the
whole fix and not a preference. The overflow carries "Drivers on the bar" for
the bar's own driver row, and the trip editor labels a trip's assigned drivers
"Drivers". Both left alone; only the pane's opener changed.

**2026-09-11 - the roster stops standing aside for the editor, except on a
phone.** rux asked whether the force-close was intended, then "id rather the
assigments grid not be force closed", then "unless its mobile breakpoint".

**IT WAS INTENDED AND IT WAS CONDITIONAL, which is worth recording because the
answer to "is this a bug" was no.** `openPanel` yielded the roster when
`sch.js` reported the board `crowded` -- its name for the day columns hitting
their 8.5rem floor -- guarded by `!wasOpen` so a second bar could not re-take
it, restored when the editor closed, and overruled by any press of `Drivers`.
Driven at three widths before changing anything: 645 crowded and yields, 1440
crowded and yields, **1900 not crowded and all three panes stay open** with day
columns at 157px.

**THE OBJECTION IS THE PREMISE, NOT THE MACHINERY.** 1440 is a width people
work at all day, so in practice opening any trip took the roster away -- and
nothing said why. The `Drivers` button simply went unpressed. A control that
closes itself reads as a control that broke.

**ON A DESKTOP THE COST OF KEEPING IT IS THE BOARD SCROLLING, which this board
is built to do.** `.sch-grid` is `max-content` with a sticky bus column
precisely so seven days can total more than the pane -- the work recorded
2026-09-11 for the phone. Measured after: at 1440 with both companions open the
roster stays, the toggle still reads pressed, the day track sits on its 136px
floor and `#sch` scrolls horizontally.

**BELOW md IT STILL YIELDS, AND THERE IT IS NOT A PREFERENCE.** sch.css puts
both companions ON TOP of the board at that width -- the editor through Carbon's
own `position: fixed`, the roster by hand beside it -- so they are full-width
overlays and one does not sit next to the other, it covers it. That file's own
stacking comment says the z-index "only decides what happens during the frame
between", which is only true because this line exists. So the condition moved
from `crowded()` to `matchMedia('(max-width: 41.98rem)')` rather than being
deleted: measured at 375, the roster yields and comes back when the editor
closes.

**WHAT WAS NEARLY DONE INSTEAD.** The first pass removed the mechanism
outright -- the flag, the restore, the guards, four sites -- on the first half
of the instruction. rux's "unless its mobile breakpoint" arrived while that was
running, and the whole thing had to be put back and re-keyed. The lesson is
about the shape of the request rather than the code: "do not do X" and "do not
do X except when Y" are different changes, and the second is not the first plus
a patch.

**NOT DONE.** Nothing tells a person on a phone that the roster stepped aside;
it is the same silence the desktop case was removed for, and it survives here
because on a 375px screen the roster was covering the board anyway. Whether
that deserves a line of its own is unasked.

**2026-09-11 - a Carbon audit of the three regions, and the two things it found
are the two rux pointed at.** rux: "review/audit the design again ibm carbon
standards ... more consistent headers? assignments grid selected days accent
squared to messy?"

**THE HEADERS ARE CONSISTENT, MEASURED, AND ONE CELL IN FOUR WAS NOT.** All
three region heads -- the roster's, the board toolbar, the trip editor's -- read
48px on `--rux-layer` at 16px/400. Three of the four column-header cells read
32px on `layer-accent-01` at 14px/600. The roster's DAY cells read **12px**.
That is the whole of the inconsistency, and it was a leftover: 12px exists
because "Wed" would not fit a 24px square, which is why those labels went to two
letters at all. The cells have been 32px wide since the pass that widened them,
and two letters at 14/600 measure **21px** -- inside 32 with eleven to spare,
measured in the cell's own font before the rule was touched. The rule is deleted
rather than retuned, so the cells inherit the same `heading-compact-01` the rest
of the band already sets.

**AND A MEASUREMENT OF MINE WAS WRONG BEFORE IT WAS RIGHT.** The first pass at
this reported the toolbar as **288px** tall against the other heads' 48, which
would have been a real defect. It was an artifact of a short browser pane:
re-measured at 1440x950 it is 48 like the others. A layout read taken at a
viewport nobody uses is not a reading.

**THE SELECTED-DAY ACCENT WAS DOING THE HEADER'S JOB FORTY TIMES OVER.**
Measured: the board marks today with `inset 0 -2px 0` on ONE header cell and
nothing in the body. The roster carried the same underline on its header cell
AND `inset 0 0 0 1px` on **all forty body cells** -- forty separate outlined
squares down one column, which is what rux called messy. Two grids, the same
question, two answers.

**AND IT ONLY EVER MARKED ONE DAY.** `currentTripDay` read `--sch-start` and
nothing else, so a five-day trip lit one column of the five it occupies. rux
asked for "a single outline around the entire columns but should include
multiple column if the trip is multiple days", which is the fault and the fix in
one sentence.

**IT IS A BRACKET NOW, AND IT IS THE DAY RULE RECOLOURED.** The bar carries
`--sch-span` beside `--sch-start`, so the marked block is the trip's real span;
the outline is a left border on the first marked column and another on the
column AFTER the last. **The second edge is the next column's left border
rather than this one's right**, because every cell but the first already draws a
left border from the day rules -- a right border here would sit beside it and
read as 2px where every other boundary reads as 1. Where the span ends on the
last column there is no next cell and the pane's edge closes it. A border also
survives the busy and day-off tints, which set the `background` shorthand; a
column fill would not.

**DRIVEN on a five-day trip (start 0, span 5): edges at columns 0 and 5, headers
underlined across Mo Tu We Th Fr, zero four-sided boxes left, the edge reading
#4589ff against the plain boundary's #525252, and every day label still fitting
at 14px.**

**AND THEN THE RIGHT LINE TURNED OUT NOT TO BE DRAWING AT ALL.** rux: "looks
like its missing the right and bottom lines." Measured: column 0 read #4589ff
and column 5 read **#525252** -- the grey boundary, not the blue edge. The day
rule above it is `.sch-avail__cell:not([data-day="0"])`, a class and an
attribute, so (0,2,0); `.sch-avail__cell--edge` is (0,1,0) and lost everywhere
EXCEPT column 0, which has no boundary rule to lose to. So the bracket drew its
left line and nothing else, and the first reading of it -- which checked the
CLASSES were on the right cells, and stopped there -- called it correct.
Doubling the class matches the boundary rule and this one comes later in the
file. **That is the second single-class `sch-` rule to lose to a compiled one
today**; the search's active row was the first. When a rule paints nothing,
compare specificity before looking anywhere else.

**THE BOTTOM IS DRAWN NOW TOO, at the end of the DATA rather than at the fold.**
The roster scrolls -- 40 drivers against about 20 rows of room -- so the line
sits on the last driver's row and is on screen once you scroll to it, which was
checked rather than assumed: scrolled to the end, the marked row's bottom edge
lands exactly on the pane's. Drawing it at the fold instead would move it every
time the pane resized.

**VERIFIED, ALL FOUR SIDES:** a five-day trip lights the header underline across
Mo Tu We Th Fr, both verticals at #4589ff on columns 0 and 5, and a bottom
border at #4589ff across columns 0 to 4 on the last row.

**AND THE BRACKET WENT TOO, WHICH MAKES THIS THE THIRD TREATMENT IN A DAY.**
rux: "not sure i like it. is there another suggestion? maybe dimm column not
selected? or tint bg tiles for selected day or something else?" Forty boxes,
then four lines, now a tint -- and the tint is the one that should have been
first, for a reason about the PANE rather than about taste.

**WHAT THIS GRID IS FOR DECIDED IT.** The question it answers is "who is free on
this day", so the eye is hunting the cells in the selected column that are
EMPTY. A tint lands on exactly those: measured, a free cell in the span reads
#393939 against the pane's #262626, while a busy cell still reads #0043ce and a
day-off cell #a2191f -- because both set the `background` SHORTHAND, which
resets what is under it. The marking and the answer are the same pixels, and
nothing competes with the tag colours. Lines could not do that: they sat beside
the data rather than on it.

**`--rux-layer-selected` IS CARBON'S OWN TOKEN** for a selected surface -- what
a selected row takes in its data table -- rather than a step chosen by eye,
which the first version's `border-interactive` bracket and the version before
that both were.

**AND IT HAD TO GO ABOVE `--busy` AND `--off` IN THE FILE, which the first
attempt got backwards.** All three are single classes, so order decides; written
after them, the tint overrode the tag colours on booked cells -- the exact
opposite of the argument in its own comment, which was already written and
already right. Moved, and checked: both tag colours survive inside the span.

**NO LINES AT ALL NOW.** The header keeps its underline, and the day rules
already mark every column edge, so the band is bounded without drawing anything.
Verified: columns 0 to 4 tinted for a five-day trip, Mo Tu We Th Fr underlined,
zero edge classes left in the document.

**THE HEADER'S UNDERLINE CAME OFF, AND TAKING IT OFF FOUND A RULE THAT HAD
NEVER WORKED.** rux: "want to remove the accented line on date selected." Gone
-- the body tint is the whole marker now, and neither header band draws anything
for it.

**THE COLOUR THAT WENT WITH IT WAS A NO-OP AND I NEARLY KEPT IT ON A WRONG
ARGUMENT.** `.sch-avail__day--on-day` also set `color: var(--rux-text-primary)`,
and the comment justifying it said the labels were secondary so this was "a real
cue". Measured: selected and unselected labels both read **#f4f4f4**. The band
already sets `text-primary` on every label, so the rule computed to what was
already there. It is deleted rather than defended.

**AND THE SAME MEASUREMENT SHOWED THE ROSTER'S WEEKEND LABELS HAVE NEVER
DIMMED.** `.sch-avail__days > .sch-avail__day` sets `color: text-primary` for
the band and counts as (0,2,0); `.sch-avail__day--weekend` was a single class at
(0,1,0) and lost. So the board's weekend dimmed and the roster's did not, and
the two bands have quietly disagreed since the pass that built them -- **which
that pass reported as working**, because it asserted the CLASSES were on the
right cells and never read a colour. Fixed with the child combinator, and
checked the right way: both bands now read `rgba(244,244,244,0.4)` on Sa and Su,
weekdays stay #f4f4f4, and no header cell carries a box-shadow.

**THAT IS THREE RULES IN ONE DAY THAT PAINTED NOTHING AND WERE CALLED DONE** --
the search's active row, the roster's bracket, and now the weekend dim. All
three were single-class `sch-` rules losing to a longer selector, and all three
passed a check that asserted the class rather than the computed value. The
check cannot see any of it: it reads classes against the compiled CSS and has no
opinion about which rule wins. **Assert the colour, not the class.**

**NOT DONE.** `--rux-layer-selected` was not re-measured in the other seven
themes. It resolves to the same #393939 as `layer-accent-01` in g100, and the
entry four passes below records `layer-hover-01` and `layer-accent-01`
collapsing to one value in ant-dark and spotify -- so a theme where
`layer-selected` equals the pane, or equals the header band, is plausible and
unchecked.

**2026-09-11 - the result cap is 50, and the 12 it replaced was a rule written
for a component that no longer exists.** rux asked whether results were limited,
then "make it 50".

**THE OLD COMMENT GAVE ITS OWN REASON AND THE REASON HAD EXPIRED.** It read "the
panel is 256px of header, not a page; past a dozen rows it is a list to scroll
rather than an answer" -- true of the `rux--header-panel` the results lived in
when it was written. They are a menu hung off the field now, at the field's
width with `max-block-size: 60vh` and the list scrolling inside. The shape the
cap was protecting had already been replaced two passes earlier and the number
stayed behind.

**WHAT 12 WAS COSTING, counted against the fleet's 737 trips before changing
anything:** "memorial" matches 38, "dallas" 28, "vanguard" 25. All three were
cut to 12 -- and since the order is `start_date` DESCENDING, what was cut was
always the OLDEST, with nothing on screen saying so. A dispatcher hunting last
spring's trip was told to narrow a query that was already a school's name.

**AT 50, ALL THREE COMPLETE.** Measured after: memorial 38 of 38, dallas 28 of
28, vanguard 25 of 25, "mcallen memorial" 11 of 11, each with an exact count and
no over-cap note. "tx" still matches 612 and still stops at 50 with "More than
50 trips match" -- which is the query that ought to be narrowed, and the cap is
printed rather than silent. cap+1 is still what is fetched, so that line never
claims a total it did not count.

**THE LAYOUT DID NOT MOVE, which is the thing a bigger cap could have broken.**
The box holds at 691px, 0.60 of the viewport, exactly the `60vh` it was given;
the list scrolls inside it. And the keyboard still reaches the far end of a
50-row list: End lands on index 49 with the row in view and the list scrolled
2440px, ArrowDown from there wraps to 0 with the scroll back at 0, ArrowUp wraps
to 49, Home returns to 0.

**NOT DONE.** Ordering is still newest-first rather than by relevance, so a
query past 50 still hides the oldest and says only "narrow the search". Fifty
rows is also 50 DOM nodes rebuilt on every keystroke past the debounce; not
measured for cost, and no virtualisation.

**2026-09-11 - the results were covering the field's focus ring by one pixel,
and it is the 47-against-48 difference for the third time.** rux, holding ours
beside the Carbon website: "looks like the focus border is clipped on ours by
the results unlike the carbon website."

**ONE PIXEL, MEASURED.** The input's box ends at y=48; the results began at
y=47. Carbon draws the input's focus as `outline: 2px solid` at
`outline-offset: -2px`, so the ring paints on y 46 to 48 -- and the results are
opaque `--rux-layer` at z-index 8100, so they took the ring's bottom edge. On
the Carbon website the ring closes and the menu starts below it, which is what
made the difference visible side by side.

**THE CAUSE IS THE SAME ONE TWICE ALREADY IN THIS HEADER.**
`.rux--header__global` is 47px -- the header's 48 less its bottom border -- and
the search inside it is 48. `.sch-header-search` was an ordinary flex item, so
it stretched to 47, and the results are `inset-block-start: 100%`: 100% of 47 is
47, one pixel above the field's own bottom. The magnifier's clipped ring and its
half-pixel misalignment were the first two faults from the same difference.

**`align-self: flex-start` SIZES THE BOX TO ITS CONTENT**, so it is 48, `100%`
is the field's real bottom edge, and the ring keeps its last pixel. Measured
after: wrapper 48, field bottom 48, results top 48, **overlap 0**; the field
still 949 wide, the results still exactly aligned to it, Account unmoved at
1167.

**WORTH NAMING AS A PATTERN RATHER THAN THREE BUGS.** Every one of these came
from a control sized to the header (48) sitting in a bar sized to the header
MINUS its border (47), and each showed up as something a pixel out: a ring
above the page, a control half a pixel high, a menu a pixel too far up. Anything
else anchored to this wrapper should be measured against the field rather than
assumed to inherit its height.

**NOT DONE.** Only the bottom edge was checked against the results. The field's
ring also runs along the top of the header, where the earlier `flex-start`
change put it at y=0 -- visible, but with nothing above it to prove it is not
being cropped by the viewport, which is the same shape of fault and was not
re-driven here.

**2026-09-11 - the arrow keys had been selecting results for three passes and
nothing on screen said so.** rux: "should pressing tab or arrow key let you
select individual search results and then enter to select/load it?" Arrows and
Enter already did. The reason it did not look like it is the answer.

**THE HIGHLIGHT NEVER PAINTED, AND THE CHECK CANNOT SEE THAT.** Measured with a
row active: the highlighted option's background computed **`transparent`** --
identical to every other row, contrast **1.00**. `aria-activedescendant` was
correct, `aria-selected` was correct, the class was on the right element, and a
sighted person saw nothing move. A selection a screen reader can follow and an
eye cannot is barely a selection.

**CARBON'S `background: none` OUTRANKED IT.**
`.rux--contained-list-item--clickable .rux--contained-list-item__content` is two
classes; `.sch-search__opt--active` was one. It lost on specificity and had lost
since the day it was written -- through a pass that verified the KEYS worked and
never verified that anything was drawn. Scoping it to `.sch-search__results`
makes it two as well, and sch.css loads after rux.css, so the later of two equal
rules wins with no `!important`.

**AND THE TOKEN IS NOW CARBON'S OWN FOR THAT ROW.** It was `--rux-layer-hover-01`,
picked by eye; the rule Carbon actually paints a hovered contained-list row with
is `--rux-layer-hover`, at
`.rux--contained-list-item--clickable ...:not(:disabled):hover`. Using the same
token means the keyboard highlight and the mouse hover are literally the same
colour rather than two near-misses. Measured after: active row #333333 against
the panel's #262626 in g100, visible.

**DRIVEN END TO END AFTER THE FIX.** Three ArrowDowns lit "San Antonio TX ·
May 17, 2027 · Vanguard Mozart", Enter moved the board **Sep 7-13 2026 to May
17-23 2027**, collapsed the search, selected that bar and opened its editor.

**AND THE ANSWER TO THE TAB HALF IS STILL NO**, for the reason the entry below
gives: Tab leaves a widget, arrows move within it, and the options are
`tabindex=-1` on purpose.

**NOT DONE.** The highlight is 1.2:1 against the panel -- Carbon's own hover
step, so it matches the mouse exactly, but it is a weak signal for a keyboard
user who has no cursor to corroborate it. A border or a left rule on the active
row would carry further and would depart from what the mouse does; not changed,
and named here so the trade is on record. Nor was the highlight re-measured in
the other seven themes: `layer-hover` is one token, but the entry three passes
below records `layer-hover-01` and `layer-accent-01` collapsing to one colour in
ant-dark and spotify, and no one has checked whether `layer-hover` does
something similar against `layer`.

**2026-09-11 - the whole listbox was a tab stop, and the property that would
have shown it reads -1 either way.** rux: "the entire list is focuable instead
of individual rows", with a ring drawn around all ten rows at once.

**IT IS THE BROWSER'S FOCUSABLE-SCROLLER RULE.** Chrome gives a SCROLLING region
its own tab stop when nothing inside it is tabbable, so a keyboard user can
still scroll it. This list qualifies twice over: `overflow-y: auto` since the
count had to stay pinned, and every option at `tabindex=-1` since the combobox
owns the keyboard. So the element the pattern deliberately keeps out of the tab
order was put back into it by the engine.

**AND `el.tabIndex` DOES NOT SHOW IT, which is why the first reading missed.**
Queried directly the list reported `tabIndex: -1` with no `tabindex` attribute
-- the DOM property is untouched by the rule -- and that was taken as "not a tab
stop", which was wrong. Only pressing Tab shows it: driven with real key presses
through the browser, two Tabs from the field landed on `sch-search-list`, 949 by
611, wearing the UA's own `1px auto rgb(153,200,255)`. That is the ring in the
screenshot, and it is the browser's, not Carbon's.

**`tabindex="-1"` AS AN ATTRIBUTE IS THE OPT-OUT.** The property already read
-1; only the attribute tells the engine the author has an opinion. Re-driven
after: two Tabs go field, Clear, **Account** -- the list is skipped, never takes
focus, and the focusout handler collapses the search on the way past.

**OPTING OUT OF AN ACCESSIBILITY FEATURE NEEDS THE REASON WRITING DOWN.** That
rule exists so a scrollable region is reachable by keyboard, and this one
already is: the arrows move `aria-activedescendant` and scroll the active option
into view. Checked rather than asserted -- twelve ArrowDowns reached indices 0
through 11 in order, the list scrolled 123px on its own, and the last row
finished inside the box. Nothing is unreachable without the scroller's tab stop,
which is the only thing that makes removing it legitimate.

**NOT DONE.** Only Chrome was driven. The rule is Chromium's; Firefox and Safari
differ on focusable scrollers, and an explicit `tabindex=-1` is the safe answer
in all three, but the fault itself was reproduced in one engine only.

**2026-09-11 - no, the results should not be tabbable, and asking found two
bugs that had nothing to do with Tab.** rux: "should the search results be
individually selectable with tab?"

**THE ANSWER IS NO, AND THE PATTERN IS THE REASON.** This is an
activedescendant listbox: focus stays in the field so the query stays editable,
`aria-activedescendant` names the current option, and the options are
`tabindex=-1`. Tab moves between widgets rather than within one -- tabbing
through twelve results to reach the Account button is the alternative, and the
list is rebuilt on every keystroke, so those stops would appear and vanish as a
person types. Verified as built: 0 of 12 options tabbable, and Tab from the
field goes to Clear, then Account.

**BUT TAB DID LEAVE, AND LEFT THE SEARCH OPEN BEHIND IT.** Measured: focus on
"Account", field still expanded at its full width, twelve results still drawn
over the board. The only things that collapsed it were a pointer press outside
and Escape -- and a keyboard user reaches neither by tabbing. `focusout` on the
wrapper closes it now, testing `relatedTarget` first and falling back to
`activeElement` after a tick, so moving between the field and its own clear
button does not count as leaving.

**AND THE PRESS-OUTSIDE TEST WAS WRONG, on a comment that asserted the thing it
got wrong.** It read `searchBox.contains(e.target)` with "the results live
inside it now" beside it. They do not: `#sch-search` is the `.rux--search`
element and the results are its SIBLING inside `.sch-header-search`. Checked
directly -- `searchBox.contains(results)` is **false**. So every press on the
list collapsed the search out from under the thing being pressed: grabbing its
scrollbar, pressing the count line, starting a drag across a row. **Clicking a
result looked fine only by accident**, because that handler collapses the search
itself, so the one path anyone had tested was the one path where the bug could
not show.

**DRIVEN, FOUR WAYS, after.** Press the list: stays open, where it used to
close. Press the board: closes. Tab away to Account: closes, where it used to
stay. Move to its own clear button: stays open.

**NOT DONE.** Shift-Tab backwards out of the field was not driven, only forward;
the handler is direction-agnostic by construction but that is reasoning rather
than a reading. Nothing returns focus to the magnifier when the search collapses
from a Tab -- focus has already gone where the person sent it, which seems
right, and is untested against a screen reader.

**2026-09-11 - the search icon's focus ring had no top edge, and it was two
faults stacked.** rux, with the search focused beside the account button for
comparison: "focus seem to be missing the top section on search button."

**CARBON STYLES THE TWO CONTROLS' FOCUS DIFFERENTLY, which is the first half:**

    .rux--header__action:focus     { border-color: var(--rux-focus); outline: none }
    .rux--search--expandable
      .rux--search-magnifier:focus { outline: 2px solid var(--rux-focus) }

A border draws INSIDE the element and an outline draws OUTSIDE it. Every other
control in this header rings within its own 48px; the magnifier needs 2px above
the header, and above the header is off the page.

**AND THE CONTROL WAS ALREADY HALF A PIXEL PROUD, which is the second.**
Measured: the magnifier read top **-0.5**, bottom 47.5, against Account at 0 and
48. The search is 48px (`size-lg`, matched to the header actions) and
`.rux--header__global` is 47 -- the header's 48 less its bottom border -- so
`align-items: center` split the difference. Half a pixel is invisible on an icon
and is not invisible on a ring: it is the difference between a ring that starts
at 0 and one that starts above the page. So the ring wanted -2.5 to 49.5 and the
browser had nowhere to put the first 2.5px.

**BOTH FIXED, AND EACH ON ITS OWN SIDE OF THE LINE.** `outline-offset: -2px`
goes in `rux-overrides.css` -- a component rule at Carbon's own specificity, no
`!important`, which is what that file is for -- and puts the ring inside the
box, where the header actions' borders already sit. `align-items: flex-start`
goes in sch.css, because the wrapper is this app's, and it puts all three
controls on one top edge. The 1px the control then overhangs at the bottom is
clipped by nothing: every ancestor reads `overflow: visible`, checked.

**IT IS OURS AND NOT A rux-ds BUG, which is why no request was filed.** Carbon's
expandable search is designed for a page with room around it. Putting it flush
against the top of a 48px shell header is this app's decision, so the correction
is this app's too.

**MEASURED AFTER: magnifier 0 to 48, Account 0 to 48, top edges equal; outline
2px solid at offset -2px; the ring spans 0 to 48 and is fully inside the
header.** Before: ring -2.5 to 49.5, top edge off the page.

**AND THE MEASUREMENT NEARLY DID NOT HAPPEN, which is worth the line.** Three
readings in a row reported `outline-style: none` and `outline-offset: 0px` with
the rule plainly loaded and last in the cascade -- because `document.hasFocus()`
was **false**: the browser pane held the element as `activeElement` while the
window itself was unfocused, and `:focus` cannot match in a document that does
not have focus. A click into the page first, and every reading changed. A focus
style cannot be measured from an unfocused window, and the failure looks exactly
like a rule that is not applying.

**NOT DONE.** Only `:focus` was looked at, not `:focus-visible` -- Carbon's rule
is on `:focus`, so the ring shows for a mouse press too, which is Carbon's
choice and was not changed. The other two header actions were not re-measured in
every theme; `--rux-focus` is one token and the geometry is what moved here.

**2026-09-11 - the result list is navigable by keyboard, and building it found
ARIA I had already got wrong.** rux asked for keyboard navigation; the pattern
page specifies it exactly: "the ARROW keys should cycle through displayed
suggestions, with ENTER choosing a suggestion and ESCAPE allowing the user to
exit the type-ahead menu without selecting anything."

**THE ROLES WERE INVALID AS SHIPPED, which the feature exposed rather than
caused.** `role="listbox"` sat on the results CONTAINER -- which also holds the
count line and the over-cap note, neither of which is an option -- and its
rows were `<button>`s inside `contained-list-item` divs. A listbox's children
must be options. So the listbox moved onto the `contained-list` itself, the
item wrappers take `role="presentation"` so Carbon's styling survives while the
tree ignores them, and the button carries `role="option"`. The count and the note
are now siblings of the list rather than contents of it.

**AND THE FIELD IS A `combobox`, NOT THE CAPTURE'S `searchbox`.** Carbon's
expandable search is captured with `role=searchbox` because nothing hangs off
it; this one owns a list of suggestions, and a searchbox has no way to say which
suggestion is current. `aria-activedescendant` is how that is said without focus
ever leaving the field -- which is the point of the pattern: the query stays
editable while the arrows walk the list. Options are `tabindex=-1` for the same
reason; tabbing through twelve results to leave the search is the alternative.

**`check.mjs` CAUGHT THE FIRST ATTEMPT AND WAS RIGHT TO.** `aria-controls` named
a list id that JavaScript minted at render time, and the ids gate fails on a
reference it cannot resolve. The fix is better than the thing it rejected: the
count, the list and the note are all static in index.html now and only their
CONTENTS change, so the id is real in the file and the three parts stop being
rebuilt on every keystroke.

**ESCAPE IS TWO-STAGE, which is that last clause of the spec read literally.**
Carbon asks for an escape from the MENU, not from the search: the first press
closes the list and leaves the query alone -- measured, "memorial" still in the
field -- and only a second collapses it. Enter with nothing highlighted takes the
first row, because a person who typed a destination and pressed Enter meant the
obvious one and doing nothing reads as a broken key.

**A POINTERMOVE MOVES THE HIGHLIGHT TOO**, so the mouse and the keyboard cannot
disagree about which row Enter would take -- without it, hovering row 9 while row
2 is highlighted leaves two rows looking current and Enter taking neither.

**THE ARROWS SCROLLED THE COUNT AWAY, AND THAT IS WHY ONLY THE LIST SCROLLS
NOW.** The whole box was the scroller, so `scrollIntoView` on the highlighted
option scrolled everything: measured `scrollTop: 32` after four presses of Down,
exactly the count's height. A flex column with the list as the one scrolling
child pins the count above and the note below. Re-measured after twelve presses:
outer scroll 0, list scroll 122.5, count still in view, highlighted option still
in view.

**DRIVEN.** Twelve options; Down from nothing takes the first and Up from
nothing takes the LAST; both ends wrap; Home and End jump; `aria-activedescendant`
matches the selected option on every reading and exactly one row is lit at a
time; Enter on the third result moved the board Sep 7-13 2026 to Jan 11-17 2027,
collapsed the field and selected the Fort Worth bar.

**A MISTAKE IN METHOD, WORTH THE LINE.** Two of the edits in this pass were
written with `str.replace` and no assertion, and one silently did not match --
so the old `searchNote` stayed, kept calling `replaceChildren` on the container,
and deleted the very static markup the new code depended on. The symptom was a
list that navigated correctly by `aria-activedescendant` while reporting zero
options to the page. Every replacement in this file should assert its count
first; the two that did are the two that were right.

**NOT DONE.** No type-ahead before typing -- Carbon describes recent searches in
the panel for an active search and there are none. Nothing announces the result
count to a screen reader when the list changes; the count is drawn but the
listbox has no live region, so an assistive user hears only what
`aria-activedescendant` names. And `docs/gate-coverage.md` is still at
`52efa52`, now with a combobox it has never seen.

**2026-09-11 - a result row carries all four fields, and the layout was chosen
from a count rather than from taste.** rux wanted destination, organization,
booking contact and date in each row, and asked which configuration.

**ONE NUMBER DECIDED IT. Counted over 737 live trips:**

    destination    empty   0%   median 14   p90 18   max 53
    organization   empty   2%   median 17   p90 25   max 46
    booking contact empty 60%   median 13   p90 17   max 27

**A column for the booking contact would be blank more often than filled**,
which is what ruled out the four-column version -- the list would read holey
down its third column on three rows in five. It is also never equal to the
organization (0% of rows), so when it IS present it adds something rather than
repeating, and it is a person's name: short, and no threat to a row's width.

**SO IT IS APPENDED, NOT PLACED.** The second line joins organization and
contact with a separator, and on the 60% with no contact the line simply ends
after the organization with nothing missing on screen.

**AND THE DATE IS THE ONLY FIELD THAT CAN BE A COLUMN, which is why it is the
only one moved.** It is the sole field that is both short and always present --
destination runs to 53 characters and organization to 46 -- so right-aligned it
lands on the same x in every row. That column is what tells seven "Dallas, TX"
apart at a glance, which is the question the old single-line meta could not
answer. Measured after: every `__when` in the list has its right edge at 1151,
one value across all rows, and every row is 62px whatever it holds.

**BOTH TEXT LINES TRUNCATE RATHER THAN WRAP**, so a 53-character destination
cannot push a row to three lines and bend the date column. "Tynan High School 213
W Walton St, Skidmore, TX 78389" was checked live: `white-space: nowrap`, and at
949px it still fits in 370px with room, so today's longest destination does not
even reach the ellipsis.

**A RULE I EXPECTED TO NEED WAS NOT NEEDED, and measuring is the only reason it
was not written.** `.rux--contained-list-item__content` computes `inline-block`,
which normally means a `space-between` child has no width to work against -- the
same class of fault as the inert `flex-direction` recorded below. Measured
instead of assumed: the button already spans the full 949px, so the title row
splits correctly with nothing added. One fewer rule on a Carbon class.

**NOT DONE.** The booking contact is shown but not searched differently from the
other two -- a query matching only a contact still shows the organization first,
which is right, but nothing says WHICH field matched beyond the bolding. No
second line for trips that have neither organization nor contact: they read "No
organization", which is honest and untested against real data, since only 2% of
rows lack one.

**2026-09-11 - the search animation ran the wrong way, and fixing it exposed a
second bug that only existed on the way back.** rux: "review the search
animation it may be a bit off or the wrong direction." It was, and neither fault
is visible in a screenshot -- both were read frame by frame off
`getBoundingClientRect` during the transition.

**IT EXPANDED RIGHTWARD FROM A MAGNIFIER THAT HAD ALREADY TELEPORTED.** Carbon
transitions the search's WIDTH and says nothing about which edge holds still --
that falls out of the layout it is dropped into, and this layout got it
backwards. Measured: at t=0 the field sat at 1119-1167; at t=3ms it was at
218-266, the magnifier having jumped **901px leftward in one frame**; then the
field unrolled RIGHTWARD, its right edge sweeping 266 -> 857 -> 1167 over 79ms.
The cause is that the wrapper's `flex` change is instantaneous while the width
is what animates, so with the default `flex-start` the growing field was pinned
to the wrapper's left edge.

**`justify-content: flex-end` IS THE WHOLE FIX for that half.** The right edge
is anchored, so the width transition plays out leftward and the icon stays under
the cursor that pressed it -- which is what makes Carbon's reason for putting
search furthest left true of the SEARCH and not only of the icons beside it.

**AND THEN THE COLLAPSE WENT TO ZERO, which the expand had been hiding.** With
the growth scoped to `:has(.rux--search--expanded)`, removing the class took the
wrapper's `flex: 1 1 auto` in the SAME frame as the field's `inline-size: 100%`.
The wrapper became shrink-to-fit while its only child asked for 100% of it, and
a percentage of a parent sized by that percentage resolves to zero: measured,
the field held **0px for 72ms** before popping to 48. Nothing about the expand
showed this, because on the way out the wrapper was growing into a definite
width before the field needed to measure against it.

**SO THE WRAPPER GROWS AT ALL TIMES NOW.** It has a definite width in both
directions and the transition has something real to run against. The 949px box
it leaves in the header while collapsed costs nothing: no background, no border,
the magnifier at its right edge under `flex-end` exactly where the other icons
sit, and nothing behind it in the header to click.

**MEASURED AFTER, BOTH WAYS, AND THEY ARE SYMMETRIC.** Expanding: 48, 305, 639,
845, 940, 949 with the left edge running 1119 -> 862 -> 528 -> 322 -> 227 -> 218.
Collapsing: 949, 692, 358, 152, 56, 48 with the left edge running back 218 ->
475 -> 809 -> 1015 -> 1111 -> 1119. The right edge reads 1167 in every frame of
both, no frame is zero, and Account does not move.

**WHAT THIS COST TO FIND, AS A NOTE ON METHOD.** Two of the three readings taken
here were wrong before they were right: one rAF loop was starved and sampled at
1000ms intervals, missing the whole 70ms transition and suggesting the collapse
was instant; another asserted the wrong starting state and measured a collapse
that had already happened. A transition is measured by asserting the state
first, then sampling on a timer short enough to land inside it.

**NOT DONE.** `prefers-reduced-motion` is not honoured -- Carbon's own 70ms
transition is not wrapped in a query either, so this would be a change to the
component's behaviour rather than to this app's, and the app adds no motion of
its own. The results list appears with no transition at all, which is its own
choice and was not examined here.

**2026-09-11 - the results attach to the field, and the header panel they were
in was the wrong component all along.** rux, on the rendered version: "is this
right panel the only option?", then a Carbon capture and "i like the fill width
results attached liek in this pic".

**IT WAS NOT THE ONLY OPTION AND CARBON SAYS WHICH ONE IT SHOULD HAVE BEEN.**
`patterns/search-pattern` names three kinds -- basic (routes to a results page),
active ("results are shown immediately below the search field"), focused -- and
what this is, is active. The panel was `rux--header-panel`, the component the
switcher and the account use, and that is a full-HEIGHT shell panel. Measured
with ten results open: 256x1103 holding 659px of list, so **444px of it was
empty surface**, and three of the ten rows wrapped their second line at its
fixed 16rem.

**NOW IT IS A MENU UNDER A FIELD.** `.sch-search__results` hangs off the search
wrapper's inline edges, so it is the field's width by construction rather than
by a number repeated in two places; `--rux-layer` with `.rux--menu`'s own
`0 2px 6px var(--rux-shadow)`; height its content, capped at 60vh so a long list
scrolls inside itself and the board stays visible behind it. Measured after:
field 384 and results 384, attached at a 0px gap, 643px tall, **zero rows
wrapping**.

**AND THEN IT TOOK THE WHOLE EMPTY HEADER, on rux's ask: "can i make the seach
expand all the empty space like the ibm demo?" Yes, and nothing Carbon owns had
to change to do it** -- which is the part worth keeping, because the obvious fix
would have been to reach up and restyle the shell. Measured at 1263 before
touching anything: `.rux--header__global` is ALREADY `flex: 1 1 0%` and already
spans 1045 of those pixels, from the app name's right edge to the header's. It
simply right-aligns its children, which is why the collapsed square sits at the
far end beside Account and the Switcher. The only thing missing was for this
app's own wrapper to claim the slack while expanded. So there is no rule on
`__global`, here or in rux-overrides.css.

**MEASURED AFTER: the field runs 218 to 1167 -- 949px, the app name's edge to
Account -- and Account and the Switcher DID NOT MOVE**, 1167 and 1215 before and
after. That is Carbon's own stated reason for putting search furthest left,
holding in practice: "to allow for an expanding search field that does not
disrupt other icon positions". The results follow to 949 with no second rule,
since they are pinned to the wrapper's inline edges rather than carrying a width.

**`min-inline-size: 0` IS NOT DECORATION.** A flex item will not shrink below
its content, so without it a narrow header pushes Account and the Switcher off
the end instead of shrinking the field. And the growth is scoped to
`:has(.rux--search--expanded)` -- always-on would leave a 949px hole in the
header with a magnifier at the far end of it.

**24rem WAS MEASURED, NOT LIKED.** 16rem came from the header panel's width and
was never a decision; the second line carries a date and an organization, and
"Aug 26, 2026 · McAllen Memorial High School" does not fit 256px. The field
expands leftward into empty header, so the extra costs nothing that was in use.

**THE MATCH IS BOLDED IN PLACE, which is the half of the capture that does the
work.** It answers the question a result list otherwise leaves open: why is this
row here. "Spring Branch, TX" for "memorial high school" looks like a mistake
until the second line shows the words bolded inside "McAllen Memorial High
School". **Built as text nodes and a `<strong>`, never as HTML** -- every value
in these rows is a customer's, and this file writes them with `textContent`
everywhere else for exactly that reason. The needle is the SANITISED query, the
same string the database was asked with, so what is emphasised is what actually
matched rather than what was typed.

**AND TWO OF CARBON'S BEST PRACTICES WERE BEING MISSED, both from the same
page.** "Always include the number of search results, including for searches
with no results" -- there is a count line now, and past the cap it says "More
than 12 trips match" rather than inventing a total, since only cap+1 is fetched.
"Avoid dead ends: if a search returns No results, suggest a follow-up action" --
the empty state now names the three columns it looked in, which is the useful
suggestion when a dispatcher has typed a bus number or a driver.

**THE RESULTS HIDE WHEN THERE IS NOTHING TO SAY**, which the panel never needed
to: a panel with no content was still a panel, but a shadow floating under the
header with nothing in it is a defect.

**NOT DONE.** Still no keyboard navigation of the list -- arrows and
Enter-to-first are exactly what this shape invites and nothing binds them, which
is the largest remaining gap now that it looks like a typeahead. No recent
searches, which Carbon's active search describes for the pre-typing state. The
cap is 12 with no paging. Not measured below md, where a 24rem field is wider
than a 375px screen and the expanded state would need its own width.

**2026-09-11 - the search reaches every trip and the field expands, which
replaced both halves of the entry below on the same day it was written.** rux:
"i want the seach to search all trips. by organizations and booking contact and
destination?" with a link to Carbon's `components-search--expandable-with-layer`,
"and can we make the it expandabel variant?"

**ALL THREE FIELDS ARE PLAIN COLUMNS ON `trips`, CHECKED RATHER THAN ASSUMED.**
A live row was read before any query was written: `destination` is the
destination, `customer` is the organization (a sampled row reads "Mission
CISD"), and `booking_contact_name` sits denormalised beside
`booking_contact_id` -- 93 columns, and the three that were asked for need no
join. `docs/backend-inventory.md` says "booking plus five trip contacts, each
name, phone, email, id", which is true and does not say which of those are
columns on `trips`; reading the row did.

**ONE `or` OF THREE `ilike`s, SANITISED FIRST, AND THE SANITISING IS NOT
COSMETIC.** PostgREST parses `or=(a.ilike.*x*,b.ilike.*x*)` as a LIST, so a
comma, parenthesis or backslash typed into the field does not error -- it
re-parses into DIFFERENT filters and returns a confident wrong answer. Those are
stripped before interpolation, and `%` and `*` with them, since a typed wildcard
would otherwise widen the match with nothing on screen saying so.

**DEBOUNCED AT 200ms AND SEQUENCED, because the second one is the bug that
would have been blamed on the database.** Replies can land out of order, so a
slow query for "dal" can overwrite a fast one for "dallas" and leave the panel
showing results for text the field no longer holds. Every run takes a token and
checks it after the await; a stale reply is dropped.

**A RESULT IS A WEEK CHANGE FIRST AND A SELECTION SECOND.** A match may be on
any date, so the cursor moves to the week of its `start_date`, `show()` re-reads,
and only then does a bar with that trip id exist to click. Driven: from Sep 7-13
2026, picking "Austin TX, May 30 2027, Mission CISD" moved the board to **May
24-30 2027**, collapsed the search, closed the panel, marked exactly one bar
pressed and opened its editor. **A trip can be on the week and still have no
bar** -- no bus yet, or a leg outside the seven days -- and the week still moves,
with a toast saying why rather than a silent nothing.

**THE FIELD IS CARBON'S EXPANDABLE VARIANT, copied from
`components-search--expandable` in `carbon-react-dom.json`.** Three things in
that capture are load-bearing and none is this app's invention: the MAGNIFIER is
the trigger, a `role=button` with `aria-expanded` and `tabindex=0` rather than a
`<button>`; the INPUT is `tabindex=-1` while collapsed, so a tab cannot land in
a field 0px wide; and the container carries `role=search`. All three move
together here, because **rux-ds ships no search module** -- `js/` has seventeen
and none of them is one -- so the class and both attributes are this app's to
set. Enter and Space are wired by hand for the same reason: a `role=button` is
not a button.

**AND IT NEEDED A BOX TO EXPAND INTO.** `.rux--search--expandable.rux--search--expanded`
is `inline-size: 100%`, and 100% of nothing is nothing: `rux--header__global` is
a flex row of fixed squares. `.sch-header-search` is that box, and the expanded
width is 16rem -- Carbon's own `header-panel--expanded` figure, read from
rux.css rather than chosen, so the field and the results beneath it are one
column. Collapsed it is a 48px square and needs no rule at all: Carbon sizes it
from `--rux-layout-size-height-local`, which `rux--layout--size-lg` in the
markup sets to the same 48 the two header actions use. Measured: 48 collapsed,
256 expanded, `tabindex` -1 then 0, `aria-expanded` following.

**IT IS THE ONE CONTROL IN THIS HEADER `ui-shell.js` DOES NOT OWN, and that is
deliberate rather than an oversight.** That module claims
`.rux--header__action[aria-expanded]`; this trigger is Carbon's magnifier inside
a search component, so it does not match. The panel class is therefore set here
-- the same class, on the same element, so the panel behaves exactly as the
switcher's and the account's do.

**THREE FAULTS OF MY OWN, ALL FROM EDITING BY REPLACEMENT.** Twice a block was
rewritten whose range also held declarations that belonged to a different
concern -- first `searchSeq`/`searchTimer`, then `SEARCH_MIN`, `searchSafe` and
`searchTrips` -- and both times the page threw `ReferenceError` and the panel
rendered nothing at all, including its own "no match" note. The lesson is the
symptom: a search that shows an EMPTY panel rather than an error looks like a
query returning no rows, and both times the console said otherwise. Read the
console before believing a blank result. Third, a panel measured 2px twice and
was a reading taken mid-transition both times -- `width 0.11s` -- which is
recorded below and was re-learned here anyway.

**DRIVEN.** "a" gives the minimum-length note; "mission" and "austin" each give
12 rows and "More than 12 match"; "zzzqqq" gives "No trip matches."; results
span 2026 and 2027, matching on organization and destination in the same list;
Cmd-K and Ctrl-K expand and focus, again collapses; Escape collapses; a press
outside collapses; the clear button hides when the field empties.

**NOT DONE.** No keyboard navigation of the results -- they are tab-reachable
buttons and nothing binds arrows or Enter-to-first. No highlight of the matched
substring. The cap is 12 with "more than" rather than paging. Cancelled trips
are excluded with no way to include them. It does not search bus number, driver
or trip reference, which the week-scoped version did reach by reading rendered
text. Not measured below md, where a 16rem field over a 375px board is most of
the header. And `docs/gate-coverage.md` is still at `52efa52`.

**2026-09-11 - the header carries a search, and what it searches is the week on
screen.** rux asked where search belongs -- "ui header ? or shedule toolbar?" --
then "add the header search icon and cmd-k for now".

**THE ANSWER WAS ALREADY WRITTEN DOWN IN THREE PLACES.**
`docs/screen-inventory.md` line 51 plans a trip finder on Cmd-K: "Header search
from the shell, results in a data table on a page. Keep the shortcut." Carbon
agrees and is specific: `components/ui-shell-header/usage.mdx` lists search
among "system-level functions such as profile, search, notifications" and orders
the global icons -- search "as the furthest left icon ... to allow for an
expanding search field that does not disrupt other icon positions", Account 2nd
from the right, Switcher furthest right. This header already ran Account then
Switcher, so search went in front and nothing moved.

**AND THE TOOLBAR IS THE RIGHT HOME FOR A DIFFERENT FEATURE.** Carbon's data
table toolbar search is "global data table controls including search", following
the active-search pattern: it filters the rows in front of you. That is "narrow
this week", not "find a trip in March". `rux--toolbar-search-container--expandable`
is compiled if that is ever wanted; the two are not alternatives.

**IT COST NO NEW COMPONENT, which was checked before building rather than
assumed.** Carbon's own header stories render search as exactly
`header__action` + ghost + icon-only with `aria-label=Search`, and ship no
`header__search` at all -- so the classes were already on the two buttons beside
it. The captures wrap it in an icon tooltip; the two buttons here do not, and
matching its own header beat matching a story.

**THE PANEL IS THE THIRD OF ITS KIND AND NEEDED NO TOGGLE CODE.**
`js/ui-shell.js` takes any `__action[aria-expanded]`, resolves the panel through
`aria-controls`, sets `--expanded` and `__action--active`, and fires
`rux:header-panel-opened` -- so this file listens for that to take focus and
owns no open state, exactly as the switcher and account panels own none.

**WHAT IT SEARCHES IS THE HONEST PART.** The trips page that
`screen-inventory.md` wants results to land on does not exist. Rather than an
icon that opens a promise -- index.html says it two panels down, about the
sign-in button: "a button with no handler is an affordance that lies" -- this
searches the week already loaded and selects the bar. The haystack is each
bar's own `textContent` plus its row's bus number, read off the rendered page,
so the search can never claim a match the eye cannot then find. Driven:
"dilley" one row, "paragon" one, "218" two, "dallas" seven, "zzzz" the empty
note, "tx" twelve rows and "9 more match".

**AND A RESULT CLICKS THE BAR RATHER THAN OPENING THE PANEL, which was wrong in
the first draft and caught by measuring.** Selection is not this file's:
`sch.js` owns it on its own delegated handler that moves `aria-pressed` between
bars, and `openPanel` knows nothing about it. Calling `openPanel` from a result
opened the editor on a bar the board did not show as selected, and the roster's
"who is free THEN" column -- which `markAvailDay` keys off
`.sch-bar[aria-pressed="true"]` -- stayed dark. Measured both ways: the direct
call marked 0 bars and lit 0 roster cells; clicking the bar marks 1 and lights
40, with the head on "Su", which is the day the trip it found actually runs.
The guard is because that handler TOGGLES -- clicking an already-selected bar
would deselect it, right for the board and wrong for "take me to this one".

**A DRAFT RULE WAS INERT AND SAYING SO IS THE POINT.**
`flex-direction: column` was put on `.rux--contained-list-item__content` to
stack the two lines of a result. That element computes `inline-block`, so the
direction applied to nothing and the lines stayed together -- a wrong
`flex-direction` shows as no change at all, which is why it was found by reading
the computed display rather than by looking. The spans are this app's own, so
`display: block` on them stacks the rows and leaves Carbon's choice of display
alone. **A claim of mine about that was also too strong and is corrected here**:
I called it an AGENTS.md breach, and sch.css already carries four rules on
`rux--*` classes -- `.sch-row-head .rux--popover-container` and three on
`.sch-times` -- all scoped under an `sch-` ancestor to lay a Carbon component
out inside an app component, which is a different thing from restyling it.

**AND A 2px PANEL WAS A MEASUREMENT TAKEN MID-TRANSITION, not a defect.** The
panel read 2px -- its two borders -- which looked like content with no width.
`.rux--header-panel--expanded` is `inline-size: 16rem` with a `width 0.11s`
transition; read once settled it is 256px. Recorded because the reading looked
exactly like a real fault.

**DRIVEN: ** icon first in `__global`; Cmd-K and Ctrl-K both open and focus the
field; Cmd-K again closes; Escape closes; the clear button hides when the field
empties; picking a result closes the panel, selects the bar, scrolls it into
view and opens its editor.

**NOT DONE.** It searches ONE WEEK -- the one on screen -- and says so in its
placeholder; the trips page and a find across all dates are the next piece and
this is the step under them. No keyboard navigation of the results: they are
tab-reachable buttons and nothing binds arrow keys or Enter-to-first-match. No
highlight of the matched substring. The results list is capped at 12 with a
count of the rest, and the cap is not configurable. Not measured below md, where
a 16rem panel over a 375px board is most of the screen.

**2026-09-11 - two answers from rux, one closing a defect's remaining half and
one declining a change.**

**THE DUPLICATE DRIVERS WAIT FOR THE DRIVER PAGE.** rux: "the duplicate rule
will have to be fixed when the driver page is added." The entry below leaves
three pairs -- Benny, Ernesto, Vasquez -- half resolved, because in each the
second driver's recorded `name` IS the short label and there is no longer form
to put in a title. That is a data gap in `drivers`, the rows are authored
elsewhere, and nothing here should invent a surname. **So it is no longer an
open item for this app**: it is a thing the driver page will own when
`screen-inventory.md` gets to it. The title stays as the best this pane can do
until then.

**THE DAY LABELS STAY START-ALIGNED, and the measurement is the argument.** rux
asked: "does it make sense to center the Tue 8 dates horizontally on the
schedule?" Measured at 1440x950, every day label sits 12px from its column's
left edge and every bar's text sits at the same 12px -- labels at 431, 570, 709,
848, 987, 1126, 1265 and bar text at 431, 710, 848, 987, 1265, identical to the
pixel. That shared vertical line is not decoration: **this board draws no
vertical rules between days**, six having gone on 2026-09-07 and only two
remaining, neither of them a day boundary. The label's left edge IS what says
where a column starts, and centring would delete that cue on five of seven
columns.

**AND A BAR IS A SPAN ANCHORED TO ITS START DAY**, not a value centred in a
cell -- it draws from that day's left edge outward. A centred header over a
left-anchored span points at the middle of nothing, some 50px right of the thing
it names.

**THE ROSTER DOES THE OPPOSITE AND IS RIGHT TO**, which is worth writing down so
the two are not "fixed" into agreement later. Its day letters are centred
because its content is a 32px square mark filling the cell. Centred label over
centred mark; start label over start-anchored span. Different content shape,
different rule.

**WHAT WOULD CHANGE IT:** per-day vertical rules coming back, since then the
rule marks the boundary and the label is free to float. Not proposed.

**2026-09-11 (fifth pass) - the driver name cell carries its full name, and it
resolves the duplicate drivers only halfway.** rux asked for the title and for
the reasoning first.

**IT IS NOT A TOOLTIP REPEATING THE CELL.** `drawAvailability` renders
`short_name || name`, so the column shows "Cortinas", "All Valley", "Andy" --
the long form is information it is actively dropping, not a restatement. The
busy cell beside it has carried `driver.name` since it was written, for the same
reason. Measured after: 34 of 40 cells take a title and none of the 34 duplicates
its own text.

**THE COLUMN IS ALSO NARROWER THAN IT WAS**, 96px against 152 since the day
cells went to 32 in the pass below, which is the argument `.sch-row-head` makes
on the board: capacity and type moved to the title so the column could be narrow
and a hover could still answer which bus it is. Today's widest name clears 96 by
7px; the next longer one will not, and this is what makes that ellipsis
recoverable.

**ONLY WHERE IT ADDS SOMETHING.** Six drivers have `name` equal to `short_name`
and take no title, because a tooltip duplicating the text under it is noise on
screen and, in some readers, the name announced twice. Same shape as the
`if (day.off || busy)` guard beside it.

**AND THE DUPLICATE-DRIVER DEFECT IS ONLY HALF ANSWERED, WHICH WAS CLAIMED MORE
STRONGLY THAN IT DESERVED BEFORE IT WAS MEASURED.** docs/log.md has carried
"two Bennys, two Ernestos ... make the roster ambiguous in the one pane meant to
resolve it" since 2026-09-07, and this was offered as the answer to it. Driven:
there are THREE duplicated labels, not two -- Benny, Ernesto and Vasquez -- and
in every pair exactly ONE half gets a title:

    Benny     (none)              Benny     Baudelio Morales
    Ernesto   Ernesto Flores      Ernesto   (none)
    Vasquez   Jose Vasquez        Vasquez   (none)

The untitled half of each pair has `name` equal to `short_name` in the database:
that driver's recorded full name IS "Benny". So the pair is now distinguishable
only by one of them having a tooltip and the other having none, which is a
distinction by absence and a poor one. **The remaining half is a data gap in
`drivers`, not a rule this app can write** -- the rows are authored elsewhere,
and nothing here should invent a surname.

**WHAT THIS DOES NOT DO, AND IT IS WORTH BEING PLAIN.** `title` is hover only.
On a non-interactive div it is not keyboard reachable and not reliably
announced, so this makes an ambiguous or clipped name RECOVERABLE BY MOUSE and
does not make the column accessible. Telling two Bennys apart without a mouse
still needs something in the cell itself.

**NOT DONE.** The data half above -- three pairs, three drivers with no distinct
full name recorded. No `title` on the board's own bar driver line, which renders
the same `short_name || name` and has the same gap; only the roster was asked
for. And nothing gates against the title regressing: `check.mjs` cannot see an
attribute built at runtime, which is the same hole `docs/log.md` recorded for
`svgUse` on 2026-09-08.

**2026-09-11 (fourth pass) - the roster's day cells are 32 wide and still 24
tall, and the reading that justified the width was wrong.** rux: "does the grid
have enough horizontal space to make squares the next size up? or should i just
widen them? or 32x32?"

**THE ANSWER WAS YES TO WIDTH AND NO TO HEIGHT, and the two axes cost different
things.** The aside is a fixed 20rem = 320px and `--sch-head-w: minmax(0, 1fr)`
makes the name column the remainder, so every pixel the days take comes off the
names: seven columns at 32 take 224 and leave 96. Height is the expensive axis
-- `--sch-avail-h` is untouched at xs, because measured at 1440x950 the roster
shows every one of 40 drivers at 24px tall and 35 at 32px, and driver count is
the exact currency the 2026-09-08 decision was settled in after this number
turned 24, 32, 24, 32, 24. Widening does not reopen it. Only 24, 32 and 40 were
ever candidates: `--rux-layout-size-height-*` ships xs/sm/md and 30 would have
been an invented size.

**THE PROBE THAT SIZED IT REPORTED A FIT THAT WAS AN OVERFLOW, and rux was told
the wrong number before it was caught.** It measured the name column at 108px
with nothing truncating, and that was offered as "no name truncates and the
padding does not need touching". Both halves were false. `.sch-avail__grid`
carries `.sch-grid` as well, and `.sch-grid` is `inline-size: max-content` --
which the BOARD needs, so its seven columns can total more than the pane and
scroll under a sticky bus column. The roster inherited the wrong half: its
columns are a fixed token width and always fit, but `max-content` let the name
column refuse to shrink, and `minmax(0, 1fr)` cannot do its job against a box
already sized to content. The 108 was the name column's own content width, and
the grid had run to **332.195px inside a 320px pane** -- a 12px horizontal
scroll on the roster that nothing asked for.

**IT HAD BEEN HIDING AT 24px.** 108 + 168 = 276, under 320, so the
`min-inline-size: 100%` floor won and the column stretched to 152. Widening the
days pushed the total past the pane and the latent fault surfaced. The note on
`--sch-head-w` had claimed since 2026-09-08 that a long name "would ellipse
rather than push the squares out of the panel"; it could not, and nothing had
tested it because nothing had made the sum exceed the pane.

**FIXED IN TWO PLACES, AND THE SECOND ONE IS WHAT THE FIRST COST.**
`.sch-avail__grid` is `inline-size: 100%` now, so the grid is its pane and the
name column takes the true remainder of 96. At `spacing-05` of padding that
ellipses the two longest names -- "Vicente Solar" at 105px and "Prudenciano" at
101 -- and the name cell carries no `title`, so a truncated driver would be
unrecoverable. The padding is `spacing-03`, which takes the widest to 89 and
clears 96.

**VERIFIED AFTER, on the pinned grid rather than the overflowing one.** Template
`96px 32px x7` = 320 against a 320px pane, horizontal overflow **0**, zero of 40
names truncated, cells 32x24, row height unchanged so driver visibility is
unchanged, and the board's own grid still sized independently. The header band
still carries no vertical rule and the name column still carries its own.

**NOT DONE.** The overlay below md sets both axes to sm and is untouched, so the
phone still has 32x32 squares -- correct there, and not re-measured against this
change. The name cell still has no `title`, so the ellipsis remains a real loss
if a longer driver name is ever added; 96px is 7px of headroom over today's
widest, which is thin. `docs/gate-coverage.md` is still at `52efa52`.

**2026-09-11 (third pass) - the bus column's vertical rule is back, and the
entry that removed it had already written the condition for its return.** rux:
"should we add a vertical border back beetween bus column and monday/sunday
column?" Yes, and the file said so first.

**THE REMOVAL CALLED THIS EXACTLY.** `.sch-row-head`'s comment, written
2026-09-07: "WHAT IT COST, AND IT IS NOT NOTHING. This column is sticky and
paints `--rux-layer`, the same surface the tracks paint, so when the week is
wider than the pane and the board scrolls sideways, bars now pass UNDER an
invisible edge rather than a drawn one. At the 8.5rem day floor that is a real
week, not a hypothetical. **If it reads badly, this one line comes back and the
corner's with it -- they are a pair.**" It read badly. Both came back.

**MEASURED BEFORE TOUCHING IT, at 900px where the week overflows by 516px.**
NINE bars sat under the sticky column at once. The head computes
`rgb(38,38,38)` and the track `rgba(0,0,0,0)` over the identical `--rux-layer`,
and neither the head nor the corner carried a border or a box-shadow -- so there
was no surface change, no line and no shadow marking the boundary. Nothing at
all. The header showed it plainest: **"Wed 9" clipped to "ed 9"**, a word cut in
half by an edge the eye cannot see.

**AND THE CORNER'S COMMENT HAD BEEN WRONG FOR FOUR DAYS.** It read "THE HEADER
BAND STAYS OPEN AT THE CORNER. **The body keeps its divider**, where it
separates bus identity from trip content." The body did not keep its divider --
`.sch-row-head` lost its rule later the SAME DAY -- so that sentence described a
line that had not existed since 2026-09-07. It is corrected in place rather than
deleted, with what it used to say kept. This is the second stale claim this
week's passes have found in a comment describing a neighbour rather than itself.

**ITS OBJECTION WAS ALSO SPENT.** "Competed with the active day rule" was true
when the header carried vertical rules and today was marked down its side; the
header's rules went 2026-09-06 and today is an underline (`inset 0 -2px`) now.
There was no vertical line left to compete with.

**CARBON HAS NO STICKY COLUMN TO COPY.** `rux--data-table--sticky-header`
compiles a sticky header ROW; there is no frozen or sticky COLUMN in the data
table and no guidance page for one. So the instrument is the app's own, and it
is the plainest available: the same 1px `border-subtle-01` the row rules already
draw, on `.sch-corner` and `.sch-row-head` both, so the frame closes in the
token it is already made of.

**THIS IS NOT THE DAY RULES, and the board now carries exactly two vertical
lines on purpose.** Six made it a lattice and went 2026-09-07. What stands is
one where identity meets content -- the only edge content actually slides under
-- and one at the weekend boundary from the pass below. Different jobs,
different places, same token.

**VERIFIED AFTER.** Corner and head right edges both at 80px, so the line runs
the frame's whole height with no step where the bands meet. Every day column
still 136px -- the 1px the column gained did not redistribute -- and the weekend
hairline still paints at 680 against Saturday's header cell at 680. No
horizontal page scroll. `node tools/check.mjs` passes, classes 359, tokens 89.

**AND THE ROSTER TOOK THE SAME PAIR, asked for in the same breath.** rux: "lets
add a vertical border also to right of driver name column in mini grid in
assigments". It is the same fault for the same reason -- `.sch-avail__name` is
sticky, paints `--rux-layer`, and the rule above it in sch.css already said
"rows scroll under it sideways" -- so it takes the same 1px `border-subtle-01`,
and `.sch-avail__day--head` carries the other half because it is that grid's
corner, sticky in both axes exactly as `.sch-corner` is. Measured after: name
and heading edges both at 200px, so the line runs the grid's whole height with
no step; the board's own pair both at 419. Same token in both panes, read live
as #6f6f6f in g90.

**AND THEN BOTH HEADER HALVES CAME BACK OUT, WHICH IS THE VERSION THAT
SHIPPED.** rux, on the render: "i dont want these vertical border to be applied
on the header row. similar rule to weekend border. doesnt cross into header."
The 2026-09-07 note called the corner and the body rule "a pair" and warned that
leaving the corner's out would make the line "start abruptly below the header
band instead of running the frame's whole height". That was the reasoning both
halves were restored on, and it was wrong: a header band is its own surface,
closed on four sides by its own colour, and a rule crossing into it divides
something already divided. Starting below the band is not abrupt, it is the
band ending.

**WHICH COLLAPSES THREE SEPARATE DECISIONS INTO ONE RULE: no vertical line
enters a header band, anywhere on this page.** The weekend is a hairline in the
body and dimmed TEXT in the band. The bus column is a rule in the body and
nothing in the band. The roster's name column is the same. Three marks, one
principle, and it was arrived at by rux looking at the third one rather than by
anything here.

**AND IT CAUGHT A FOURTH CASE THIS SESSION HAD ALREADY SHIPPED WRONG.**
Verifying the removal meant checking every header cell in both grids rather than
the two just changed -- and `.sch-avail__day--boundary` turned up, the WEEKEND
boundary, drawing a vertical line in the roster's header band since the pass
below. The board's header had only ever dimmed its weekend text, so the two
bands had been saying the weekend differently and nobody had looked. The class
is gone from sch.css and from `drawAvailability`. Asserted after: all 16 header
cells across both grids, zero vertical borders and zero background images among
them, while both bands still dim Sat/Sun and Sa/Su.

**THE TWO GRIDS HAD TO MOVE TOGETHER.** They share seven day columns and sit one
above the other, so closing one frame and leaving the other open would have made
a matched pair look like two different components -- the same argument that put
the weekend boundary in both.

**NOT DONE.** The rule is permanent rather than appearing only once the board
scrolls, which is what a shadow on a sticky column would do and what several
data grids outside Carbon use; that was not built, because the divider does a
second job -- separating identity from content -- that holds at every width and
would be lost by a rule that came and went. Not re-measured against
`check-spacing`; `docs/gate-coverage.md` is still at `52efa52`.

**2026-09-11 (second pass) - the band became a line and the notification left
the flow, both because rux looked at the first version and said so.** "not sure
it looks ok for weekend tint to match header color. also the status
notification shifts the entire table. are tehre other optiosn for its
placement?" Two faults, and the first one is mine twice over: I chose the token
and I measured everything about it EXCEPT what it sat next to.

**THE FILL WAS `--rux-layer-accent-01`, WHICH IS THE HEADER BAND'S OWN TOKEN.**
So two filled weekend columns read as the header bleeding down the board rather
than as the weekend -- an inverted L of header colour. The entry below records
measuring that fill against the ROW SURFACE in all eight themes and against the
header in none of them, which is how a token identical to the thing above it
passed a nine-row check.

**AND THE SMALLER STEP ONLY HALF-ANSWERS IT.** `layer-hover-01` is between
layer-01 and the header's accent-01 in most themes -- but measured, hover-01
EQUALS accent-01 in ant-dark (#1f1f1f) and spotify (#242424), the same two
themes whose collapse the entry below already turned on. So the obvious fix
would have left the band header-coloured in exactly those two and nowhere else.
`--rux-background` clears both tests in all nine and was offered; rux chose the
third option instead.

**SO THE WEEKEND IS A BOUNDARY NOW, NOT A SURFACE.** One hairline per
weekday-to-weekend change, `border-subtle-01` at 1px -- the token and width
`.sch-track` already draws its own bottom rule in, so no theme question arises
at all. Monday-first that is one line before Saturday; Sunday-first the weekend
sits at BOTH ENDS of the week, so the changes are at columns 1 and 6 and two
lines bracket it. Column 0 can never be a boundary: the pane's edge is already
there. Measured at 1440: the rule paints at 935px and Saturday's header cell
starts at 935px.

**WHAT THIS IS NOT IS THE DAY RULES COMING BACK.** Six vertical rules went on
2026-09-07 at rux's ask because they made the board a grid and Carbon's data
table draws none. One or two mark a boundary. The lattice was the objection,
not the line.

**AND THE PAIRING FELL OUT.** A fill needed two tokens because it is a SURFACE
and had to differ from the surface under it by a step of the same scale, which
ant-dark and spotify could not supply twice. A hairline does not, so
`.sch-row--unassigned .sch-track` loses its override and there is one rule for
every row.

**THE NOTIFICATION SHIFTED THE BOARD BECAUSE IT WAS IN THE FLOW ABOVE IT**, and
the fix is not one region moving but two regions splitting. Of the sixteen
`say()` call sites, three describe the BOARD -- loading, "Nothing this week", a
week that would not load -- and those stay in `#sch-status`, where pushing the
grid is honest because they stand in for it. The other thirteen report what a
PERSON just did, and those go to `#sch-toast`: fixed, bottom right, over the
page. Measured after a real move: the board moved **0px**.

**CARBON SHIPS THE TOAST'S APPEARANCE AND NO PLACEMENT AT ALL.**
`rux--toast-notification` and `rux--actionable-notification--toast` set 18rem,
`flex-wrap` and a shadow between them, and not one of `position`, `inset` or
`z-index`. So where a toast goes is the consumer's, every time, and
`.sch-toast` in sch.css is this app's answer.

**IT COVERED SAVE, WHICH WAS MEASURED RATHER THAN GUESSED AT.** The side panel
is on the right and its action bar -- Cancel, Reset, Save -- is at its bottom
edge, the same corner a bottom-right toast wants. Measured at 1440x950 with a
trip open: the bar at y 869-918 over x 1072-1392, the toast at y 854-934 over x
1136-1424. Overlapping. It is lifted while the panel is open -- 48px of
condensed action bar, the 32px the panel sits off the page bottom, and the same
16px gutter -- which puts it at y 714-854, a 15px gap above the bar, and
`elementFromPoint` at Save's centre returns Save. Lifted rather than moved to
the other corner because that corner has bus rows in it always, and this one
has three buttons in it only while the panel is open.

**`:has()` RATHER THAN A CLASS TO KEEP IN SYNC.** The panel's open state IS
`[hidden]` and sch-data.js sets nothing else, so `body:has(#sch-panel:not([hidden]))`
reads it directly with no second source of truth. rux.css compiles 221 `:has()`
rules of its own, so it is already a baseline for any page loading it.

**AND BOTTOM RIGHT IS NOT CARBON'S PLACEMENT, WHICH WAS CHECKED AFTERWARDS
RATHER THAN BEFORE.** rux asked what Carbon normally does and whether bottom
centre was an option. Carbon's own source is vendored in rux-ds, and
`carbon-website/src/pages/components/notification/usage.mdx` specifies exactly
one: "Toast notifications slide in and out from the TOP RIGHT of the screen.
They stack with $spacing-03 in-between. New toast notifications should appear at
the top of the list, with older notifications being pushed down until they are
dismissed." Inline goes at the top of the primary content area or beside what it
refers to; callout goes near its element. **Bottom centre appears nowhere, and
neither does bottom right** -- grepped across `usage.mdx` and `style.mdx`. So
this app was already departing and the only question was which departure.

**MEASURED ACROSS ALL THREE, at 1440x950 with a 288px card and a 16px gutter.**
Top right -- Carbon's own -- covers `.sch-toolbar` and its icon buttons, the
week chevrons and date picker and drivers toggle and overflow, which are present
and interactive at every moment. Bottom centre covers `.sch-bar` and
`.sch-bar__row`: trip bars, data rather than controls. Bottom right covers empty
`.sch-track`, and the only control it can reach is the panel's action bar, which
exists only while the panel is open and is already lifted clear of. Carbon's
placement is the WORST of the three here, for a reason particular to this app
and not to the guidance. rux kept bottom right on that evidence; sch.css carries
the reasoning beside the rule, including what would make Carbon's placement
right again.

**AND CARBON BACKS THE DISMISSAL ALREADY BUILT.** Toasts "persist by default",
may be coded to dismiss after five seconds, and should always carry a close
button "because toast notifications cover content on the screen". For ACTIONABLE
toasts it warns specifically to leave enough time "to interact with the button
without the toast closing too soon" -- which is the argument against a timer on
an Undo, arrived at here independently and confirmed by the source afterwards.

**A PLAIN TOAST WAS THE INLINE NOTIFICATION FLOATED, AND IT SPRAWLED.** Caught
by measuring the corner rather than by looking at the happy path: an inline
notification has no width of its own, so "Move undone" came to 383px and a real
foreign-key error to **559px**, stretching the container to 1119 of the
viewport's 1440. It is `rux--toast-notification` now -- Carbon's own component
for this, which sets `inline-size: 18rem` itself, the same figure the actionable
`--toast` carries -- so both shapes take Carbon's number and this file invents
no width. Its structure is flatter and was taken from the capture rather than
assumed: the icon is a DIRECT child and `__details` holds the title and
subtitle, where the inline one nests both inside a `__text-wrapper`. Re-measured
after: **288px**. Below md it fills the width minus the gutters instead, since
18rem would otherwise decide a 375px phone's layout; measured 16 to 359 in a
375 viewport with no horizontal page scroll.

**A TOAST CAN BE DISMISSED AND THE ONE ABOVE THE BOARD CANNOT**, which is the
one behavioural difference between the rooms. `say`'s region is cleared by the
next render; nothing clears a toast -- which is exactly why the undo now
survives a re-read without depending on call ordering, and equally why it would
otherwise sit there for good. So it carries Carbon's close button, and changing
the week clears it: an undo naming a bus that has left the screen would still
WORK, going by assignment id, which is worse than if it did not.

**THE `await show()` ORDERING IS KEPT AND ITS REASON HAS CHANGED**, so the
comment was rewritten rather than left standing. It used to be the only thing
stopping `render()`'s `say(null)` destroying the offer. With the toast in its
own region that is no longer what it buys; what it buys now is that the undo is
not offered, and a failure not reported, against a grid still showing the
pre-move week.

**DRIVEN AGAIN, BOTH BRANCHES, NET ZERO.** The same assignment `5ba30a12`
moved 218 -> 763 and undone, with the toast surviving the re-read and the
closing message carrying no action; then the failure path with a target
rewritten to a UUID no bus has, which the foreign key refused, leaving the trip
on 218 and the error in a 288px toast. The database is where it started.

**NOT DONE.** The lift is measured at one size with one panel variant --
`--condensed-actions`, whose action bar is 48px; the non-condensed 4rem variant
would need 16px more and nothing here reads which is in play, because the token
that would say so is Carbon-internal and does not resolve outside the panel.
Two toasts cannot stack: the second replaces the first, which is right for
undo and unexamined for a save landing on top of a cancel. No timer, by
decision, so a toast waits for the next action, the close button or a week
change. And `docs/gate-coverage.md` is still at `52efa52` and has now not seen
a background, a fixed region, or three notification components.

**2026-09-11 - the weekend is a band and a move can be undone, and the first
of those found a bug in a preference nobody had toggled.** Both items are the
oldest thing on `node tools/open.mjs`: "No undo on a bus move. No weekend tint,
so an empty row still cannot be counted", written 2026-09-07 and repeated in
three entries since.

**THE WEEKEND TEST WAS WRONG, AND ONLY UNDER A SETTING THAT SHIPS.** The header
loop said `if (i >= 5)`, which is Saturday and Sunday only while the week starts
on Monday. "Start on Sunday" is a real saved view option -- `view.sunday`,
`weekStartsSunday` -- and evaluated on a Sunday-first week in the page, indices
5 and 6 are **Friday and Saturday**, while the actual weekend sits at indices
**0 and 6**. So with that preference on, the board dimmed Friday, called Sunday
a weekday, and had done since the preference was built. It is now
`isWeekend(d)`, one rule beside the other date helpers, asked of `getDay()` and
never of the column. Measured after: Sunday-first dims Sun 6 and Sat 12, and the
band paints two stripes at 0-14.29% and 85.71-100%.

**WHICH IS ALSO WHY THE BAND IS NOT `start: 5, span: 2`.** Sunday-first puts the
weekend at OPPOSITE ENDS of the week, so it is not a run of columns and nothing
may treat it as one.

**THE BAND IS A BACKGROUND ON THE TRACK, AND IT HAD TO BE, TWICE OVER.** It is
one `linear-gradient` of seven segments -- every day named, weekdays explicitly
`transparent` -- because a gradient INTERPOLATES between the end of one stop and
the start of the next, so naming only the two weekend days blends fill into fill
across the midweek gap and paints the whole track solid. And it is on
`.sch-track` rather than `.sch-grid` for the reason sch.css already records for
the now-line: a percentage of the grid is a percentage of its containing block,
not of its seven columns. Measured at 1440: band starts at 935px, Saturday's
header cell starts at 935px. At 375, where the grid is `max-content` at 984
inside a 375 pane, 680 and 816 against header cells at 680 and 816.

**AND SETTING IT ON THE GRID FAILED IN TOTAL SILENCE, which is the thing worth
keeping.** Written first as one property on `#sch-grid` left to inherit -- the
obvious way -- the band never appeared: no console error, `background-image:
none`, and the property reading back EMPTY from `getComputedStyle` while the
inline style plainly held it. `var()` inside a custom property is substituted
where that property is COMPUTED, not where it is used. `--sch-weekend` names
`var(--sch-weekend-fill)`, which is declared on `.sch-track` and nowhere above
it, so computing it on the grid had nothing to substitute and the declaration
went guaranteed-invalid -- and an invalid custom property inherits as invalid.
Proved both ways on the served page before changing anything: identical stops on
the grid gave `none`, on the track gave the full gradient. It also means the
pairing below could never have worked from the grid, since one colour would have
been frozen for every row.

**TWO TOKENS, BECAUSE TWO SURFACES, AND THIS ONE WAS MEASURED BEFORE IT WAS
WRITTEN.** `.sch-row--unassigned .sch-track` is already `--rux-layer-hover-01`,
and **`layer-hover-01` and `layer-accent-01` are the same colour in two of the
eight themes** -- ant-dark #1f1f1f and spotify #242424. A single band token would
have been invisible on that row in exactly those two and nowhere else. The
Unassigned row pays `--rux-layer-active-01` instead. Read live in all eight
afterwards, band against the surface under it: white #e0e0e0/#f4f4f4, g10
#e0e0e0/#ffffff, g90 #525252/#393939, g100 #393939/#262626, geist #1a1a1a/#0a0a0a,
linear #202029/#141419, ant-dark #1f1f1f/#141414, spotify #242424/#181818, and on
the Unassigned row ant-dark #303030/#1f1f1f and spotify #333333/#242424. Every
one distinct.

**THE BODY BANDS AND THE HEADERS DIM, which was rux's call between three
options.** The roster takes the same mark -- `.sch-avail__cell--weekend`, placed
BEFORE `--busy` and `--off` so those keep their tag tints and only a FREE
weekend cell bands -- because the two panes share seven columns and banding only
the board puts the landmark on half the height being counted. Neither header
band is touched: both are already their own surface and cutting notches into
them would break a band that reads as one unit.

**THIS IS NOT THE DAY RULES COMING BACK.** They were removed 2026-09-07 at rux's
ask and sch.css keeps the paste. Two bands are a different instrument answering
the question that removal left open -- which sch.css itself framed: "if it
fails, it fails on an empty row and not on a busy one."

**UNDO IS THE WRITE THE MOVE ALREADY MAKES**, as the 2026-09-07 entry said it
would be: `moveToBus` with the `fromBus` the drag closure had already captured.
`fromBus === null` needs no special case, being the same write "Take off its
bus" makes. `say` grew a fourth argument and builds Carbon's
`actionable-notification` when one is passed, from
`carbon-react-dom.json`'s `components-notifications-actionable--inline` --
`__focus-wrapper`, `__content`, and the icon keeping
`rux--inline-notification__icon`, which is what the capture does. **Carbon's
`role="alertdialog"` and its two focus sentinels are deliberately not copied**:
together they TRAP the keyboard, which is right for a notice demanding a
decision and wrong for a board where the move has already happened.
`#sch-status` stays `role="status" aria-live="polite"`.

**AND IT HAS TO BE RAISED AFTER THE RE-READ, which is the whole of the wiring.**
`show()` re-reads the week and `render()` ends with `say(null)`, so an offer
raised before that line is destroyed by the very re-read that confirms the move.
`finish()` now awaits `show()` and offers the undo after it. One step and no
timer: `say` is a single slot, so a second move drops the first's offer and only
the last move is undoable, and nothing expires on a clock.

**AND AWAITING `show()` BROKE THE FAILURE MESSAGE, WHICH THIS PASS THEN FIXED.**
The `catch` said its piece where it caught -- and `render()`'s `say(null)` then
wiped it. That was already true before today, but `show()` was UNAWAITED, so it
was a race the message sometimes won: the intermittent kind. Awaiting it made
the loss certain, which is how it was noticed. The failure is carried down as a
string now and spoken after the re-read, beside the undo it replaces. The board
is re-read either way, because a move that threw may still have landed and the
only honest thing on screen is what the server says.

**THE FAILURE PATH WAS DRIVEN TOO, AND IT WROTE NOTHING.** A drop was aimed at
a track whose `data-bus-id` was rewritten in the page to a UUID no bus has, so
the foreign key refused the update and no row could change. The trip stayed on
218, the message read `Could not move that trip / insert or update on table
"trip_assignments" violates foreign key constraint
"trip_assignments_bus_id_fkey"`, it SURVIVED the re-read, and no undo was
offered. Both branches are now exercised and the database is untouched by
either.

**DRIVEN ON THE PRODUCTION DATABASE, on rux's explicit say-so.** Assignment
`5ba30a12` ("Paragon Casino", Sunday only) dragged bus 218 -> 763, chosen
because 763's Sunday was free so the drop was clean rather than a warning. The
target track lit `sch-track--drop`; after the re-read the bar was on 763 and the
undo offer had SURVIVED that re-read, naming bus 218. Pressing it put the trip
back on 218, confirmed by the re-read, and left a plain
`rux--inline-notification--success` with no action on it -- so the pair cannot be
ping-ponged. The database ends where it started; net zero change.

**NOT DONE.** Both moves were driven with synthetic pointer events against the
real code, not with a hand on a mouse, and never on a touch device -- the
TOUCH_HOLD path is untouched here and still unexercised on hardware. No undo for cancel,
save or create: those write many rows and their reversal is not one call, and
nothing here builds a history deeper than one step. The band assumes seven equal
day columns, which `--sch-days` and the grid template both guarantee today and
neither enforces. `check-spacing` and the rest of rux-ds's browser gates were NOT
re-run -- `docs/gate-coverage.md` was last swept 2026-09-08 at `52efa52` and this
pass adds a background and a notification component it has not seen. And the
header of `sch-data.js` still opens "READ ONLY ... nothing here writes", which
stopped being true when the drag landed and is now doubly untrue; it is named on
`tools/open.mjs` and left for its own pass rather than folded into this one.

**2026-09-11 - the Billing tab answers the question it is for, and three of
its faults were found by measuring rather than by looking.** rux: "still not
happy with the design and workflow of the billing tab", then "im open to
design suggestions -- keep in mind that there are items that trigger trip
status to confirmed". That second sentence is the whole design.

**THE RULE NOTHING ON SCREEN STATED.** `deriveStatus` takes `contractSigned`,
`poReceived`, `poAmount`, `price` and `paid`, and `CONFIRM_WHEN` turns three of
those into one answer: a signed contract, a PO received (a PARTIAL one counts,
`po_partial` remaps to `po_received`), or ANY payment. Each confirms the trip
on its own. **`Invoice sent` is not an input to `deriveStatus` at all** -- it
moves neither the rung nor the confirmation -- and it sat between PO and
Payments looking identical to both. That is what made the tab read as an
undifferentiated stack of switches: four controls, three of which decide the
one fact a dispatcher comes here for, and no sign of which.

So the headline is the answer now. `Trip / Confirmed` or `Not confirmed`, the
rung tag beside it, and a line naming WHICH trigger did it (`CONFIRM_BY`) or
stating the rule when none has. Balance led this tile before, and on a new trip
it read **"No quote"** -- the largest type on the panel saying there is no data
yet, in the slot the eye lands on first. Balance keeps every digit, one row
down beside Paid.

**A BUG THE REWRITE WAS NOT LOOKING FOR.** `overpaid` was missing from
`CONFIRM_WHEN`, where every other rung above `pending` was present. Driven live
on an unsaved trip before the fix: quote $100, payment $150 gave `Balance
-$50`, `Overpaid`, `Confirmed  Not yet`. A customer who had paid MORE than the
quote left the trip reading as unconfirmed. Fixed, and verified the same way.

**"ONCE SAVED" LEFT THE WORDING, deliberately.** The row said `Yes, once saved`
to mark that the ladder is computed from the controls rather than read from the
database. True -- and equally true of Balance, Paid and the coverage line, all
recomputed on every keystroke. Singling out this one implied the others were
stored. The footer's Save is what says nothing is written yet.

**ONE CONTROL PER HEADER LINE, which is the whole of the alignment fix.** PO
and Invoice carried a switch AND a `+` in the contained-list's `__action`;
Contract carried only a switch. Measured at the 320px panel: switch right edges
at 311 / 271 / 271, three consecutive rows on two edges. The label and switch
moved out to `.sch-panel-section__head` -- the line Contract has always used --
and the `+` became the list's last ROW. All three edges now agree.

**THE ADD ROW IS ALSO THE EMPTY STATE**, which rux asked for: an empty list
drew "No purchase order recorded." and then an add button under it, two rows
saying one thing. `emptyRow` is deleted; nothing referenced it afterwards. And
with the switch off the whole list hides, so the dead disabled `+` that shipped
on a new trip -- visible, greyed, with an EMPTY tooltip, since the cap note
applies only once a row exists -- is no longer on screen at all. The cap still
disables the add row at `LIST_CAP`, in its own words: "One purchase order per
trip for now".

**A LONG REFERENCE CLIPS NOW.** `overflow-wrap: anywhere` broke "MT CONV DALLAS
S26-ESCAMILLA" over two lines: 238px of text in a 173px box, one row 40px tall
where every other is 20. With several POs on a trip that is the list losing its
rhythm, not one tall row. The whole string stays on the row's `title` and in
the dialog it opens.

**THE ROW'S `X` BECAME AN OVERFLOW MENU.** A destructive control on screen at
all times, in a row that has to grow a date and a second line once `trip_pos`
and `trip_invoices` exist. Edit and Remove sit behind the row's own trigger
now, `rux--menu-item--danger` on Remove. One menu element positioned at
whichever trigger was pressed, the pattern the cell and bar menus already use;
a menu per row would mint one on every redraw. Still no confirm on Remove:
nothing is written until Save, so a mis-click costs a `Reset`.

**AND IT OPENED THE WRONG WAY, for a reason worth writing down.**
`Rux.menu.open(surface, trigger)` registers an anchored surface whose
`reposition` re-places any `position: fixed` menu itself -- so a placement
computed here is written and then overwritten. Measured: asked for left 489
against a trigger ending at 649, got 537, opening RIGHTWARD off the row and off
the panel's edge. `popMenuAt` passes `null` for exactly this reason and this
does too now. It also measures its own `offsetWidth` rather than the hardcoded
160 that was right only for today's two items, opens LEFT, and clamps on both
axes. The trade for `null` is that the module no longer wires the trigger, so
`aria-expanded` is synced here on open and on close.

**THE DIVIDER THAT "DISAPPEARS", and it was not a weak divider.** rux reported
it from the phone. `.sch-billing-rule` had padding above its border and none
below, so a section's last element ended exactly ON the next section's border:
Contract's Note field and the PO rule both at **y=395**, measured. A Carbon
text input draws its own underline at `border-strong-01` (#6f6f6f) and the
divider is `border-subtle-01` (#525252) -- the brighter line covered the dimmer
one and the separation was not on screen. One section down, the same collision
without the overlap: the coverage sentence butted onto the Invoice rule, so
that border read as an UNDERLINE of the text rather than the start of a
section. `padding-block-end: spacing-03` fixes both; verified 8px where there
was 0.

**A TILE PER SECTION WAS ASKED FOR AND NOT BUILT.** rux suggested it. The
separation was not failing, it was being painted over -- and layer-two bands
were REMOVED from these lists earlier the same day because repeated filled
blocks competed with the summary. Reversing that to fix a collision would be
the wrong instrument. Left open for rux to judge on the fixed version.

**WHAT THE SEPARATION COST, AND A CLAIM OF MINE THAT WAS WRONG.** The first
draft grouped the three triggers under a "Confirms the trip" heading; measured,
it added 104px to a new trip and 168px to a trip with a PO. Replacing it with a
labelled hairline was pitched as costing "1px instead of 60" -- and the first
attempt measured 624px against the heading version's 608. TALLER, because the
rule added `spacing-05` on top of the margin `.sch-billing-section` already
carried. The margin goes to 0 and that space becomes padding under the border;
then it measured 560. The claim was true only after the correction, and it was
made before it.

**MEASURED ON THE SERVED PAGE, live data, both themes inspected.** Remove takes
the row and arms Save; Reset restores it and disables Save; coverage recomputes
$22,750 -> $45,500 -> "Covers the balance"; the switch reveals and hides the
list including its add; the cap disables the add row with its tooltip; the
overpaid case reads `Confirmed`. Both row menus open leftward and stay on
screen at 697px wide and at 375x812. `--rux-border-subtle-01` resolves in all
eight themes.

**NOT DONE.** Save was never PRESSED -- the patch `EDITS` builds was read off
the panel on an existing and a new trip, but the database is production and
shared with rux-ui, so writing a test record is rux's call. `posPatch()` /
`invoicesPatch()` are still unwritten and the two `EDITS` keys still write the
single columns. `LIST_CAP` stays 1 until the tables exist; no date on either
section and no invoice amount, for the same reason -- Phase 1 of
`docs/po-invoice-lists-plan.md`, whose Phase 0 is three decisions that are
rux's. The menu's flip-above branch is written and NOT exercised: the footer
holds the bottom of the panel, so no row gets close enough to the viewport edge
to trigger it. And the toggle's tap target is 21px tall at EVERY size -- `--sm`
and the default differ in width only, 40 against 56 -- so a bigger switch does
not answer it. It is under iOS's 44 and Android's 48 either way, and it is a
rux-ds request not yet filed.

**THIS WORK WAS COMMITTED BY ANOTHER SESSION, as a passenger.** `ea6d7e9`
"feat(schedule): Make the board usable on a phone" carried roughly 380
uncommitted lines of it in `sch-data.js`; that commit's own body says so, and
says it was not reviewed there. The entry above is this session's account of
what those lines are and why. Only the divider and menu fixes, and this entry,
are in the commit it belongs to.

**2026-09-11 - the overflow menu carries icons, and Carbon had the shape
already.** rux, from the phone: "what about the overflow items having the icons
for driver + and today?" They do, and it took no invention at all.

**`--with-icons` AND `--with-selectable-items` ARE MEANT TO COMBINE.** rux.css
compiles the pair explicitly:
`.rux--menu--with-icons.rux--menu--with-selectable-items > .rux--menu-item`
takes `grid-template-columns: 1rem 1rem 1fr max-content` (rux.css:10427),
against `1rem 1fr max-content` for either class alone. So a menu holding both
checkable rows and icon rows is a case Carbon sized for.

**AND THE SLOT ORDER CAME FROM THE CAPTURE RATHER THAN A GUESS, which mattered
because neither column is assigned by `grid-column` -- the children fill in DOM
order, so the wrong order puts the checkmark in the icon column.**
`components-menu--default` in `docs/carbon-react-dom.json` is itself
`--with-icons --with-selectable-items`, and every one of its items carries all
four slots in the order `__selection-icon`, `__icon`, `__label`, `__shortcut`.
That is what this menu now matches.

**EVERY ROW KEEPS BOTH COLUMNS, filled or not** -- the same rule that fixed the
16px "N.." label an hour ago, now applied to the second column as well. The
three action rows carry their toolbar glyph (`add`, `calendar`,
`user--multiple`), so the menu row and the button it replaces below `md` are
visibly the same control; the five toggles leave the icon column empty and keep
the checkmark in the selection column.

**MEASURED.** At 375 with all ten rows: selection slot at x=163, icon slot at
187, label at 211 and 140 wide on EVERY row, nothing clipped; the menu is 228
wide, 147 to 375, inside the display, and the document stays 375. At 1440 the
menu holds New trip -- with its `+` -- and the five view options, labels all at
1228, box 1164 to 1392 under its trigger. `node tools/check.mjs` exits 0.

**2026-09-11 - the phone's toolbar is one row: the week, a spacer, `< >` and
More.** rux's layout, verbatim: `[date picker]      < > [overflow]`, with
`Today` and `Drivers` hidden in the overflow below `md` only. The week row that
had been stacked above the controls since earlier today is gone, and **the
board gets the 48px back: the pane is 716 at 375x812 against 668.**

**IT FITS WITH ROOM.** `< >` and More are 144px; the week wants 181, or 213 on
a two-month span like "Aug 31 - Sep 6, 2026" -- 325 and 357 of a 375 display.
Below about 357 the week is what gives way, which is the base rule's own
argument and why it carries `min-inline-size: 0`. Measured: week 181 at x=0,
spacer 50, the three controls at 231 / 279 / 327 ending exactly on 375, nothing
truncated.

**AND IT UNCOVERED A MENU BUG THAT WAS ALWAYS THERE.** `popMenuAt` pinned a
menu's left edge to the click and clamped nothing, so any menu opened near the
right edge ran off the page. It showed here because the overflow trigger moved
to x=327 and the menu opened at 327 and ran to 510 with every label cut -- but
**a right-click in Sunday's column would always have done the same.** It clamps
to the page's right edge now, shifted rather than flipped, which keeps the menu
under the thing that opened it. Measured after: 171 to 375, inside. The block
axis is deliberately not clamped -- the page grows and scrolls there, which
loses nothing.

**AND A SECOND ONE THAT MY OWN CSS HAD BEEN HIDING.** The two new rows were
`display: none` by default with `display: flex` inside the max-width block --
`flex` being a value guessed for a Carbon component whose display this file has
no business choosing. It looked right, which was the problem: it MASKED the
real fault on the sibling row that had no such override. In a
`--with-selectable-items` menu Carbon reserves the first column for the
checkmark on EVERY row, and a row without a `__selection-icon` div lays out
wrong -- `New trip`'s label measured **16px** and rendered "N..", against 140
for the checkbox rows beside it. Both action rows carry an empty selection slot
now, and the visibility rule hides at `min-width: 42rem` instead of forcing a
display at the width the row is used. All ten rows measure labX 211, labW 140,
none clipped.

**DRIVERS IS A CHECKBOX THAT IS NOT A VIEW OPTION**, so it carries `data-act`
rather than `data-row`/`data-view` and `applyView` skips it -- that loop reads
`view[key]`, and an unknown key is `undefined`, which would have silently
unchecked the row every time any other option changed. Its state is kept by
`placeAvailability`, beside the toolbar button's `aria-pressed`, because only
that function knows what is ON SCREEN: the editor can yield the roster without
anyone pressing anything.

**MEASURED.** At 375: toolbar 48 and one row, pane 716, menu reads New trip /
Today / Driver availability / divider / the four row toggles / divider / Start
week on Sunday. `Today` from the menu returns the week and closes the menu;
`Driver availability` opens the roster and the row shows its checkmark with
`aria-checked` true. Document 375. At 1440: the toolbar is the week at 48 plus
five controls at 1152 / 1200 / 1248 / 1296 / 1344 -- `Today` and `Drivers` are
buttons again -- the menu holds only New trip and the view options, and its box
is 1188 to 1392, under its trigger. Toolbar 48, pane 790.
`node tools/check.mjs` exits 0.

**2026-09-11 - `New trip` leaves the toolbar entirely, at every width.** rux
extended the call an hour after the mobile one, and then gave the reason that
matters: *"almost never do we enter a trip with no bus or date available. it's
that rare occasion happens well add new trip from overflow."*

**WHICH CORRECTS THE WEIGHT I PUT ON MY OWN ARGUMENT.** The entry below keeps
the button out of the bin by two facts, and presents the first as decisive: the
Unassigned row is hidden when empty, so on a quiet week there is no cell to
right-click for a trip with a date and no bus -- "that is the intake case, and
this button is its only door." The fact is right and the framing was not. rux
dispatches this board: a trip with neither bus nor date is RARE, not a standing
case, so it does not earn a permanent control in the toolbar. It earns a menu
item, which is what it now has at every width. The second fact -- no long-press
on iOS, so the menu item is currently the only create path on an iPhone -- is
unaffected and is still why the item exists rather than nothing.

**SO THE BOARD HAS NO PRIMARY BUTTON AND NO BLUE IN ITS TOOLBAR.** Five ghost
icons, right-aligned: page back, page forward, today, drivers, more. The trip
is created where the intent already is -- right-click the cell, and
`New trip here` prefills the bus and the day from it. The blank form is the
fallback and now reads like one. What it trades is discoverability, and that is
rux's call on rux's board.

**IT ALSO EMPTIED sch.js's LAST WIDTH-DEPENDENT BEHAVIOUR, the fourth time in a
day.** `fitToolbar` began as two class swaps by width; the 48px module took the
size half, icon-only `Today`/`Drivers` took most of the rest, hiding `New trip`
below md took `.sch-toolbar__label`, and moving it into the menu took the last
job -- renaming the trigger to "More" -- because the markup can just say "More"
now. The block is a comment where a handler was: nothing in that file responds
to width any more, and being able to find that stated is worth the lines.

**MEASURED.** At 1440: the toolbar holds the week at x=48 and five 48px
controls at 1152 / 1200 / 1248 / 1296 / 1344, `#sch-new-trip` does not exist,
the trigger announces "More", the menu reads New trip / divider / Customer /
Times / Requirements / Drivers on the bar / divider / Start week on Sunday, and
pressing New trip opens the editor titled "New trip" with the shown week's
Monday in the start date. Toolbar 48, pane 790, document 1440.
`node tools/check.mjs` exits 0.

**2026-09-11 - `New trip` leaves the mobile toolbar for the overflow menu.**
rux: "mobile is for quick references anyway ... its not that primary and
probably wont be used to open the actual editor that often". Below `md` the row
keeps every READING control -- page back, page forward, today, drivers, view --
and the one WRITING action moves into the menu. Five 48px squares, 240 of a 375
display. Desktop is untouched: the button is still there, still labelled, still
the blue primary at 135x48.

**THE PROMPT FOR IT WAS A BETTER QUESTION THAN THE ANSWER I FIRST GAVE:** is
the button redundant, when right-clicking a cell already opens a trip there?
Largely yes, and the code says why -- the cell menu sets
`cellMenuAt = { startDate, busId }` from the cell and calls
`openCreate(cellMenuAt)`, so the bus and the day are answered before the panel
opens. The toolbar's is `openCreate()` with no argument, a blank form.

**TWO THINGS STOP IT BEING REMOVED RATHER THAN DEMOTED, and both are measured
from this repository rather than argued.** The Unassigned row is HIDDEN when
empty -- `sch-data.js:786` reveals it for a drag and `:812` hides it again --
so on a quiet week there is no cell to right-click for a trip that has a date
and no bus yet, which is the intake case. And the touch path is UNVERIFIED:
`sch-data.js:733` claims only that "Android fires `contextmenu` at about the
moment a hold completes", iOS Safari does not, and no long-press handler exists
here. **So on an iPhone this menu item is currently the only way to create a
trip at all.** Demoted, never removed. rux has long-press on the list.

**AN ACTION IN A MENU OF CHECKBOXES, handled rather than ignored.** The item
takes `role="menuitem"` among five `menuitemcheckbox`es with a divider under
it, which is a shape Carbon's menu supports. And the trigger is renamed: a
button labelled "View options" that also creates a trip is mislabelled, so
sch.js sets `aria-label` to "More" below `md`. That rename is now the ONLY
thing that function does.

**WHICH IS THE THIRD TIME THIS PASS HAS EMPTIED IT.** `fitToolbar` began as two
class swaps -- icon-only by width, and `size-md`/`size-lg` by width. The module
went to 48 everywhere, so the size swap went; `Today` and `Drivers` became
icon-only at every width, so most of the other went; and `New trip` is hidden
below `md` rather than squared off, so the last of it went with
`.sch-toolbar__label`, which is deleted. What is left is a `matchMedia` that
renames one control, which is the one thing CSS cannot say.

**MEASURED.** At 375: toolbar row two holds five controls at 0 / 48 / 96 / 144
/ 192, the New trip button computes `display: none`, the menu item computes
`display: flex`, the trigger announces "More", and the menu reads New trip /
divider / Customer / Times / Requirements / Drivers on the bar / divider /
Start week on Sunday. The menu box is 192 to 375 -- inside the viewport -- and
the document stays 375 wide with it open. Pressing the item closes the menu and
opens the editor titled "New trip" with the shown week's Monday already in the
start date. At 1440: New trip 135x48 at x=1257 reading "New trip", the menu
item `display: none`, the trigger "View options", the menu back to its six view
options with no extra divider, toolbar 48, pane 790.
`node tools/check.mjs` exits 0.

**NOT DONE, AND ONE OF THESE IS LOAD-BEARING.** No long-press handler, so the
cell menu -- the prefilled and better create path -- is mouse-only on iOS and
this demotion rests on the menu item being reachable. Nothing was tested on
real hardware. And `New trip` on the desktop toolbar was NOT demoted; the same
argument would apply there, but there is 789px of spare row and no reason to
hide a labelled primary Carbon's own table toolbar would keep.

**2026-09-11 - the toolbar is one row again, the week first.** rux sketched it:
`Datepicker |        < > [today] [Driver] [+]`. The week reads at the left, a
spacer, then every control pinned right. **The 48px the entry below spent on a
second row is returned: the pane is 790 again at 1440x950.**

**THE ORDER WAS ARGUED AGAINST ONCE AND THE SPACER IS WHY IT IS SAFE NOW.**
index.html's note said the label "sits straight after the controls that change
it, and NEVER before them: 'August 31 - September 6, 2026' is wider than
'September 7 - 13, 2026', so anything after it in the flow would slide sideways
as the week changes, moving the very buttons being clicked." That is a real
failure and it does not happen here, because `.sch-toolbar__spacer` is `flex: 1`
between them: a wider week eats the spacer. **Measured rather than asserted** --
paging from "Sep 7 - 13, 2026" to "Aug 31 - Sep 6, 2026" grows the week from
181px to 213, and all six button positions are BYTE-IDENTICAL at 1017 / 1065 /
1113 / 1161 / 1209 / 1257. Without the spacer the old note would still be right.

**THE MARKUP MOVED, NOT JUST THE PAINT ORDER.** The week was drawn first by
`order: -1` while three buttons preceded it in the DOM, so tab order reached the
paging controls before the thing they page. It is first in the markup now and
`order` is gone; DOM order is reading order.

**BELOW md IT IS STILL TWO ROWS, and that is arithmetic rather than taste.**
Six 48px controls are 288 of a 375 display, leaving 87px for a week that wants
181 -- "Sep 7 - 1..." -- so one row there costs the label most of itself. The
full-width basis is now the ONLY thing the media block says about this row; the
band, the centring and the 16px inset are base rules that hold at every width.

**MEASURED.** At 1440: week at x=48 and 181 wide, spacer 789, the six controls
from 1017 to 1392, toolbar 48, pane 790, document width 1440; the calendar still
opens under the label at x=48, y=128, 288 wide. At 375: week row full width at
y=48 and untruncated, the six controls on the second row at y=96 spanning 0 to
288, toolbar 96, calendar at x=0 inside the viewport, document width 375.
`node tools/check.mjs` exits 0.

**2026-09-11 - the week label is the date picker, on its own row at every
width.** `docs/screen-inventory.md` has said this twice since 2026-09-06 --
section 1 lists the toolbar as "previous, today, next, the week range as a
date-picker trigger", section 7 rejects a permanent mini calendar because it
"spends standing space on an occasional action" -- and it is built.

**rux-ds BUILT THE HARD HALF FOR THIS APP ALREADY, which is the reason this
took a rule rather than a module.** `js/date-picker.js`'s header records
`data-rux-open` arriving on 2026-09-08 "asked for by rux-scheduler, whose week
label is the control that should jump the calendar and sits in a toolbar far
from the picker", and the hidden input the same way: "a toolbar reading 'Sep 7
- 13, 2026' beside a `2026-09-07` field is one week displayed twice". Nothing
here is invented; this is the consumer half of a contract already written.

**THE ROW WAS PERMANENT FOR ABOUT AN HOUR AND IS NOT ANY MORE -- corrected
below, same day, and the 48px is back.** This paragraph read: "THE ROW IS
PERMANENT AND IT COSTS 48px OF BOARD. Measured at 1440x950: the pane goes 790
to 742, 8.3 bus rows to 7.8." True as built. rux then sketched the toolbar back
onto one line -- `Datepicker |        < > [today] [Driver] [+]` -- and the
board has its 790 back. What survives the change is everything about the week
being a CONTROL rather than a label; only where it sits changed. The
below-md row stayed, for the reason the next entry gives.

**AND `flex-wrap: nowrap` HAD TO GO, WHICH THE OLD NOTE ON IT PREDICTED.** It
read "IT DOES NOT STACK ... three rows of chrome above a board whose whole
argument is vertical room". That fear was of wrapping ACCIDENTALLY -- a long
label pushing the actions onto a third row. The wrap is on purpose and in one
place: `.sch-toolbar__weekrow` takes a full-width basis BELOW md and nowhere
else, so there are exactly two rows there by construction and one above. Left
at `nowrap` the full-width basis could not wrap at all and every button
overflowed the toolbar's box, measured at y=100 under a toolbar ending at 88.

**THE CONTRACT THE HEADER STATES ABOUT `hidden` DOES NOT HOLD, and that is the
find of the pass.** It says writing `hidden` on `.rux--date-picker__input`
"computes `display: none` and a 0x0 box on the built page -- measured, not
reasoned". Measured here: the attribute is set, the input computes
`display: block` and boxes at **288x40**, and enumerating every rule in every
sheet that matches it and sets `display` returns exactly one --
`.rux--date-picker__input { display: block }` in `rux.css`, ONE CLASS at NORMAL
priority. An author declaration beats a UA declaration whatever its
specificity, so `[hidden]` never gets a say. **The header's own correction note
cannot be right either**: it claims the UA sheet declares
`[hidden] { display: none !important }`, and an important UA declaration would
beat this normal author one and hide the input. Filed; worked around with
`#sch-week-picker .rux--date-picker-container { display: none }`, scoped by id
so the trip editor's four visible date fields are untouched.

**`aria-expanded` IS THE CONSUMER'S, and left alone it lied.** The module reads
`data-rux-open`, makes the opener the overlay anchor and the focus destination,
and says nothing about the opener's STATE -- correctly, since it did not write
that element. So the button announced `false` the whole time the calendar was
open. It is kept in step by a `MutationObserver` on the picker root's child
list, which is not a signal borrowed for the purpose: Carbon ships no closed
state for the calendar, so the module DETACHES the container on close, and its
presence is exactly what open means.

**THE CARET IS A `<use>`, AFTER A FIRST VERSION THAT WAS NOT.** The trigger
needed a disclosure mark that is not a calendar -- `Today` already carries the
calendar glyph, and the two mean different things. It was first drawn with
`mask: var(--sch-caret)`, which invents a `--sch-*` variable holding a URL
(AGENTS.md allows those "a count or a position only") and puts an icon on the
page `check.mjs` cannot see, since the gate resolves `<use href>` and knows
nothing about masks. It is `#i-caret--down` from the inlined sprite now.

**AND SPLITTING THE TEXT OUT OF THE BUTTON WAS NOT OPTIONAL.** `setRange`
writes `textContent`; on a button that also holds the caret `<use>` that
deletes the svg on the first render. `rangeEl` is the button -- what carries
`data-rux-open` and what the overlay anchors to -- and `rangeTextEl` is the
span inside it.

**MEASURED, on the live project.** At 1440: week row 48, toolbar 96, all six
buttons on one line at y=128, pane 742, document width 1440. Open -> calendar
288x348 under the label, September 2026, the 7th selected because `setRange`
feeds the hidden input, `aria-expanded` true. Pick the 21st -> "Sep 21 - 27,
2026", 11 bars from the real week, calendar closed, `aria-expanded` false. Pick
WEDNESDAY the 23rd -> the same week, which is `mondayOf` doing the only thing a
pick means. Re-pick the 25th, the same week again -> no redraw at all, 11 bars
before and after and the busy class never set. `Today` -> back to Sep 7 - 13
with the input in step. At 375: row 48, toolbar 96, trigger 181x48 at x=0,
calendar 288 wide at x=0 inside the viewport, document width 375.
`node tools/check.mjs` exits 0.

**NOT DONE.** No keyboard pass on the trigger beyond what the module gives --
Escape and outside-press close come from `overlay.js` and were not exercised by
hand here. The Sunday-start preference is honoured by construction, since the
pick goes through `mondayOf`, but was not toggled and re-tested. And `Today`
still carries the calendar glyph beside a control that opens a calendar; the
caret distinguishes them, and whether `Today` should go back to a word is
rux's call, not settled here.

**2026-09-11 - the panel's close is 48, and Today and Drivers are icons at
every width.** Three of rux's calls in one pass.

**THE CLOSE BUTTON TAKES A RULE, WHICH THE ENTRY BELOW SAID IT WOULD NOT.**
That entry filed the missing size upstream and wrote "Not worked around
locally", with a reason: every other button's size here comes from a compiled
class, and one set by a stylesheet would be the odd one out. rux asked for the
right size anyway, so the rule exists and the cost is now being paid rather
than avoided. `docs/rux-ds-requests.md` has been corrected where it claimed
otherwise; the request itself stands, because a compiled `lg` upstream is what
removes this rule.

**`rux--btn--lg` WAS THE OBVIOUS ANSWER AND IS NOT AVAILABLE.** It is not
compiled ANYWHERE in `rux.css` -- 0 occurrences against 6 for `--md` -- so
putting it in the markup would be inventing a class, which `check.mjs` catches
and `AGENTS.md` forbids. The markup keeps `rux--btn--md` and
`rux--overrides.css` sizes it at Carbon's own (0,3,0) specificity, matching the
shape of Carbon's own two rules for that button (rux.css:24069 and 24089).

**TODAY AND DRIVERS ARE ICON-ONLY ON THE DESKTOP TOO**, which retires
`.sch-toolbar__glyph` entirely. That class existed so the two could be words at
one width and icons at another; with one answer at every width each carries a
plain `rux--btn__icon` and `rux--btn--icon-only` in the markup and no rule
decides anything. `New trip` is the only button left with a word to lose, so
`.sch-toolbar__label` and sch.js's `fitToolbar` now serve exactly one element.

**IT ALSO BOUGHT THE TOOLBAR 92px.** `Today` was 70 wide and `Drivers` 78;
both are 48 now, and that space goes to the week label's row and to the board.

**ONE THING WORTH WATCHING, NOT A FAULT.** `Today` is the `calendar` glyph
because it is the closest of the sprite's forty; Carbon's own today-mark is not
among them. `docs/screen-inventory.md` section 7 plans the WEEK LABEL as a
date-picker trigger, and when that lands there will be two calendar-ish
controls in one toolbar, one meaning "jump to today" and one "pick a date".
Worth deciding then whether this one changes glyph or goes back to a word.

**MEASURED.** At 1440: the six toolbar buttons 48x48 except `New trip` at
135x48; panel close 48x48 sitting exactly in the 48px header band (80->128) and
flush with the panel's right edge at 1392, inside it; week label 125; toolbar
48; document width 1440. At 375: all six toolbar buttons 48x48 icon-only,
close 48x48, header 48, document width 375. `node tools/check.mjs` exits 0.

**2026-09-11 - the panel's tab strip is 32, and the three regions now agree on
BOTH bands.** rux: "make the panel tab strip 32 so it matches". It does. The
schedule's day header and the roster's column header are both 32 and the tab
strip was 40, so the panel's content started 8px below the grids'. All three
second bands are 128->160 now, as the three heads above them are 80->128.

**THE SIZE CLASS ALONE DID NOT DO IT, AND CHASING THAT IS WHERE THE TIME
WENT.** `rux--layout--size-sm` on `.rux--tabs` took the LABEL's line box from
40 to 32 and set the component's `min-block-size` to 32, and the strip stayed
40. Probing down through list, nav-item and nav-link found no Carbon rule
holding 40: padding and borders are 0 and nothing in `rux.css` sets a height on
them. **It was this app's own rule.** `#sch-panel-body .rux--tabs` has carried
`block-size: calc(var(--rux-layout-size-height-md) + var(--rux-spacing-05))`
since 2026-09-10 -- the band plus the sticky gap, written so scrolling content
passes under the strip instead of touching it. One token, `md` to `sm`.

**AND THE 2026-09-10 ENTRY EXPLAINS WHY ONE TOKEN IS ENOUGH.** Its own note
says the nav items STRETCH to the content box, which is why padding alone came
out of the tabs rather than below them. That stretch is what makes this work:
the box became 32 and the buttons followed with no rule of their own.

**BOTH HALVES ARE STILL NEEDED.** The markup keeps `rux--layout--size-sm` --
without it the label's line box stays 40 and overflows a 32px strip -- and the
calc sets the box. 32 is the floor of the range Carbon's tabs clamp themselves
to (`sm` to `lg`, rux.css:25252), so this is the bottom of the component's own
range rather than a size forced past it, and Carbon compiles
`.rux--tabs...rux--layout--size-sm` itself for the vertical variant.

**THE 16px GAP IS UNTOUCHED.** It still sits below the band, so the fix rux
asked for on 2026-09-10 -- `Round trip` cutting itself in half on the strip's
edge while scrolling -- still holds. The tabs component is 48 total now (32 +
16) where it was 56.

**MEASURED.** At 1920 and 1440: head bands 80->128 all three at 48, second
bands 128->160 all three at 32, tab 80x32, all four labels -- Details, Billing,
Fleet, Schedule -- untruncated. At 375: header 48->96, strip 96->128, tabs
block 96->144, first field at 168, tabs 94x32 and none truncated, document
width 375. `node tools/check.mjs` exits 0.

**2026-09-11 - the control module is 48 at every width, and a note in sch.css
was the thing that had to be disproved first.** rux asked for a review of the
three surfaces, then, offered a below-md-only touch-target fix: "should we
change actual size instead so it work best for both desktop and mobile?" Yes,
and the evidence is Carbon's.

**TWO FACTS OUT OF `rux.css`, NOT OUT OF PREFERENCE.** `.rux--table-toolbar`
REDEFINES `--rux-layout-size-height-md` to `3rem` and clamps its height
between `lg` and `lg` (13160-13179): **a Carbon table toolbar is 48px at every
size class it accepts, and there is no density at which it is 40.** And a bare
`.rux--btn` resolves its clamp to `var(--rux-layout-size-height, ...-lg)`, so
48 is Carbon's DEFAULT button and `md` was a downgrade from it. The shell's own
header actions in index.html have been `size-lg` since the page was scaffolded.

**WHICH FALSIFIES THE STATED REASON FOR 40.** `.sch-toolbar`'s note of
2026-09-10 reads: 40px of band holding 40px of control "is what Carbon's own
table toolbar is at any density". It is not, and the whole of that day's
decision rested on it. The note is left standing with the correction under it
rather than rewritten.

**SO IT IS NOT A MOBILE SIZE APPLIED EVERYWHERE.** The three region head bands
and all seven ordinary buttons are `size-lg` in the markup at every width. It
also clears iOS's 44 and Android's 48, which the 2026-09-10 note conceded 40
did not.

**AND THE BREAKPOINT SWAP IN sch.js IS GONE.** `fitToolbar` did two things;
half of it existed only because the module was 40 on a desktop and wanted 48 on
a phone. One size needs no `matchMedia`. What remains there is the word/glyph
swap, which is genuinely about width.

**WHAT DID NOT MOVE, EACH FOR A REASON READ OUT OF THE SAME FILE.** Form
fields stay 40: `.rux--text-input` and `.rux--select-input` fall back to `md`,
so 40 IS Carbon's default there and raising them would be the mirror of the
mistake being corrected. The tab strip stays 40 for the same reason --
`.rux--tabs` falls back to `md`. Both grids' column-header bands stay 32 and no
row density is touched: Carbon lets a table's rows go dense and refuses to let
its toolbar follow, which is exactly the decoupling `.sch-toolbar`'s note
worried about, answered by Carbon itself.

**THE ONE CONTROL LEFT AT 40 IS THE PANEL'S CLOSE, AND IT IS CAPPED BY CARBON.**
Only two sizes are compiled for it -- 2rem base and 2.5rem `--md`
(`rux.css:24069` and `24089`); there is no `lg`. A local rule could pin 3rem
and deliberately does not: every other button's size here is a compiled class,
and one button sized by a stylesheet instead would be the odd one out in a
different way. Filed in `docs/rux-ds-requests.md`.

**WHAT THE REVIEW FOUND BEFORE THAT, INCLUDING TWO THINGS I NEARLY REPORTED AS
DEFECTS AND WHICH ARE NOT.** The panel's head looked misaligned because I
measured `.rux--side-panel__title`, a 28px text block, instead of
`.rux--side-panel__header`, the band: all three heads were 80->120 at 40px and
are now 80->128 at 48, aligned to the pixel. And the panel title's `heading-03`
against the other two titles' `heading-compact-02` is the 2026-09-10 call
already in HEAD -- table chrome versus a form label -- not drift. Both were
checked against the file before being written up, which is the only reason they
are in this paragraph rather than in a fix.

**STILL OPEN AND NOT DONE.** The panel's tab strip is 40 and both column-header
bands are 32, so the panel's content starts 8px below the grids' -- the FIRST
band was deliberately unified and the second never has been. Left as a
question, not a fix, because a tab strip is not a column header. And there is
no scroll lock behind the full-screen overlays below md: `body` overflow stays
`visible` and the board still scrolls behind the panel. Low severity -- the
overlay is opaque and its own content captures the drag -- and it is a touch
behaviour this session cannot test, so it is named rather than guessed at.

**MEASURED AFTER.** At 1920 with all three regions open: head bands 80->128,
all three 48px; column heads 128->160, both 32px; buttons prev/roster-close
48x48, Today 70x48, Drivers 78x48, New trip 135x48; panel close 40x40; fields
40; the board lost 8px once, 848 to 840, because the three heads sit side by
side rather than stacked. At 375: every toolbar button 48x48 icon-only, label
band 48, toolbar 96, roster head 48 and its close 48x48, document width 375.
`node tools/check.mjs` exits 0.

**2026-09-11 - the phone, and the fact that made every fault on it the same
fault.** rux asked how the scheduler works on mobile. It does not, and the
reason is one line long: `grep '@media' sch.css rux-overrides.css index.html`
returned NOTHING, while `rux.css` compiles 654 of them at sm 320 / md 672 /
lg 1056 / xlg 1312 / max 1584. A board whose three regions are each sized for
a desktop row, laid out on a 375px screen. Everything below follows from that
and was measured at 375x812 against the live project, not read off the code.

**THE PAGE OVERFLOWED BY 107px AND TOOK THE SHELL'S OWN CONTROLS WITH IT.**
`.sch-toolbar` is `flex-wrap: nowrap` over seven controls that cannot give
way; its irreducible width is 434px with the week label already shrunk to
zero, so with the page's 64px of padding the PAGE overflows below a 499px
viewport. The shell header is `position: fixed` at `inline-size: 100%` and
resolved that against the widened ICB: **Account at x=387 and App switcher at
x=435 on a 375px display**, both off the screen and unreachable without
scrolling the whole page sideways. The stylesheet's own rule -- "One row,
always; what gives way is the label" -- is true to about 500px and false
below it, and the label giving way to nothing is what made the failure silent.

**THE STICKY BUS COLUMN DETACHED, AND IT IS THE NOW-LINE BUG AGAIN.**
`.sch-grid` was `min-inline-size: 100%`, so the grid BOX was the pane's 279px
while its seven columns totalled 984 -- and a sticky grid cell is clamped to
its own box. Measured: the column held to `scrollLeft` 247 (279 less its own
32) and was then dragged one pixel per pixel, 458px off the left edge at the
end of the week. **From Wednesday on, nothing said which bus a row was.**
docs/log.md's 2026-09-06 entry states this exact cause -- "a grid container is
only as wide as its own containing block" -- and fixed it for the line drawn
ON the grid while leaving the grid itself. It hid on a desktop window because
the whole overflow there is 136px, well inside the clamp; on a phone it is 705.

**AND EITHER COMPANION DELETED THE BOARD.** `.sch-trip` is `flex: 0 0 20rem`
with `min-inline-size: 20rem` and `.sch-aside` the same 20rem: one of them is
already wider than the whole 343px row. Measured, opening either put
`.sch-frame` and `.sch` at **0px wide** with the region pushed past the right
edge -- tapping a trip did not shrink the schedule, it removed it. The note on
`.sch-trip` that says "it does not shrink at all now -- the schedule absorbs
instead" is right about a desktop and is the direct cause here.

**WHAT WAS BUILT, AND CARBON HAD ALREADY WRITTEN MOST OF IT.**

- `.sch-grid` is `inline-size: max-content` over the 100% floor. Where the week
  fits, max-content is under 100%, the floor wins and the `1fr` tracks divide
  the pane exactly as before; where it does not, the box is its columns and the
  sticky cell has room to travel. Measured at 1440 before and after: pane 1344,
  grid 1344, all seven day columns on the same x, all 22 bars unmoved.
- **The editor goes back to being Carbon's.** rux-overrides.css's un-fixing
  block is now scoped to `min-width: 42rem`, so below it Carbon's own
  `position: fixed`, z-index 9000, `inset-block-start: 3rem` stand on their
  own. That is not a number chosen here: `.rux--side-panel` turns
  `max-inline-size: 75vw` on at exactly 42rem, so the component itself stops
  expecting to be a column there. `--rux-side-panel-modified-size: 100%` is
  Carbon's own documented hook and makes the sm panel full width.
- **Two things the scoping alone did not give.** The shadow rule was scoped
  with it -- below md the panel IS above something, so Carbon's elevation is
  telling the truth. And the panel needed `inset-inline: 0`: Carbon's base
  rule carries no inline inset, the anchor lives on the `--right-placement`
  class, and index.html removes that deliberately. Without it the panel came
  out fixed, 375 wide, **at x=663, entirely off the screen** -- found by
  measuring, not visible in the first screenshot because the board beside it
  looked correct.
- The roster is this app's own with no Carbon under it, so it gets the same
  geometry by hand, at z-index 8999 -- one below the panel, so a trip opened
  over the roster is in front during the frame before `openPanel` closes it.
- **The toolbar stacks below md, which is a deliberate exception to its own
  rule.** The label goes first and full width; the six controls sit under it as
  48px squares, 32 to 343 in a 343px row. The label stops being the thing that
  pays -- "Sep 7 - 13, 20..." truncated becomes "Sep 7 - 13, 2026" whole -- and
  the buttons no longer move when the week changes, which is the concern
  index.html raises for putting the label after its own controls.
- **48px is Carbon's `size-lg` and the swap is sch.js's**, because a media
  query cannot add a class and the alternative was writing icon-only's geometry
  onto `.rux--btn` in a media block, which is reimplementing a compiled variant
  in order to reach it. sch.css's own note on the 40px toolbar called it "still
  under iOS's 44 and Android's 48"; below md these are touch targets and
  nothing else, so they take Carbon's own 48. The roster's close button is in
  the same set -- once the roster is an overlay, that x is the only way back.
- The page gutter goes to 1rem below md. **Corrected to 0 an hour later; see
  the block below.**

**THE GUTTER WAS WRONG AND RUX ASKED THE QUESTION THAT FOUND IT: "on mobile
should the calendar reach the edges inline?"** It should, and the first version
of this pass set 1rem. **1rem is Carbon's md value used at sm.** The steps are
`--rux-grid-margin` 0 below 42rem, 1rem from 42rem, 1.5rem from 99rem -- so
Carbon's number at THIS width is zero, and the paragraph justifying 1rem cited
those very steps while landing on the wrong one of them. The reason given, "the
board needs an edge to read against", was a preference written as a derivation.

**IT IS ALSO WRONG ON ITS OWN TERMS.** The board is a horizontally scrolling
surface whose next day column is always cut off; a margin around it draws a
boundary where the week does not end, while flush lets the content slide under
the display edge, which is what a scroll pane should look like. And it left the
page disagreeing with itself: the editor and the roster are both full-bleed
below md by the rules above, so the board was the only region not reaching the
edge. Nothing on this page wanted the margin -- `.rux--content` holds one
full-width data surface and a heading that exists in the outline and is never
drawn, so there is no prose whose measure a gutter would protect.

**AND THERE WERE TWO INSETS, WHICH ONLY MEASURING FOUND.** Zeroing
`.rux--content`'s padding moved the board 16px, not 32: `.rux--css-grid-column`
carries `margin-inline` of `calc(var(--rux-grid-gutter) / 2)` = 1rem a side.
That margin is the gutter BETWEEN columns and this grid has one column spanning
all of them, with nothing either side to be separated from. Carbon's knob for
it is `--rux-grid-gutter`; `--narrow` zeroes only the start and `--condensed`
takes it to 1px, so neither says what is meant. **The divergence is that half,
not the first**: Carbon holds the gutter at 2rem at every width, whereas the
`.rux--content` change now BRINGS that flat 2rem into line with the grid margin
Carbon itself declares at this width. The note in rux-overrides.css said the
opposite when it set 1rem and now says this.

**THE LABEL NEEDED AN INSET THE BUTTONS DID NOT.** Bled to the edges, the week
label sat hard against the bezel -- fine for a button, which is a box you aim
at, wrong for type. It takes 16px, and not for air: the paging chevron below it
is a 48px square holding a 16px icon, so its glyph starts at exactly 16 and the
label's first character lands on it. Measured after: label text x=16, chevron
glyph x=16. The buttons stay flush, which is what Carbon's table toolbar does
with its controls and the reason `.sch-toolbar` has no inline padding at all.

**MEASURED AFTER THE CORRECTION, 375x812:** `.rux--content`, the grid column,
`.sch-page`, `.sch-toolbar` and `.sch` all at x=0 and 375 wide; document scroll
width still 375; the pane 375 instead of 311, so **2.52 day columns of seven
are visible instead of 2.05**; the bus column still at offset 0 at the new
maximum scroll of 609. At 1440 nothing moved: gutter still 2rem, content
padding still 32px, board at x=48 and 1344 wide, the seven day columns on
83 / 270 / 457 / 644 / 831 / 1018 / 1205 -- the same pixels as the baseline
snapshotted before any of this.

**AND THE BLOCK PADDING WAS THE SAME MISTAKE, ONE QUESTION LATER: "is that
gap above the calendar intended?"** It was not. The gutter fix zeroed
`padding-inline` only, and its note said so on purpose -- "INLINE ONLY: the
block padding is separation from the shell header above and the end of the page
below, and neither changes with width". Measured, that left the board reaching
three display edges and stopping 32px short of the fourth, with another 32px
under it: header bottom 48, toolbar top 80. A full-bleed object hanging below
the header rather than meeting it, which is the seam rux saw.

**IT WAS NOT SEPARATION FROM THE HEADER EITHER.** The shell header is its own
dark surface and the toolbar band below it is `--rux-layer`; they are different
colours in all eight themes, so the surfaces already draw that edge and the
32px was drawing it twice. On a phone it is also expensive in a way it is not
on a desktop -- 64px of an 812px viewport where one bus row is 95px, so the two
gaps cost two thirds of a row each. `.rux--content` is `padding: 0` below md
now. sch.js needed nothing: `fitHeight` reads this element's computed
`paddingBottom` and subtracts it, so the pane took the room back on its own.

**MEASURED AFTER, 375x812:** gap above the toolbar 0 and below the board 0;
the toolbar starts at 48, directly under the header, and the pane runs 126 to
812, the full bottom of the viewport. Pane height 686 against 622 before.
`elementFromPoint` finds trip bars at y=620 and y=700 and `.sch-track` at 780
and 805, so the board really does reach the bottom edge. At 1440 nothing moved
again: content padding still 32px, toolbar at 48,80 and 1344 wide, the same
seven day columns.

**THE ROSTER'S ROWS GO xs TO sm BELOW md, AND md WAS ASKED FOR AND MISSES BY
0.2px.** rux: "i can increase the driver assignments table rows to something a
bit better? md?" The aside's own rule joins `--sch-day-track` to the row
height, so a day cell is a square and raising the row raises the cell -- seven
of them at 40 take 280 of a 375 screen and leave the name column 107, which is
75 inside its padding.

**THE LONGEST NAME IS 75.2px.** Measured across all 40 drivers with a Range on
the text node, because `scrollWidth` reports ZERO overflow on an ellipsised
grid cell and said every size was fine -- the same class of mistake as the
2026-09-06 probe that measured names in the browser's fallback serif. So md
clips "Vicente Solar" today and clips anything longer worse, on the one column
in that grid with something to say. sm leaves 119 and nothing clips.

**AND THE COST IN DRIVERS IS WHAT EVERY PREVIOUS TURN OF THIS NUMBER WAS
ABOUT.** In the 716px overlay: 29 rows at xs, 22 at sm, 17 at md. md spends 12
of 40 on a surface whose whole job while it is open is scanning the roster.
sm is the step that was asked for without either cost.

**THE DESKTOP NUMBER IS NOT REOPENED.** `.sch--avail` stays xs above the
breakpoint. This log records that value turning 24, 32, 24, 32 and settling on
24 with an argument about a companion pane competing with the BOARD for
height -- none of which is true of a full-width overlay, which is why the two
can differ without touching that decision. Measured at 1440 after: roster rows
24, cells 24x24, name column 152, aside 320 at x=48 with the board at 384.
Measured at 375 after: rows 32, cells 32x32, name column 151 with a 119 content
box, nothing clipped, 22 of 40 visible, document scroll width still 375.

**THE WEEK LABEL BECOMES A BAND, NOT A STRIP.** rux, looking at the stacked
toolbar: "the title on the schedule on mobile ... make it match the New Trip
size better?" It was `padding-block: spacing-02` around a 22px line -- 30px of
label over a 48px row of controls, so the page's only VISIBLE title was thinner
than the buttons beneath it and pinched between them and the shell header. It
takes `size-lg` now, the same 48 the controls take, and the toolbar reads as
two equal bands. Costs 18px: 78px of toolbar becomes 96, and the pane 686 to
668.

**THE TYPE DID NOT CHANGE, AND THE ROSTER IS THE REASON.** `.sch-aside__title`
is heading-compact-02 in a head of exactly this height, and this log records
that type being picked so the two regions' heads match each other rather than
their own subordinates. The week label is the schedule's head; same band, same
type. Raising it would have made the schedule's title outrank the roster's for
no reason but width, and would have broken the ladder under it -- 16px title,
16px bus number, 14px day.

**AND THE FIRST WAY I CENTRED IT SILENTLY BROKE THE TRUNCATION.**
`display: flex` with `align-items: center` centres perfectly and makes the text
an ANONYMOUS FLEX ITEM, and `text-overflow` applies to the box holding the
text, not to a flex container -- so a long range is hard-clipped with no
ellipsis. That is precisely what the base rule exists to prevent: "a truncated
'September 7 - 13, 20...' still says which week; a hidden button says nothing."
**The real label is 125px in a 343px band and would never have shown it**; it
was found by setting a 52-character range by hand. `align-content: center` on
the block keeps `overflow`, `text-overflow` and `white-space` doing what the
base rule set them to. Verified both ways: with the long string the ellipsis is
drawn, and text sits 13.5px from each edge of the 48px band.

**AND A BROKEN COMMENT THAT ATE THE FIX FOR ONE PASS.** The note explaining all
of the above was appended without its opening `/*`, so it closed the block
above it and then sat as bare text in the rule -- the parser discarded up to the
next `;`, which was `align-content: center` itself, while `min-block-size`
after it survived. The band was 48px and the text was not centred, and the only
reason it was caught is that the computed `align-content` was read back and
said `normal`. **A stylesheet this heavily commented can lose a declaration to
a comment, and no gate here can see it**: `check.mjs` parses classes, tokens,
ids and hrefs, not cascade. Reading the computed value of what you just set is
the check.

**MEASURED AFTER, 375x812:** label band 48 and button row 48, toolbar 96, text
13.5px from each edge, label text still starting at x=16 on the chevron glyph,
document width 375. At 1440 the label is untouched: `display: block`,
`align-content: normal`, `min-block-size: auto`, `margin-inline: 16px`, band
22px in a 40px toolbar, grid at y=120, the same seven day columns.

**AND A BUG THIS PASS INTRODUCED, FOUND BY RUX: "the profile and switcher
button are hidden when viewing the trip editor and driver assignments panels".**
The buttons were never hidden -- measured, they are visible, hit-testable and
`aria-expanded` goes true on press. **The panel they open was.**
`#rux-account-panel` lays out exactly where it should, x=119 y=48 at 256x764,
and the full-width trip editor painted straight over it, so pressing Account
appeared to do nothing.

**IT IS A CONSEQUENCE OF SCOPING THE UN-FIXING AND EXISTS NOWHERE ELSE.** On a
desktop rux-overrides.css gives the panel `z-index: auto` and it is a flex
column in the board, so nothing ever stacked. Restoring Carbon's fixed
positioning below md restored its `z-index: 9000` with it -- a number chosen
for a panel in an app that does not also own the chrome. The roster, which this
pass wrote by hand at 8999 to sit just under it, had the same fault for the
same reason.

**THE SCALE, READ OUT OF `rux.css` RATHER THAN GUESSED.** Distinct z-indexes
there are 0-10, 999, 6000, 6001, 8000, 8001, 8002, 9000, 9100, 9999, 99999,
100000. Measured on this page: side-nav scrim 6000; header, its panels and the
side nav 8000; menus -- Carbon's and this app's three -- 9000; everything in
the board at most 10. **999 is the only rung that clears the board while
staying under all of it**, and it is Carbon's own next step down rather than a
number invented here. Trip panel 999, roster 998, keeping the order between
them.

**VERIFIED AT 375x812, all four of the things that number has to satisfy.** The
account panel opens over the trip editor and over the roster, settling at x=119
and 256 wide with its theme radios hit-testable. The side-nav scrim at 6000
dims the trip panel and the nav at 8000 sits over both. The bar's context menu
at 9000 still opens over the panel and its items hit-test. At 1440 nothing
moved: both regions are `position: static`, `z-index: auto`, the roster at
x=48 and the editor at 1072, both 320 wide, the board at 384.

**A MEASUREMENT MISTAKE OF MINE ALONG THE WAY, TWICE.** The account panel
animates `transition-property: width`, and two readings taken under a second
after the click recorded it 2px wide at x=373 and were nearly written up as
"the panel does not open". It does; it had not finished. The poll loop written
to fix that was also wrong -- it exited on `w === last` and two identical 2px
samples BEFORE the transition started satisfied it at 100ms. A settle loop must
not treat "has not started" as "has stopped". The reliable readings were a
fixed 2s wait and the screenshot.

**ONE THING THE SCREENSHOTS GOT WRONG AND THE MEASUREMENTS DID NOT.** After the
bleed the board APPEARED to end 190px short of the pane, with dead page
background under it. It does not: `elementFromPoint` finds real trip bars at
y=650 and y=700 and `.sch-track` at y=770, with `.rux--content` only past the
pane's measured bottom of 780. It is the paint lag this log already records for
a hidden browser pane -- "read off the computed styles rather than the
screenshots, which lag while the browser pane is hidden", 2026-09-06. Worth
restating because this time the lag looked exactly like a layout bug.

**TWO MISTAKES OF MINE, BOTH CAUGHT BY MEASURING AFTER.** The class swap first
toggled `rux--btn--icon-only` by width on EVERY toolbar button, which would
have stripped it from the two chevrons and the overflow trigger at md and up
and left three text-padded buttons with no text in the desktop toolbar; it is
keyed on the presence of a label span now. And `.sch-toolbar__glyph {
display: none }` was written BELOW the media block -- same specificity, later
in the file, so it beat the `display: block` inside it and Today and Drivers
rendered as 48px squares with nothing in them: pressable, named to a screen
reader, blank to look at. A media query adds no specificity. Both were visible
only because the buttons were measured rather than assumed.

**AND ONE STALE CLAIM CORRECTED IN PLACE.** The note on the stacked label
first said it would then read "September 7 - 13, 2026". It does not -- the
form is `formatRange`'s, the locale's, not the width's, and it reads "Sep 7 -
13, 2026". The comment now says so and says it was wrong.

**MEASURED AFTER, at 375x812 on the live project.** Document scroll width 375
against a 375 viewport in every state -- board alone, roster open, editor open
-- so the page no longer overflows and Account and App switcher sit at 279 and
327, on the screen. The bus column offset is 0 at scrollLeft 0, 247, 433 and
673 (the maximum); it was 0, 0, -186, -458. Board 311px with neither companion,
295px with the editor over it, 311px with the roster over it -- never 0. Six
toolbar buttons at 48x48 from x=32 to x=343, every glyph resolving. Panel x=0,
w=375, below the 3rem header, with its Cancel/Reset/Save bar pinned at the
foot. Roster head 48px holding a 48px close that closes it. Opening a trip
while the roster is up still hides the roster -- the `crowded` yield written
on 2026-09-06 does it, unchanged, because below md the board is always
crowded. Crossing back to 1440 without a reload restores every button to 40px
and its word, one row, no overflow. All eight themes resolve their own
`--rux-overlay` and `--rux-layer` for the new overlay surfaces, read off the
computed styles; white was opened as well as g90. specimen.html gains the
sticky fix on the same stylesheet: 375 document width, column offset 0 at max
scroll.

**NOT DONE, AND THE FIRST IS THE ONE THAT MATTERS.** The week is still a week:
at 375 the pane shows about two day columns of seven and you scroll for the
rest. That is Carbon's own small-screen table pattern -- horizontal scroll
under a sticky first column -- and it is what this pass chose. **A day view
below md was considered and deliberately not built**: it is a surface Carbon
does not ship, it needs the week/day switch designed rather than a breakpoint,
and screen-inventory.md section 4 already points the other way by planning
`driver.html` as the mobile-first surface. That decision is open.

Also not done: the day header cells are still 32px, under both platforms'
touch guidance, and they are the control that jumps a week; no landscape
orientation was checked; nothing was tested on real hardware, so momentum
scrolling and the two nested horizontal scrollers are unproven -- this was
Chrome's device emulation driven by a mouse. `check-a11y` and rux-ds's browser
gates still have never run against this app.

**AND `node tools/check.mjs` DOES NOT EXIT 0, FOR A REASON THAT IS NOT THIS
PASS.** It fails on `mock-billing.html` -- an untracked file, written 11:22
today by something other than this session -- for `var(--rux-font-family-sans)`,
a token declared nowhere. Classes, files, sprite and ids all pass, and the
token gate passes on everything else, so the three files changed here are
clean. The file was left alone rather than fixed or removed: it is not this
pass's and not this pass's to delete.

**2026-09-11 - the billing composition simplified.** Reworked the existing
billing composition after the request for a clean, professional tab. Balance
is the single headline, with the existing status tag beside it; Paid and the
confirmation prediction are supporting rows. The first section no longer
doubles the sticky tabs' top spacing. Document lists share the panel surface
and omit their redundant PO/INV tags, while payments retain their method
tags. Milestone headings now name their state, and the switches use Carbon's
captured small variant. Section gaps use spacing-05. The coverage shortfall
remains explicit in neutral helper text.

This revises the earlier two-headline layout, layer-two list bands, full-size
switches and red shortfall text. It changes presentation, not the billing
ladder, fields, one-record caps, dialogs or persistence. The footer is left
as previously chosen: its full labels had already been rejected for wrapping
at this width. No database writes, release or commit were made.

Validation: `node tools/check.mjs` and `node --check sch-data.js` exit 0.
At the same 320px panel width, the inspected Billing content went from
697.95px to 595.97px. Before/after DOM snapshots match every input value and
disabled state, switch state, and named action's disabled state. Balance,
paid total, coverage amount and confirmation agree. Pointer PO toggle,
keyboard Contract toggle, quote recalculation, and Reset were exercised in
unsaved drafts; Reset restored the original records and disabled Save.
All eight themes were visually inspected; lower rows and footer clearance
were checked in white. This was not a persistence test or a full browser-gate
sweep, and no production records were saved.

**MOVED HERE 2026-09-11, FROM THE FOOT OF A FILE THAT SAYS NEWEST FIRST.** It
was written as a `##` heading below the 2026-09-06 entry, the oldest position
in the log. Only its heading changed in the move -- restyled to the bold
dated form every other entry uses -- and the lines rewrapped; the words above
are its own. Its place is above the list entry rather than below it because
it treats the document lists, the one-record caps and the dialogs as already
built, and those are the list pass's, so it is the later of the day's two
passes.

**AND ITS LAST LINE IS STALE: THE CODE IT DESCRIBES IS COMMITTED.** "No
database writes, release or commit were made" was true when written; the work
then went into `a3f8bf9` together with the list pass -- the small switch
variant and `.sch-billing-section` enter the history there and nowhere else.
The line is left standing rather than edited, as what that session saw. It is
not the missing 2026-09-10 write-up the entry below asks for, either: the
Billing tab rebuild at `8af1f6b`, the three billing fixes and the cell mark
are still unwritten here.

**2026-09-11 - the PO and the invoice became lists, capped at one row.** rux
asked for the layout to be finalised now and for the cap to hold
compatibility with the columns that exist. Both sections are
`contained-list`s with an add button, a row per record and their fields behind
a dialog -- the shape `docs/po-invoice-lists-plan.md` Phase 4 draws, built
ahead of the tables rather than waiting for them.

**THE CAP IS THE SCHEMA'S AND IT IS ONE LINE.** `LIST_CAP = 1`, and the `+`
disables at it with "One purchase order per trip for now" in its tooltip.
`trips` holds one `po_ref`, one `po_amount` and one `invoice_number`;
`trip_pos` and `trip_invoices` are still 404. On 2026-09-10 that was the
argument for having NO add button, and the note in the code said a `+` would
be a control that can never add a second row. That is still true of the
database and is not true of a button that stops: a control refusing a second
row at a stated limit is honest, one that accepts it and drops it on save is
not. Raising the constant, giving the rows an `id` and swapping two keys in
`EDITS` for `posPatch()` / `invoicesPatch()` is the whole of the UI half of
the plan.

**THE VALUES LEFT THE FORM AND `readForm` HAD TO BE TOLD.** `sch-f-poref`,
`sch-f-poamount` and `sch-f-invnum` are dialog fields now, so they came OUT of
`readForm`'s id list -- left in, three ids that never resolve would make
`readForm` return null on every open and kill Save on a panel where nothing
was wrong. `EDITS` reads `poPending[0]` and `invPending[0]` instead and
touches no element at all. The same rule as 2026-09-10's, read the other way:
a key added to `EDITS` must join that list, and an id whose control left the
panel must leave it.

**THE SWITCH STAYED, AND THE DATA IS WHY.** With a list, "at least one row"
could be the switch and the section would lose a control -- Phase 4 lays out
both options. 12 of the 55 trips with a PO carry `po_received` with no
reference and no amount: a PO promised, nothing typed. A list alone cannot say
that, and switch-on-with-an-empty-list is exactly those 12 rows. Off still
hides and clears, so hidden means empty means what Save will write.

**PAYMENTS MOVED ONTO THE SAME BUILDER, which is the part that makes "reads
the same way" a fact rather than a claim.** `rowList` builds the header, the
switch slot and the `+`; `listRow` builds the tag/middle/amount grid. Three
lists cannot now drift in height, density, tag size or column alignment.
Measured after: all three labels at x=311 and all three `+` right edges at
x=599, the panel's own right edge.

**A BUG OF MINE THAT rux SAW BEFORE THE CHECK DID, and it was in the same
commit as the feature.** The shared row class was first named `.sch-row` --
which is already the BOARD'S bus row at `sch.css:110`, `display: contents` so
its cells join the week grid. A second `.sch-row { display: grid }` later in
the file won on order, every bus row became a three-column grid, and the
schedule came apart. rux reported it from the screenshot. It is now
`.sch-listrow`, and the comment in `sch.css` says why the short name is not
available. `check.mjs` cannot catch this class of fault at all: both names are
this app's own, so there is nothing upstream to resolve them against -- the
gate that would have caught it does not exist and this entry is the only
record.

**AND A CLIPPED CONTROL THAT HAS BEEN SHIPPING SINCE 2026-09-10.**
`.rux--contained-list__action` is absolute with `inset-inline: 0`, so it
resolves against the header's border box and ignores the header's own
`padding-inline`. With the list bled out to the panel's edges that put the add
button 16px OUTSIDE the panel: measured x 1036-1068 against a panel ending at
1052, half a button clipped -- on the payments list as delivered yesterday,
not only on the new ones. Fixed in `.sch-list-action`, this app's own element
inside the slot, reading Carbon's own density variable; filed against rux-ds
as its own open request.

**WHAT WAS MEASURED ON THE SERVED PAGE**, trip 218's panel and a new trip,
both themes: open with a PO shows the row and a disabled `+`; Save and Reset
dead on an untouched panel, so no phantom patch. Remove the row -> empty
state, `+` live, coverage recomputes from $22,750 to $45,500, Save arms. Add
`PO-TEST-1` / $10,000 -> coverage $35,500; edit to $46,000 -> "Covers the
balance" and the rung moves from Partial PO to PO received. Switch off ->
rows hidden and cleared, coverage blank; on -> empty list, `+` live. Reset ->
the original row and number back, Save dead. Blank `Done` adds nothing.
Invoice remove/add/edit the same, its third column 0px wide. Payments add
($5,000 Check) and remove still move the Paid figure. On a NEW trip both
lists render hidden, the switch reveals them, and typing a destination and a
date arms Save -- which is the check that `readForm` still returns non-null
with three ids gone.

**NOT DONE, AND THE FIRST TWO ARE THE SAME BLOCKER.** No second PO and no
split invoice: the tables do not exist, and this pass deliberately did not
touch `rux-backend`. No date on either section, which is the one thing rux
asked for that is missing -- there is no column to write it to, so a picker
here would be a control whose value is dropped on save; Phase 1 adds `date` to
both tables and the row's middle column is the slot. No invoice amount, for
the same reason. `posPatch()` / `invoicesPatch()` are not written -- the two
`EDITS` keys still write the single columns. rux-ui is untaught either way
(Phase 0.3).

**NOT VERIFIED: THE WRITE ITSELF.** Save was armed and disarmed and the patch
it would build was read from the panel, but Save was never PRESSED -- the
database is production and shared with rux-ui, so writing a test PO to a real
trip is rux's call, not this session's. What is verified is everything up to
the update: the values `EDITS` produces, on both an existing and a new trip.

**STILL MISSING FROM THIS LOG: the 2026-09-10 pass.** The Billing tab rebuild,
the three billing fixes and the new cell mark are all committed and none of
them is written up here. Not backfilled by this entry, which would be this
session inventing another session's reasons.

**2026-09-09 - every field on a new trip, and the regression that asking for
it uncovered.** rux asked for all fields to be visible when creating. Building
it found that the Billing tab had broken trip CREATION four commits ago.

**THE BUG, WHICH WAS MINE AND IS ALREADY COMMITTED AT `c125087`.** The Billing
tab rendered nothing on a new trip -- "Billing opens once the trip exists" --
so nine of the ids `readForm` requires did not exist. `readForm` returns null
the moment ONE is missing. The create path is `{ ...readForm(), bus_count: 1 }`
and `{ ...null }` is `{}`, so a new trip would have inserted as
**`{ bus_count: 1 }`**: no destination, no start date. `legsOf` builds no leg
without a start date, so the row would have existed and never appeared on any
week -- created and lost in the same click. Save is disabled until a date is
typed, which is the only reason it was never seen.

**THE FIX IS THE FEATURE.** Every column on the Billing tab is a `trips`
column; none of them needed the trip to exist. The same was true of the two
contact blocks -- the search picks contacts that already exist, and the six
link columns join the insert like any other. A booking contact is often the
first thing known about a trip, someone having rung, so hiding it until after a
save had the order backwards.

**AND A GUARD, BECAUSE THE NEXT ONE DESERVES TO FAIL LOUDLY.** The create path
now refuses to insert from a null form instead of spreading it into nothing.
The fields are all present, so it cannot fire; it is there because this fault
was invisible until someone read the spread.

**SCHEDULE NEEDED A DECISION RATHER THAN A GUARD REMOVED.** Its four fields
write `trip_stops` and a new trip has none. `stopsPatch` refuses to create a
row for an EXISTING leg with no pickup, because where it belongs among the
others is the itinerary editor's business -- but a brand-new trip has no
others, so leg `outbound`, position 0, type `pickup` is the only thing it could
mean. On create the rows are inserted; on edit the refusal stands. Nothing is
written unless something was typed, which is what 687 of the 751 existing trips
look like.

**VERIFIED: the panel. NOT VERIFIED: the insert.** All 21 ids `readForm` wants
are present on the create panel and none is missing. Destination gates Save and
clearing it re-disables with `aria-invalid`. Pickup, yard depart and a quoted
price all accept input there. **No insert was sent** -- same standing limit.

**NOTICED AND NOT FIXED: an end date can precede a start date.** Setting start
to 2026-09-10 left end at 2026-09-07 and nothing objected. `date-picker.js`
swaps them when a range is picked THROUGH the calendar, so this only shows when
a value arrives another way. Pre-existing, not introduced here, and left for a
decision rather than fixed in passing.

**2026-09-09 - one Organization, and an autofill rule that was wrong twice
over.** rux opened the panel, saw `Customer` reading "TMS" above `Organization
or group` reading "TMS", and cut one.

**`trips.customer` IS THE SURVIVOR AND IT IS NOT A COIN TOSS.** It is on 725 of
751 trips; `contacts.client` exists only for the 292 with a linked contact, and
only 160 of the 196 contacts carry one. Keeping the contact's copy would have
blanked the field on 433 trips. Relabelled `Organization`, and the booking
block's field is gone.

**WHAT IT GIVES UP, STATED ONCE.** 13 trips have a `customer` that differs from
their contact's `client` -- "Mission CISD" books for "Vaquero Indoor". Billed-to
and travelling-group were two facts and are now one on this panel.
`contacts.client` still holds the other and the Customers view still edits it;
this form simply stops showing it. Raised before the cut and decided by rux
after it was raised.

**AND THE AUTOFILL RULE WAS WRONG, WHICH THE SCREEN SHOWED WITHIN A MINUTE.**
"Fill only what is empty" was written to stop an agency stamping itself over a
school. Applied to all three fields it produced something worse: picking Adan
Molina left **Louise Reece's phone and email** sitting under his name, because
the rule treats the PREVIOUS contact's data as though a person had typed it.
They are not the same thing.

**THE SPLIT IS BY WHO OWNS THE FACT.** A phone and an email belong to the
person, so choosing a different person REPLACES them. Organization is a trip
column that 13 trips disagree with their contact about, so it stays a
suggestion: empty it fills, filled it stands. Driven: picking Adan Molina now
gives 361-695-7512 and adan.molina@ccisd.us while Organization holds "TMS".

**2026-09-09 - the contact block rebuilt, and the three orderings judged
against the data.** rux collected three proposals for the form's order and
asked which to take. The answer was the third's structure with two of the
first's behaviours, and the reasons are measurements rather than taste.

**WHAT WAS TAKEN, AND WHY EACH SURVIVED A COUNT.** Section headings so the
labels can drop their prefix -- in a 320px panel "Booking contact phone" wraps
and "Phone" does not, so this is width and not tidiness. A search over the
contacts, because there are **196** of them and 55 of the 162 linked ones serve
more than one trip, so a bare name field cannot tell two Ashleys apart. One
day-of row rather than five, because **687 of 751 trips carry no day-of contact
at all** -- 57 carry one, 6 carry two, one carries five -- so five empty rows
would be noise on 91% of trips. "Day-of-trip" over "on-site", since the person
may be travelling with the group or working a desk.

**AND THE TWO BEHAVIOURS FROM THE FIRST PROPOSAL, both of which the data
argues for.** `Same as booking contact` is a checkbox because
`trip_contact_1_id` EQUALS `booking_contact_id` on **34** trips -- 53% of every
day-of contact that exists is the booking contact retyped. And the autofill
suggests rather than locks, because 13 trips have a `customer` that differs
from their contact's `client`: "Mission CISD" books for "Vaquero Indoor",
"Raymondville ISD" for "Raymondville High School". An agency booking for a
school is a real shape here, and a hard fill would stamp the agency onto trips
that are not theirs. Only empty fields are filled.

**WHAT WAS REJECTED, WITH THE NUMBER THAT REJECTED IT.** Trip type first, on
the argument that it decides whether an end date is meaningful: **705 of 751
trips are round trips** and one-way keeps a range too (25 of 26 run a day, one
runs three), so the field is the same value 94% of the time and the main range
is meaningful for every type. Type governs only the conditional `Pick-up` pair,
which already sits directly beneath it. The second proposal's review screen is
wizard shape and this is a side panel; its combined range picker is already
Carbon's; its visual grouping is already `section()`.

**THREE FIELDS ALL THREE PROPOSALS WANTED CANNOT BE BUILT.** `passenger_count`,
`pax` and `passengers` are all absent -- capacity lives on `buses` and
`req_56pax` is a boolean need -- as are `role` and `contact_role`, and the
email thread, which six name probes could not find. All three are schema
additions and rux's to make. Four more of the first proposal's "missing" fields
already existed: pickup location, yard depart, spot and return are the Schedule
section from earlier today.

**THE SEARCH IS A NATIVE `<datalist>`, NOT CARBON'S COMBO BOX**, and that is a
deliberate choice rather than a shortcut. `js/list-box.js` says filtering is not
reimplemented and the combo-box form is not verified -- "nothing here should be
read as covering it" -- so writing the filtering would have been implementing a
component rux-ds owns. A datalist is the platform's, it filters and announces
itself with no script of ours, and the input wearing `rux--text-input` is that
component used correctly. Filed as a seventh request. The cost is on the record
there: no value/label pair, so one string per contact is built and matched
back, and the dropdown is the browser's rather than Carbon's.

**THE NAME STOPPED BEING EDITABLE HERE, which is a change worth naming.** It
was its own field this morning; the search replaced it, and a search FINDS a
contact rather than renaming one. Renaming belongs to the Customers view that
owns the record. Picking a different person is a change to
`trips.booking_contact_id`, a trip column, so it diffs with the trip rather
than with the contact.

**DRIVEN, ALL OF IT EXCEPT THE WRITE.** 196 options in the list. Opening a
linked trip fills Louise Reece - TMS - 240-224-4044 with organisation, phone
and email beside it. Picking another contact resolves its id and arms Save;
typing a name that matches nothing clears the id, which is correct -- it is not
a contact until it is one. Checking `Same as booking contact` hides the rows
and disables the add button; clearing it brings them back. `Add another
contact` stops at five, which is where the schema stops. **No write was sent**,
same standing limit as everything else here.

**2026-09-09 - Customer details, four fields of five, and two facts the
mockup could not show.** rux asked to include the mockup's Customer Details
card. Counted before building, as with Billing.

**FOUR MAP CLEANLY.** `contacts` holds 196 rows: name 196, phone 140, email
134, client 160 -- all four real and all four editable. Customer name, Customer
phone, Business/School and Email are in.

**`Business/School` IS NOT THE `Customer` FIELD ABOVE IT**, which is the thing
that looked like duplication and is not. Of the 275 trips carrying both, 262
agree and 13 genuinely differ: "Mission CISD" books for "Vaquero Indoor",
"Raymondville ISD" for "Raymondville High School", "Santa Rosa TX" for "Santa
Rosa HS". `trips.customer` is who the trip is billed to, `contacts.client` is
the group travelling. Both stay, and the panel now shows both.

**`Email thread` IS NOT BUILT BECAUSE THERE IS NO COLUMN.** Asked the table for
`missive_url`, `email_thread`, `email_thread_url`, `thread_url`,
`missive_link` and `conversation_url`; all six came back absent. A Missive link
is a schema addition and rux's to make, the same answer `service_type` got on
the Billing tab. Nothing was invented to fill the space.

**459 OF 751 TRIPS HAVE NO CONTACT AT ALL**, which is the case the mockup
cannot show and the section has to be honest about. Only 292 carry a
`booking_contact_id`, so an unlinked trip gets a line saying so -- and saying
that the Customer field above is the billing name -- rather than four dead
boxes. Attaching one means choosing from 196 contacts, which is a picker and a
separate piece of work. Both branches were driven: a linked trip fills with
Louise Reece / 240-224-4044 / TMS / lreece@tms.com, an unlinked one shows the
hint.

**IT EDITS A SHARED RECORD, AND THE PANEL SAYS SO ON SCREEN.** 55 of the 162
linked contacts serve more than one trip and the busiest serves 18, so
correcting a phone here corrects it on all 18. That is what a contact IS, and
it is how the old app already works -- `backend-inventory.md` lists `contacts`
as written by the trip editor as well as the customer editor -- so this
follows it rather than inventing a rule. What would have been wrong is leaving
it implicit, so a hint under the fields states it.

**A THIRD TABLE MEANS A THIRD WRITE.** `contactPatch` diffs one row the way
`stopsPatch` does and the save sends it separately; `trips.update` has no
`name` or `client` to receive. A failure there leaves the trip saved and says
which half did not, the rule the stop and assignment writes already follow.

**VERIFIED: reads, both branches, arming. NOT VERIFIED: the write.** Save is
dead at open, arms on a phone edit, dies again on the way back. The `contacts`
update was not sent -- same standing limit as every other write here.

**2026-09-09 - mm/dd/yyyy where it can be had, and the mono zero settled by
looking at it.** rux asked for the date format everywhere and whether the mono
face is really loading.

**THE FONT IS LOADING AND IT IS THE REAL FACE.** Rendered `0O` at 200px and
looked: the zero carries IBM Plex Mono's centre DOT and the capital O does not,
and both measure 240px, so it is the monospaced face rather than a fallback
wearing its name. That is the check that settles it -- the width probes in the
entry below could only say "not the fallback", where the dot says "this font".

**THE FORMAT SPLITS IN TWO, AND ONLY ONE HALF IS OURS.** `mdy()` now formats
every date this app renders itself; the Billing payments list is the one place
today. It does STRING work rather than `new Date()`, because a bare
`new Date('2026-07-06')` is parsed as UTC midnight and printed local, which is
the previous day west of Greenwich -- the payment dated the 6th would have read
as the 5th.

**THE PICKER'S OWN FIELDS CANNOT FOLLOW, and they are left alone.**
`date-picker.js` reads one shape -- `^(\d{4})-(\d{2})-(\d{2})$` in `parse()`
-- and writes ISO straight back into the input on every pick, at four places.
A field showing mm/dd/yyyy is a field the module cannot read: no calendar
position, no range arithmetic. There is no format hook, and
`--short` is a width rather than a format. Filed as a sixth request. Writing a
display layer over a module that owns the field is the workaround shape
`AGENTS.md` forbids, so nothing was written.

**A TEST OF MINE WAS BADLY DESIGNED AND IS NOT EVIDENCE.** The first attempt to
show the module rejects mm/dd/yyyy typed the format into the start field and
read a highlighted day off the calendar as acceptance. The highlight came from
the OTHER input, still ISO. The source settles it; that probe did not, and
saying so is cheaper than someone re-running it.

**2026-09-09 - the date labels, and a mono question answered by measuring.**
`From`/`To` are `Start date`/`End date`, matching Carbon's own story. The
`Pick-up` return pair took the same words rather than keeping the old ones: two
date ranges in one form labelled two ways would have made the conditional
section the odd one out, and the `Pick-up` heading above them already says
which outing they belong to.

**AND THE TYPE IS MONO, WHICH TOOK FOUR TRIES TO ESTABLISH.** rux asked whether
the date text is the mono version. Carbon compiles
`.rux--date-picker__input { font-family: var(--rux-code-02-font-family, 'IBM
Plex Mono', ...) }`, this app's input computes the same stack, and it resolves
to the real face: `09/08/2026` measures 84px against 77.16 for system-ui and
77.93 for Plex Sans, 84 being the true monospace advance. Nothing to change.

**THE MEASUREMENT WENT WRONG TWICE FIRST, AND THE REASON IS WORTH KEEPING.**
The first probes said it was NOT rendering mono -- `"IBM Plex Mono"` measured
identically to `serif`, which is what an unavailable face looks like. `plex.css`
sets `font-display: optional` on every face, and optional means the browser
uses the fallback if the file is not ready almost at once and then **never
swaps it in for that page load**, cached or not. So the face was present,
`document.fonts` reported it loaded, and the page was still drawing system-ui.
Only an explicit `document.fonts.load()` before measuring showed the real
advance. A warm reload did NOT fix it, and reading that as "optional is not the
cause" was wrong -- it is the cause, and the warm-load test simply had not
warmed the face.

**WHAT THAT MEANS IN USE.** On a cold load the date field can render in
system-ui rather than IBM Plex Mono, for the whole of that load. It is rux-ds's
deliberate choice -- reasoned in `plex.css`'s own header, which lists the
date-picker and time-picker inputs among the things that are code-02 -- and it
is not a divergence from Carbon, which this app matches either way. Recorded
rather than filed.

**2026-09-09 - the dates moved to the first row of Details.** rux's reasoning,
and it is the right one: the range is the first decision anyone makes about a
trip and the one field that arrives already answered. A trip created from a
cell carries the day that cell was, so the panel now opens with row one filled
and the rest blank, which is the order the form should read in.

**IT ALSO FIXED AN ADJACENCY BY ACCIDENT.** `Pick-up`, the return pair, is
appended after the main block and only shown for a drop-off and pick-up trip.
Type used to sit two fields above it; Type is now directly above, so choosing
that type makes a field appear immediately beneath the select that asked for
it. Driven: switching the type reveals `Pick-up` in place.

**AND IT COSTS THE CALENDAR NOTHING**, which was the thing worth checking
rather than assuming. `__calendar-container` is `position: absolute;
inset-block-start: 100%` against its own root, so it opens downward over what
follows -- from the top of the panel it has MORE room, not less. Measured: the
calendar opens at 260 and ends at 608 against a panel body ending at 869, so it
now falls entirely inside the panel where before it ran past the fold. Overflow
is unchanged at 191 for a round trip; nothing moved but the order.

**2026-09-09 - the calendar was painting the panel's own colour.** rux
compared it against Carbon's `range-with-calendar` story at g100 and said the
surface looked wrong. It was, and the token was right -- what was missing was
the context it reads.

**THE MEASUREMENT.** `.rux--date-picker--next .rux--date-picker__calendar` is
`background-color: var(--rux-layer)`, and `--rux-layer` is CONTEXTUAL: Carbon
expects an ancestor to have raised it. Nothing on Carbon's story page has, so
the calendar takes layer-01 and steps above the page background, which is why
it reads correctly there. Here it opens inside a side panel that IS a layer-01
surface: measured in g90, panel `#393939` and calendar `#393939` -- the same
value, no step, the boundary invisible. Not a wrong colour, a missing one.

**THE FIX IS CARBON'S OWN LAYER COMPONENT.** `.rux--layer-one/two/three` are
compiled in the pin and set `--rux-layer` for their subtree; a surface floating
over another surface is exactly what layer-two is for. It goes on
`__calendar-container` and not on the panel, so every field in the form keeps
the layer it had and only the floating thing is raised. It survives
`date-picker.js` detaching and re-inserting the container, the class travelling
with the element.

**STEPPED IN ALL FIVE THEMES, checked rather than assumed.** white 255/244,
g10 244/255, g90 82/57, g100 57/38, rux 255/244. **g10 inverts** -- the calendar
is DARKER than the panel there, because Carbon's g10 puts layer-01 at #ffffff
and layer-02 at #f4f4f4. That is the system's own ordering, not a fault, and it
is worth knowing before someone reads it as one.

**NOT A REQUEST.** The markup was already right: `date-picker.js` claims
`__calendar-container` inside the root and does not portal it, which is what
this app builds. Only the layer context was missing, and the class for it ships.

**2026-09-09 - the Billing tab, built against counted columns rather than a
mockup.** Third tab in the editor, between Details and Fleet.

**EVERY FIELD WAS COUNTED BEFORE IT WAS BUILT**, which is the habit the
Schedule section earned by getting it wrong. Over all 751 rows: `quoted_price`
99, `deposit_amount` 31, `invoice_number` 43, `po_ref` 42, `po_amount` 47,
`contract_status` 336, `invoice_status` 336, `balance_paid` 751, `date_paid`
24. All nine are real, so all nine are fetched and eight are editable.
`contract_status` holds exactly "Pending" and "Signed"; `invoice_status`
exactly "Pending" and "Invoiced" -- two values each, which is why they are
toggles and not selects.

**THREE THINGS IN THE MOCKUP ARE NOT BUILT, AND THE REASONS ARE DIFFERENT.**
`Service type` (Charter/Ticketed) has no column: `trips.service_type` does not
exist -- asked for it and read the error -- and exactly ONE trip of 751 has any
`trip_ticket_options`, so there is nothing to switch between and the column
would be rux's to add. `Est. miles`/`Actual miles` are not trip columns either;
`trip_stops.miles` carries them per stop with `miles_source` saying estimated
or manual, so a total is the itinerary's arithmetic. And `Balance` is drawn as
money in the mockup while `balance_paid` is a **boolean**, true on 751 of 751 --
the column is "is it settled", not "how much is left". It is a toggle, and the
amount outstanding is shown beside it as quoted less payments, from the same
rows the Payments list shows so the two cannot disagree.

**TWO FAULTS FOUND BY DRIVING IT, NOT BY READING IT.** Save never armed for any
Billing field: `input` and `change` were bound to `panelDetails` alone, so
typing a quoted price left the button grey and the edit was lost. And the
toggle read `false` after an odd number of presses, because `toggleField` bound
its own click handler to a control `js/form-controls.js` already owns --
`setToggle` sets `aria-checked`, swaps `__switch--checked` and fires
`rux:toggle`. Ours is gone; the panel listens for `rux:toggle` instead, which
is the third event, a <button> firing neither `input` nor `change`.

**THE TOGGLE'S WORDS ARE CARBON'S AND CANNOT BE OURS.** `setToggle` hard-codes
On/Off, so "Signed"/"Pending" was overwritten on the first press. The label
carries the meaning instead -- "Contract signed" -- which reads correctly and
needs no override. Filed as a fifth request: rux-ds's own file header already
calls that hard-coding "worth a decision rather than a silent default", so this
is that decision arriving with a consumer attached.

**MARKUP CAME FROM rux-ds's TEMPLATES, NOT FROM THE COMPILED SELECTORS.** The
toggle is `templates/form-page.html`'s shape, copied. That is the correction to
how `timeField` was built yesterday -- reading class names out of `rux.css` and
assembling something plausible produced a `rux--time-picker` wrapped round
markup that was not that component. One grep of `templates/` is the cost of not
doing that again. Money is a `rux--text-input` with `inputmode="decimal"` and
deliberately NOT `rux--number-input`: Carbon's ships stepper buttons, and a
quoted price is not stepped by one. `calendarBody()` was extracted so the range
picker and Billing's single `Date paid` build the same calendar.

**BLANK IS NULL AND NOT ZERO.** 652 of 751 trips have no quoted price; a form
turning every empty box into 0 would claim 652 free charters.

**VERIFIED: reads, arming, toggles. NOT VERIFIED: the write.** Trip 218 shows
quoted 45500, invoice 15659, PO ref "MT CONV DALLAS S26-ESCAMILLA", PO amount
22750, Contract Pending, Invoice Invoiced -- all matching the table. Save is
dead at open, arms on a money edit or a toggle, and dies again on the way back,
driven on both. **The `trips` update was not sent**: same standing limit as
everything else that writes here.

**NOT DONE.** Payments are read-only -- `backend-inventory.md` records that the
old app rewrites every row of a trip on save, so editing means owning insert,
update, delete and position, which is an editor rather than a panel field.
Deposit is stored but does not feed the balance, because what it means against
`trip_payments` was not established. No Service type, no miles, per above.
`node tools/check.mjs` passes.

**2026-09-09 - the Details tab restructured, and a correction that inverted
where it writes.** rux asked to strip the itinerary down to a pickup location
and three times, after a five-tab mockup from rux-ui. The structure was the
easy half; the store was not.

**I TOLD RUX THREE OF THE FOUR FIELDS WERE ALREADY COLUMNS AND THAT WAS WRONG
WHERE IT MATTERED.** `trips.departure_time`, `spot_time` and `return_time` do
exist -- and are **null on all 743 rows**, counted 2026-09-06 and recorded in
the comment above the select this app has been reading all along. `timesOf`
takes them only as a fallback that has never been taken; `spot` has no column
fallback at all. Writing them would have saved values **the board does not
read**: the field would change, Save would report success, and the bar would
not move. The Schedule section writes `trip_stops`.

**WHICH TURNS OUT TO BE THE HAPPY VERSION.** All four fields are two rows -- the
leg's `pickup` stop carries the location, `depart_prev` and `spot`; its `return`
stop carries `arrive`. Stripping the itinerary is editing those two rows, and
`stopsOfLeg` is now the ONE place that picks them, extracted from `timesOf` so
the bar and the panel describing it cannot choose different stops.

**WHAT WENT AND WHAT CAME.** Out: `This leg`, a 146px `sch-def` readout, and
`Itinerary`, a 284px structured list -- 430px of a 729px panel that could not be
acted on. In: Pickup location and a two-up row of Yard depart, Spot, Return.
**Overflow 405 to 191 at 1440x950**, and what remains is a form that scrolls
rather than a readout that forced it.

**TWO FAULTS CAUGHT BY LOOKING, BOTH MINE, BOTH IN THIS PASS.** First the row
was three columns: 288 across, 91 each, arithmetically fine and rendered
"07:5", "03:4", "07:C" -- a `type="time"` control draws "07:50 AM" plus a clock
and wants about 130. The clipping is in the control's shadow DOM, so
`scrollWidth` on the input reported nothing and only the screenshot showed it.
Two columns give 140. Second, and worse, `timeField` first wrapped a
`rux--text-input` in `rux--time-picker` -- a Carbon name on markup that is not
that component, since Carbon's time picker is a `__input-field` beside a
`select` for AM/PM. That is precisely the move `docs/rux-ds-requests.md` refuses
for `rux--date-picker__icon`. It is a plain Carbon text input in time mode now,
and `.sch-times` is an `sch-` rule for the row, which Carbon does ship nothing
for.

**VERIFIED: reads and arming. NOT VERIFIED: the write.** Every bar tested filled
all four from real stops -- 07:50 AM, 03:45 PM, 07:00 PM on trip 218, matching
both the bar and the readout that was removed. Save is dead at open, arms on a
time or a location edit, and dies again when the value is typed back, checked
on both. **The `trip_stops` update itself was not driven**: the grid needs the
production sign-in this browser pane has no session for, the same standing limit
under which `moveToBus` shipped. Two branches are also untested because this
week's data has neither: a **return-leg** panel, and the **disabled** state for a
leg missing a `pickup` or `return` row.

**NOT DONE.** Pickup location is a text input, not a select of the saved
locations -- `settings` holds them and this app does not fetch it. A leg with no
stop row gets disabled controls rather than an inserted row, deliberately:
making stops is the itinerary editor's job, which `screen-inventory.md` puts
later. Billing, Trip Contact, Requirements chips, Files and Grid from the mockup
are all untouched; Files is blocked upstream, `rux--file-uploader` not being in
the pin. `node tools/check.mjs` passes.

**2026-09-08 - custom themes were vendored, unlinked and failing in silence.**
rux-ds noticed it and sent the one line; every claim in it was checked here
before the line went in, and the round trip was driven live afterwards.

**THE FAULT.** `vendor/rux-ds/js/custom-themes.js` has shipped since the v0.1.9
pin and neither page ever linked it -- this app was scaffolded before rux-ds
Phase 16 put the tag in `templates/app-shell.html`, and a pin move refreshes
`vendor/` without rewriting a page. **Nothing failed loudly, because every read
of the module is optionally chained:** `profile.js:79` is
`window.Rux?.customThemes?.list() ?? []`, so the panel had no radio to clone and
said nothing; `theme.js:73` is `window.Rux?.customThemes?.get(t)`, so a stored
custom id resolved to `undefined` and fell back. A theme saved in rux-ds's
creator simply never appeared, with no error to search for.

**VERIFIED BEFORE THE FIX, NOT ASSUMED.** `window.Rux.customThemes` was
`undefined` on the live page and the account panel offered 5 radios -- the four
compiled themes and rux. The vendored file is byte-identical to rux-ds v0.1.11
(sha256 `a04c6e76…` both sides), so this needed no pin move and no tag.

**ORDER IS LOAD-BEARING AND IS WRITTEN DOWN.** `custom-themes.js` goes BEFORE
`theme.js`, because `theme.js` resolves a stored id through the module at load;
after it, a custom theme would resolve to undefined on the first paint.
rux-ds's own template has the same order at lines 14 and 15. A comment above
the tag says so, since the next person to tidy the head is the one at risk.

**DRIVEN LIVE, WHOLE.** Saved `{id:'probe-teal', kind:'accent', tokens:
{interactive:'#0f7d6b'}}`; the panel went from 5 radios to 6; applying it moved
`--rux-interactive` from #4589ff to #0f7d6b and set
`data-rux-custom-theme="probe-teal"`; removing it released the token back to
#4589ff, cleared the attribute and emptied the store. The probe was cleaned up
-- the page is back on g90 with 5 radios and `{"v":1,"themes":[]}` stored. Both
pages carry the module; `specimen.html` was checked too, not inferred from
`index.html`.

**ONE LIMIT, AND IT IS NOT MINE TO CLAIM AS TESTED.** rux-ds points out that
`localStorage` is per browser profile per origin, so a custom theme does not
follow a user to another device: the hub syncs the theme PREFERENCE to Supabase
but never the DEFINITION, so a custom id opened on a second device resolves to
nothing, falls back to white, and `account.js` would then push that white back
up. **Neither of us has tested it** -- it follows from two behaviours rather
than from a run -- and it needs a second device and the production sign-in this
browser pane has no session for. Recorded so it is not discovered as a surprise.

**2026-09-08 - button icons put under Carbon's rule rather than under our
attributes.** rux asked for button icons to follow Carbon design-system-wide at
16px. **Nothing in rux-ds needed changing: Carbon already enforces it.**
`.rux--btn .rux--btn__icon` is `1rem` square unconditionally (rux.css:3461) and
does NOT follow the button size -- xs through xl all draw 16. Across all 33
`.rux--btn__icon` rules there are two departures: `--expressive` at 20
(:3814) and `unstable-pagination` at `initial` (:22604). Carbon's own toolbar row
agrees, `.rux--toolbar-action__icon` being 1rem with a 1rem cap (:13390).

**WHAT WAS ACTUALLY WRONG WAS HERE, AND IT WAS GOVERNANCE RATHER THAN SIZE.**
Four `rux--btn` buttons -- `sch-prev`, `sch-next`, `sch-view-trigger`,
`sch-avail-close` -- drew their icons at 16 from `width`/`height` ATTRIBUTES
with no `rux--btn__icon` class, so Carbon's rule was not reaching them. They
looked right and were held right by nothing: an edit to either attribute would
have moved them with no rule objecting. The class is on all four now. **No
visual change, by design** -- measured 16x16 before and after, which is the
point of the change rather than a disappointment in it.

**AND ONE SET OF DEAD ATTRIBUTES REMOVED.** The side-nav icon carried
`width="20" height="20"` while `.rux--side-nav__icon > svg` (:28017) sets 1rem,
and CSS beats presentational attributes -- so it has always rendered 16 and the
markup has always said 20. Corrected to 16. Nothing moves; the file stops lying.

**THE TWO HEADER ACTIONS STAY AT 20, ON RUX'S CALL, AND THE GAP IS FILED.** Account and the app
switcher are `rux--btn--icon-only` carrying 20px icons by attribute, and putting
`rux--btn__icon` on them WOULD take them to 16 -- a visible change, and not
clearly the right one. `rux.css` compiles no size for header action icons at
all: `.rux--btn--icon-only.rux--header__action svg` sets `fill` and nothing else
(:27288), and Carbon's own React header actions ship 20. So this is the one
place where "follow Carbon" does not resolve itself, and it is rux's call rather
than a mechanical sweep's. The menu toggle is not a `rux--btn` at all, so the
rule would never have reached it either way.

**AND THE ARGUMENT FOR 20 IS STRONGER THAN "LEAVE IT".** Carbon's React ships
20px icons in `HeaderGlobalAction` and passes the icon as a bare child with no
`btn__icon` class -- which is exactly the markup shape here. So adding the class
would have moved this app AWAY from Carbon rather than towards it, which is the
opposite of what the sweep was for. Re-parsed rule by rule to be sure: of the
seven `rux.css` rules naming `header__action` with `svg` or `icon`, **zero set a
size** -- they set `fill`, `display` and `transform` only.

**A FIFTH REQUEST RATHER THAN A LOCAL RULE.** Pinning 20 in `rux-overrides.css`
would be a local rule standing in for a missing rux-ds one, which `AGENTS.md`
forbids in as many words, so `docs/rux-ds-requests.md` now asks rux-ds to
compile a size at whatever value it judges right. The ask is explicitly not
"20 is correct" -- if they compile 16, the attributes come off and this app
follows.

**AND OPENING THE CONSOLE TO CHECK THE SWEEP FOUND A DEFECT OLDER THAN IT.**
`svgUse(href, size, box)` takes the WHOLE viewBox string, and four callers were
passing its last number: `svgUse('#i-checkmark', 16, 32)` wrote
`viewBox="32"`, which is invalid, so the browser dropped the attribute and
logged one error per icon -- **78 in a session**, in the console this app is
meant to be debugged in. Fixed at the date-picker calendar, both mini-calendar
chevrons and the view menu's checkmarks.

**IT NEVER LOOKED WRONG, WHICH IS WHY IT LASTED.** Every symbol in the sprite
carries its own viewBox and scales into whatever viewport it is used in, so the
icons rendered correctly with no outer viewBox at all -- verified before
touching it, the view menu's checkmarks were the right size and shape. The
fault was only ever in the console. The numbers were not even guessable from the
call site: `#i-checkmark` is a 20-unit drawing, the chevrons are 16, and
`#i-calendar` is 32, where all four calls said 32. The helper now says so above
its own definition.

**VERIFIED BY MARKER, NOT BY A CLEAN BUFFER.** The pane's console accumulates
across reloads, so "the errors are gone" could not be read off it. Bracketed
between two deliberate `console.error` markers, with the view menu opened twice
and a bar clicked to rebuild every icon those four calls produce: **zero new
viewBox errors, and 0 malformed of 23 SVGs in the DOM.** The two remaining 404s
are `/switcher.js` and `/account.js`, root-absolute by design -- the same seven
`check.mjs` declines to check, and they resolve on the deployed root.

**NOT DONE.** Nothing pins the header action icons until that request lands;
they are 20 by this app's own markup, as they were. The `svgUse` fault was
found by hand and nothing gates against its return -- `check.mjs` cannot see a
malformed attribute built at runtime. `node tools/check.mjs` passes.

**2026-09-08 - rux-ds answered all four requests in one afternoon, and three
of the four answers are unreachable.** The rux-ds session reported back and
every claim below was checked in the clone rather than relayed.

**THREE LANDED ON `main` AND ARE IN NO TAG.** `a545cc1` corrects the
`ui-shell.js` comment and names both shells the CSS supports; `0527a30` scopes
`check-behaviour` to the document; `89e14fd` lets a page own the date-picker
trigger. `c869d7f` adds `#i-user--multiple`. **The pin is on v0.1.11 and that
work sits 42 commits past it**, so none of it is consumable here -- the pin only
ever moves to a tag. Cutting one is rux's call and rux-ds has put it to them; a
minor bump by their §8.2, both being additions. We are not asking for one, and
said so.

**WHAT THAT UNBLOCKS WHEN IT ARRIVES.** The date-picker trigger makes
`screen-inventory.md` §7 buildable -- jumping to a date is the week LABEL's job
-- which has been undecidable rather than merely unbuilt since 2026-09-07.
Nothing is built for it yet.

**`#i-events` IS DECLINED AND THE DRIVERS BUTTON IS NOW OUR PROBLEM.** Judged by
rasterising each glyph at its real device size and magnifying, not from a
screenshot: at 16 device px `events` merges the front figure's head and
shoulders into one smear. At 32 all three read, so the decline is a 1x call.
This app asked for a pair because a toolbar button draws its icon at 16px; with
one glyph the toggle either goes icon-only on `user--multiple` or stays text.
rux-ds agrees that is ours. Unanswered here.

**THE 8px ADJUDICATION STOPS BEING PROVISIONAL, WHICH IS THE MOST USEFUL THING
IN THE REPLY.** The capture half of our shell request was DECLINED, and the
reason is stronger than the fix would have been:
`carbon-react-spacing.json` keys on an element's own signature plus its parents
and holds one entry for `cds--header__name`; our 8px comes from a SIBLING
selector, and both shells give the name an identical signature and parent, so no
capture can separate them. `check-spacing.js:482` passes on ANY recorded
variant, so an 8px entry would license 8px across eleven persistent-shell
templates and rux-ds's own index.html -- a real regression to buy a cosmetic
pass here. **An exception list would not have been a passing check.**
`docs/gate-coverage.md` now says the finding is permanent and that we are not
waiting on anyone.

**AND WE WERE TOLD TO CHECK OUR OWN SHELL MARKUP, SO IT WAS CHECKED.**
`check-behaviour` found eleven rux-ds templates carrying an invented
`aria-label="Toggle navigation"`, which silently disabled `ui-shell.js`'s name
swap: the glyph and `aria-expanded` moved while the accessible name did not.
`index.html:219` carries `aria-label="Open menu"` -- the recognised pair, no
`data-rux-label-*` needed -- and driven live here, open gives "Close menu",
`#i-close` and `aria-expanded="true"`, close gives all three back. **Clean, and
verified rather than assumed.**

**NOT DONE.** No pin move, because there is no tag. The Drivers button is still
text. Everything the entries below leave open stays open, Edit trip's 405px
overflow included.

**2026-09-08 (second pass) - the two flanks made one width, and two
corrections to the entry below.** rux asked for three things: both companions
at a stock 320, the roster's day cells 24x24, and whatever that frees given to
the driver name. All three are in. The interesting part is that the entry
directly below this one argued against the second, and its argument was sound
on a premise nobody had checked.

**THE ROSTER WAS NEVER A CARBON PANEL, WHICH IS WHY IT DID NOT MATCH.** The
trip editor is `rux--side-panel--sm` and measures Carbon's compiled 20rem. The
roster is `.sch-aside`, this app's own box, and was `inline-size: max-content`
capped at 22rem: **331.195px, a width set by the longest driver name.** So the
two things flanking the board disagreed by 11px for a reason nobody chose, and
the roster moved whenever its data did. It is `flex: 0 0 20rem` now. Carbon
ships six panel sizes -- xs 16rem, sm 20rem, md 30rem, lg 40rem, xl 65rem, 2xl
80rem, each `clamp(16rem, var(--rux-side-panel-modified-size, N), 100%)` -- so
20rem is its number, reached the same way, not a local invention.
`--rux-side-panel-modified-size` is the sanctioned hook for a custom width and
this app still uses none.

**"WED IS 26px" WAS RIGHT AND WAS NOT THE WHOLE QUESTION.** The entry below
held `--sch-day-track` at sm because the head must carry three letters and
"Wed" is 26px at label-01 -- re-measured today at 25.0 of glyphs plus 0.32 of
tracking three times, so 26.0, and it genuinely will not fit 24. What it did
not weigh is the middle: the case for three letters was only ever that ONE
cannot tell Tuesday from Thursday or Saturday from Sunday. **Two can.** "We" is
18.4px, the widest of the seven, and clears a 24px cell with 5.6 to spare. The
labels are sliced from `weekday: 'short'` rather than hand-written, so a
non-English locale gets its own first two characters.

**THE CELL IS SQUARE AGAIN AND THE NAME TOOK THE DIFFERENCE.** `--sch-day-track`
rejoins `--sch-avail-h` at xs after one day apart, so the cells are 24x24 rather
than 32x24, and `--sch-head-w` is `minmax(0, 1fr)` -- which is what its own
comment had claimed since the aside became `max-content` and made the head the
thing sizing the box. **The name column goes 107 to 152**, and all 40 drivers
now fit it without ellipsing, in all five themes. The 32px head band is
untouched, so the two grids' top edges still line up.

**WHAT IT DID NOT BUY, AND THIS IS THE POINT.** The board gained 11px, not 56:
the days gave up 56 but the aside gave up its `max-content` 331 for 320, and
the rest went inward to the name. At 1440x950 with both companions open the
week is still short and still scrolls -- `crowded` is still true, the roster
still yields on the editor opening, and the overrule still costs Saturday and
Sunday. Nothing here was ever going to close 323px, which the entry below is
right about.

**AND A SECOND CORRECTION, TO THE FIELD-VARIANT DECISION.** That entry rejected
`size-sm` partly on "the panel's content is 729px inside a 729px box: it does
not overflow." That reads `scrollHeight`, which is floored at `clientHeight`
and so cannot report slack -- 729 was the box describing itself. Measured
properly: New trip's content is ~656 and fits at 1440x950 with 73 to spare, but
overflows by 87 at 790 tall; **Edit trip is 1134 in the same box -- 405 over at
950, 565 at 790** -- because it carries `This leg` (146) and `Itinerary` (284),
which New trip does not. The conclusion holds and the reason changes: `size-sm`
saves 8px on each of four fields, 32 against 405, so it is rejected for buying
8% of a real gap rather than for buying nothing. Edit trip's overflow is
structural and is NOT addressed here -- same shape as the 323px finding, and
open.

**AND A THIRD CORRECTION, TO A CARBON PRECEDENT THAT WAS NEVER THERE.** The
entry below defends 24px rows under a 32px band with "Carbon's own row-height
control offers exactly this shape: five row heights under an unchanged header."
Read from the compiled stylesheet rather than from memory, it does not: `thead
tr` sits in EVERY size selector beside `tbody tr` -- `--xs` 1.5rem (rux.css
:12127), `--sm` 2rem (:12157), `--md` 2.5rem (:12182), `--xl` 4rem (:12207),
with lg the unclassed default. **Carbon moves the head and the body together
and ships no variant where they differ.** 24-under-32 is this app's own shape,
which an `sch-` component is entitled to; what it is not entitled to is the
claim that Carbon ships it. The decision itself stands on the half that was
load-bearing -- there is no 32px body row on this page to be consistent with,
and 32 of 40 drivers is a measurement, not a precedent. Struck in place below.

**WHERE THAT CAME UP: rux asked whether each table should choose its own
header and toolbar size variant.** Answered no, and the first reason is that
the premise is not the page's: **there is no `rux--data-table` and no
`rux--table-toolbar` in this app at all** -- audited live, the only
`rux--layout--size-*` carriers are eight buttons, a tabs strip and a select.
The board, the roster and `.sch-toolbar` are all this app's own, so a size
variant has nothing to switch. The other two reasons: the header band was never
the constraint in the 24/32/24/32 flip-flop, which was always a body-row
question; and the two grids' top edges line up BECAUSE both bands are pinned at
32, so a per-table header size is precisely what would break the one alignment
invariant here. The density control that would pay is the one already built --
the view menu's four bar-row toggles move a 95px bus row, where a band can move
8.

**NOT DONE.** Everything the entry below leaves open stays open: the bars, no
undo, no weekend tint. Edit trip's overflow is now named and unfixed. The gates
were not re-run; this was measured by hand at 1440x950 and 1440x790, and the
clipping check was run in all five themes. `node tools/check.mjs` passes, token
count 79 -- one lower because the roster no longer reads
`--rux-layout-size-height-sm`.

**2026-09-08 - the layout review, and the arithmetic that settled three
open questions at once.** rux was finalising the layout with both companions
under review and asked three things: whether the driver grid has to match the
main table, whether xs and md could differ between them, and whether the trip
editor's fields want another variant or fluid. All three were answered by one
measurement neither question had asked for.

**THE THREE COLUMNS DO NOT FIT A WEEK AT 1440, AND NOTHING ABOUT DENSITY CAN
PAY FOR IT.** Measured live at 1440x950, both companions open: the board is
1344, the roster 331, the editor 320, two gaps 32, and seven day columns need
984 -- the `--sch-day-min` floor of 8.5rem times seven plus a 32px bus column.
1667 wanted against 1344 had, so the week runs **323px short** and Saturday and
Sunday scroll off the right edge. A charter board that hides the weekend is the
one failure this layout cannot have, and it had it. Either companion ALONE
fits: 997 of 997 with the roster, 1008 of 984 with the editor. Both together
never do -- all three need a 1763px viewport, which is why it looked correct on
rux's screen and broke on a laptop.

**WHY DENSITY WAS THE WRONG LEVER, WHICH IS WHAT THE QUESTIONS ASSUMED.** xs
rows give back 56px and the editor at `--xs` gives 64: 120 of the 323. There is
no arrangement of the three at 1440. The editor cannot go below its own 16rem
clamp, so the answer had to be about WHICH regions coexist, not how tight they
are.

**THE ROSTER YIELDS TO THE EDITOR, AND ONLY ON THE WAY IN.** `fitColumns` in
sch.js already computed this exact condition -- `day < dayMin` IS "the week does
not fit" -- so it is named `crowded` and returned rather than measured a second
time somewhere else. `fitPanelRoom` is why: docs/log.md records the afternoon
three places disagreed about one number, and a second budget would have been
the fourth. sch-data.js reads it once, as the editor OPENS, and hides the
roster; closing gives it back. Not on every fit -- this runs on every resize
frame, and yielding on a measurement that moves under the pointer would
collapse the roster while a window edge is being dragged.

**THE TOGGLE WAS WRITTEN WRONG FIRST AND THE BROWSER CAUGHT IT.**
`aria-pressed` came from `availOn`, the wanted state, so a yielded roster left a
lit button with nothing behind it -- and pressing it flipped the invisible want
to false: pressed, still nothing, control dead. Both now come from `shown`.
`availOn` still survives the editor, which is how the roster returns unasked;
it is simply no longer the thing announced. Verified through six steps: on,
yield, overrule, a second bar clicked with the overrule holding, off, close.

**XS ROWS UNDER AN SM HEAD, AND THE FLIP-FLOP ENDS ON AN ARGUMENT.** The row
height has been 24, 32, 24, 32 and is now 24. Every previous turn was fought
over how many drivers fit and the readings were genuinely even, which is why it
kept turning. What broke the tie: the consistency the last turn protected was
not there. It traded eight drivers for "one module on the page" and the page
does not have one -- a bus row is 95px. The 32px module lives in the toolbar
and the two header BANDS, never in a body row, so what the rows were matched to
was a band. The band is still 32px and still explicit. ~~Carbon's own
row-height control offers exactly this shape: five row heights under an
unchanged header.~~ **That sentence is wrong and is corrected in the entry
above, 2026-09-08 second pass: Carbon moves the head with the body at every
size and ships no such variant.** The rest of the paragraph stands, and so does
the decision -- the appeal to precedent was never the load-bearing half.
Measured at 1440x950: **32 of 40 drivers, up from 24**.

**THE DAY COLUMNS STOPPED FOLLOWING THE ROW, WHICH FORFEITS THE 56px ON
PURPOSE.** `--sch-day-track` WAS `--sch-avail-h`, so xs took the seven columns
with it. It also clipped the head: "Wed" is 26px at label-01 in a 24px column,
measured. Three letters are there because one cannot tell Tuesday from Thursday,
settled 2026-09-07, and reopening it for 56px that does not close a 323px gap
would be paying a real cost for nothing. The cell is 32x24 now rather than
square, which costs nothing -- what it draws is a bar spanning days.

**THE TRIP EDITOR'S FIELDS ARE UNCHANGED, AND FLUID WAS THE WRONG ASK.** Every
field measures 64px: a 20px label, a 40px control, 4px. The control is md
because `.rux--text-input` clamps to `--rux-layout-size-height-md` by default,
which is what the explicitly-md select already was, so they agreed before
anyone set them. **Fluid is `min-block-size: 4rem` -- 64px, identical**, because
it trades the outer label for an inner one; it buys no height at all. It also
hides `form__helper-text`, and there is no fluid checkbox in the pin, so the
four Status and needs boxes could not follow and the form would mix fluid with
default -- the one thing fluid must not do. `size-sm` works and was measured at
56px a field, but the panel's content is 729px inside a 729px box: it does not
overflow, so it would buy nothing but a smaller target on the only thing here
anyone types into. Left at 40. The board is scanned and the editor is typed
into; that is the same argument that frees the roster's rows, pointed the other
way.

**RUX PROPOSED ONE SHARED RIGHT-HAND SLOT** -- both companions in the same
place, mutually exclusive by construction -- and it is the better mechanism
against the worse model. It makes the budget structural: one slot cannot
overflow, no `crowded`, no restore. Declined because it costs the task the app
exists for. Assigning a driver means the editor open and the roster answering
who is free; the width budget keeps that wherever there is room -- verified at
2000x950, both open, schedule 1221 of 984 needed, no yield taken -- and gives
it up only where it cannot be had. The shared slot gives it up at every width
including the one rux works at. The 2026-09-06 note about the right-hand slot
putting the grid "between the board and the panel describing it" does NOT apply
here and was not the reason.

**AND THE HEADER QUESTION THAT CAME OUT OF IT, FILED RATHER THAN FIXED.** rux
compared this app's `rux--header__name` against another rux-ds app's and asked
which padding is correct. Neither is wrong: Carbon ships three values — 16/32
plain, 8/32 when a visible hamburger sits beside it, 16/16 below 41.98rem — and
this app gets the middle one because its toggle carries no `__hidden`. Nothing
in this repository touches that class. Checking it turned the standing note at
the foot of the 2026-09-06 entry into a real request: `js/ui-shell.js` calls a
desktop hamburger invented, and three separate compiled rules only do work in
that configuration. Written up in `docs/rux-ds-requests.md`, which now has four
open. The brand stays content-width, which is what Carbon's own header is —
there is no reserved slot to align to a rail that measures 0 most of the time.

**NOT DONE.** The bars themselves, still: the review's own findings from
2026-09-07 are all open. No undo, no weekend tint -- which this pass makes
sharper, since the weekend is exactly what was falling off. The gates were not
re-run; this was measured by hand in the browser at 1440x950 and 2000x950,
white and g90, and `node tools/check.mjs` passes with the token count at 80.

**2026-09-08 - the browser sweep at `52efa52`, and two gates that were never
actually run.** Figures and conditions are in `docs/gate-coverage.md`; this is
what the pass changed its mind about.

**THE HEADER OF `gate-coverage.md` WAS WRONG AND IT COST A SESSION ITS PLAN.**
It said running rux-ds's browser gates here means copying them into this
repository and deleting them again. The `b8c373d` entry forty lines below
already corrected that in bold. The header was read, believed, and a restart
into a different working directory was planned around it before anything was
measured. The header now says the true mechanism first. A correction that only
exists below the thing it corrects is not a correction.

**`check-rendered` AND `check-behaviour` WERE CARRIED AS "N/A" AND HAD NOT BEEN
RUN.** Both were run this time and neither reading matches the word.
`check-rendered` throws — `getBoundingClientRect` of null — because its unit is
`.ks-sec` inside `.ks-main`. `check-behaviour` reports 4 passed of 18, and the
prior entry's reasoning for the N/A was backwards: it said the gate "would
report a pass it did not earn", when what it actually does is report fourteen
failures it did not earn. Every one of those fourteen is a fixture scoped to a
kitchen-sink section id, so no consumer app can satisfy one. Filed as a request
in `docs/rux-ds-requests.md`.

**WHAT THE GATE COULD NOT SEE WAS CHECKED BY HAND, AND WORKS.** The shell
`check-behaviour` calls absent: nav 0 → 256 → 0 over two clicks, glyph
`#i-menu` → `#i-close` → `#i-menu`, `aria-label` "Close menu" while open. The
tablist it calls "fewer than two tabs": two, roving `tabindex` 0 / -1.

**TWO NEW SPACING DIVERGENCES, NEITHER A DEFECT.** The `rux--css-grid`
full-width inset is this app's own `--rux-grid-margin: 0`, and its comment's
arithmetic was measured rather than taken on trust — `.rux--content` pays 32px,
the column's margin pays 16px, content lands at 48px, and `.sch-board` lands at
48px too, so the regions do agree and the comment's "16px" is the grid's own
contribution. The `rux--tabs__nav-item` 1px margin is Carbon's own compiled
rule at `vendor/rux-ds/css/rux.css:25485`, an adjacent-sibling selector that
needs two tabs to fire; nothing here selects that class. Same category as the
standing `rux--header__name` finding.

**THE ELEVEN RUNTIME-ADDED CLASSES WERE RESOLVED, NOT ASSUMED.** ADDED is the
harmless direction for the coverage ratchet, but harmless is not the same as
resolves, so all eleven toggletip and popover classes were checked against the
pinned `rux.css` by hand, along with `rux--btn--selected`. The one class this
app builds rather than writes out, `sch--no-${r}`, has exactly four values and
exactly four matching selectors at `sch.css:607`.


**2026-09-07 - the toolbar's own pass, and two things left unbuilt on
purpose.** Continues the entry below, same sitting.

**IT DOES NOT STACK.** `flex-wrap: wrap` had put the week on a second line and
the actions on a third -- three rows of chrome above a board whose argument is
vertical room, and it moved the paging buttons every time it happened. One row
now; the LABEL is what gives way, truncating, because a shortened
"Sep 7 - 13, 20..." still says which week and a hidden button says nothing. The
month is `short` for the same reason: about 70px back on the widest thing there.

**RUX PROPOSED HIDING `New trip` AT NARROW WIDTHS** on the grounds that a trip
can be made by right-clicking an empty cell. Declined, and recorded because it
was a reasonable ask: that gesture is a LONG PRESS on touch, which this same day
taught to mean "pick up a bar", and a right-click menu is a power path rather
than how anyone learns an app can create something. Hiding the primary action at
the width where the app is hardest to use inverts it. `Drivers` is the better
candidate if one has to go.

**THE VIEW MENU, WITH TWO OF THE FOUR OPTIONS SECTION 7 LISTS.** Bar rows --
customer, times, requirements, drivers -- and start on Sunday. Turning a row off
REMOVES it: `--sch-bar-rows` is the count, so the bar shrinks and more buses fit,
which is the first thing done about the blank requirements line the review found.
**Time-aligned and two-week are deliberately absent.** This grid places by day
and fetches one week; a control for either would be a switch attached to nothing.
Preferences are `localStorage` with a try-catch, read before `cursor` is first
computed so a saved Sunday holds for the first week drawn.

**THE EQUIPMENT ICONS WERE SETTING THE ROW HEIGHT**, which rux saw and I had
argued against removing a day earlier. Two icons stacked under a number come to
about 74px; the rows carrying two measured taller than the rows carrying one.
The view menu makes it far worse -- a two-row bar is 40px, so equipment would
decide every row. `ada_lift` and `sleeper` are attributes and moved to a
toggletip on the bus number, built from the `popover-container` /
`toggletip-button` / `popover-content` structure in
`carbon-ibm-products-dom.json`. Out of service STAYS: it is a state, it changes
what the row accepts this week, and one icon cannot out-measure a bar.

**"#", NOT "Bus", and it saves no width.** rux asked for it to save space; the
column floors at 2rem to square the corner and the widest bus number is already
under it. What changes is a heading that stopped saying a word the grid says.

**THE DAY LETTERS WERE CRAMPED, AND THE FIX WAS THE TYPE.** rux asked for single
letters back. "Wed" at the table header's 14px is about 30px in a 32px square, so
the seven touched -- but one letter cannot tell Tuesday from Thursday, which is
what put three letters there this morning. The day cells drop to label-01 and
"Driver" keeps 14px: a word labelling names and a day labelling marks are
different jobs in one row.

**NOT BUILT, AND BOTH ARE UPSTREAM.** The Drivers button stays text: the sprite's
only person is `user--avatar` and the shell's Account button already uses it.
And the week label cannot become a date-picker trigger, which section 7 decided
it should be -- `js/date-picker.js`'s contract is that the trigger is
`__icon` INSIDE the picker's root, and every way round it either puts a Carbon
class on an app element or an app rule on a Carbon part. A picker in the shape
the component allows would be shipped knowing it is the wrong one. Both are in
`docs/rux-ds-requests.md`, which is new and is this app's record of what it has
asked for.

**2026-09-07 - the board rebuilt against Carbon's data table, in one long
pass with rux at the screen.** rux asked for a design review of the schedule --
"the most important page to get right as it will be the most used" -- and then
drove it component by component from IBM's own data table pages. Everything
below is one sitting; the order is the order it happened, because several
entries correct the one before them.

**THE REVIEW'S OWN FINDINGS, AND WHICH SURVIVED.** Colour spends itself on the
normal case (every bar blue, the one teal override doing all the work); five
lines per bar with the requirements row blank on nearly all of them; the
destination truncating while times never do; 70% of the board drawn as boxes;
four of five bar lines at one weight. **None of these are fixed.** They are the
content of the bars, and this pass was the frame around them.

**WHAT THE TABLE GAVE, in the order rux asked for it.** No box around the pane
-- Carbon's table draws none and the header band closes the top edge, and it
retired the line that met the trip panel's border as a doubled edge. No vertical
day rules, on rux's call to try the table's own terms; the arithmetic is
deliberately untouched so it is one paste back, and the thing to judge it on is
an EMPTY row, where nothing but the header seven columns away says which day is
which. No rule under either header band. The row rule runs through the bus
column, which only became possible because the row heads left `layer-accent-01`
-- the old comment measured 1.00:1 in g10 on that surface and every figure in it
still holds. The last row draws its rule again, which the pane's border had been
covering for.

**THE 32px MODULE, AFTER TWO WRONG ANSWERS.** rux asked whether the headers
should be md/40 and whether both could be 40 wide. Measured in Plex: "218" is
25.2px at 14px and 21.6 at 12, "1234" 33.6 and 28.8. 40 needs 12px type; 48
(Carbon's default table) was tried and reverted; 32 is where it landed, because
Carbon's SMALL table is what this board actually is. **The 32 was already right
and nobody had noticed**: `.sch-avail__days` was pinned at 2rem to meet the
schedule's day header, and the 40 and 48 experiments had silently broken that
for a day.

**THE TOOLBAR IS PART OF THE BOARD.** `.rux--table-toolbar` is `--rux-layer` at
3rem, the SAME surface as the grid body with the day band the only accent -- the
obvious guess, that the toolbar shares the header band's colour, is wrong and
the source screenshot shows it. It was first hung over the whole board on the
argument that `.sch-board` keeps its width when Drivers is toggled. **That was
wrong and rux saw it**: the driver grid has its own header row, so one toolbar
over two heads read as one table. It belongs to the schedule, in `.sch-frame`.

**THE TRIP EDITOR IS A COLUMN, NOT AN OVERLAY**, on rux's ask after IBM's
condensed-grid pages, and it reopens `screen-inventory.md` section 7. No rux-ds
module claims `side-panel`, so nothing was lost. What went with it:
`fitPanelRoom()`, `.sch-page--with-panel`, its no-script fallback, and the
`animationend` plus 400ms timer that existed to stop a one-frame flash on close.
Three places that had to agree about one number, and the log above records the
afternoon they did not.

**FOUR BUGS FOUND BY BUILDING IT.** A wrapper at `min-inline-size: 0` around a
panel with Carbon's `16rem` floor, which is why the editor escaped its own box.
`display: flex` on `.sch-aside` beating the UA's `[hidden]` rule -- the same
trap `.sch-row` documents twenty lines up, in a file that had already written
the lesson down. A definite height needed where a `max-block-size` was given,
without which the panel's `auto 1fr auto` rows never constrain and the Save bar
is pushed down the page instead of pinned. And `.sch-page` was **never**
`position: relative`, though `popMenuAt` has offset menus by its rect since the
day they were built -- every ancestor to `.rux--content` is static, so the
right-click menus have been landing about 96px out.

**THE PAGE'S INSET IS ONE NUMBER NOW.** It was `--rux-grid-margin` plus half a
gutter, 32px a side, stepping to 40 above 99rem. Zeroing the grid's own margin
leaves the column gutter, which is a flat 2rem at every width: 16px a side
always, matching what `.sch-board` puts between its regions.

**THE AUDIT RUX ASKED FOR AT THE END, and one finding I withdrew.** Times were
`String(t).slice(0, 5)` -- a truncation, not a format, and the only thing on the
page ignoring the reader; they are 12 hour. Tabs were `--contained`, which is
built to fill its container and filled half of a 20rem column. Both region
titles were wrong against each other rather than against their own subordinates,
and are `heading-compact-02` over the columns' `heading-compact-01`. The Drivers
toggle set `aria-pressed` and nothing else -- Carbon compiles no `[aria-pressed]`
styling at all, and `rux--btn--selected` is its own compiled answer. The driver
grid's single day letters could not tell Tuesday from Thursday, and the comment
justifying them cited an alignment that stopped existing when the grid moved
left. **Withdrawn:** that the bus and driver columns disagree on alignment. They
hold a 32px square of digits and a column of names; centred and start are both
right.

**NOT DONE.** No undo on a bus move. No weekend tint, so an empty row still
cannot be counted. Nothing about the bars themselves. The equipment icons stay
until a vehicle panel exists to hold what they say. Two icons are requested from
rux-ds in `docs/rux-ds-requests.md` and the Drivers button stays text until they
land. The duplicate driver names -- two Bennys, two Ernestos -- are untouched
and make the roster ambiguous in the one pane meant to resolve it.

**AND THE HONEST PART: almost none of this was verified by me.** The browser
preview stayed pinned to the rux-ds project through a folder change and three
restarts, so every check was `node tools/check.mjs`, `node --check`, a markup
balance parser, and text measured in Plex through a harness. rux looked at every
step and sent screenshots; several changes above exist because of what those
showed. The five browser gates have not been run against this pass at all, and
`docs/gate-coverage.md` is stale from `b8c373d`.

**2026-09-07 - moving a bus by accident on a phone, which was two faults.**
rux: *"i keep by mistake moving buses on mobile"*, and asked whether a
confirmation screen was the answer. It is not the first answer, because
neither fault needed one.

**A CONFIRMATION ON EVERY DROP WAS REJECTED.** It taxes the mouse drag, which
was never the thing going wrong, and a dialog raised on every legitimate move
is dismissed reflexively inside a week -- at which point it has cost the
gesture and gates nothing. It stays available as a touch-only gate if the two
fixes below turn out not to be enough; rux's call, not taken here.

**FAULT ONE: 4px is no threshold at all for a thumb.** The drag armed on 4px
of travel whatever the pointer was, and a finger moves that far just landing
on the glass. So a scroll that began on a bar and the drag were competing for
one gesture, and on a board that scrolls in both directions the scroll is what
a finger on a bar nearly always meant. Touch now HOLDS: within 10px for 400ms
and the bar lifts, travel before that and the drag stands down for good and
the board keeps the gesture. The mouse is untouched at 4px.

**Keyed off `pointerType`, not the screen.** The gesture says what it is; a
width query would have given a touchscreen laptop the hold for its mouse and,
had it been a `pointer: coarse` query, the same answer for both of its
pointers. One window, one size, both behaviours, decided per gesture.

**FAULT TWO, AND THE WORSE ONE: an interrupted drag committed the move.**
`pointercancel` was bound to the same handler as `pointerup`, and that handler
wrote as soon as the drag had armed. `pointercancel` is exactly what a browser
fires when it takes a touch over for scrolling -- so the accidental arm above
did not merely start a drag, it FINISHED one, against whichever row the bar
was last over, with nothing released. Not mobile's alone: a system dialog or a
window switch mid-drag does the same on a desktop. Only a release writes now.

**Measured before and after, on the shipped code.** The drag block was sliced
out of `sch-data.js` by its own text into a harness with stubbed
`client`/`show`/`say` and driven with synthetic pointer events, first from
`HEAD` and then from the working tree, same six gestures:

| Gesture | Before | After |
|---|---|---|
| Mouse drag to another bus, released | wrote | wrote |
| Mouse drag, interrupted | **wrote** | no write |
| Touch swipe across the bar (a scroll) | **wrote** | no write |
| Touch hold, drag, released | wrote | wrote |
| Touch hold, drag, interrupted | **wrote** | no write |
| Touch hold, dropped on its own row | no write | no write |

Five of six wrote before; the two that should write, write.

**The hold needed the page to stop fighting it.** `touch-action` is read when a
gesture STARTS, so it cannot be tightened once the hold completes: a
non-passive `touchmove` suppresses the scroll instead, which holds only because
arming requires the finger to have stayed still -- a scroll already under way
cannot be taken back. `.sch-bar` also takes `touch-action: manipulation`
(panning and pinching kept, double-tap zoom dropped), `-webkit-touch-callout:
none` and `user-select: none`, or iOS raises its selection callout on top of
the bar being picked up. Android fires `contextmenu` at about the moment the
hold completes, so the bar menu now stands down while a touch drag is armed;
right-click is unchanged.

**NOT DONE, and each is a separate decision.** No undo on a completed move --
proposed as the third fix, the write to reverse it is the one `moveToBus`
already makes, and it is the only one of the three that helps when the move
was deliberate but wrong. No touch-only confirmation. **And this was not
driven on a real touch device or on the live page**: the grid needs the
production sign-in the browser pane has no session for, so the evidence above
is synthetic pointer events against the real code, not a thumb on a phone.
`node tools/check.mjs` exits 0. The header of `sch-data.js` still opens "READ
ONLY ... nothing here writes", which stopped being true when the drag landed
and is untouched here.

**2026-09-06 - full width, because a board is scanned, not read.** rux asked
whether the week should still be tiny on a large screen, and whether it should
still scroll with the trip panel and the driver grid open when there is room
either side. It should not, and the cause was not the board's.

**Carbon's grid caps content at 99rem and centres it.** `.rux--css-grid` is
`max-inline-size: 99rem; margin-inline: auto` -- a reading width, right for
prose and forms. On a 2000px screen that left about 200px dead on each side
while the board scrolled for want of room: with both the panel and the driver
grid open it had 763px against the 995 seven columns need at their floor.

**Carbon ships the answer.** `rux--css-grid--full-width` is
`max-inline-size: 100%`, the modifier for exactly a data-dense page. Applied
always rather than behind a toggle: a week board has no reading-width
argument, and a toggle is a control that needs explaining for a state nobody
would choose.

Measured at 2000px: board only 1854 wide with 258px days; with the driver grid
1577 and 219; with the driver grid AND the trip panel 1097 and 150 - all seven
days on screen in every state, nothing scrolling. At 1440 nothing changes,
since the cap was above the viewport there anyway.

**2026-09-06 - the gutter restored, and the entry below corrected.** rux saw
the board flush against the panel, border on border, and asked whether there
should be space. There should, and there had been until the previous change
took it away.

**THE "RESERVED TWICE" REASONING BELOW WAS WRONG.** The 64px between the board
and the panel was not the shell's gutter paid twice; it was the shell's gutter,
once, doing its job - the same 64 the board has from the viewport's LEFT edge.
The "384px gap" that reasoning started from was the panel measured
mid-entrance, 320px right of where it settles, which that same entry then
went on to warn about. Half of the entry was right: the transition really did
stop the padding applying, and its removal stands.

**What IBM does, which is what the original 30rem did.** The slide-in variant
sets the page content's inline-end margin to the PANEL'S FULL WIDTH, and the
content's own padding is what keeps it off the panel's edge. No capture
records page content beside a panel - all nine hold a data table - so this
comes from the component's contract rather than a story, and it is confirmed
by the test that matters: the board is framed alike on both sides. Measured
settled at 1440, left gutter 64, right gutter 64, borders not touching.

The measurement in `sch.js` stays, set to the panel's width rather than a
constant, so a panel at another size or a shell with another gutter is still
right by it. The stylesheet's 30rem is the no-script fallback.

**Three lessons from one afternoon of measuring this page**, each paid for: a
hidden pane freezes transitions and reads their start value; a fronted pane
still reads the panel 320px out until its entrance ends; and a number that
happens to endorse a change already made deserves the most suspicion, not the
least.

**2026-09-06 - the space between the board and the panel, which was two
bugs.** rux asked what sets it and whether that much was intended. It was not,
and neither half of it was deliberate.

**ONE: the transition stopped the padding applying AT ALL.** `.sch-page` had
`transition: padding-inline-end .11s`, and with the panel open the class was
on the element, the rule declared `padding-inline-end: 30rem`, its sheet was
enabled and unwrapped, `page.matches()` was true - and `getComputedStyle`
still returned **0px**, with NO transition object in `getAnimations()`.
Suppressing transitions returned 480px immediately. So the page never made
room and the board ran 96px UNDERNEATH the panel. That animation had already
cost one defect earlier today, when `fit()` measured the page mid-transition
and sized the grid for a width it was about to lose. Two bugs for an animation
nobody asked for, on a page whose panel already slides: removed. The
`transitionend` re-fit went with it, having nothing left to wait for.

**TWO: the room was reserved twice over.** The panel is `position: fixed`
against the VIEWPORT's right edge; `.sch-page` is not there - the shell's
content region holds its own gutter, 64px at 1440. Reserving the panel's full
480 from the page's own edge pays that 64 twice, and it shows as dead space
between the board and the panel. Only the overlap is owed, and that is a
measurement rather than a constant: it moves with the shell's padding and the
panel's size. `sch.js` sets it; the stylesheet keeps 30rem as what renders if
the script never runs, erring toward too much room rather than a board hidden
under the panel.

Verified at 1440: padding 416, board right 960, panel left 960, gap 0, and the
board 64px wider than before. Closed, the padding is removed and the week goes
back to 181px columns.

**A measurement note, twice paid.** The panel reads 320px to the right of
where it settles while its entrance animation runs - that is
`--panel-transform`, not a gap - so a "320px gap" appeared in the middle of
this and was not real. And an earlier read of the padding returned 0 with the
pane hidden, which looked like the same bug for a different reason: CSS
transitions do not advance in a hidden pane. Front the pane, let the animation
finish, then measure.

**2026-09-06 - the bus number centred, which was the price of the last
change.** Giving the bus column the flooring remainder aligned the board with
the toolbar and left the number sitting 8px from one edge and 13.8 from the
other at 1290, moving as the window did. Centred, the remainder splits.

Measured over the glyphs, not the element box, because the number fills its
cell and the box reads even either way: skew from 5.8px to 1px at 1290
(10.4 and 11.4), and 1px at 1440 (8.4 and 9.4). The residual is the glyph's
own side bearings, not a layout error. The corner's "Bus" centres with it -
12.3 and 13.3 - and `.sch-day` keeps its start alignment, since a day name and
its date read left to right. The board still meets the toolbar at 0 in both.

The column carries an identity rather than a value, so nothing there wants a
shared left edge with a column of figures.

**2026-09-06 - the strip at the right edge, and a decision reversed.** rux saw
the board's right edge failing to line up with the New trip button above it.
Real, width-dependent, and mine: 0px at 1440, 2px at 1400 and 1365, 4px at
1290.

**IT WAS DELIBERATE AND THE DELIBERATION WAS WRONG.** `fitColumns` floors the
day width and the leftover has to go somewhere; earlier today it was put
OUTSIDE the pane, narrowing the board so the spare pixels sat in the page's
padding "where nothing reads it as part of the grid". They do read as part of
it - as a ragged edge against the toolbar, which is worse than what that
choice was avoiding.

**The bus column takes the remainder again.** The head becomes
`pane - day * days`, so the columns fill the pane exactly and the right edges
meet. Verified at three widths: gap 0 at 1440, 1400 and 1290, columns summing
to the pane in each, with the head growing 43, 45, 47 to absorb it.

**AND IT SIMPLIFIED THE CODE.** No explicit `inline-size` is needed at all now
- the pane simply fills the board - which retires the `flex-grow` pinning
added earlier today, whose only job was to stop the pane being stretched past
a width nothing sets any more.

**The cost is real and is the one the earlier note named.** Measured with a
Range over the glyphs at 1290: the bus number sits 8px from the left of its
column and 13.8px from the right, and that right figure moves as the window
does. Element boxes read 8 and 9 and hid it - the number fills its cell, so
only the glyph box tells the truth. If it grates, centring the number in the
column splits the remainder evenly and is one declaration; rux's call, not
taken here.

**2026-09-06 - cancel, not delete, and a defect it uncovered.** rux described
the old board's only bar action: cancel, which gives the trip a cancelled
status and takes it off the schedule while leaving it on the trips page, "its
useful to know about trips that were cancelled". Deleting outright belongs on
that page, for test rows worth nothing to anybody.

**THE SCHEDULE HAS BEEN DRAWING CANCELLED TRIPS AS LIVE WORK.** `cancelled_at`
is set on 41 of the 743 rows and the week read never excluded it. Three of
those 41 overlap the week on screen right now - Local and Hidalgo TX on the
3rd, Edinburg TX on the 2nd - so this was not theoretical. Proven by trip id
rather than by destination text, because a first attempt matched on text and
"Edinburg, TX" also names live trips: it read 2 where the honest answer was 0
after the fix and 3 before it. The read now filters `is('cancelled_at', null)`.

**Cancel asks for a reason and stores it when given.** 32 of the 41 already
carry one, so it is normally written but not always, and refusing a cancel
without one would be stricter than the data has ever been. The modal's
structure is copied from `templates/wizard-page.html`, which confirms a cancel
the same way; `modal.js` supplies the focus trap, Escape and
`data-rux-close`. Danger styling, because it takes a trip off the board -- but
it is reversible, which is exactly why it is not a delete.

**Delete is still not built anywhere**, and now has a home in the plan: the
trips page, once that exists.

**Verified against production and restored.** Banquete, TX: the modal named
the trip and its customer, cancelling set `cancelled_at` and the reason, the
bar left the board, and the notice said where it went. Then both columns were
nulled and the cancelled count went back to exactly 41 with 743 rows.

One measurement note: the modal read `opacity: 0` from a computed style while
the screenshot showed it fully painted. The same stale-style trap as the side
panel; the screenshot is what settled it.

**2026-09-06 - the bar's right-click menu.** `screen-inventory.md` section 5
keeps three of the old bar's five icons - Open trip, Move bus, Print envelope -
and section 7 says the ones wanted WITHOUT opening anything belong on a
right-click menu. Two of the three are here.

**Open trip**, which the panel already does on a left click, and **Take off
this bus**, which is Move bus in the only form it can take without a list of
every bus. That write is not new: it is exactly what the drag does when a bar
is dropped on the Unassigned row.

**Hidden where it cannot act.** A bar with no assignment row is an unfilled
slot in the Unassigned row and there is nothing to clear, so the item is not
rendered rather than rendered disabled - a disabled item that can never enable
is worse than no item. Verified on the bar after unassigning it: menu opens,
the item is gone.

**Print envelope is the third and is deferred, not forgotten** - printing is
step 5 of the build order and nothing prints yet.

**Delete is not on this menu and that is deliberate.** The inventory never
lists it among the bar's actions, so it has no home in the plan; inventing one
for an irreversible write, on a menu, is not a call to make in passing. Worth
rux deciding where it belongs.

**Verified against production and restored.** Open trip opened the panel on
"Banquete, TX". Take off this bus set `bus_id` null, the board redrew the bar
in the Unassigned row, the notice read as expected, and the assignment was put
back on its original bus with a match confirmed.

The placement arithmetic both menus use is now one function; the cell menu's
handler already returned early on a bar, so the two contextmenu listeners on
the grid do not fight.

**2026-09-06 - right-click an empty cell, the old board's gesture.** rux said
the old app offered "add new trip" from a context menu on an empty spot, with
the date and bus already filled. It is worth keeping for the reason it
existed: the two things a new trip most needs are the two the cell already
knows, so creating from a cell leaves only the destination to type.

**Which day, from the pointer.** The track is ONE element spanning all seven
columns - bars sit inside it by percentage, not in per-day cells - so there is
no element to read the day off. It is the pointer's offset across the track
over a seventh of its width, the arithmetic `clip` does in reverse. Verified:
a press at 2.5/7 across row 763 filled in Wednesday 2026-09-02 and bus 763.

**Only on empty space.** A right-click on a bar is left alone; that gesture
wants the bar's own actions, which are not built, and offering "new trip here"
over an existing trip is the wrong answer to it.

**Two writes, and the second can fail on its own.** The assignment needs the
trip's id, which only exists after the insert, so `.select('id').single()`
returns it and a second insert puts the bus on. **If that second write fails
the first still stands**, which this client cannot roll back and should not
pretend to: the trip exists with no bus, so it appears in the Unassigned row,
and the notice says exactly that rather than claiming the whole thing failed.

**Created against production and deleted.** Trip on 2026-09-02 with an
assignment carrying the right bus, `leg: outbound`, `position: 0`; the board
drew the bar on row 763 and NOT in Unassigned. Deleting the trip cascaded the
assignment away, back to 743 rows, and a `like 'ZZ %'` sweep returned empty.

**AND IT EXPOSED A QUIET BUG OF MY OWN.** `NOTE` carried only `error` and
`info`, and `say` falls back to `info` for anything else - so every "Saved 1
change" and "Trip created" notice since the editor landed has been rendering
as an INFO notice. Right words, wrong kind, hidden by a fallback. Found only
because `warning` was needed for the half-finished create. `success` and
`warning` are in the map now, both classes written out in full, and the create
above was confirmed carrying `rux--inline-notification--success`.

**2026-09-06 - New trip, and the button's own promise kept.** The toolbar
comment said it would come back "on the day the trip editor does", absent
rather than disabled because a disabled primary button was the most prominent
thing on the page and did nothing. Dates were the only thing standing in the
way, so it is back: primary, rightmost, which is Carbon's place for the action
that creates something.

**It opens the same panel with nothing in it.** A trip needs exactly one thing
to exist on the board - a start date, since `legsOf` builds the outbound leg
only `if (trip.start_date)` - and with no assignment the render pushes it into
the Unassigned row. So creation needs no bus and no drivers, and the Fleet tab
says as much instead of showing blanks.

**Every default is the data's, not invented.** Counted across all 743:
`trip_type` never null and 705 round trips, so that is the type; `bus_count`
never null, so it is written as 1 rather than left for `|| 1` to cover;
`confirmed` never null with 274 already false, so a trip nobody has confirmed
is a normal row and the box starts clear; `destination` null on NONE, which is
why it joins the start date as required - a null would have been the first in
the table. `customer` is null on 26, so it is not required.

**A new trip is saveable with nothing touched**, because its defaults are
already a real trip. The dirty test is for edits; creation only asks whether
the two required fields are filled.

**Created against production and deleted.** 743 rows before, 744 after, the
row carrying exactly the defaults above, and the board drew ONE bar for it in
the Unassigned row - `inUnassignedRow: [true]`, which is the claim this whole
design rests on. Then deleted by id, back to 743, and a `like 'ZZ TEST%'`
sweep returned empty.

**A third invented class, caught by the gate.** The button was written with a
`rux--btn__label` span around its text; Carbon compiles no such class and puts
the label as bare text beside the icon, which is what `templates/table-page`
does. That is three this session - the interpolated date-picker container, the
invented date-picker invalid state, and this - all three caught by
check-classes rather than by me.

**2026-09-06 - the ring around the whole form, and two widths.** rux asked
whether the form should be selectable like that, and whether notes and dates
should span the panel.

**The ring was a real defect and ARIA names the rule.** A tabpanel takes
`tabindex="0"` only when NOTHING inside it is focusable. Details holds 16
focusable controls and carried the attribute anyway, so the panel was a
redundant tab stop that drew a focus ring around the entire form. It is now
decided per panel from its contents at render time, not written into the
markup once: Details drops it, Fleet KEEPS it, because Fleet is read-only and
without it a keyboard user could reach the tab and never reach what it
reveals.

**Notes should fill, and does now.** `.rux--text-area__wrapper` is
`display: flex` at `inline-size: 100%`, but `.rux--text-area` carries no width
of its own, so as a flex item at the default `0 1 auto` it took its basis from
the HTML `cols` default and sat at 190px inside a 447px wrapper. That 190 is
the BROWSER's number, not Carbon's -- nothing in rux.css sizes the control.
Growing it is what the 100% wrapper already said was intended.

**The dates should NOT, and are left alone.** `.rux--date-picker__input` is an
explicit `inline-size: 8.96875rem` in Carbon's own CSS. A date is a
fixed-length string; the width is a decision, not an oversight, and two of
them leaving space to the right is how a Carbon form looks. Stretching them
would be a divergence with nothing behind it and no functional gain.

Verified: Details `tabindex` absent with 16 focusable inside, Fleet `0` with
none, notes 447 against a 447 wrapper, date inputs still 144.

**2026-09-06 - the tab spacing, and only half of it was wrong.** rux asked
whether the tabs should reach the panel's sides or keep the gap. Measured
against the panel edge at 480px: title 17, tab strip 17 left and 16 right,
form fields **33 and 32**.

**The strip's inset is Carbon's and is right.** `side-panel__inner-content`
is `padding: 0 1rem 1rem`, so the strip lines up exactly with the panel's own
title. Nothing to fix.

**The content was double-padded.** `.rux--tab-content` adds a density-derived
inline padding of its own on top of the panel's, so every field sat 16px
further in than the title above it - a ragged edge running down the panel,
which is what could be seen. `rux-overrides.css` zeroes the INLINE padding
only, inside a side panel only, at Carbon's own specificity. The block padding
stays: it is the separation between the strip and what it reveals, and the
panel supplies none of it.

**NO CAPTURE SETTLES THE FULL-BLEED QUESTION.** None of the nine captured
side-panel stories contains tabs - every one holds a data table - so there is
no reference for tabs inside a panel and full bleed would be a divergence with
nothing behind it. The inset at least matches the one alignment the panel
already asserts. Said plainly rather than answered from taste.

Verified: title, strip and fields all at 17 left and 16 right.

**2026-09-06 - trip dates, and split is two outings not one range.** rux asked
whether From/To could serve round trip and split with a depart-only field for
one way. **The data says no to both halves of that**, so it was measured
across all 743 trips before anything was built.

| type | n | outbound | return dates |
|---|---|---|---|
| round_trip | 705 | end differs from start in 268 | never |
| one_way | 26 | one day in 25, THREE in one | never |
| dropoff_pickup | 12 | always exactly one day | always set, always later |

**A split is not a range.** All 12 drop off on a single day, the bus LEAVES,
and it returns 1 to 4 days later - Sandia TX drops 19 July and collects 22
July. A From/To range would claim the bus for those four days when the point
of the type is that it is free in between, and the board already knew: legsOf
makes two legs and draws two bars. **And one way is not a single date** - 25
of 26 run a day, but Corpus Christi runs 2027-01-31 to 02-02, which a
depart-only field would have silently collapsed.

So it is ONE control repeated per leg: an outbound From/To for every type, and
a second pair labelled Pick-up shown only for a split. That maps onto the four
columns and onto how bars are already placed, so nothing is special-cased at
render time.

**The return pair is nulled off a non-split on save, on rux's instruction**,
because legsOf reads those columns whatever the type says and would draw a
phantom second bar.

**Verified against production and restored.** Trip
`f522945d-b51f-4480-a072-7f63b5ceaf4e`: made a split with a pick-up on the
6th, saved, and the board drew TWO bars - outbound at day 3, return at day 6.
Switched back to round trip, saved, both return columns came back null and the
board went to one bar. Restored all five columns and compared against the
recorded original.

**A start date is now unsaveable when empty.** legsOf builds the outbound leg
only `if (trip.start_date)`, so a null start takes the trip off every week
while leaving the row in the table - lost rather than deleted, by the editor
that just did it. Clearing it disables Save and marks the field
`aria-invalid`. The end date needs no such guard: blank means the same day,
which is also what the picker leaves behind after the first click of a range.

**Two gates caught two real mistakes in this pass, both mine.** The container
class was built as `rux--date-picker-container--${which}` and check-classes
cannot see through an interpolation, so it read an uncompiled fragment and
failed - both names are written out in full now, the same rule the
notification kinds follow. Then the invalid state hung a
`rux--date-picker--invalid` class on the root, which Carbon does not compile
at all; that is inventing a class to hang a rule on, and the gate said so.
`aria-invalid` alone does the job.

Not done: the New Trip button. Dates were the thing blocking it, so it is next.

**2026-09-06 - the sliver right of Sunday, and it was two bugs.** rux saw a
few pixels of daylight between the last day column and the pane's border at
full width. Real, and mine.

**One: the head column was reserved at a width it never took.** `fitColumns`
ceils the corner to keep the pane on whole pixels -- 42.203 becomes 43 -- and
builds the pane's width from that, but the column itself stayed `max-content`
and kept its fractional width. So the columns summed to 1309.203 inside a
1310px content box and 0.797px fell out at the right, about two device pixels
on a 2x display. The fix is to pin the column to the figure already reserved
for it.

**Two, and it only appeared once the first was fixed: `flex-grow` handed the
remainder back.** The whole point of the narrowing is that the leftover pixels
sit OUTSIDE the pane's border where nothing reads them as part of the grid.
`.sch-board > .sch` grows, so the pane was stretched to fill the board again
and 2.805px reopened with the driver grid on.

**And grow could not simply be removed, which the first attempt did.** Growing
is also the MEASUREMENT: `fitColumns` reads `clientWidth` off the pane to
learn how much room there is, and a pane that cannot grow measures its own
content -- 995 instead of 1310, so the week never widened past the floor and
every day column sat at its 136px minimum. Caught immediately because the
check reads the day width, not just the gap. So grow is restored for the
measuring pass and pinned to 0 for the width just set; the floor-binds branch
leaves it alone, since a grid wider than its pane should fill whatever room
there is and scroll.

Verified across five states at 1440, columns summing exactly to the pane in
every one that does not scroll: 1310/181, driver grid on 1030/141, trip panel
open 553 and scrolling at the 136 floor, then both back again.

**2026-09-06 - the trip editor, first slice.** Step 4 of the build order. The
panel gains Details and Fleet tabs and Details is editable: destination,
customer, type, the confirmed flag, the three requirement flags, notes. Every
one is a plain column on `trips` that changes nothing about WHERE the bar
sits, so a save is one update with no cascade.

**What is not editable and why, since `trips` has 88 columns.** Dates move a
bar across days and are read through legsOf/clip, so a wrong write moves a
real trip; they get a pass with the placement in front of them. Times are not
on the trip at all - they live per-leg and per-stop in `trip_stops`, which is
the itinerary editor. Bus and drivers are the Fleet half, read-only here.
Money, contacts and the per-leg workflow booleans want a fuller editor than a
panel.

**One Save button, because one is what is captured.** `action-set--row-double`
is compiled but no captured story shows a two-button action set, so the second
is not ours to invent. Close discards, and it already restores focus. The
markup for the action set, the tabs, the text input, the select, the checkbox
group and the text area all came from `carbon-ibm-products-dom.json` and the
vendored `templates/`, not from guesses.

**Dirty is computed, not tracked.** Every input re-reads the form against the
values the panel opened with, so typing a change and typing it back out again
disables Save rather than leaving it armed. Verified: disabled at open, armed
on edit, disabled on revert, armed on a checkbox, disabled when unchecked, and
a whitespace-only edit does not count because the read trims.

**Saved against production and restored.** Trip
`f522945d-b51f-4480-a072-7f63b5ceaf4e`, notes null before; wrote a marker
through the panel, read it back from the table, status said "Saved 1 change.",
then set it back to null and confirmed. The save reads the week back rather
than trusting the write, as the drag does.

Not done: the panel closes on save because a render replaces every bar, and
reopening on the new bar is not written yet. The Fleet tab is read-only. Both
tabs carried the leg's dates and times for one commit, which read as a bug;
they are in Details now, above the editor they belong to.

**2026-09-06 - back to xs, and the width derived rather than picked.** rux
asked for both. Rows return to 24px: 32 showed 23 of 40 drivers where 24 shows
31, and seeing the roster at once is the whole point of the grid. The header
stays at 32 to meet the schedule's day header, which is the one row where the
two grids sit side by side. The square follows the row, so a day cell is 24 by
24 again.

**The width is now content-sized, the same rule the bus column follows.** It
is only ever seven squares plus the longest driver name, so hand-setting it
means clipping a name or carrying dead space. `max-content` with a 22rem cap,
and `minmax(0, max-content)` on the name track so the cap shrinks and
ellipsises rather than overflowing. It comes out at 261px against the 304 of
19rem and the 368 it carried at 32px rows; the board gets the 43 back and now
measures 1035. Nothing clips, checked by `scrollWidth` against `clientWidth`
on all 40.

**THE FIRST MEASUREMENT OF THE NAMES WAS WRONG, and I reported it to rux
before catching it.** It said the longest name needed 131px, which would have
made 19rem the "derived" answer - a wrong number that happened to justify the
value already there, which is the kind that survives. The probe built its font
from `getComputedStyle(el).font`, and **that shorthand returns an empty string
here**, so every name was measured in the browser's default 16px serif and
inflated by about half. The real longest is "Vicente Solar" at 88px in a 91px
column. Read the longhands, or ask the rendered box whether it overflows.

**2026-09-06 - left of the board, and the trial comes out.** rux chose it,
so the dock and the right-hand slot are deleted along with the layout button
and the stored preference. One position, no switch.

**Every row is 32px now**, Carbon's sm and the height the header already had,
which makes the earlier "match the header, not every row" answer moot - rux
looked at it and wanted one height throughout. The square follows the row, so
a day cell is 32 by 32 and the aside widens from 19rem to 23rem to hold seven
of them plus a 142px name column. The cost is on screen: 23 of 40 drivers
visible against 31 at 24px rows.

Verified after the deletion: aside at x=64 with the board at 448, rows and
squares 32, header 32, both panes ending on the same line, and neither the
dock nor the layout button in the document.

**A process note worth keeping.** The cleanup went out as two heredocs and the
first one asserted on its last replacement, so `sch-data.js` was never written
while `sch.js` was - and `node tools/check.mjs` still exited 0, because a
stale module that parses is not something it can see. Caught by grepping for
the thing that should have been gone. Check the file, not the exit code, when
a pass is a deletion.

**2026-09-06 - beside the board means as tall as the board.** rux asked
whether the list should reach the schedule's height. It should: it had a
hand-set 30rem cap of its own and stopped short with empty page beneath it,
showing 18 of 40 drivers. In the side and left positions it now takes the
same measured height the grid gets, so both panes run 128 to 918 and 31 of 40
drivers are visible without scrolling. Docked it keeps the stylesheet's cap,
because there it sits BELOW the grid and this height would push it off-screen.

A measurement note: `.sch-avail__row` is `display: contents` and has no box,
so counting visible rows from their rects reads zero. Counted from the name
cells instead.

**2026-09-06 - a third position, left of the schedule.** rux asked about it
rather than a left-hand panel, and it is one property: `side` and `left` are
the same box in the same flex row, `order: -1` apart. The layout button cycles
Dock, Side, Left and names where it goes next. Verified through a full cycle:
aside at 1072 after the board, at 64 with the board pushed to 384, then the
dock.

**A left-hand Carbon panel was the other option and was argued against.** The
class is compiled and would have worked. But `screen-inventory.md` section 7
says a panel holds the DETAIL OF A SELECTED THING and closes when you are
done, and rux keeps this open the whole time - persistent reference belongs in
the layout. It also costs the same width as the slot already there, so it buys
no room, only a different edge to lose it from.

**What the left position trades, and it is not obvious in either direction.**
It puts the trip panel beside the board it describes, which is what rux found
awkward about the middle. It also puts the selected trip's date and the
squares that answer it at opposite edges of the screen, which is the pairing
the marked column exists to serve. Both are defensible; that is what the
trial is for.

**2026-09-06 - the header seam, fixed in the header.** rux asked whether the
availability rows should go to 32 to match the table header. Measured: both
grids start at y=129 and the schedule's day header is 32px against this one's
24, so the mismatch was one row and 8px. Taking every row to 32 would have
spent 320px of scroll to fix it - 40 drivers at 32 is 1280 against 960 - so
the header alone takes the schedule's height and the data stays at xs. Both
headers now run 129 to 161 and the cell is still a 24px square.

**2026-09-06 - the availability grid at xs, on rux's reading.** Still on
trial; this is the side layout made to fit its slot. Days are one letter,
M T W T F S S, because the day number is already directly above in the
schedule's own header and "T..." truncated twice said less than "T". The row
is 24px, which is the step Carbon's data table calls xs, and the day cell is
square at that: a day here is a STATE, so it wants to be a mark rather than a
box with text in it. It was 25 by 32, which read as neither. Everything the
squares do not need goes to the name - 80px before, 134 now.

`minmax(0, 1fr)` on the name track and not `1fr`, because a track's automatic
minimum is its content and a long name would have pushed the squares out of
the panel instead of ellipsing. Read live: 24 by 24, square, 40 rows.

**2026-09-06 - driver availability, built both ways to be decided from.**
rux was unsure about section 7's answer and asked to try both. Both are built,
one renderer fills one element, and the `Side`/`Dock` button moves it. **This
is a trial, not a decision**: the loser's slot and that button come out
together.

**It is the week grid again, not a third component.** `.sch-avail__grid`
carries `.sch-grid` and inherits its column template; the rules add a denser
row and three cell states, and nothing else. Free is the state with nothing in
it, because free is what is being looked for. Busy and time off are Carbon's
tag tints, the same palette the bars use.

**Busy is derived, time off is stored.** No table holds a driver's day: a
driver is busy because an assignment they are on covers it, so this walks the
same legs the bars are placed from - as correct as the board above it and
wrong in the same ways. `driver_time_off` is fetched by OVERLAP, not
containment, since a fortnight away has neither date inside this week. Read
live: 40 drivers, 16 busy cells, 4 on time off.

**What my recommendation had wrong, and rux was right to push.** Section 7 says
a second row group in the grid. That puts it in the SAME scroll container as
the buses, so it scrolls away exactly when there are enough buses to need it.
The dock is a separate pane instead: same columns, own scroll.

**Three defects found by building it, all fixed.** `fitHeight` gave the grid
every remaining pixel, so the dock began at y=950 in a 950px window - 240px
tall and entirely below the fold. `fit()` runs inside `openPanel` and measured
the page mid-transition, so the grid kept its pre-panel width; harmless with
only the grid there, but it pushed the aside to 1380 against a panel edge at
960. And `.sch-board` sits in Carbon's `rux--stack-vertical`, which is a grid,
where an item defaults to `min-width: auto` and will not shrink below its
content: the track was 832 and the box still measured 1316. `min-inline-size:
0` is load-bearing, and the comment says so.

**One number rux should weigh:** the side layout with the trip panel open
leaves the schedule 512px, under four day columns. The dock costs 240px of
height and leaves all seven.

**2026-09-06 - the flash again, and the cause I had wrong.** rux said it was
still doing it, and it was. **The entry below this one names the timer as the
cause and that is wrong.** The timer was a real defect - the exit was being cut
off at 88% - but it was never what rux could see, and fixing it changed nothing
for them.

**Carbon TRANSITIONS the panel, and the close was fighting that, not the
animation.** The base rule carries `transition-property: display, opacity,
transform` at 150ms with `transition-behavior: allow-discrete`. So ending the
close removes `--closing`, the exit animation's `forwards` fill goes with it,
and the panel does not snap out of sight - it TRANSITIONS back, sliding in
from 320px and fading up to full opacity. `display` is in that same list, so
`display: none` waits out the 150ms and the panel is on screen for the whole
return trip. The reappearance IS the removal, animated, which is exactly why
correcting WHEN the class came off did not help.

`transition: none` alongside the `display: none` already in the `[hidden]`
rule. It applies only while the attribute is set, so the entrance is untouched.

**Proved without a timer, because timing here cannot be trusted.** The end of a
close was reproduced by hand and the element asked what it was running.
Without the rule: `display: grid` with a live `CSSTransition` on `display`.
With it: `display: none` and nothing running. The opacity and transform return
is the same mechanism and was not isolated by that run - the synthetic close
had not moved them - but the `display` transition alone holds the panel on
screen at full strength, and that is the flash.

**Confirmed by rux the same day: no more flash.** Which is the reading that
matters, because the proof above is structural and the eye was the only
instrument that could see the defect in the first place.

**The harness wasted most of this pass and the reason is worth keeping.** The
browser pane throttles a page it is not showing: timers clamp to 1000ms, CSS
animations do not run, and `requestAnimationFrame` does not fire. Two
measurements were taken through that without noticing - a close that "finished
in 68ms" against a 4000ms animation, and a run with no animation events at
all. Front the pane before timing anything, and prefer a question that has no
clock in it: `getAnimations()` answered this one outright.

**2026-09-06 - the flash on close, and a timer that could not win.** rux saw
the panel appear again for an instant as it closed. It did.

**The exit's `forwards` fill is the only thing holding the panel off-screen.**
Carbon's exit is a 150ms animation; remove `--closing` and the element snaps
back to opacity 1 at its original position. The close used a
`setTimeout(150)`, which starts when it is called while the animation starts a
frame later, so the class came off at about 88% of the way through. Sampled
every frame: at 143ms the panel was at opacity 0.176 and 263px out, and the
next frame had it at opacity 1 and x=0.

Now `animationend` ends the exit and the timer is only a fallback, running
long at 400ms for the case where a stylesheet suppresses animations - which
the gate sweep does deliberately, and a panel that never hides would be worse
than one that flashes. **`hidden` goes on before the class comes off**, so the
snap happens to an element that is already `display: none`.

**The frame sampler could not see this defect, and could not prove the fix.**
It is worth writing down. The old code set `hidden` in the same statement pair
as the class removal, so no `requestAnimationFrame` sample ever caught a frame
that was both visible and at full opacity - the run before the fix looks clean
in the log. The animation runs on the COMPOSITOR, and cancelling it commits a
full-strength frame there that the main thread never observes. Visible to the
eye, invisible to script. What is measurable is that the animation now
completes - 0.102 at 287px on the last visible frame against 0.176 at 263px
before - and the rest is structural. **That sentence originally ended
"confirmed by rux looking at it", and that was never true:** rux looked
and it was still flashing. See the entry above for the real cause.

**2026-09-06 - the panel was open the whole time, and `hidden` could not
close it.** rux asked whether the panel is always open like that even when
empty. It was, on every load, and the entry below this one did not notice:
it recorded the open state in detail and never looked at the closed one.

**An author rule beats the browser's.** `.rux--side-panel` sets
`display: grid`, and the user-agent's `[hidden] { display: none }` is the
weakest rule in the cascade, so marking the element hidden did nothing at
all. Carbon has no closed state to reach for because its React version does
not render one - closed means absent from the document - and this app keeps
the element and toggles it, which is the arrangement Carbon never had to
style. Measured before the fix: `hidden` true and `display: grid` at 480px
wide with the page already giving up its 30rem.

`rux-overrides.css` gets its first rule, one line at Carbon's own
specificity: `hidden` means hidden. **The same trap as `.sch-row`**, whose
`display: contents` swallowed the attribute the same way when the empty bus
rows were meant to collapse; that one is in the stylesheet's header, and
this is the second instance, so it is a rule rather than a coincidence -
any Carbon class that sets `display` needs a `[hidden]` companion before
the attribute is used to hide it.

**Carbon's own animation classes now drive both directions**, since the
element persists: `--open` goes on after `hidden` comes off, and `--closing`
runs for 150ms before `hidden` goes back on, so the panel leaves rather than
vanishing. Verified live in all four states: at load `display: none` with
width 0; open, `display: grid` at 480 with `--open` set and the title
reading the clicked trip; mid-close, `--closing` present and not yet hidden;
closed, both classes cleared, `hidden` true, `display: none`, page padding
back to 0 and the day columns back to 181.

One measurement note, because it nearly produced a second wrong answer: the
first read after the close returned `display: grid` from a stale computed
style. Forcing a reflow first returns `none`. The same trap the pane has
shown before, and it makes a fixed thing look broken rather than the other
way round.

**2026-09-06 - the trip panel, read only.** Step 4 of
`docs/screen-inventory.md` section 5, and the first thing that makes clicking
a bar lead anywhere. It shows a trip; it changes nothing yet. Editing goes in
field by field, the way the drag did.

Carbon's `side-panel`, and **no rux-ds module claims it**, so opening and
closing it is this app's own behaviour on Carbon's own markup - the classes
are compiled and the structure is the sink's; only the open state is ours.
The slide-in variant, not the default: it drops the shadow because the page
makes ROOM rather than letting the panel float over the grid. `.sch-page`
takes the panel's 30rem as end padding and the grid follows on its own,
because it measures its pane. Measured with it open: page padding 480px, day
columns at their 136px floor with the week scrolling, grid right edge 896
against the panel's left at 960, so nothing is covered. Closed, the columns
go back to 181.

**The spot time finally has somewhere to be.** The bar's one line of times
holds departure and return and no more; be-at-the-yard is read in the panel,
along with the full itinerary for that leg, the drivers' full names and roles,
the requirements, the trip type and the notes.

**Focus is handled, because a panel that drops it is worse than none.** Open
puts focus on the close button, Escape and the close button both return it to
the bar that opened it, and the bar's selection clears with it. A render
replaces every bar, so a panel left open across one closes itself rather than
pointing at an element no longer in the page.

Not done and deliberate: no editing, no actions in the header yet, and the
availability section is not built - section 7 says it is a second row group in
the grid rather than panel content, so it is its own piece of work.

**2026-09-06 - where every surface lives, written down before the first panel
is built.** rux asked whether there was a general plan for the old right
panel's contents. There were per-surface verdicts and no architecture, so
`docs/screen-inventory.md` section 7 now carries one: the panel holds the
detail of the thing you selected, a page holds a list or a feed, a menu or
modal holds options and one-off actions.

What it settles: Tasks and History become pages, the customer editor moves
from a modal into the panel so there is one editing surface, the view options
need a toolbar menu again since the one they were promised was dropped with
the specimen, and the mini calendar becomes a date-picker trigger on the week
label rather than standing space.

**And it corrects me on the driver availability grid.** I had it as a popover,
twice. rux's account of the old board is that clicking a trip highlights the
row for that trip's DATE, so the grid answers "who is free then" about the
selected trip - which is the panel's job, beside the trip's own driver list.
The per-driver card that opened from a cell in that grid does stay a popover:
that is the detail of a cell, not a surface.

**2026-09-06 - the doubled bottom edge, and the one cell that was not the
frame's colour.** Both reported by rux, both real.

**The last row drew a rule into the pane's own border**, so the bottom of the
grid was 2px where every other row boundary is 1. The last VISIBLE row is
marked by `sch-data.js` rather than by `:last-child`, which would land on the
Unassigned row on the weeks it is hidden and leave the real last row still
drawing one. Verified: last track 0px, every other track 1px, pane border 1px.

**The Unassigned row's head had its own surface** and was the only cell in the
sticky column that was not the column's colour. It takes the frame's
`layer-accent-01` now, like every other head; the row is already told apart by
its italic label and by the tint on its track, which is where a row's own
identity belongs.

That is the third instance today of the same shape of fault - two edges
meeting on one boundary - after the day rules beside the bus column and the
day rules in the header band. **The rule that falls out of all three: a line
belongs to exactly one of the two things it separates, and the frame's own
border always wins.**

**2026-09-06 - the bus column at 42px, with the padding actually equal.**
Three answers to three questions from rux.

**"No bus" is broken at the space and always two lines.** Left to wrap on its
own it is 53px wide and set the column single-handed, wider than the numbers
it sits under. Stacked it is 28px and the numbers decide.

**The column sizes itself.** It is `max-content` in the stylesheet and
`sch.js` measures the corner's rendered width rather than parsing a token, so
the column is exactly the widest of the corner's "Bus", the longest bus number
and the stacked label, plus 8px either side. 42px today. A four-digit bus
number widens it on its own, where a hand-set 45px would have clipped one by
10px.

**The whole-pixel remainder moved out of that column, which is what made the
padding uneven.** Flooring the day width leaves up to 6px over; it used to go
into the bus column, and once that column was exactly its content the leftover
showed as extra space to the right of the number - measured 8px of glyph
padding on the left against 9 to 14 on the right as the window moved. The pane
is that much narrower now instead, so the leftover falls beyond its border in
the page's own 32px of padding, where nothing reads it as part of the grid.
Measured at 1440, 1441, 1443, 1445, 1447 and 1520: the column holds at 42px
with **8px each side at every width**, every day column an equal integer, and
the grid filling the pane exactly. Where the floor binds and the grid scrolls
there is no leftover and the pane keeps every pixel.

**And the corner's borders are deliberate.** It carries exactly two, its right
and its bottom, which are the frame's own two edges - the right continuous
with the bus column's, the bottom continuous with the day band's. The first
day cell draws no left rule, so there is no doubling: verified, 1px each and
no shadow on the neighbour.

**2026-09-06 - the frame's own rules, and why neither axis has any.** rux
noticed the bus column still had lines between rows while the day band had
none, and asked whether that was deliberate. It was not, and it was worse
than inconsistent: **those column rules are invisible in g10** - measured at
1.00:1 against their own background, the same collapse that took the day
band's rules out an hour earlier, and for the same reason. Putting the column
on `layer-accent-01` moved it onto a surface the subtle tokens cannot draw on.

`border-strong-01` is the only token that survives all five themes there, and
it is the wrong answer: it reads 2.5:1 against the band where the body's own
rules read 1.3:1 against the pane, so the frame would carry heavier lines than
the grid it frames.

**So neither axis draws grid lines.** Both are clean strips. The frame is
already separated by its own surface and its two edges; a row begins where its
number does, with the body's rule immediately to its right - symmetric with
the day band, where the column rules start below it. Verified: the column has
no bottom border, the band has no shadow, and both keep the one edge that
divides them from the grid.

**2026-09-06 - the two sticky axes are one frame now.** rux asked whether the
bus column should be styled like the day band. It is, and the two precedents
disagree, so the reasoning is worth keeping.

**Carbon's own data table says no.** `thead` takes `layer-accent`; `tbody th`
- a row header - takes no background at all, only `text-secondary` and a
border. That is right for a table, where the row header is one column of
content among others.

**rux-ui's scheduler said yes**, painting the corner, the day heads and the
row heads from a single `--sched-calendar-header-bg`.

This follows rux-ui, because this axis is not a column of content: it holds
the row's identity and what the bus carries, and nothing anyone reads as a
value. Corner, day band and bus column now share `layer-accent-01` in all
five themes, so the corner is a corner rather than a cell that changes colour
halfway down. The Unassigned row head keeps its own hover step, one below the
frame, so it still reads as the odd row out.

**And an answer to the other half of the question: Carbon has no example of
this table.** No calendar, gantt, schedule, timeline or matrix component
exists in `@carbon/styles` at all - checked against the package, not from
memory. That is the whole reason the grid is this app's own component, and it
is why questions like this one get settled by argument from the nearest
Carbon pattern rather than by copying one.

**2026-09-06 - the day header is one 32px row, and the date sits beside the
day.** It was two stacked lines at 51px. It is `2rem` now, the same 32px the
toolbar's buttons are, with the name and the number on one line: they name one
thing, so they read as one label, the name in the secondary colour and the
date in the primary. The 19px goes to the grid inside the pane, which is more
of the last bus row rather than a whole new one.

**Not spread to the far edge, which is what rux sketched, and the reason is
the rules that came out an hour earlier.** With no vertical rules in the band,
a date pushed to the right of its own cell sits 24px from the NEXT day's name
and 117px from its own -- measured on a 179px column - so it would read as
belonging to the wrong column. Kept together the pair is unambiguous. Spread
becomes the better arrangement again the day the band gets its rules back,
and it is a one-line change either way.

Corner and day cells both measure 32px, "Bus" still starts on the same pixel
as the bus numbers, and the today underline is unaffected.

**2026-09-06 - the grid was a layer step too dim, both ways.** rux compared
it to the sink's own data table in g90 and was right twice: the table's rules
are brighter and its header lighter. Measured, table against grid: header
#525252 against #393939, row rule #6f6f6f against #525252.

**The cause is that Carbon's tokens are layer-aware and the grid ignored it.**
The un-suffixed `--rux-border-subtle` is the border for content sitting on the
page background. This grid does not sit there: its pane is `--rux-layer`,
which IS layer-01, so its rules are `border-subtle-01` and its header band is
`layer-accent-01`. Ten rules moved up a step and the header band with them.
Both now read the same as the table in every theme.

**Lifting the header cost it its vertical rules, and they are gone for good.**
On `layer-accent-01` the rule and its own background land on the same colour
in g10; the step up, `border-subtle-02`, collapses the same way in white and
rux, both measured at 1.00:1. `border-strong-01` survives all five at 2.3 to
2.5, but a header rule heavier than the body's breaks the single line each
boundary is meant to draw from top to bottom. **Carbon's own table header has
no vertical rules either.** So the band has none: its bottom edge divides it
from the grid, the sticky column's edge divides it from the bus numbers, and
the day labels sit at the same 12px as the bar text below them, which is what
actually says where a column starts.

**And the Unassigned row moved off `layer-accent`**, which is the header
band's surface now; two accent bands at opposite ends of the grid read as two
headers. It takes the hover step instead.

**2026-09-06 - the bus reassignment drag: the first thing this page writes.**
Step 3 of `docs/screen-inventory.md` section 5. It writes ONE column,
`trip_assignments.bus_id`, on one row. Vertical only, as rux-ui's own drag is:
a trip's dates belong to the itinerary and are changed in an editor, never by
sliding a bar sideways.

Its rules are taken from that drag rather than invented, and each was driven
and measured:

- **A threshold before it counts** - a 2px move leaves the bar unflagged, so a
  press that does not travel still selects.
- **The Unassigned row is revealed for the duration** and hidden again after,
  because the week's first unassigned trip needs a rectangle to land on.
- **A double booking is a warning, not a wall.** Dragging a Thursday bar over
  a bus already working that Thursday lit the row in the warning tone rather
  than the interactive one, and the drop would still go through: the
  dispatcher can see what this page cannot. Out of service reads the same.
- **The Unassigned row can never be a conflict.**
- **Dropping on the row it came from does nothing** - released on its own
  track, no highlight, no write, `aria-busy` never set.

**No ghost and no optimistic move.** The source dims where it sits, the target
row lights, and on release the week is read back from the server, so what is
on screen after a move is what the database holds rather than what this page
hoped.

**Driven against real data, and put back.** The South Padre Island assignment
moved from bus 218 to 763 through the interface, the row was confirmed changed
by reading the table directly, and the original bus was written back the same
way. Nothing in production is left altered.

**2026-09-06 - why every bar was grey, and the rule that fixes it.** rux
asked. The cause: only the OVERRIDE colour was wired. rux-ui's rule has three
levels, in its own `--_tone` declaration and the one rule beneath it -
`var(--_trip-bar-color, var(--sched-trip-bar-confirmed-tone))`, with
`--unconfirmed:not([data-trip-bar-color])` taking the unconfirmed tone. So an
override beats status, status beats the default, **and the default is blue,
not neutral**: blue-400 on the dark themes, blue-600 on the light, with red
for unconfirmed. Only 64 of 743 trips carry an override, so wiring that alone
left every other bar saying nothing.

Carbon has no token for "a confirmed trip" and its support tokens are for
alerts, so the categorical tag palette carries all three levels: the override
hues as before, `blue` for the default and `red` for unconfirmed. That is the
same information the old board showed, in tokens this system already compiles.
On the current week, 17 blue and 2 red.

**The selection ring had to move.** It was `border-interactive`, which is
Carbon's blue, and a blue ring on a blue bar is the one pairing that cannot be
seen. It is `layer-selected-inverse` now - near-black on the light themes,
near-white on the dark - measured at 7.09:1 against the fill on g90 and g100
and 13.79:1 on white, g10 and rux. Label on fill reads 5.94:1 in all five,
comfortably past AA. Focus keeps the focus token; they are different signals.

**2026-09-06 - the browser gates, swept for the first time.** `docs/gate-
coverage.md` is the record. Both pages, white theme asserted from a resolved
token, focus taken with Tab then blurred, transitions suppressed, Plex
serving, pointer parked, page looked at. **Two findings, both adjudicated,
nothing to fix.**

- **Five stripped classes on `index.html`** are the pre-JS loading spinner in
  `#sch-status`. `sch-data.js` replaces the status contents on the first read,
  so they live in the file and never in the settled page - which is the point
  of them, and not a defect.
- **One spacing divergence on both pages**, `rux--header__name` at 8px of
  inline start padding where Carbon's capture has 16. Carbon's own rule causes
  it: it tightens the app name when the hamburger sits beside it, and the
  captured story has the toggle hidden because it was taken at desktop. This
  app shows it at every width, so the rule fires and the value is right.

`check-a11y` read 0 on both, and **the red run was done** rather than assumed:
stripping every focus outline and shadow took it to 21 findings and restoring
them returned it to 0. `check-rendered` and `check-behaviour` are N/A here for
the same reason they are on rux-ds's own templates - one measures kitchen-sink
sections, the other drives modules these pages do not carry.

**A gap for rux-ds, raised not acted on: the browser gates are not vendored.**
`vendor/rux-ds/tools/` carries the app check and the server. Sweeping meant
copying three gates and a 360KB capture out of a rux-ds clone and deleting
them after, so an app on a tag cannot check its own rendering without a
checkout of the design system beside it.

**And a second thing to raise there.** `js/ui-shell.js` says a desktop
hamburger "invents a state IBM's design does not have". Carbon ships
`.rux--header__menu-toggle:not(.__hidden) ~ .rux--header__name`, a rule whose
only purpose is to space the app name when that toggle is visible. It is the
divergence above, and it is evidence the other way.

**2026-09-06 - the correctness pass: feedback, failure, and two dead
controls.**

**Week navigation said nothing while it worked.** Measured: 120ms after
pressing the arrow, the label, the bars and the status were all still the
previous week's, so two presses read as a page that had not noticed. The week
being asked for is known the moment the button is pressed, so the label moves
first and the grid dims to 0.55 with `aria-busy` set. **Dimmed, not cleared**
- the week on screen is still worth reading while the next one loads.

**A failed week no longer takes the last good one with it.** It hid the grid
outright, so one dropped request wiped what was there. The rendered week is
tracked separately from the one being fetched: on a failure the label goes
back to what is actually drawn and the notice says which week failed and that
the old one still stands. Only a first load with nothing drawn stays empty.

**A stalled read had no end.** Trying to test the failure path is what found
it: with the network blocked the grid sat dimmed and busy past seven seconds
with no error and no way back but a reload, because a hanging connection
never rejects. `read` loses a race against 15 seconds now. Verified end to
end with a fetch that never settles: the timeout fires, the error reads "The
schedule did not answer within 15 seconds. Still showing the week that did
load.", the grid keeps its 19 bars, the label returns to the drawn week, busy
and the dim clear, and pressing the arrow again is a working retry.

**Two controls that did nothing are gone.** New trip was the most prominent
thing on the page and was disabled; it returns, right-aligned, the day the
trip editor does. Five of the six side-nav items pointed at this page, so
clicking Drivers silently reloaded the schedule - worse than not offering it.
Carbon compiles no disabled state for a side-nav link and inventing one is
not this app's to do, so **the nav lists what exists** and each returns when
its page does.

**2026-09-06 - toolbar buttons to the small size, and a height bug it
uncovered.** All four are `layout--size-sm`, 32px rather than 40, which is
Carbon's own size for a dense context and takes the toolbar row from 40px to
32. The 8px goes to the grid, because the pane's height is measured now
rather than guessed. The smallest target is 32x32, comfortably over the 24px
WCAG 2.5.8 minimum, and this is a pointer-driven dispatch board.

**The bug: the height only followed a window resize.** The pane's own box and
the block above it can change without one, and the case that matters is the
status notification - a week with no trips draws one, the grid starts 80px
lower, and its height has to follow or it runs off the bottom. Reproduced by
hand: the pane's top went 128 to 208 and its cap stayed where it was,
overflowing the viewport.

`sch.js` exposes `Rux.schedule.fit` and `sch-data.js` calls it right after
the line that shows or hides that notification, so the renderer says when
rather than leaving it to be noticed. Measured after: pushed down, the cap
tracks 790 to 710 and leaves exactly 32px below; restored, back to 790.

**A ResizeObserver is also wired, and it is UNVERIFIED.** This browser pane
does not render while hidden and ResizeObserver delivers at paint, so no
callback ever arrived in testing - a probe observer added by hand counted
zero over a change that moved the pane 80px. It is kept because it is correct
and free, not because it was seen working, and the explicit call is what the
behaviour actually rests on. The `window.resize` listener WAS proven, by
dispatching the event by hand after this harness changed the viewport without
firing one.

**2026-09-06 - the toolbar reordered: move, then read, then act.** It ran
New trip, prev, Today, next, label. It now runs prev, next, Today, label,
then New trip on the right.

- **The two arrows are neighbours** because paging back and forth is the most
  repeated gesture on the page, and Today between them put a 70px hop between
  the pair.
- **The label stays after the controls that change it, never before.** This is
  the constraint that decided the order: "August 31 - September 6, 2026" is
  wider than "September 7 - 13, 2026", so anything placed after the label
  slides sideways as the week changes, moving the very buttons being clicked.
  Verified over three weeks - the arrows and Today hold at 64, 112 and 160px
  and New trip's right edge at 1376 while the label changes width under them.
- **New trip is right-aligned**, flush with the grid's right edge, which is
  Carbon's own place for a primary action and keeps creating a trip clear of
  the paging controls.

Considered and rejected: the label as a left-hand title with every control on
the right, which reads well but puts 1200px between reading the week and
changing it, for the action repeated most.

**2026-09-06 - the page heading goes to the outline, and the grid takes the
room.** Two changes, and only together do they pay.

The heading was 42px type in a 50px line and, with the stack gap under it,
cost 66px of a viewport where a bus row is 95px. Three pieces of chrome
already name the page - the tab title, the app name in the header, and the
current item in the side nav - and the toolbar below carries the week, which
is the part that changes. It is `rux--visually-hidden` now, so the document
outline and anyone arriving by screen reader still get it.

**On its own that would have gained nothing**, and this is the part worth
remembering. The grid's height was capped at `100dvh` minus a hard 15rem, a
number tuned by hand to whatever chrome happened to sit above it: at 950px
the pane came out 708px because 950 - 240 - 2 is 708, so the cap decided, not
the space. `sch.js` measures the pane's own top now and subtracts the content
region's own bottom padding, which means any change above the grid - a
heading going, a toolbar wrapping - turns into grid. The stylesheet keeps its
old cap as the no-script fallback.

Measured after, at 1440x950: pane top 136, height 780 against 708, exactly
32px left below it, and eight bus rows visible where seven fitted. At
1200x500 the 24rem floor holds at 382px and both the page and the grid
scroll. At 1440x1100 it grows to 930 on the resize listener alone.

**2026-09-06 - three pixels clear, evenly, on rux's call.** The gap was 4px
to every boundary and the clear space was not: 3px left and bottom against
4px right and top. **Every rule is 1px painted on one side of the boundary it
marks**, so it falls inside the gap on that side - the day rule sits in its
column's first pixel, the row rule in its row's last - and outside it on the
other. Two variables now: `--sch-gap` where the rule is inside, and
`--sch-gap-clear`, one pixel less, where it is not.

Measured after: 3px clear on all four sides, the bar unchanged at 88px, the
single-lane row 95px rather than 96. The bar's first character still lands at
12px from the day boundary, which is where the day header's own label starts,
so the alignment that mattered did not move.

**The continuing edges keep no gap, which was rux's own point.** A bar running
in from last week sits flush at the track's left with 3px on its right; one
running out into next week is flush at the right with 3px on its left. The
space is what says the trip stops there, so an edge that does not stop has
none. Verified on the specimen, both directions.

**Between two stacked bars stays 4px.** There is no rule there - it separates
bar from bar rather than bar from line - and at 3px two bars in one row would
read as closer to each other than to the grid.

**2026-09-06 - whole-pixel day columns, and what "pixel perfect" turned out
to mean.** rux asked for the bars to be pixel perfect in the grid. Audited
first: **the placement arithmetic was already exact**, worst deviation 0.016px
across six viewport widths, because the bars are positioned inside the track
and the track is a grid item spanning the very columns they are measured
against.

**The columns themselves were the problem.** `1fr` is a seventh of whatever
is left over, which is almost never a whole pixel. Measured at 1440 on a 2x
display: the track 1253.992px, a day 179.1417px, the day boundaries at 121,
300.141, 479.281, 658.422, 837.57 and so on - and 37 of 38 bar edges missing
a device pixel, the worst by 0.438 of one. The browser then paints every bar
edge, and every day rule, across two device pixels.

`sch.js` now floors the day width to whole pixels and **gives the remainder to
the bus column**. Parking it in the last day would make one column visibly
wider than its neighbours; leaving it at the right edge would open a gap
inside the pane's border. The bus column carries no alignment of its own, so
a few pixels there are invisible and the grid still fills its pane exactly.
When the floor binds the columns are already at `--sch-day-min` and the grid
scrolls, so there is no remainder to place.

After: every column exactly 179px at 1440, every boundary an integer, worst
edge 0.031 device pixels, which is float noise. Checked at 1441, 1443, 1447
and 1520, where the day lands on 179, 179, 180 and 190 and the grid fills
each time; at 900 the floor binds at 136px and it scrolls; the specimen gets
it too, since both pages load this file.

**It is an enhancement, not a requirement.** Without the script the
stylesheet's own `minmax(--sch-day-min, 1fr)` renders, which is exactly what
shipped before, so there is no state where the grid depends on it to work.

**2026-09-06 - the side nav is behind the hamburger at every width.** rux's
question was whether this just makes desktop behave the way the narrow
breakpoint already does, and it does, with one difference: the scrim stays
below the breakpoint, so at desktop the nav opens over the page with nothing
dimmed.

**It needed no new CSS and no change in rux-ds.** Three compiled Carbon
classes and one attribute:
- `header__menu-toggle__hidden` is OPT-IN, not forced - Carbon hides the
  button above 66rem only if the markup asks. Removed, so the button shows.
- `side-nav--hidden` is declared AFTER `--side-nav--ux` and BEFORE
  `--expanded`, so carrying it permanently makes the nav 0 at every width
  while the hamburger's own `--expanded` still opens it to 16rem.
- The page's 18rem content offset, which existed to clear a persistent nav,
  is gone; the nav is `position: fixed` at z-index 8000 with an opaque
  background, so it covers the grid rather than pushing it.
- The button's label is Carbon's own "Open menu", because `js/ui-shell.js`
  swaps only that known pair and left "Toggle navigation" alone.

`js/ui-shell.js` has no width gate at all - the 66rem in it is comment, not
code - so the toggle it already ships works at desktop untouched. The earlier
reading that this would need a change there was wrong and is corrected here.

**A day column goes 143px to 179px, text 119px to 155px**, which is more than
every other adjustment today put together. Verified at 1440: closed 0 and open
256 with the grid never reflowing, glyph swapping to the X, aria-expanded
tracking, Escape closing and restoring the label. At 900: closed 0, open 256,
scrim 900x850 and active, exactly as before.

**A measurement trap worth recording.** getComputedStyle right after a class
change returned the PREVIOUS value in this browser pane, which made `--hidden`
look inert and `--expanded` look like it collapsed the nav - the readings were
lagging one step. Forcing layout with offsetWidth and waiting two animation
frames fixed it, and the true readings then matched the stylesheet's own order
exactly: 256 / 0 / 256 / 256.

**2026-09-06 - the empty time row, and why it was empty.** rux asked why no
times showed. The bar was reading `trips.departure_time` and `return_time`,
and those columns are **null on all 743 rows** - counted, not sampled. They
are dead columns; nothing has ever written them.

The times live in the itinerary. A leg's first `pickup` stop holds the
departure in `depart_prev` and its last `return` stop holds the arrival in
`arrive`. That is rux-ui's own rule, `extractTripTimes`, with one correction:
it read a trip's stops without regard to leg, and a bar here IS a leg, so the
return leg of a drop-off now reads its own stops. The trip columns stay as
the fallback they were written to be.

Measured over a 90-day window: 99 trips, 80 with stops, 72 with both a
departure and a return derivable, 74KB for the nested query. On the current
week 18 of 19 bars now carry a time and none of them clips.

**The SPOT time is read and deliberately not drawn.** The row is one line in a
column of about 119px and two times already fill it; three would not fit. It
belongs on the trip editor, which does not exist yet.

**Not handled: a return after midnight.** "Banquete, TX 12:23 - 01:38" is real
data and the bar gives no sign that the arrival is the next day. Day
granularity cannot show it; the old app only distinguished it in time-aligned
mode, which is later.

**2026-09-06 - the bus column, 5.5rem to 3.5rem, and what actually made it
possible.** rux asked whether stacking the equipment icons would let the
column be narrower. Measured first, and it would not have: at 88px the two
icons side by side came to 36px, a three-digit number to 26px, and the word
"Unassigned" to 66px against a 71px content box. **The LABEL was the column's
width.** Stacking icons that were already narrower than the number above them
saves nothing on its own.

So both: the icons are in a column, and the row is labelled "No bus", which
wraps to two lines and puts the full sense in the row's title. The widest
thing left is the number, and 3.5rem carries a four-digit one; the floor
below that is the corner's own "Bus" at 39px. The corner also took the row
head's inline padding rather than the day cells', so that word starts on the
same pixel as the numbers under it - measured, both at 329px.

The 32px goes to the days: a day column reads 143px at 1440 against 138px
before, and 119px of text against 114px. Nothing clips at 1440, 1000 or 900,
and "No bus" wraps to two lines at all three.

**2026-09-06 - the day column floor, raised to 8.5rem.** rux asked whether a
minimum width would do, given the grid already scrolls past it. It does, and
the exact threshold was measured rather than picked: at 8.5rem the 1fr share
of 138px still wins on a 1440 window and nothing changes, at 9rem the floor
binds and pushes 42px of overflow. So 8.5rem is free where the week fits and
worth 24px a column where it does not - 112px of text at the old 7rem against
136px now.

**What a floor cannot do, said plainly.** It only binds when the columns would
otherwise be narrower, so it buys nothing on a wide window; only a floor ABOVE
the 1fr share could, and that scrolls the whole week at every size. Measured
over 30 single-day bars across two weeks of real data, a destination needs
113px at the median, 167px at the third quartile and 349px at the worst
("Harlingen Convention Center Shuttle to UTRGV"). Fitting three quarters of
them means a 191px column, which is 1425px of grid before the bus column.

**The lever that would actually pay is vertical, not horizontal.** The bar has
five fixed rows and the time row is empty on most trips here; spending that
row on a second line of destination would roughly double the characters at no
horizontal cost. Not done, and not decided.

**2026-09-06 - one size, no switcher, on rux's call.** The bar shipped with
two density tiers behind a Carbon content switcher, compact at label-01 and
comfortable at label-02. The second tier is gone and compact is the only one:
12px text, 16px rows, an 88px bar. Old rule 2.8 allowed two and this takes
one, because the larger tier fits FEWER characters into a day column that
already truncates a destination, and the switcher spent a toolbar control
saying so. `--sch-fs` and `--sch-row-h` stay as the derivation of the row
height, not as a knob.

The toolbar is now four controls and the week label. `sch.js` is back to one
job, selecting a bar, since the switcher was the only thing it drove besides
that; the spacer that existed only to push the switcher right went with it.
Measured after: no switcher in either page, no `sch--lg` anywhere, bar text
12px, row 16px, bar 88px, and selection still sets `aria-pressed`.

**2026-09-06 - the doubled rule beside the Bus column.** Reported and real:
two hairlines side by side where every other boundary has one. The sticky
column ends in a border and the first day drew a rule of its own at the same
pixel. Both halves of the grid had it, and start-aligning the body's rules
earlier the same day is what gave the body its half.

The day rules now cover **the six boundaries between days and neither edge**.
In the header the first day draws nothing, so the sticky column's own border
survives - it has to, since it is what divides the frozen column from the days
sliding under it. In the body the painted layer starts one day in and repeats
every sixth of its own width, which is exactly one day, so the rules land on
days 1 to 6 and never on either edge. Measured: the layer starts at 138px and
runs 828px on a 138px day, and the gradient period reads 16.6667% of that.

**Monday being today needed its own rule**, because box-shadow is one
property: the first day has to lose the day rule while keeping the accent.
Checked both ways by forcing the class - Monday gets the underline alone, a
midweek day gets rule and underline.

**2026-09-06 - the now-line removed, on rux's call.** Reported as landing on
the wrong day when the window is narrow, and it was: measured at 900px, the
line sat at 785px, inside Friday, with today on Sunday. **The cause is that
a grid container is only as wide as its own containing block.** The line was
positioned as a percentage of `.sch-grid`, whose box measured 770px while its
seven columns totalled 872px and overflowed it. Everything else on the page
is placed inside `.sch-track`, a grid ITEM spanning those columns, whose
width IS their total -- which is why bar placement measured exact at every
width and only this one drifted.

**Nothing replaces it, and that is the better answer anyway.** A grid placed
by DAY has no position within a day to point at, so a rule down the middle of
a column claims a precision the data does not have. Today is the header
cell's own accent: the interactive underline, the bold date, and
`aria-current="date"`.

**One bug found while removing it.** Moving the day rule from
`border-inline-start` to an inset shadow earlier the same day meant
`.sch-day--today`'s own shadow -- later in the file, same specificity --
REPLACED it, so today's column had silently lost its left rule. Both shadows
are on the one property now.

**And one thing the removal made necessary.** With the header cell the only
mark, it has to be on screen: a Sunday sits past the right edge of a narrow
window. The grid now scrolls today's column into view after a render, only
when it is actually out of view and never behind the sticky bus column.
Measured at 900px: scrollLeft 102, today fully visible; at 1440px it does not
scroll at all.

**2026-09-06 - the grid, tightened, and what was actually wrong.** The bars
were never mis-PLACED: measured against the day header columns at eight
viewport widths, the worst error was 0.02px, because the seven columns are
equal `1fr` and the track spans exactly them, so a percentage of the track
lands on a column boundary. Four things around that were wrong, all found
by measuring rather than looking.

1. **The gap was asymmetric**: 2px left and right against 4px above and
   below. One `--sch-gap` at `spacing-02` now governs all four sides.
2. **The bar's text did not line up with the day header's label**: 10px
   from the day boundary against 13px. The header's rule was a
   `border-inline-start`, which sits INSIDE the cell and pushes its label
   one pixel right of everything else measured from that boundary. It is an
   inset box-shadow now, which paints on the same pixel and moves nothing;
   with the 4px gap plus the bar's own 8px padding both now sit at 12px.
3. **Every rule in the body sat one pixel left of the rule above it.** The
   track paints its day rules with a repeating gradient, and it painted the
   LAST pixel of each day (`calc(14.2857% - 1px)` to `14.2857%`, read off the
   resolved `background-image`) while a `border-inline-start` paints a day's
   FIRST. Start-aligned now, so header and body draw the same line.
4. **A bar continuing from the previous week was one gap short.** It went
   flush to the left edge but still subtracted both gaps from its width, so
   it ended 4px before every other bar in that day.

**The gap is 4px because of what it buys**, not because it looked right:
two bars in neighbouring days sit 8px apart plus the rule, it is the same
number already separating stacked bars in a lane, and it is what puts the
bar's first character on the day header's own text edge. It costs 4px of
text width per bar, which matters at the 7rem minimum column where
destinations already truncate. 2px everywhere would buy that back and lose
all three.

Not changed and deliberate: a bar keeps five rows even when a row is empty,
so every bar in a lane is the same height. That is the old app's rule 1.1.

**2026-09-06 - the bus column, narrowed to what it says.** It held "Bus 218"
over "52 pax - Motorcoach" and took 9rem of a grid whose job is the seven
days beside it. Now the number alone, with the equipment as icons under it:
`accessibility` for an ADA lift, `hotel` for a sleeper, the warning mark for
an out-of-service window. Capacity, type and a non-active status are not
dropped, they moved to the row's `title`. Measured 1440x950: the head went
144px to 88px and each day column 117px to 138px, and the icons take their
colour from the same token in all five themes.

**5.5rem, not the 5rem tried first.** Three digits fit either way, but
"Unassigned" measured 66px against a 63px content box and clipped; the row
is worth its own word rather than an abbreviation.

**The two icons came from rux-ds, not from here.** Carbon ships both and the
sprite carried neither, so `tools/icons.mjs` there gained two names, the
glyph snapshot gained two entries and moved none, all 41 browser cells were
re-swept because `npm run icons` rewrites every page's inlined sprite, and
`v0.1.8` was cut. The pin moved to it. **A pin move does NOT refresh a page's
inlined sprite** - `new-project.sh` leaves pages alone by design - so the app
had the new icons in `vendor/` and the old sprite in its markup, with no
gate able to see it: `check.mjs` asks whether a `<use>` resolves, and it did,
against the stale copy. `tools/sprite.mjs` is the answer, and `--check` says
whether a page is behind the pin.

**2026-09-06 - the live week, read only.** `index.html` now draws the real
schedule: `sch-data.js` reads `buses`, `trips` with their `trip_assignments`
and `trip_drivers` nested, `drivers` and `bus_out_of_service` straight from
the Supabase project the rux-ui app writes, through the client
`/account.js` exposes. Nothing writes; New trip ships disabled. Week
navigation works. The static states moved to `specimen.html`, which needs no
network and stays the design reference; it is deliberately not in the nav.

**A bar is one ASSIGNMENT, not one trip** - the model the data actually has.
A trip carries an outbound leg and, when it is a drop-off and pick-up, a
return leg days later; assignments name a bus per leg and per position. So
the Dallas trip of 7 to 11 September renders as seven bars across seven bus
rows, each labelled its position of seven, and a drop-off renders as two
bars on one row with a gap. A leg needing more buses than it has
assignments puts the difference on Unassigned as "Needs a bus"; verified on
Harlingen (pm) that week, which needs four and has three.

**Two faults found by measuring, not by reading.** The week label built by
hand read "7 - September 13, 2026"; it is `Intl.DateTimeFormat.formatRange`
now, which knows the form for the locale. And the day header only sticks to
its SCROLL CONTAINER, which was never scrolling - the page was, so the
header slid away above ten bus rows. The grid is its own scroll pane now;
measured after, the header holds at the top and the bus column at the left
through both scroll directions.

**No conflict marking, deliberately.** Placement here is by day, and two
same-day trips on one bus are ordinary. Marking every overlap would cry
wolf on most rows; real detection needs the times, which is the
time-aligned mode, which is later. The specimen still draws the state.

**ONE THING NEEDS RUX'S CALL: amber.** rux-ui stores a colour name and its
own module maps retired names onto five live ones - teal, green, purple,
amber, pink. Carbon's tag palette has no amber, and amber is the most-used
of the five (22 rows of 64 counted 2026-09-06, counting the yellow that
maps to it). It renders warm-gray today, which is honest but drops the
distinction. Either amber goes neutral, or `sch.css` gets one bar hue that
is not a Carbon tag. Not decided here.

Measured live at 1440x950 against the real project: current week 11 rows and
19 bars, next week 18 bars with 7 multi-day, one continuing into the week
after, two unconfirmed drawn hollow. All five themes resolve their own
tokens, read off the computed styles rather than the screenshots, which lag
while the browser pane is hidden. Selection, keyboard Enter and both size
tiers work on live bars: 88px compact, 98px comfortable.

Not covered: no drag, no editor, no realtime, no time-aligned mode, no
two-week view, no print. The side nav's other five items go nowhere yet.
`check-a11y` and the spacing gate are rux-ds's and have never run against
this app.

**2026-09-06 — pin moved to v0.1.7.** The tag was cut in rux-ds at
`57031cc`, verified there in a clean worktree with all 41 browser cells
current, nothing removed in `CHANGES.md`. The move brought
`vendor/rux-ds/tools/` and `githooks/` with it, so `node tools/check.mjs`,
the commit hook and `node tools/serve.mjs` now run from the vendored copy;
this is the first commit made under the app's own hook. The drift report
lists three head resources that are this app's own and a header nav the
page leaves out on purpose. Pages was enabled by rux with the Actions
source.

**2026-09-06 — the week grid, static.** `index.html` is the Schedule page:
Carbon shell and toolbar, and the two app components in `sch.css`, the
grid and the trip bar, with `sch.js` for selection and the size switcher.
Eleven invented trips on an invented week show every state the old bar
had: two-day, continues-before, continues-after with a partial-PO border,
a second lane, unconfirmed, double booked, out of service, Unassigned.
Ported from `rux-ui` with four changes, each recorded in the stylesheet's
header: Carbon tag tints instead of saturated fills, square corners, the
border-interactive and focus tokens for selected and focus, label-01 and
label-02 as the two size tiers with row height equal to line height.
Measured live at 1440×900: compact rows 16px and a bar 88px, comfortable
18px and 98px; a click sets `aria-pressed`; the overflow menu opens under
rux-ds's `menu.js`. Looked at in white, g10, g90, g100 and rux; the light
themes tint, the dark ones saturate, both Carbon's own tag palette. The
shared app check passes when run from rux-ds's copy, since the vendored
copy is still absent. Not covered: no data, no drag, no editor, no week
navigation, no time-aligned mode; `check-a11y` and the spacing gate are
rux-ds's and were not run here; the `Settings` and `Drivers` nav icons are
stand-ins from the sprite's forty icons.

**2026-09-06 — repository started.** Scaffolded by rux-ds
`tools/new-project.sh` from `v0.1.6`; that tag predated the shared app
check, so `vendor/rux-ds/tools/` was empty and `node tools/check.mjs` failed
on a missing module until the pin moved, see above. Two
inventories written from the `rux-backend` snapshot of 2026-09-03 and the
old app in `rux-ui`. Decisions recorded there: same tables, no schema
change; platform sign-in from the first commit, which the old app's
permissive policies allow; every floating window becomes a side panel or
modal; the week grid and the trip bar are the app's two components, rule
added to `AGENTS.md`. Not done: no page beyond the scaffold, no Pages
deployment, and rux-ds roadmap §4.13 step 8 amended separately there.

