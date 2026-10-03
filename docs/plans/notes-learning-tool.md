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

- **An idea that cuts across screens has one concept card**, such as available
  to promise. It shows a short explanation atlas writes in its own words; the
  fuller account drawn from Infor's help follows the answer to the question
  below.

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

### Questions on a tile

- **A scenario is the simplest way through, and every other possibility hangs
  off the tile where it turns.** The line shows one path; the questions on its
  tiles reach all the rest.

- **Every question that can come up is asked on the tile where it comes up.**
  There are five kinds, and atlas holds each today in a different shape:

  | Kind | Example | Where atlas holds it |
  | :--- | :--- | :--- |
  | A decision | Does on-hand cover it? | the map's decisions and branches |
  | Something went wrong | The status is stuck on Free | a walkthrough's troubleshooting rows |
  | A different case | Shipping less than ordered | a walkthrough's variants, and the side tasks under a step |
  | A setting | Is the date inside the order horizon? | the configuration and screen files |
  | What next | The order is shipped, now what? | a walkthrough's next-walkthrough rows |

- **A question offers every answer the reader could have.** Each outcome opens
  where it leads: the next tile, a tile on another branch, another scenario, or
  the fix. "I don't know" opens the screen where the answer is read and returns
  to the same question. Where a setting decides the outcome, "Check or change
  it" opens the screen that holds the setting.

- **Questions stay closed until wanted.** An open tile lists them by name under
  its steps, and one opens at a time, so a tile with many stays short.

- **An answer that leads somewhere atlas has not written says so plainly**, and
  offers nothing to do about it.

- **Atlas states every question one way:** the task it comes up in, the
  question, its answers, and where each answer leads. The five shapes above
  are rewritten into it, so a question is found in one place.

- **An answer moves the reader and saves nothing.** The chosen branch is in the
  address, like the open tile.

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
  decision shows its question and answers in place, and an outcome its short
  explanation. A dim tile with
  a screen opens that screen's card, and a dim tile without one does nothing.

### Look up

- **One search box over screens, concepts, scenarios and tasks**, matching a
  name, a session code or a word in a step.

- **A screen card has fixed parts:** name and code, route, what it is for, and
  the tasks that use it. "Used in" is worked out from the scenarios at build
  time.

### What a page never shows

- **No gaps, quests, counts or states.** An open question about LN stays in
  atlas's issue list, where the work on it happens.

- **No form, upload, notepad, quiz or review box.** Notes is read-only.

- **Meeting reviews, summaries and experiments are not pages.** They are
  sources a scenario rests on, and they stay in atlas.

### The map

- **`notes/specimen-map.html` draws atlas's export as it stands:** what leads to
  what, the branches, the setup, and what the export does not yet say.

- **Four things are written into atlas for a scenario before it is built:** its
  route, the setup it needs, the setting that decides each of its branches, and
  every question on the tile where it comes up. A setting nobody can name yet is recorded as unknown, not left out.

- **A decision is recorded in three parts:** the setting that switches it on,
  the tile where the check runs, and the screen where its figure is read.
  Available to promise is the first written this way: switched on in the
  planning setup, checked when the sales order is entered, and read on the
  item's order plan.

- **A branch nobody has walked stays marked on the map.** Its steps come from a
  run in LN, which atlas's walking plan owns, and it does not hold the build
  back.

### Version one, then constant change

- **Version one is Ship from stock through the three views, with its
  questions, built on the map as atlas holds it.** The map is corrected as it
  is used, not before.

- **Everything on a page is generated from atlas.** No tile is placed, no line
  drawn and no link written by hand on the site, so a correction is made once
  in atlas and the next export redraws every page it touches.

- **An error found in use becomes a row in atlas's issue list**, added in a
  session. Notes has no form for it.

- **The build says what it could not place:** a question with no tile, an
  answer that leads nowhere, a route with a hole. It lists them and still
  builds, because a page with a known hole is more use than no page.

- **rux is the only reader.** A later reader is an account with Notes ticked on
  the site's Access page, and Notes itself does not change.

### One scenario first

