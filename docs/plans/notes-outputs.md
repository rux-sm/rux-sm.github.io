---
type: plan
---

# Plan: five outputs — map, walkthrough, concept, experiment, meeting summary

## Goal

Notes is rux's own learning tool, and it publishes five kinds of output built
from atlas's knowledge base, each with one job and no overlap: the **map** of
the whole process, **walkthroughs** that give the steps, **concepts** that
explain why, **experiments** that test understanding, and **meeting
summaries**. Everything else stays private as the working layer: screen files,
issues, walks, ledgers, meeting reviews and evidence. Each walk, experiment and
meeting updates the outputs, and every fact keeps one home.

## Decisions

- All five outputs publish on Notes. The export tier still carries no gaps,
  issue ids or environment detail.
- **Map.** The overview. The session map retires: its own text says it composes
  and owns nothing, and its four "fails with no message" notes are confirmed in
  a walkthrough, line by line, before it goes. A tile links to its walkthrough.
- A **walkthrough** holds the steps and one short "What LN is doing" paragraph
  per phase. A walk is one run of it.
- The long notes under each phase, about 45% of a guide today, move into
  concepts or the screen files that own them, so a walkthrough is quick to scan
  during a run.
- The planning route, `demand-to-shipment-via-planning.md`, stops being its own
  document. It becomes a route on the map that links the walkthroughs in
  order, and anything only it holds moves into the walkthrough that owns it.
- The bamboo test item family, today a reference beside the tests, folds into
  the walkthrough that builds it, `create-basic-test-items-and-defaults.md`.
- **Concept** stays the name and becomes published. Each concept is attested by
  rux before it publishes, which is what closes OI-274.
- An **experiment** is a question, a prediction, one change, what happened, and
  the explanation. Its answer key publishes only once rux has attested it, and
  the result of a run is written into that key with its captures cited.
- **Meeting summary** is titled `Meeting summary · YYYY-MM-DD · Topic` and has
  three parts: what was discussed, the steps shown or agreed, and what was left
  open. Its id and address do not change. The full meeting reviews stop
  publishing and stay in atlas as the source each summary is written from.
- Each walkthrough phase and map tile shows when it was last walked in LN, or
  that it has not been, which is what closes OI-275.
- Walks use the form on the private preview and the after-a-walk checklist in
  atlas's `docs/handoff.md`, both built.

## Questions

None open.

## Tasks

- [ ] Fold the bamboo test item family into the walkthrough that builds it,
      then retire atlas's `tests/` folder and its `test` type, which hold
      nothing else.
- [ ] Move each walkthrough's long phase notes into the concept or screen file
      that owns them, and attest and publish the concepts.
- [ ] Turn the planning route into a map route, moving what only it holds into
      the walkthroughs.
- [ ] Reshape the eight meeting summaries to the standard title and three
      parts, and stop publishing the full reviews.
- [ ] Confirm the session map's four silent-failure notes in a walkthrough,
      then retire the map: delete it in atlas, remove its page and links, and
      drop it from `notes/docs/diagram.md`, `notes/tools/build-tile-looks.mjs`
      and the specimen.
- [ ] Carry each phase's walked date into the export and show it on
      walkthrough phases and map tiles.
- [ ] Publish with `npm run export`, and update `docs/status.md` where an item
      changes.
