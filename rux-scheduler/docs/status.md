# Status — where this app stands

**Written 2026-09-11**, when the family adopted one name and one place for
this: `docs/status.md` in every repository that has state to record.

**Almost nothing here is checked by anything, and the two lines that are say
so.** `docs/log.md` is the record and this is the index into it. Where the two
disagree, the log is right and this has rotted.

## What is outstanding

    node tools/open.mjs                 every open item, newest first
    node tools/open.mjs --since 2026-09-11

**Read off `docs/log.md`, never kept beside it.** Every pass records what it
did not do inside the entry for the day it was found, which is the right place
— and the reason nothing collected them: 14 paragraphs over 3,600 lines. The
sweep prints them; this file does not restate them, because a hand-kept copy
beside an append-only log is a second answer that goes stale.

**An item older than the newest pass is a question, not a fact.** A later pass
that finished the work says so in its own entry and never goes back to amend
the earlier one. `--since` is how you narrow to what is certainly current.

## What is still open elsewhere

The hub's `docs/status.md` is the one list, across every app. Since
2026-09-12 a gap in rux-ds or in the schema is fixed there in the same
session; `docs/rux-ds-requests.md` and `docs/schema-requests.md` stay as the
record of what was asked and why.

## What is blocked on a decision, not on work

- **`docs/po-invoice-lists-plan.md` §0.3** — whether rux-ui is taught the PO
  and invoice tables, or the scheduler replaces it first. Phase 1 waits on it,
  `LIST_CAP` stays 1, and `posPatch()` / `invoicesPatch()` stay unwritten until
  it is answered.
- **Step 5 of `rux-backend/docs/identity-plan.md`** — the same question wearing
  different clothes. Dropping the permissive RLS policies breaks rux-ui, so it
  waits on rux-ui being retired rather than retrofitted.

Both are one decision, and it is not this repository's to make.

## What is deliberately not checked

`tools/check.mjs` reads classes, tokens, files, ids and the sprite. It cannot
see spacing, contrast, focus, behaviour, or whether the page looks right —
`docs/gate-coverage.md` is the full account, and serving the app and opening it
is the only answer to any of them.

The database is production and shared with rux-ui. Nothing here writes a test
record; that is why Save has never been pressed.
