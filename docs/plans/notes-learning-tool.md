---
type: plan
---

# Plan: Notes, three ways to one tile

## Goal

One simple tool for learning Infor LN and for getting a task done in it.

**Notes is rebuilt from an empty folder.** It reads what atlas exports and
shows it three ways. It collects nothing and asks nothing of the reader.

**Simple wins.** Where a decision trades simplicity against completeness,
simplicity wins and this plan says what was left out.

**The library stays the source.** Atlas keeps collecting, mining and indexing
LN's documentation. This plan changes atlas only where the tool needs a screen
or a scenario to be complete, and where a new area of LN must be easy to add.

## Decisions

### One object

- **The tile is the only object.** A tile is one screen in LN doing one job:
  its name, its menu route, its session code and its steps.

- **Three ways reach a tile: Do, Understand and Look up.** They are the side
  nav, and nothing else is in it.

- **A scenario is one of atlas's walkthroughs, and its tiles are that
  walkthrough's phases.** Nothing is authored on the site, so there is no second
  list to keep in step.

### Do

- **Do is the front page.** It lists the scenarios by name. Picking one draws
  its tiles as a numbered line, left to right, and as a column on a phone.

- **One tile is open at a time**, in place under the line. It shows the route,
  the session code and the steps as atlas wrote them.

- **Tapping the session code copies it**, because typing it into LN is the
  fastest way to the screen.

- **Two quiet links sit under the steps:** why this step, which is the phase's
  own "what LN is doing" paragraph, and the screen's card in Look up.

- **Nothing is ticked, saved or counted.** The open tile is in the address, so
  a reload or a shared link returns to it.

### Understand

- **Understand is the map of one chain**, drawn from the lanes, stages and
  tiles atlas already exports for the overview.

- **Picking a scenario lights its route and dims the rest.** The route comes
  from the link atlas records between a map tile and the phases it opens, never
  from a list on the site.

- **A lit tile carries its number on the line, and lines are drawn only along
  the lit route**, so the map stays quiet until a scenario is chosen.

- **Every tile has one look.** Lit or dim is the only signal.

- **Tapping a lit tile opens that tile in Do.** Tapping a dim one opens its
  screen card.

### Look up

- **One search box over screens, scenarios and tiles**, matching a name, a
  session code or a word in a step.

- **A screen card has fixed parts:** name and code, route, what it is for, and
  the scenarios that use it. "Used in" is worked out from the scenarios at
  build time.

- **Search runs in the page**, from one index file the build writes, so it
  needs no server.

### What a page never shows

- **No gaps, quests, counts or states.** An open question about LN stays in
  atlas's issue list, where the work on it happens.

- **No form, upload, notepad or review box.** Notes is read-only.

- **Meeting reviews, summaries and experiments are not pages.** They are
  sources a scenario rests on, and they stay in atlas.

### The library

- **Every screen file says what it is for.** The purpose line is what a screen
  card shows, and a screen without one has no card.

- **A new area of LN is one map file and its walkthroughs.** When atlas exports
  a second map, Understand gains a switch between maps and Do groups the
  scenarios by map. Nothing else on the site changes.

- **A walk is recorded in atlas, with atlas's own command.** The walk form
  leaves Notes, so atlas's pull from Notes is removed.

- **Atlas's evidence, screen files, concepts and checks are untouched.**

### Built from Design

- **Every control is Carbon:** the search box, links, the scenario picker and
  the copy button.

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

- **What happens to what the owner's tools saved?** Reviews, answers, tile
  notes and uploaded files sit in eight tables and two private buckets.
  Recommended: pull once more into atlas, then drop them.

## Tasks

- [ ] Build one specimen page from invented content: a scenario line with an
      open tile, the map with a route lit, and a screen card. Read it at
      desktop and phone widths in light and dark.
- [ ] Rewrite `notes/tools/build.mjs` to emit only the three views and the
      search index from `notes/data/atlas/`.
- [ ] Remove `notes/js/experiment.js`, `notes/js/quests.js`,
      `notes/js/tile-owner.js`, `notes/js/tile-walk.js`, `notes/js/online.js`,
      `notes/specimen-tile.html`, and the generated pages the new build does not
      write.
- [ ] Rewrite `notes/docs/diagram.md` for the one-look map, delete
      `notes/docs/owner-tools.md`, and bring Notes' checks down to what the new
      pages need.
- [ ] In atlas, write the purpose line for each screen file that lacks one, from
      its help, and add the check that refuses a screen file without it.
- [ ] In atlas, stop exporting reviews, summaries and experiments, and correct
      `standards/export-json.md` to match.
- [ ] In atlas, link every phase of every walkthrough to a map tile, or say in
      the map which phases sit off it, so a lit route has no hole.
- [ ] In atlas, remove `tools/pull.py` and correct `docs/plans/overview-walks.md`
      and `docs/handoff.md` so a walk is started with `tools/newwalk.py`.
- [ ] Count what the eight tables and two buckets hold, then apply the answer to
      the third question as its own database step.
- [ ] Open every scenario, every lit route and a search for a name, a code and a
      step word on the preview, at desktop and phone widths.
