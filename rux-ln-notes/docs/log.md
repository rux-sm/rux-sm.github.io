# Log — dated records moved out of the startup files

Started 2026-09-12 under the consolidation plan's stage 1
(`../rux-sm.github.io/docs/platform-consolidation-plan.md`): `AGENTS.md`
keeps what still changes how work is done; the incidents that explained it
are here. Full text of each: `git show 3466126:AGENTS.md`.

**2026-09-12 — four paragraphs left `AGENTS.md`.**

- *The rebuild gate, added 2026-09-09.* Moving the pin to `v0.1.12` committed
  stale pages that only `pages.yml` caught, on push: `build.mjs` inlines
  rux-ds's whole icon sprite into every page, two icons had joined it since
  the last build, and the shared check could not see it, because it only
  verifies that a page's inlined icons exist somewhere in what rux-ds ships.
  Neither `roll-out.sh` nor the sync recipe said to rebuild first. The rebuild
  is inside `check.mjs` so nothing that calls it can skip it.
- *The shared check, wired up 2026-09-09.* None of the seven local gates read
  a token, so `var(--rux-font-mono)` — a name rux-ds never declared — shipped
  in 28 generated pages with every gate green; every use carried a fallback,
  which is why nothing noticed. Found by running rux-ds's implementation from
  a rux-ds clone.
- *Memos.* A memo stayed in the repository that wrote it because an atlas
  reply names the extract it answers from, which `check-publishable` refuses:
  measured 2026-09-11, two of three replies. Four asks moved into atlas before
  2026-09-11 stay there; re-adding a deleted file to a public repository is a
  fresh publication decision. Since 2026-09-12 no memo is written for routine
  work.
- *Root layout, 2026-09-11.* Nine documents sat at the root against
  rux-scheduler's two; `TODO.md` became `docs/status.md`.
