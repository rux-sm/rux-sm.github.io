# Personal platform implementation plan

Date: 2026-09-12

Status: executed 2026-09-12. Stage 1 landed on `main` in all six repositories;
stage 2 was assembled on `codex/consolidate` and proven from a fresh clone;
stage 3 cut over the same evening — the hub deployed from `main`, the three
project sites were turned off, every sampled live route matched `main` byte
for byte, the old workflows were disabled; archiving the old repositories is
the one step still to run.
`docs/migration-start.md` is the state before; `docs/status.md` names what is
deliberately left for later.

## Goal and decisions

Make this easy for one person to develop: one task can change every affected
module, one public repository holds the website, and pushing to `main`
automatically checks and publishes it.
Repository boundaries exist for privacy, not internal correspondence.

User clarification, 2026-09-12: nothing needs to be preserved merely because it
already exists. Keep what is needed to work, publish safely, and recover from
the move. Do not migrate obsolete process or maintain compatibility tooling
for abandoned workflows.

User answers, 2026-09-12, now determine the plan:

- All current apps and tools are used and remain ongoing projects, including
  the DS builder and theme creator. The hub remains the homepage.
- The users are rux and possibly one or two coworkers. The old `rux-ui`
  frontend must keep working alongside the new Scheduler.
- Pushing the public repository's `main` publishes automatically after checks.
  There is no separate release command, tag, or publication approval step.
- DS continues evolving through direct component fixes and additions. It
  remains a distinct folder and working tool, without an independent release.
- The main friction is separate sessions and cross-folder permission/memo
  exchanges. Remove that friction first, before moving repositories.
- Import only history and documentation that help current work. Source
  snapshots are sufficient; old repositories may remain for reference.
- Future public apps and browser games normally join as folders in this same
  public repository, using the existing commands and automatic deployment.
- Local pages must load shared CSS and fonts without an internet connection
  after the checkout and required runtime are present. Offline cloud data and
  an installable/offline public website are separate features, not this move.

Primary acceptance scenario: in one session, mine evidence in Atlas, update a
guide or diagram, render it in Notes, and adjust its presentation or a shared
DS component. The agent handles the affected files and preview without asking
another session or writing a memo. When the task includes updating the public
page, it also prepares the safe export and pushes the public change using the
authorization already given. Private-only research does not automatically
export the library. These are steps performed by the agent, not handoffs the
user has to coordinate.

The destination is:

- `rux-sm.github.io`: public apps, design system, and sanitized Notes exports.
- `rux-ln-atlas`: private knowledge, evidence, authoring, and export tools.
- `rux-backend`: private database configuration, migrations, and tests.

Three repositories can be one working project. Keeping the private repositories
where they are avoids an unnecessary second migration. No private files or Git
history enter the public repository. Database application stays separate from
website deployment. Legacy `rux-ui` and its deployment stay outside this move,
but continued compatibility is a requirement, not an invitation to retire it.
Do not change shared schema, auth, or data semantics in a way that breaks it.

Keep the apps' behavior, Carbon dependency and customization approach, public
app URLs, and the assets and reference pages they actually use. Keep the export
contract and provenance that make public Notes content reproducible. Existing
production data and applied migration files are unchanged.

Do not require imported Git histories, old tags, historical memos, obsolete
commands, generated status bookkeeping, or every accidentally served source
file to survive in the new layout. Inventory actual dependencies first and
record intentional omissions briefly. Original repositories can remain where
they are; retaining them requires no new archive system or deletion operation.

Review corrections, 2026-09-12:

- The first version called Backend public, following its local instructions.
  A subsequent GitHub check reported it private. Keep it private and correct
  the misleading instruction during the instruction cleanup.
- The previous revision made original commit preservation the preferred import
  strategy. That exceeded the need identified by review. Use source snapshots,
  check the new candidate directly, and run browser checks on it. Old readings
  must not be relabelled as measurements of the new tree.
- The earlier plan required a separate publication action and an assembled
  `apps/`/`packages/`/`dist/` layout. Automatic publication is now the user's
  explicit choice. The proposed simpler layout below matches the URL paths
  and retains committed generated pages to avoid an unnecessary build rewrite.

## How the work is reviewed

Current repository instructions remain effective until their replacements are
reviewed. Present instruction, gate, fixture, hook, and CI changes together in
coherent diffs for a session that did not author them. Explain any protection
or earlier failure detection that changes. This is a bounded migration review,
not a new per-feature correspondence process.

Keep checks of actual behavior and publication safety. Replace assumptions
about old folders, tags, and release ownership with the new structure. Do not
bypass a failing check or remove its defect coverage to make the move pass.
No new supervisor, verifier harness, baseline system, or caching framework.

