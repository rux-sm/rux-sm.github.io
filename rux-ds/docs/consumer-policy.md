# The consumer policy

**What every project built on rux-ds agrees to.** Written 2026-09-11, from the
three that already existed — `rux-sm.github.io`, `rux-scheduler` and
`rux-ln-notes` — each of which carried its own phrasing of these rules in its
`AGENTS.md`. Three phrasings of one rule drift; this is the one copy, and a
consumer links it rather than restating it.

**It is the floor, not the whole policy.** A consumer's own `AGENTS.md` stays
the authority on everything this does not name — what that project publishes,
what it must never publish, which components it owns. Where the two disagree
about rux-ds, this wins; about anything else, the project wins.

A new app is a folder named for its URL beside `rux-ds/` in the site repository, an `index.html` started from a template, and one entry in `switcher.json`; it satisfies this by construction.

## 1. Nothing vendors rux-ds

Every page links `/rux-ds/…` on the shared account-root origin. What is live
there is rux-ds's newest release tag, checked in rux-ds's own Pages workflow
before it goes live. **There is no pin and no second command to move one** —
an app is on the live tag or it is not on rux-ds. Roadmap §8.4, decided §8.6,
2026-09-10.

The trade this drops is holding an app back on an older release deliberately.
Roadmap §8.3 alternative (b) — a second, deliberately-updated path — is the
fallback if that is ever needed.

`CHANGES.md` names any class that left between two tags.

## 2. What is yours and what is not

| yours | rux-ds's |
| :--- | :--- |
| the pages, `brand/`, `tools/`, `AGENTS.md` | everything under `/rux-ds/` |
| `rux-theme.css` and `rux-overrides.css` at your root — **deltas only, empty is the normal state** | `css/rux.css` and rux-ds's own pair of the same names, linked before yours |
| components Carbon has no equivalent for, under your own prefix | every `rux--*` class |

## 3. Where a change goes

| the change is | it goes in | never |
| :--- | :--- | :--- |
| a colour, or any value a token names | your `rux-theme.css`, inside a `[data-theme]` block | `:root`; rux-ds's files |
| how a rux-ds component looks beyond its tokens | your `rux-overrides.css`, at Carbon's own specificity | `!important`; a class rux-ds does not compile |
| a component rux-ds does not have | **added to rux-ds, in the same session, with invented content** | a local rule on a `rux--*` class |

**An app's own component is yours and is prefixed.** Carbon has no schedule
grid; the app that needs one owns it — markup in the page, rules in its own
stylesheet, and **every colour, size and space a `--rux-*` token**. A variable
in your own namespace carries a count or a position, never a colour. A
prefixed class is never a way to restyle a Carbon part: that is done in
rux-ds.

**Work in rux-ds is authored with invented, generic content.** rux-ds is
public and generic, with its own consumers. Nothing from a client, a person,
a private repository or a domain goes into a commit, template or issue there —
whatever an app needs is demonstrated on content that was made up.

## 3.1 Where a document goes

**Three files at the root, the same three in every repository.** Adopted
2026-09-11, after one project carried nine root documents and another carried
two with identical totals — only the placement differed.

| | |
| :--- | :--- |
| root | `AGENTS.md` the policy, `CLAUDE.md` importing it, `README.md` the front door — plus what the project publishes |
| `docs/status.md` | where the project stands and what is outstanding. One name, one place, wherever there is state to record |
| `docs/` | working documents: reasoning, designs, records, plans |
| `exchange/` | the record of past cross-repository memos; since 2026-09-12 the work is done in the owning repository in the same session, and nothing new is written there for routine work |

**`README.md` stays at the root because GitHub renders it** — a repository
whose front page is blank is worse than one file out of place.

**There is no `TODO.md`.** It was a fourth kind of root file that only one
project had, and what it held was half task and half record. It is
`docs/status.md` now, renamed rather than folded into `README.md`: the two
change at different rates and mixing reference with state makes both harder
to read.

**Two exceptions, both deliberate.** `rux-ds/CHANGES.md` stays at its root — it
is a published contract with consumers and a changelog belongs where people
look for one. `rux-ln-atlas` keeps its nine, because `START-HERE.md`,
`HANDOFF.md`, `SETUP.md` and `PLAN.md` are entry points for a reader rather
than working documents, and burying them defeats their purpose. A library is
not an app.

## 3.2 Where a toast goes, because rux-ds cannot ship it

**rux-ds compiles the toast CARD and nothing about where it sits.** Checked at
source 2026-09-11: `@carbon/styles`' `_toast-notification.scss` carries no
`position`, no `inset`, no `z-index` and no stacking rule at all, and Carbon's
own captured demo drops the card straight into the page with no wrapper. The
card's width, wrap and shadow are all it ships.

**And rux-ds cannot fix that with a class.** A `rux--*` class comes from
Carbon; `check-classes` fails the build on one Carbon does not compile, so
there is no `rux--toast-region` to be had. By §2 and §3 a region is therefore
**yours, under your own prefix** — the same answer as any component Carbon has
no equivalent for. Asked for by `rux-scheduler` 2026-09-11 and declined on
that ground, not on merit: the gap is real.

**So that every app's is the same, here is the shape.** Carbon's own guidance
(`carbon-website`, notification usage) is specific, and these three facts are
the whole of it:

- toasts sit at the **top right** of the screen,
- they **stack with `--rux-spacing-03`** between them,
- the **newest is on top**, older ones pushed down until dismissed.

**The placement is a default, not a rule, and the first consumer to build one
overrode it with a measurement.** `rux-scheduler` puts its toasts bottom right,
because at 1440x950 Carbon's top-right lands on that board's own toolbar
buttons. A region worth writing makes its corner easy to change; an app with
chrome in that corner should move it and say why.

Everything else is yours: the fixed position, the gutter, the z-index, and a
narrow-width override so an 18rem card does not decide a 375px layout.

## 4. The one check

    node tools/check.mjs

Imports rux-ds's `tools/app-check.mjs` from the checkout beside your
repository (`../rux-ds`, or `DS=<dir>`): classes, tokens, file and id
references. **Locally that is rux-ds on `main`; the Pages workflow checks
rux-ds out at its newest tag** — what is actually live at `/rux-ds/`. A class
added on `main` passes locally and fails in CI until it is tagged. That is the
right failure, and it is why the workflow resolves the tag rather than pinning
one.

It cannot see whether the page looks right. Serve it and open it.

## 5. The two things every app shares

- **The design system, live** — §1.
- **The list of apps**, `switcher.json` in the hub, fetched at runtime by
  `/switcher.js`. Adding a module is one entry there and nothing anywhere
  else. **Nothing but the hub lists apps.**

The header and switcher are therefore identical on every site by construction.
The side nav and the page are each app's own. **No frames** — a module renders
its own shell, and wrapping it would show two.

## 6. Seeing it locally

    node ../rux-ds/tools/serve.mjs --workspace

Port 8640, every checkout laid out as GitHub Pages lays it out: `/` is the
hub, and each path in `switcher.json` is served from the folder of that name
beside it. **This is the only way an absolute `/rux-ds/…` link resolves on a
local machine** — serving one app alone will 404 every stylesheet it has.
