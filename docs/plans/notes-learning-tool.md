---
type: plan
---

# Plan: Notes, three ways into a scenario

## Goal

One simple tool for learning Infor LN and for getting a task done in it.

**Notes is rebuilt from an empty folder.** It reads what atlas exports and
shows it three ways. It collects nothing and asks nothing of the reader.

**The task is the centre.** A reader is doing one task in one scenario; the
screens it uses and the map it sits on are there to explain it.

**Simple wins.** Where a decision trades simplicity against completeness,
simplicity wins and this plan says what was left out.

**The library stays the source.** Atlas keeps collecting, mining and indexing
LN's documentation. This plan changes atlas only where the tool needs a
scenario to be complete, and where a new area of LN must be easy to add.

## Decisions

### Scenario, task and screen

- **A scenario is one of atlas's walkthroughs.** Nothing is authored on the
  site, so there is no second list to keep in step.

- **A scenario holds ordered task tiles, and a tile is one of its phases.** A
  task is one thing to get done, such as releasing an order to the warehouse.

- **A task can use several screens, and two tasks can share one.** A tile names
  the screen it starts on and links every other screen its steps name.

- **Each screen has one reference card**, however many tasks use it.

- **Three ways in: Do, Understand and Look up.** They are the side nav, and
  nothing else is in it.

### Do

- **Do is the front page.** It lists the scenarios by name. Picking one draws
  its tiles as a numbered line, left to right, and as a column on a phone.

- **A scenario opens with what it needs and what it ends in:** atlas's
  prerequisites and objective for that walkthrough, above the line.

- **One tile is open at a time**, in place under the line.

- **An open tile reads top to bottom: the route and session code, one short
  explanation, then the steps.** The explanation is the phase's own "what LN is
  doing" paragraph, cut to its opening sentences with the rest behind a
  show-more.

- **Each step shows what to do and what you should see**, side by side, as
  atlas writes them.

- **Tapping the session code copies it**, because typing it into LN is the
  fastest way to the screen.

- **Nothing is ticked, saved or counted.** The open tile is in the address, so
  a reload or a shared link returns to it.

### Understand

- **Understand is the map of one chain, and it explains; it is not a second
  way to run a scenario.** It is drawn from the lanes, stages and tiles atlas
  exports for the overview.

- **Picking a scenario lights its route and dims the rest.** Atlas states each
  scenario's route in full: the map tiles it passes in order, its decisions
  included, and the task each one stands for.

- **The route is the one link between the map and the tasks.** It replaces the
  map tile's list of phases it opens, so the two can never disagree.

- **A lit tile carries its number on the line, and lines are drawn only along
  the lit route**, so the map stays quiet until a scenario is chosen.

- **Every tile has one look.** Lit or dim is the only signal.

- **What a tap does depends on what the tile is.** A tile that stands for one
  task opens it in Do. A tile that stands for several offers the choice. A
  decision or an outcome shows its short explanation in place. A dim tile with
  a screen opens that screen's card, and a dim tile without one does nothing.

### Look up

- **One search box over screens, scenarios and tasks**, matching a name, a
  session code or a word in a step.

- **A screen card has fixed parts:** name and code, route, what it is for, and
  the tasks that use it. "Used in" is worked out from the scenarios at build
  time.

- **Search runs in the page**, from one index file the build writes, so it
  needs no server.

### What a page never shows

- **No gaps, quests, counts or states.** An open question about LN stays in
  atlas's issue list, where the work on it happens.

- **No form, upload, notepad, quiz or review box.** Notes is read-only.

- **Meeting reviews, summaries and experiments are not pages.** They are
  sources a scenario rests on, and they stay in atlas.

### One scenario first

- **Ship from stock is built through all three views before any other
  scenario**, and the real pages are judged on it. The specimen before it uses
  invented content, because Design holds nothing from atlas.

- **A scenario is ready when every screen its steps name has a card and every
  task is on its route.** The build refuses a scenario that is not, and names
  what is missing. A screen no ready scenario names can wait.

- **The old pages stay until Ship from stock works in the new Notes.** The new
  views are built beside them, and the old pages and scripts go in one step
  after.

### The library

- **A new area of LN is one map file and its walkthroughs.** When atlas exports
  a second map, Understand gains a switch between maps and Do groups the
  scenarios by map. Nothing else on the site changes.

- **A walk is recorded in atlas, with atlas's own command.** The walk form
  leaves Notes, so atlas's pull from Notes is removed once the saved data is
  home.

- **Atlas's evidence, screen files, concepts and checks are untouched.**

### Retiring what the old tools saved

- **Retiring and deleting are two steps.** Reviews, answers, tile notes and
  uploaded files are first brought into atlas and read back from there, record
  by record and file by file. A matching count is not proof.

- **The database is cleaned only after the new Notes is in use**, as its own
  step, on rux's yes.

### Built from Design

- **Every control is Carbon:** the search box, links, the scenario picker, the
  show-more and the copy button.

- **The tile, the line and the map are Notes' own**, under the `notes-` prefix,
  with every colour a `--rux-*` token.

- **The page starts from a Design template**, and the site's log-in and app
  switcher are unchanged.

### Left out, on purpose

- A narrow one-step-at-a-time view to sit beside the LN window.
- Lighting two scenarios at once to compare them.
- Old page addresses. The pages are deleted, not kept as landings.

## Questions

- **Where do field meanings and concepts show?** They come from Infor's own
  help, so they cannot sit in this public repository. Today they show only in
  the private preview on the Mac. The other choice is to hold them in the
  database behind the log-in, so any device sees them, at the cost of a second
  build and of Infor's text living in the database. Recommended: the Mac
  preview first, and decide again once the three views are in use.

- **Does anyone but rux open Notes?** If so, deleted addresses need a landing
  page that points to Do.

## Tasks

- [ ] Build one specimen page from invented content: a scenario's start and
      result, its line with an open tile, the map with a route lit and a
      decision opened, and a screen card. Read it at desktop and phone widths
      in light and dark.
- [ ] In atlas, state Ship from stock's route on the map, with its first and
      last tasks and its decisions, and export it.
- [ ] In atlas, write the purpose line for the one screen Ship from stock names
      that lacks it.
- [ ] Write the new build beside the old one: the three views, the search index
      and the readiness check, from `notes/data/atlas/`.
- [ ] Open Ship from stock on the preview through all three views, at desktop
      and phone widths: every task, every screen link, the lit route, each kind
      of map tile, and a search for a name, a code and a step word.
- [ ] Remove the old pages, `notes/js/experiment.js`, `notes/js/quests.js`,
      `notes/js/tile-owner.js`, `notes/js/tile-walk.js`, `notes/js/online.js`
      and `notes/specimen-tile.html`, and bring Notes' checks down to what the
      new pages need.
- [ ] Rewrite `notes/docs/diagram.md` for the one-look map and delete
      `notes/docs/owner-tools.md`.
- [ ] In atlas, state the route of each other scenario and write the purpose
      line of each screen it names, one scenario at a time, until the build
      accepts all eight.
- [ ] In atlas, replace the map tiles' lists of phases with the routes, and
      correct `standards/export-json.md` to match.
- [ ] In atlas, stop exporting reviews, summaries and experiments.
- [ ] Pull what the eight tables and two buckets hold into atlas, and read each
      record and file back from where it landed against the database.
- [ ] In atlas, remove `tools/pull.py` and correct `docs/plans/overview-walks.md`
      and `docs/handoff.md` so a walk is started with `tools/newwalk.py`.
- [ ] Drop the eight tables and two buckets, as a database step shown to rux.
