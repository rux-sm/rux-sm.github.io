---
type: reference
---

# The owner's tools

**What Notes shows the account with the owner switch, and where what it
collects is kept.** Anyone else with Notes ticked sees the published pages and
nothing else. Logging in is the site's own login page.

## The three scripts

| File | What it does |
| :--- | :--- |
| `notes/js/online.js` | Loaded on every page after the site's `account.js`. For the owner it reveals what `build.mjs` wrote hidden — the review box, and the link to walk a procedure |
| `notes/js/experiment.js` | The worksheet: answers typed into the spaces the data marks, boxes ticked, a notepad, a revealable answer key, and an export |
| `notes/js/walk.js` | One run of a procedure, a step at a time, from any device signed in as the owner |

## Where what they collect is kept

Five tables in the database's `platform` schema, readable and writable only by
the owner, and one private bucket.

| | Holds |
| :--- | :--- |
| `notes_reviews` | A review sent from the foot of a page: the decision, and the feedback with it |
| `notes_answers` | Homework answers, saved to the account. The browser copy stays for anyone who is not the owner, and the newer copy wins when a page opens |
| `notes_walks` | One run: which procedure, when it started, and the atlas commit the pages were built from |
| `notes_walk_steps` | What actually happened at each step, saved as the step is left |
| `notes_walk_shots` | The screenshots taken during a run, one row per shot |
| `notes-walk-shots` | The private bucket those screenshots are uploaded to |

A walk pins the commit its pages came from, so a record can always be read back
against the instructions it was made under.

## Bringing it home

`tools/pull.py` in atlas writes each walk into `walks/` and everything else into
`inbox/`, then marks it pulled. Atlas refuses a commit while the inbox holds
anything, so a session deals with what arrived before anything else lands.

It runs without a browser, so it reads with the project's secret key kept in the
Mac's Keychain. The key never sits in a file or a repository.
