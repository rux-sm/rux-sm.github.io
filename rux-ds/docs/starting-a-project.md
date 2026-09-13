# Starting a project

**Since 2026-09-12 there is no script.** Every app lives in the one site
repository, `rux-sm.github.io`, beside this folder, and a new one is three
things:

1. A folder named for its URL — `habit-tracker/` is served at `/habit-tracker/`.
2. An `index.html` in it, started from a page in `templates/` or downloaded
   from `builder.html`; its links already point at `/rux-ds/`.
3. One entry in the repository's `switcher.json`.

`npm run check` at the root reads that list and checks the new app with the
same shared check as every other; `npm run serve` serves it at its path; a
push to `main` publishes it. No repository, policy file, hooks or workflow of
its own.

The scaffold this document used to describe, `tools/new-project.sh` with
`tools/app-skeleton/`, created a repository per app with a vendored copy of
this design system and later a live link to it. It left with the
consolidation; `docs/log.md`, 2026-09-12, has the record, and the archived
rux-ds repository at `fdab509` has the script.
