---
type: plan
---

# Plan: the shape of a tile on the path

## Goal

The path's tiles take the shape worked out in the specimen, generated from
atlas's data like every other tile, so the real path shows it with every tile,
every name length and every quest count.

**A tile is one action, for someone who has done it before.** The fewest steps
that reach the result, and nothing else. What explains, teaches or justifies is
one link away.

**A tile ends with a question, and its answers are the next tiles.** No arrow is
drawn by hand; the map is what the questions add up to.

**An unknown fact and an undrawn branch are the same object.** Both are quests,
both sit where the reader stands, and both are answered in place.

What this plan decides is the shape. What a tile *contains* is
`notes-learning-tool.md`, and the decisions below that replace one of its are
named.

## Decisions

### The card

- **One row for the header:** a badge, the tile's name, the caret. Complete is
  the step number in a filled circle in the theme's accent; not done is the same
  number in a dashed ring. No word repeats what the badge says.

- **The route and the session code share one line**, at the same size as the
  steps. The code is monospaced and bracketed so it cannot read as another step
  in the route, and tapping it copies the code alone.

- **Steps are grouped by where the reader is in the record** — header, line,
  back to header — because the same control does different things at each
  level, and returning to the header is the step most often missed.

- **Each step is a checkbox**, with a count beneath the steps, so a tile is
  something worked through rather than read.

- **The full procedure is one quiet link under the steps.** This replaces
  `notes-learning-tool.md`'s open tile, which inlines the phases of the
  walkthrough the tile opens.

- **The answers sit in a band across the foot of the card**, so they are held by
  something rather than floating on it.

### Quests

- **A quest sits at the step that needed it**, not collected at the bottom.

- **A quest is answered in the tile:** what was found, a screenshot, send. It
  carries the kind of work that closes it, as
  `notes-learning-tool.md` already decides.

- **An answer with nowhere to go is drawn as missing** — a dashed, muted box
  that links to the quest that would build that branch.

- **One mark means "something is missing here"**, on every quest and on every
  undrawn answer.

- **A sent answer is not a closed gap.** It takes the interactive colour, never
  the success colour, and says so.

### Where the parts come from

- **Every control the reader touches is Carbon:** buttons, checkboxes, the
  answer box, the uploader, links and labels.

- **The shell is Notes' own**, under the `notes-` prefix: the card, the badge,
  the step grouping, the quest box, the footer band, the overview list. Carbon
  has no component for any of them, and its accordion and tile are not these.

- **The quest mark belongs in Design's icon set**, drawn there rather than
  inlined per page, because a shared icon cannot be recoloured inside.

- **The rules live in `notes/tools/build.mjs`**, which generates the page; the
  specimen's own stylesheet is scaffolding and does not ship.

## Questions

- **`notes-learning-tool.md` puts "Before starting" and "what LN is doing" in
  the open tile, and the new shape has neither.** Do they move behind the full
  procedure link, or does the tile keep them?

- **A collapsed tile no longer carries its quest count**, now that the subtitle
  is gone. The overview list still shows it. Is that enough?

- **The quest mark needs a dark counter that survives every theme**, and no
  token gives one. Does Design gain a token, or does the drawn icon carry the
  colour itself?

## Tasks

- [ ] Answer the three questions above.
- [ ] Draw the quest mark into Design's icon set with its counter colour
      settled, and remove the inlined copy.
- [ ] Move the specimen's rules into `notes/tools/build.mjs` under the tile's
      own class names.
- [ ] Change the tile markup the build tool emits to the shape above, including
      the checkbox steps, the footer band and the quest placement.
- [ ] Point each tile's full-procedure link at the walkthrough phase it opens.
- [ ] Read the whole path at desktop and phone widths: a tile with no steps, a
      tile with several quests, the longest tile and session names, and a
      question whose answers do not fit one line.
- [ ] Correct the decisions in `notes-learning-tool.md` that this plan replaces.
- [ ] Delete `notes/specimen-tile.html` once the path carries the shape.
