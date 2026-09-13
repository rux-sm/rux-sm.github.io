---
type: plan
---

# Plan: one naming system

## Goal

Every app has one word, and every name derives from it: folder, web address,
menu label, page title, file names, code prefix and commit scope. Nothing
carries an owner prefix, because the GitHub account already is one.

## Decisions

- **The apps:** Home, Design, Notes, Scheduler, and Atlas as its own repository.

| App | Address | Menu label | Code prefix | Commit scope |
| :--- | :--- | :--- | :--- | :--- |
| Home | `/` | Home | none | `home` |
| Design | `/design/` | Design | `rux--`, which names the product | `design` |
| Notes | `/notes/` | Notes | `notes-` | `notes` |
| Scheduler | `/scheduler/` | Scheduler | `scheduler-` | `scheduler` |
| Atlas | repository `atlas` | none | none | its own folders |

- **Two repositories.** The site keeps the name `rux-sm.github.io`, because
  GitHub serves that address only from a repository with that name. Atlas is
  renamed `atlas`.
- **Names the computer reads are lowercase,** with hyphens: folders, files,
  addresses and prefixes. A name a tool or a convention fixes stays as it
  expects: `README.md`, `AGENTS.md`, `CLAUDE.md`, `LICENSE`, `NOTICE`,
  `SKILL.md`, `ORDER` and `PIN`.
- **Names people read are sentence case:** Home, Design, Notes, Scheduler.
- **Page titles** put the page first and the app second, as `Page — App`. An
  app's front page is just the app name, and the site's front page is `Home`.
  The design system's full name, Rux Design System, appears in its menu
  description.
- **Files inside an app** use the same names everywhere: `index.html`,
  `app.js`, `data.js`, `app.css`, `theme.css`, `overrides.css`, `brand/`,
  `docs/`, `README.md`. The design system keeps its library layout.
- **Headers show `Rux` and the app name,** as Home already does: Rux Home,
  Rux Design, Rux Notes, Rux Scheduler.
- **The design system's own style sheets keep their names,** such as
  `css/rux-theme.css`, because they are its library layout. Each app's
  theme and overrides files become `theme.css` and `overrides.css`.
- **Names atlas's rules fix stay:** ledgers are named for the capture they
  transcribe and walks for the run they record, and both follow evidence
  names.
- **Scenario guides are found by their `type: guide`,** so atlas's tools no
  longer need the `SG-` prefix; the session map and overview in the same
  folder are references.
- **Stored browser keys stay,** so nobody loses a saved theme or setting.
- **Shared site files stay where they are,** at the top of the site, because
  that is simplest.
- **Notes page addresses** are lowercase with hyphens only, and follow atlas's
  names.
- **Atlas file names drop the type prefix,** because the folder already says
  the type: `guides/ship-from-stock.md`. Evidence files are never renamed.
- **Tool names start with the action:** `check-`, `build-`, `sync-`. Three
  separate sprite tools become one if they do one job.
- **The design system's npm commands** keep only what the root commands cannot
  do.
- **Kept on purpose:** `.js` for browser code and `.mjs` for tools on the Mac;
  atlas's Python helpers with a leading underscore; the `rux--` prefix; the
  `claude-config` name; and the old `rux-ui` app.
- **No redirects** from old addresses. Bookmarks get updated once.
- **Later, not in this plan:** buying a domain, which would allow renaming the
  site repository.
- **Order:** this plan starts after the document standard plan is finished.

## Questions

1. **Review names and their recordings.** A review is named like its
   recording, `order-planning-training_2026-08-20`, and the recording's
   evidence files keep that underscore date forever. Hyphens would make every
   Notes address hyphen-only but break that visible match. Keep the underscore
   dates in review names, or switch to hyphens?

## Tasks

### Atlas

- [ ] Drop the `SG-`, `HOMEWORK-`, `RUN-SHEET-` and `LC-` prefixes from file
      names and ids, teach atlas's tools to find scenario guides by type, and
      fix every reference. If two documents would end up with the same name,
      stop and ask. Run the check and self-test, commit and push.
- [ ] Once question 1 is answered, rename reviews and their summaries to match.
- [ ] Rename the GitHub repository to `atlas`, or hand rux the command if
      GitHub refuses it. Rename the local folder, relink its memory, and update
      the site's default atlas path.
- [ ] Export into the site, commit and push.

### Claude settings

- [ ] Rename `memory/rux-ln-atlas/` to `memory/atlas/` and update the setup
      guide, the instruction map and the workspace file.

### Finish

- [ ] rux deletes the archived GitHub repositories and decides on `trip-board`.
- [ ] Delete this plan.