## 1. Simplify the working agreement and establish the start

- Read each affected repository's instructions. State that authorized work can
  change all affected folders in one session. Atlas and Notes already adopted
  this agreement; extend it to DS/consumers and Backend/Scheduler.
- Remove routine request/reply requirements and startup exchange scans. Keep
  one concise public operating guide and one public backlog of unfinished work.
  Private work remains recorded privately. Import historical explanations only
  where they explain a constraint that still matters.
- Make the relevant public and private folders available in one working
  project. Verify the primary instructions load and explicitly read sibling
  instructions before edits. A folder boundary is not a reason for a new
  session or another approval of the same task.
- Scope DS's generic, invented-content rule to `rux-ds/` after consolidation.
  Notes exports belong in `rux-ln-notes/`, never in DS examples.
- Record source revisions, dirty work, actual repository visibility, and the
  deployed revisions. Check for consumers outside the public apps being moved.
  A newest tag is not evidence of what is deployed.
- Identify the routes and tools still used, the checks affected by relocation,
  and how to restore the current deployments. Capture representative renders
  and computed values for comparison. Keep temporary material outside public
  source. Measure the existing edit/check/commit loop once for comparison.

Done when ordinary cross-folder work needs no memo or repeated authorization,
and the source revisions, required routes, and rollback starting points are
known. Report failures and resolve them before relying on the affected check.
This step does not move files or change deployments. Demonstrate the primary
Atlas-to-Notes scenario with the existing folders before starting the move.

## 2. Assemble and verify the new public repository locally

Use a `codex/` branch in the hub. Keep it off the deploy-triggering main branch
until the replacement workflow is ready. Existing sites continue serving while
the new layout is prepared.

```text
rux-sm.github.io/
├── AGENTS.md, CLAUDE.md, README.md
├── package.json
├── index.html               hub homepage
├── account/                 account page
├── account.js, switcher.js, switcher.json
├── rux-ds/                  components, builder, theme creator, references
├── rux-scheduler/           Scheduler
├── rux-ln-notes/            renderer, sanitized data, generated pages
├── habit-tracker/          example future app (not created by this migration)
├── puzzle-game/            example future game (not created by this migration)
├── tools/                  shared build, preview, check, export
└── docs/                   concise current guidance and unfinished work
```

### Import and build

Import tracked public app source at recorded commits, including the complete
tracked DS tree so its build inputs, builder, theme creator, and reference
material travel together. Remove obsolete coordination and ledger files in
separate visible changes; do not discard a current tool while importing. Do not copy whole
checkouts, Git metadata, local settings, dependency installations, ignored
output, or credentials. Merge only the public skills/settings still used and
update their paths. Leave Atlas and Backend in place.

Use one root set of commands. Retain the DS dependency versions and lockfile
while moving it; dependency upgrades are separate work. Adapt tools to explicit
module and Atlas paths. Source folders match the public route layout:

| Route | Source |
| --- | --- |
| `/`, `/account/`, shared account and switcher assets | repository root |
| `/rux-scheduler/` | `rux-scheduler/` |
| `/rux-ln-notes/` | `rux-ln-notes/` |
| `/rux-ds/` | DS assets and used reference/tool pages |

Preserve app deep links, fonts, icons, templates, captures, builder, theme
creator, and references. Serve the DS folder's public files; do not introduce
an extra route-selection system. Exclude deployment metadata, dependencies,
and local-only output during artifact packaging as described below.

Keep generated pages and compiled assets tracked initially, along with
sanitized Notes data. The normal build updates them; the agent stages them with
the source change. CI rebuilds and refuses stale committed output. Separate
asset assembly is unnecessary for this URL-shaped layout. Package the checked
public tree for Pages, excluding Git metadata, dependency installations, local
configuration and private/ignored preview output. Never upload an arbitrary
developer working directory. Removing generated files from Git is not part of
this simplification.

### Remove obsolete history dependencies

Run Notes' ancestry check using the candidate DS package and its captured
markup directly. Retire the newest-tag lookup, historical archive extraction,
and second informational run. All included apps and the DS now release together.

Keep the useful executable browser checks and concise instructions for running
them. Propose retiring the persistent browser-reading ledger, portal freshness
stamps, and staleness machinery together, rather than migrating bookkeeping
whose history is being left behind. Show that diff under the current control
rules before applying it. The lost capability is a durable per-page record of
the last sweep; browser checks still run for affected behavior and report what
was exercised in the task. Keep the portal as a component reference. Old
readings remain historical in the old repository, never presented as current.

No imported tag namespaces, rewritten history, or old-object fetch mechanism
is required. Verify setup and checks from a fresh clone of the candidate.

### Keep the publication boundary

