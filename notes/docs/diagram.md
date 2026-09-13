---
type: reference
---

# The diagram

**What it is for, what it covers, and how a tile is drawn.** Figures come from
the rendered page or the synced data at `data/guides/PIN`, never from a count
by hand.

**The section numbers are load-bearing and do not move.** `build.mjs`,
`build-specimen-kinds.mjs` and `build-tile-looks.mjs` cite §-numbers in this file. Add
anything new at the front without a number, or at the back with the next one.

## Purpose

**One map of the demand-to-shipment chain: every path and branch that leads to a
shipment, and the planning that decides which one runs.** Around the main path
sit the four other things a reader needs: what must be configured first, what
the system produced on its own, what you open to find out where things stand,
and where the chain decides for you.

**There is one diagram, and it is the overview.** A map of every LN screen is
out of scope: it would copy a menu the vendor already ships, and §11 shows the
lane × stage axis cannot place reference-data screens. The level-2 session map
is not extended; whether it is retired is atlas's call.

### The five tile types, and what each answers

| type | the question it answers | derived from |
| :--- | :--- | :--- |
| **Step** | what do I do here | everything else on the route |
| **Setup** | what has to be configured before any of this runs | no `flow` edge, in or out |
| **Lookup** | what is true right now — opened, never changed | `kind` is `read` |
| **Result** | what now exists, that nobody performed | `planned`, `real`, `outcome`, `terminal`, on the route |
| **Checkpoint** | what decides on its own, and how would I know | `kind` is `gate` or `decision` |

The internal classes read `config` for Setup and `info` for Lookup; renaming
them gains the reader nothing. The reader-facing names are `CATEGORY_NAME` in
`tools/build-tile-looks.mjs`.

`guide`, the SOP link, is a node field and renders in the tile's panel.

## Scope — what the overview does not yet know

**The short-stock branches are placeholders.** Four Checkpoint tiles mark where
a route turns when something is short: stock promised elsewhere, advice, a
production release and a short shipment. Each names what is not yet walked,
and atlas completes them as walks come in. Nodes, edges, lanes, stages and
`kind` come from atlas; this side renders them.

## 0. Five categories

A reader at a screen with the map open asks five questions, so there are five
categories (the table above). They are drawn by independent signals:

| signal | says | values |
|---|---|---|
| **border** | on the route or beside it | solid · dashed (Setup, Lookup) |
| **fill** | a screen you can open | filled when the node has a session `code` · outline when it has none |
| **colour** | which category | grey Step · magenta Setup · blue Lookup · green Result · yellow Checkpoint |
| **name style** | act on it, or take it in | upright (Step, Setup) · italic (Lookup, Result, Checkpoint) |

Setup is magenta rather than purple, because purple and the Lookup blue merge
under red-green colour blindness and the two share the dashed border.

A tile off the walk has no number, so its top row names its category instead,
and no category rests on colour alone.

Italic means the same thing wherever it appears: a state you take in rather
than an action you perform. Checkpoint keeps its yellow wherever it stands,
because a silent failure is the one thing no layout can show.

**Result exists so a planned order does not read as something to perform.**
MRP made it; a proposal is not an order, and both halves are Results.

**A dashed card is not indented.** The dashed border already says *off the
line*; an indent widens every column (§10) and adds horizontal scroll.

All five derive from the data, as the first table shows. The distinction
that matters: **Setup is configured once and is then ready; a Lookup is
opened to find out what is true now.** A session *about*
configuration, such as `Production Order Parameters`, is a Lookup.

`read` is tested **before** the path, because a Lookup need not sit beside
the route. Mid-sequence it takes the solid border and keeps the italic name:
the signals stay independent.

## 1. What is actually there

Nine `kind` values arrive from atlas; the contract lists them (§6).
`build.mjs` folds them into the five categories and draws the categories, not
the kinds. The tile's panel names the kind in full (`.notes-dg-kind`), and the
legend names the categories (§9).

## 2. What the data supports

### 2.1 The contract rules on the axis

`../atlas/standards/guide-json.md` §5, addressed to renderers:

> colour says what to do with a thing, form says what kind of thing it is

### 2.2 The column already says planned, transfer or real

In both documents every `planned` node sits left of the boundary stage, every
`transfer` on it and every `real` right of it, so a hue per kind would repeat
what the column states. This is observed, not guaranteed by the contract, and
it holds only for a map that traces one run past one boundary.

### 2.3 Openability is `code`, not `kind`

`code` and `route` are present or absent together on every node. The same kind
can be a session on one page and not on the other: `gate` is `cprrp0520m000` on
the session map, a screen you open, and a bare question with no code on the
overview. "Can I open this?" is what a reader beside a screen asks, and `code`
answers it with no new field from atlas.

## 3. Route and openability

### 3.0 On the route, or beside it

A node with no `flow` edge, in or out, is one the sequence never enters or
leaves: Setup, or a Lookup beside the route. It needs no new field.

**It cuts across `kind`.** `Items and groups` is a `step` beside the path; `Bill
of material and routing` is an `outcome` beside it; `Finished item into stock`
is an `outcome` on it.

### 3.1 Filled or outline

A tile with a session `code` is filled; a tile without one is an outline,
because there is nothing behind it to open. It is not a separate category and
never changes one.

### 3.2 Form and colour are independent axes

A rule about one never removes the other. Every `gate` on the overview is
codeless, so a rule that strips a codeless tile's colour hides Checkpoint on
the page whose content is mostly gates.

### 3.3 The panel

It names all nine kinds in `.notes-dg-kind` and pairs the name with the
category's accent.

## 4. What this does not do