- **Ship from stock is built through all three views before any other
  scenario**, and the real pages are judged on it. The specimen before it uses
  invented content, because Design holds nothing from atlas.

- **A scenario is ready when every screen its steps name has a card and every
  task is on its route.** The build lists a scenario that is not ready, with
  what is missing, and leaves it out of Do. A screen no ready scenario names
  can wait.

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
  show-more and the copy button. **The tile, the line and the map are Notes'
  own**, under the `notes-` prefix, with every colour a `--rux-*` token.

- **The page starts from a Design template**, and the site's log-in and app
  switcher are unchanged.

### Left out, on purpose

A one-step-at-a-time view beside the LN window; lighting two scenarios to
compare them; and landings for old page addresses, which are deleted.

## Questions

- **Where do field meanings and concepts show?** They come from Infor's own
  help, so they cannot sit in this public repository. Version one shows only
  what atlas exports and does not wait for this. The choices to compare: the
  private preview on the Mac, as today; the database behind the log-in, so any
  device and any later reader sees them; or atlas rewriting each meaning in its
  own words so it can publish.

## Tasks

- [ ] Build one specimen page from invented content: a scenario's start and
      result, its line with an open tile, a question with each kind of answer,
      the map with a route lit and a decision opened, a screen card and a
      concept card. Read it at desktop and phone widths
      in light and dark.
- [ ] In atlas, record the setting that decides each of the seven branches,
      from the configuration files and the screen files, or record it as
      unknown.
- [ ] In atlas, give each decision on the map its question, its answers, the
      screen where the answer is read and the screen where its setting is
      changed.
- [ ] In atlas, set the one shape for a question in `standards/`, with its
      check, and rewrite Ship from stock's troubleshooting rows, variants,
      conditional steps and next-walkthrough rows into it, each on its task.
- [ ] Add to `notes/specimen-map.html` every question the export holds, listed
      under the tile it comes up on, and the ones that have no tile yet.
- [ ] In atlas, write available to promise and capable to promise as a concept
      of their own, moved out of the item order plan's screen file, and name
      it on the map's stock-promise tile in the three parts above.
- [ ] In atlas, export each concept's short explanation, and show it as a card
      in Look up.
- [ ] In atlas, state Ship from stock's route on the map, with its first and
      last tasks, its decisions and the setup it needs, and export it.
- [ ] In atlas, write the purpose line for the one screen Ship from stock names
      that lacks it.
- [ ] Write the new build beside the old one: the three views, the search index
      and the readiness check, from `notes/data/atlas/`.
- [ ] Open Ship from stock on the preview through all three views, at desktop
      and phone widths: every task, every screen link, the lit route, each kind
      of map tile, and a search for a name, a code and a step word.
- [ ] Remove the old pages, `notes/js/experiment.js`, `notes/js/quests.js`,
      `notes/js/tile-owner.js`, `notes/js/tile-walk.js`, `notes/js/online.js`,
      `notes/specimen-tile.html` and `notes/specimen-map.html`, and bring Notes' checks down to what the
      new pages need.
- [ ] Rewrite `notes/docs/diagram.md` for the one-look map and delete
      `notes/docs/owner-tools.md`.
- [ ] In atlas, state the route and the setup of each other scenario, rewrite
      its questions into the one shape, and write the purpose line of each
      screen it names, one scenario at a time, until the build accepts all
      eight.
- [ ] In atlas, replace the map tiles' lists of phases with the routes, and
      correct `standards/export-json.md` to match.
- [ ] In atlas, stop exporting reviews, summaries and experiments.
- [ ] Lay out the three choices for field meanings and concepts on one page,
      each with a working sample, what it costs to keep, and what leaves the
      Mac.
- [ ] Pull what the eight tables and two buckets hold into atlas, and read each
      record and file back from where it landed against the database.
- [ ] In atlas, remove `tools/pull.py` and correct `docs/plans/overview-walks.md`
      and `docs/handoff.md` so a walk is started with `tools/newwalk.py`.
- [ ] Drop the eight tables and two buckets, as a database step shown to rux.