- Keep public Notes data committed so a public build does not need Atlas.
  Export only on request, from a reproducible Atlas revision, preserving the
  existing contract and integrity metadata.
- Export prepares checked content; public `git push` triggers deployment. There
  is no separate publish command. A task to update the live Notes page includes
  export/build/check/push without separate permission for each step. Preserve
  source revision requirements; the agent performs needed private commits and
  pushes within that scope, staging only task-related work. A private-only
  commit does not export anything. Keep destination/source validation at the
  operations that use it.
- Install and verify one root pre-commit privacy hook before making import
  commits; nested hooks do not run automatically. Inspect staged contents,
  rather than only the working tree, on every commit. Cover public text across
  the repository, including scripts, JSON, and configuration. Keep Notes-specific
  marker checks scoped to Notes. Define binary asset handling explicitly;
  a text scan does not inspect images or fonts.
- Use fresh source-snapshot commits through that hook, not imports of unchecked
  history. Confirm hook setup on a fresh development clone. This retains early
  privacy inspection without adding a pre-push history-scanning mechanism.
- Check generated public output and required private name inputs locally before
  public push. Missing required inputs refuse publication. Public CI builds
  and checks the sanitized snapshot, clearly reporting private checks it
  cannot run. Private diagnostic matches and name lists stay out of public logs.
- Exercise normal export, forbidden invented content, nested text paths,
  removed documents, stale data, and missing required input. Reuse suitable
  existing fixtures; review fixture changes with the check changes.
- Keep private preview output in Atlas's ignored build area, separately served
  on loopback. It never becomes public build input. Refresh without removing
  the running server's root directory.

The snapshot hash verifies consistent bytes; export and publication checks
establish the properties that the hash cannot prove.

### Make the daily loop small

| Command | Purpose |
| --- | --- |
| `npm run serve` | Serve the public layout with production writes disabled |
| `npm run serve -- --private` | Render and serve Atlas working content privately |
| `npm run build` | Regenerate pages and compiled assets without publishing |
| `npm run check` | Complete public release checks |
| `npm run export` | Prepare checked public Notes content for the current task |

These are four entry points: serve, build, check, export. Publishing is the
normal `git push` to public `main`; the agent
handles build/check/staging as part of the task rather than asking the user to
operate every command.

The root pre-commit hook runs the staged privacy sweep, Notes' existing checks
including rebuild-and-diff, and the hub/Scheduler checks. The full root check
also runs DS verification; CI runs the full check before deployment. Browser
checks exercise changed UI during the task. No scoped check flags, caching, or
new history scanner. Report actual runtime after adaptation rather than
promising the timings reported for the old layout.

Retire duplicate entry points, mandatory commit typography, and browser-ledger
bookkeeping in coherent reviewed diffs. Handle control reporting and instruction
changes in that same migration review; do not create another routine review
workflow. Until replacements are reviewed, existing requirements apply without
bypasses. Keep short decisions useful to current work rather than copying
incident narratives into each startup file.

### Future apps and browser games

The default is a new root folder named for its URL: `habit-tracker/index.html`
is served at `/habit-tracker/`. Add one entry to `switcher.json` for the homepage
and app switcher. Start with an existing DS page/template, share `/rux-ds/`
styles and behavior, and keep app-specific code and assets in the app folder.
Games may render gameplay with canvas or another renderer and use DS for menus
and settings. Do not force game graphics into the component system.

The root check reads `switcher.json`: every entry except `/rux-ds/` is an app
root for the shared check, run against the in-tree DS with the repository root
as the hub; the DS runs its own `verify`. A new app is checked because it is
listed, and it must be listed to appear in the switcher. No folder scan and no
exclusion list: the shared check pointed at the DS's own tree fails in every
class, so the repository root is never walked as one app. Verify this with a
temporary example app during migration. Each new static app uses the same
preview and push-to-main workflow; it does not need a repository, policy file,
or deployment workflow of its own.
Only use a separate repository for a concrete boundary such as private source
or independent collaboration. A future server-backed app may need another
runtime deployment without requiring its source to move to another repository.

### Local offline styling

Reuse `rux-ds/tools/serve.mjs` from the public repository root. Its plain mode
serves the current working directory as the site root. Two changes, both made
in stage 2: it answered a directory with its `index.html` only in workspace
mode, so `/account/` was a 404 in plain mode (the review of 2026-09-12 said
otherwise and was wrong, found by opening the page); and it listened on every
interface, now loopback. Do not create a second server implementation. The
root serve command wraps it.

