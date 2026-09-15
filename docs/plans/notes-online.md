---
type: plan
---

# Plan: review, answer and walk on Notes from anywhere

## Goal

rux works on Notes from any device, signed in: approves a page or requests
changes, fills in experiment answers, and walks a walkthrough with screenshots.
What rux enters is kept privately in the Supabase project, reaches atlas as
files, and can be read by Claude in a session.

## Decisions

- **The tools appear only for the owner**, the account with the owner switch
  (`is_owner()`). Anyone else with Notes ticked sees the published pages and
  nothing else. Logging in is the site's log-in page.
- **Every published page shows its review status:** Not reviewed, Approved
  with its date, or Changes requested. Unreviewed content publishes, labelled.
- **A review box at the foot of every page** records Approve, or Request
  changes with feedback, and says what was last sent and whether atlas has it.
  A review never edits a document: a session applies it, and a changed
  document returns to Not reviewed.
- **Experiment answers save to rux's account**, and the browser copy stays for
  anyone who is not the owner. The newer copy wins when a page opens.
- **The walk page is `notes/pages/walk.html`**, linked from the nav and from
  each walkthrough for the owner. Its steps are the published walkthrough's,
  each answer saves as it is left, screenshots upload from any device, and only
  today's walks are offered to continue, because a walk is written on the day
  it was walked. The walk pins the atlas commit the published pages were built
  from.
- **The data sits in five `platform.notes_*` tables and the private bucket
  `notes-walk-shots`**, readable and writable only by the owner, in the schema
  the site already uses for its own per-account data. Screenshots and walk
  results show a client's LN environment; rux approved keeping them there on
  2026-09-13. Each database change is a named migration shown to rux and
  applied on a yes, with its rollback beside it, never by a website deploy.
- **A pull command on the Mac, atlas's `tools/pull.py`,** writes each walk into
  `walks/` exactly as `newwalk.py` starts one, and screenshots, reviews and
  worksheets into `inbox/`, then marks them pulled. Atlas refuses a commit
  while the inbox holds anything, so a session processes it first. Claude can
  also read the tables directly through the Supabase connection; files need
  the pull.
- **The pull reads with the project's secret key, kept in the Mac's
  Keychain**, because it runs without a browser; the key never sits in a file
  or a repository.
- **The walk form on the private preview stays** until the online one
  replaces it.
- **The work sits on a `notes-online` branch in both repositories** until the
  migration is applied and rux has tried it signed in.

## Questions

- How does a page show its review status beside the Draft or Approved badge it
  already has, and where does atlas record an approval of a review, a summary
  or a map, when only walkthroughs and experiments carry `reviewed:`? Until
  this is answered the owner sees the last review inside the review box.

## Tasks

- [ ] rux reads migration `notes_online_add` and its rollback, a dry run
      inside a transaction that is rolled back shows the owner reading and
      writing and nobody else, and rux says yes to apply it.
- [ ] rux stores the project's secret key in the Keychain for the pull.
- [ ] Signed in, on the Mac and on the phone: send a review, answer an
      experiment on both, walk a few steps with a screenshot, run
      `python3 tools/pull.py`, then merge both `notes-online` branches.
- [ ] Carry each document's review status into atlas's export and show it on
      every Notes page, once the question is answered.
- [ ] Retire the private-preview walk form and its save service.
