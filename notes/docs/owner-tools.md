---
type: reference
---

# The owner's tools

**What Notes shows the account with the owner switch, and where what it
collects is kept.** Anyone else with Notes ticked sees the published pages and
nothing else. Logging in is the site's own login page.

## The six scripts

| File | What it does |
| :--- | :--- |
| `notes/js/online.js` | Loaded on every page after the site's `account.js`. For the owner it reveals what `build.mjs` wrote hidden — the review box, and the link to walk a procedure |
| `notes/js/experiment.js` | The worksheet: answers typed into the spaces the data marks, boxes ticked, a notepad, a revealable answer key, and an export |
| `notes/js/walk.js` | One run of a procedure, a step at a time, from any device signed in as the owner |
| `notes/js/tile-owner.js` | On the path: each tile's quests, the notepad kept per tile in the account, a tile's screenshots and documents, and Send for review |
| `notes/js/quests.js` | The Quests page: every quest in the owner's quest table, in the path's order, each linking to its tile |
| `notes/js/tile-walk.js` | Walk this, inside an open tile on the path: what happened and screenshots beside each of that tile's steps, saved as a walk of its walkthrough |

## Where what they collect is kept

Eight tables in the database's `platform` schema, readable only by the owner,
and two private buckets. Every table but the quests is writable by the owner too.

| | Holds |
| :--- | :--- |
| `notes_reviews` | A review sent from the foot of a page: the decision, and the feedback with it |
| `notes_answers` | Homework answers, saved to the account. The browser copy stays for anyone who is not the owner, and the newer copy wins when a page opens |
| `notes_walks` | One run: which procedure, when it started, and the atlas commit the pages were built from |
| `notes_walk_steps` | What actually happened at each step, saved as the step is left |
| `notes_walk_shots` | The screenshots taken during a run, one row per shot |
| `notes-walk-shots` | The private bucket those screenshots are uploaded to |
| `notes_quests` | Each path tile's open gaps, replaced by atlas's pull on every run |
| `notes_tile_notes` | A tile's notepad, and when it was sent for review |
| `notes_tile_files` | A tile's screenshots and documents, and when they were sent |
| `notes-tile-files` | The private bucket those files are uploaded to |

A walk pins the commit its pages came from, so a record can always be read back
against the instructions it was made under. It can be continued only on that
same build, because the site keeps no earlier build's steps; a walk from an
earlier build keeps its answers for the pull, and a fresh walk carries on.

## Bringing it home

`tools/pull.py` in atlas writes each walk into `walks/` and everything else into
`inbox/`, then marks it pulled. Atlas refuses a commit while the inbox holds
anything, so a session deals with what arrived before anything else lands.

It runs without a browser, so it reads with the project's secret key kept in the
Mac's Keychain. The key never sits in a file or a repository.
