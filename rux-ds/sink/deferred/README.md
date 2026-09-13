# Stripped fragments

Markup for the components Phase 3 did not compile — the CUT and DEFER rows of
`docs/inventory.md`. Every one was diffed against Carbon's rendered DOM during
Phase 1 and carries its `PROVENANCE` line, so none of that work is lost.

They live here rather than in `sink/` because `tools/build-sink.mjs` assembles
**everything** it finds in `sink/`, on purpose: "anything not listed in ORDER is
appended alphabetically and reported, so a new fragment can never be silently
invisible." Excluding them by list would have broken that property. Moving them
keeps it, and keeps the gates scoped to what actually ships.

Restoring a component is three lines: uncomment its `@use` in `src/app.scss`,
move its fragment back to `sink/`, and add it to `sink/ORDER`.
