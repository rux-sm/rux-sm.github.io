---
type: plan
---

# Plan: review, answer and walk on Notes from anywhere

## Goal

rux works on Notes from any device, signed in: approves a page or requests
changes, fills in experiment answers, and walks a walkthrough with screenshots.
What rux enters is kept privately in the Supabase project, reaches atlas as
files in its `inbox/`, and can be read by Claude in a session.

## Decisions

- **The tools appear only for the owner**, the account with the owner switch
  (`is_owner()`). Anyone else with Notes ticked sees the published pages and
  nothing else. Logging in is the site's log-in page.
- **Every published page shows its review status:** Not reviewed, Approved
  with its date, or Changes requested. Unreviewed content publishes, labelled.
- **A review box at the foot of every page** records Approve, or Request
  changes with feedback. A review never edits a document: a session applies
  it, and a changed document returns to Not reviewed.
- **Experiment answers save to rux's account**, and the browser copy stays for
  anyone who is not the owner.
- **The walk form works online**, with screenshots uploaded from any device.
  Each entry carries its time, so a walk is still written on the day it was
  walked, and the walk pins the atlas commit the published pages were built
  from.
- **The data sits in new tables and a private file bucket**, readable and
  writable only by that staff account. Screenshots and walk results show a
  client's LN environment; rux approved keeping them there on 2026-09-13.
  Each database change is a named migration shown to rux and applied on a
  yes, with its rollback beside it, never by a website deploy.
- **A pull command on the Mac** downloads what is new into atlas's `inbox/` as
  files, screenshots included, and marks it pulled. Atlas refuses a commit
  while the inbox holds anything, so a session processes it first. Claude can
  also read the tables directly through the Supabase connection; files need
  the pull.
- **The walk form on the private preview stays** until the online one
  replaces it.

## Questions

None open.

## Tasks

- [ ] Migration `notes_online_add`: tables for reviews, experiment answers,
      walks and walk steps; access rules for the owner through `is_owner()`;
      a private bucket for screenshots.
- [ ] Carry each document's review status into atlas's export and show it on
      every Notes page.
- [ ] Add the review box to every Notes page, saving to the reviews table.
- [ ] Save experiment answers to the account, keeping the browser copy.
- [ ] Put the walk form on Notes, with screenshot upload to the bucket.
- [ ] Write the pull command into atlas's `inbox/`, and add a review step to
      the after-a-walk checklist in atlas's `docs/handoff.md`.
- [ ] Retire the private-preview walk form and its save service.