- **Ask atlas for a new field.** `code` is exact; an `openable` boolean would
  duplicate it.
- **Drop a kind nobody styled.** A kind with no treatment still renders as a
  readable tile with its words, as the contract guarantees.
- **Rely on a key to tell forms apart.** The forms carry the distinctions; the
  legend (§9) supplies only the names.

## 5. What a diagram change is checked against

Both documents, every theme:

1. **Tiles that collide with a tile of a different category** — cannot be told
   apart at rest. Count by category, never by kind: a design that merges kinds
   into categories would fail a by-kind count by definition. The same test
   applies to on-route versus beside-route.
2. **Looks a reader must learn, and one category, one look.** Collisions ask
   whether two categories can be told apart; only this asks whether *one* is
   drawn consistently.
3. **Column width and figure scroll width.** Neither may grow for a change that
   is not about width (§10).
4. **Contrast of every accent against its ground**, in all four themes.

### 5.1 The specimen

`node tools/build-specimen-kinds.mjs` writes `build/specimen-kinds.html`: the real
diagrams lifted whole from the built pages, drawn as shipped and once per
proposal variant, differing by CSS alone, with the figures above computed live
in whichever theme is on. `build/` is git-ignored and skipped by
`check-publishable`, so it is a decision aid and never a page.

**Delete a variant the day it ships.** It becomes a second copy of the
shipped page and keeps printing numbers that mean nothing. Do not
rebuild a "before" variant by overriding the shipped CSS; the reconstruction
misreports what it reconstructs.

### 5.2 `build-tile-looks.mjs`

`node tools/build-tile-looks.mjs [page]` reads the diagram's rules out of a built
page, resolves which land on which tile (specificity included), and prints the
look of every tile, so a category drawn two ways shows without a browser.

It compares **token names**, not painted colours: two tokens that paint the
same value in one theme collide on screen and not here. That half is the
specimen's. It refuses rather than guesses: a selector or value outside its
grammar throws.

## 6. The kind vocabulary

`guide-json.md` §7 lists nine kinds: `step`, `gate`, `planned`, `transfer`,
`real`, `terminal`, `read`, `decision`, `outcome`. Its §7.4 lists the five
categories with the derivation above. Read both at the commit in
`data/guides/PIN`, not from memory of this file.

## 7. The specificity trap

**Key a refinement rule on the one category it is about.** Never widen it to
every tile and carve categories back out with `:not()`. Each `:not()` raises
the rule's specificity, so it can silently beat a rule another category
depends on, and no collision count reports a colour that is missing.

Do not fix an ordering problem by adding classes either. Fix it by source order
or a narrower selector.

## 8. The lane rule

A rule runs across the top of every lane, spanning every column, and the stage
headings share it rather than drawing their own underline. Without it, tiles
in different lanes sit the same 8px apart as tiles in one lane, and a reader
cannot tell where a lane ends. Cells and lane labels take the same top padding,
so every tile clears the rule and the label still lines up with the first
tile's title.

**It is an element (`.notes-dg-rule`, `grid-column: 1 / -1`), not an `::after` on
the lane label.** A positioned label (`position: sticky`) becomes the
containing block and the pseudo-element collapses to the label's width.

**A sticky lane name is declined.** On the session map the lane names scroll
out of view at the far right. An opaque label painting over tiles as they pass
under it is a second thing to judge, and the rule already holds the row.

## 9. The legend

The legend is the figure's `<figcaption>`. It names the categories, because
otherwise their names appear only inside a tile's panel.

- **Every swatch is a real tile:** `notes-dg-node`, `notes-dg-legend-tile` and the
  same `notes-dg-cat--*` class the canvas uses. Its border, fill and name style
  come from the canvas rules, so a key cannot say *dashed* while the tiles are
  solid.
- **It lists only the categories the document contains.** A key that teaches a
  look the reader will not meet is clutter.
- **Two glosses:** what a Checkpoint does, and that a filled tile is a screen
  you can open.
- **Off-sequence edges fold.** The reading-order sentence stays visible; the
  list moves into a `<details>` whose summary carries the count. Those edges
  are listed nowhere else on the site.
- **Scope any census to `.notes-dg-grid .notes-dg-node`.** A swatch is also an
  `.notes-dg-node`, with no panel.

## 10. Each column as wide as its own content

`.notes-dg-grid` is `repeat(var(--dg-cols), max-content) 1fr`. With
`minmax(7rem, 1fr)` the widest tile anywhere sets the width of every column;
`max-content` cuts the session map's scroll width from 2612px to 1738px with no
change in height or wrapped names. Fixed caps (12rem, 10rem) keep an even
lattice but wrap names and add height.

**What is given up:** an even lattice, and an empty stage column is only as
wide as its heading. It is still drawn and labelled.

**The trailing `1fr` track** takes the slack so lane rules reach the figure's
right edge. It holds nothing and computes to zero when the figure overflows.
Delete the ` 1fr` to have the rules end with the content instead.

## 11. What 124 tiles does to the canvas

124 synthetic tiles built through `build.mjs` and measured at 1440 fit: at five
stages the figure is 1.1 screens wide, and more stages trade height for width.
**Geometry is not the obstacle.**

**The axis is.** Reference-data screens have no place in a run, so they pile
into whichever cell a stage assignment invents, stacked in no meaningful order.
So:

- **A stage is only honest inside a run.**
- **A cell is a set, not a sequence.** The renderer stacks a cell's tiles in
  emission order.
- **Nothing helps a reader find one tile in many.** No search, filter or zoom.

Not measured: whether a reader can use any such map. The placements were
invented by the test, not authored by atlas.