The layout already satisfies the offline requirement: compiled CSS is
committed, the Plex fonts are files under `rux-ds/assets/fonts/` linked
root-relative, and `rux.css` references nothing external. Supabase, sign-in
and CAPTCHA load from CDNs and are unavailable offline; `account.js` returns
early without them and styling is unaffected. `file://` is not supported, and
the hosted site is not offline-capable; a service worker is outside this plan.

Acceptance: with Wi-Fi off and the local server running, open the hub,
Scheduler shell, Notes page, builder, and theme creator. Confirm CSS and font
requests succeed locally and inspect their styles. Record which online
functionality is unavailable instead of calling the application
offline-capable.

### Verify the candidate

Compare representative renders and computed values, inspect affected pages,
and exercise required browser checks and local references. A passing Node
check alone does not establish visual correctness.

Before browser inspection, prevent production writes from the preview. Shared
`account.js` creates the client Scheduler normally uses; configure that shared
initialization, not just Scheduler's fallback URL. Account loading can create
an anonymous session/profile, and theme changes can update it. Use a disabled
cloud connection or isolated local backend for previews; verify the selected
mode and do not silently fall back to production. This does not require a full
local Supabase installation merely to inspect static pages.

Done when a fresh public clone builds from committed public inputs, required
checks and pages work in the new layout, private preview leaves public tracked
files unchanged, future apps enter the shared check and navigation without
duplicate tooling, and local styles render without external network access.
Measure the commit hook's whole loop; on this tree it is 1.7 s with Notes'
rebuild included, so no scope flag was needed. Report untested behavior and
any changes in protection honestly.

## 3. Switch deployment and retire the old workflow

- Briefly freeze changes in the old public repositories. Compare their current
  revisions and dirty work with the imported revisions; incorporate anything
  missing and check the final candidate. No ongoing synchronization system.
- Prepare one workflow triggered by pushes to public `main`: build, check,
  confirm committed output is current, package the checked public tree, and
  deploy that artifact. Other branches can run checks without deploying.
  No release tag, separate publish command, or manual deployment approval is
  required. Replace remote consumer checkouts with local candidate modules.
  A website deployment never applies database migrations. This supersedes
  DS roadmap section 8.6's tag-release choice at the user's request; shared
  visual regressions remain possible, so keep the affected browser checks.
- Verify the Pages settings and reversible order for transferring `/rux-ds/`,
  `/rux-scheduler/`, and `/rux-ln-notes/` to the root site's output. Disable old
  publishing routes as ownership transfers. Keep `/rux-ui/` untouched. State
  any expected interruption before release; do not promise an atomic switch
  across independent sites.
- Deploy and inspect required live links, assets, switcher, and pages. Block
  production writes during inspection; visual interaction is not inherently
  read-only. Keep the previous deployment revisions/settings available until
  the cutover checks pass. On failure, restore them in the verified order.
- Confirm the old `/rux-ui/` remains reachable and its shared backend contract
  has not changed. Do not retire it or change auth/RLS to favor Scheduler.
  Exercise any write compatibility tests only in an isolated environment;
  unchanged schema/configuration is not a claim that live writes were tested.
- Mark old public repositories superseded. Remove obsolete release scripts,
  sibling-clone assumptions, exchange startup commands, and duplicate active
  instructions from the new workflow. Keep useful user-facing change notes;
  there is no independent DS release process to maintain.
- Point the working project at the public repository plus private Atlas and
  Backend. Verify the everyday commands from the concise README.

Done when one revision serves the included public apps, old workflows cannot
replace it, and an ordinary public UI task needs one task, one public commit,
and one push that publishes automatically. Work involving private content or database source can
use separate commits in the same session. Private knowledge stays unpublished
by default, and no production database writes were made by migration checks.

## Separate follow-up: local database write testing

Establish local Supabase in private Backend when taking on write-flow testing.
Verify container/runtime prerequisites, use invented seed data, and configure
the shared account client and Scheduler consistently for that environment.
Exercise create, edit, assignment, and payment flows there. Record untested
flows until exercised. This work does not delay the static website move and
does not authorize changes to production schema or legacy-app compatibility.

## Verification and execution notes

Earlier review inspected local instructions, source, hooks, and workflows.
A subsequent review queried GitHub for Backend visibility and legacy `rux-ui`
Pages ownership. Other remote settings still need verification. An isolated
mock executed shared account initialization and Scheduler client selection:
the shared production-configured client won over local fallback constants, and
a theme change attempted a profile update. That mock made no network requests.

No builds, timing measurements, live browser checks, database queries, or Pages
cutover rehearsal have run for this plan. Report changed files, exercised
behavior, and remaining limitations briefly at each of the three stages.
Keep source movement, control changes, and deployment changes distinguishable
in review. This revision edits only the plan: no files have been migrated,
controls changed, repositories deleted, commits made, or sites published.
