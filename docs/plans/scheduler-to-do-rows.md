---
type: plan
---

# Plan: To do rows that read at a glance

## Goal

A row of the To do list says what kind of work it is, who it is about and
what to do before anyone reads a sentence. A coloured tag names the kind, the
name is in bold, the words are a few, and everything else is a quiet line
under them.

## Decisions

- **A stored row has up to four parts:** its kind, who it is about, what to
  do, and its detail. `body` stays what to do, in a few words; `kind`, `who`
  and `detail` are new columns of `to_dos`, each empty on a row that has none.
- **The tag is the row's first line, and the name leads the words in bold,**
  so the kinds line up down the list and can be read without the rest.
- **The quiet line keeps the trip, the due day and Email,** with the detail's
  first line among them; each further line of detail is a quiet line of its
  own.
- **A row with no kind, name or detail is drawn as it is now,** so a row a
  person types stays one quick line.
- **A person picks a tag from the row's pencil, and need not.** The add box
  at the top stays one field.
- **Seven kinds, each one of Design's tag colours:**

  | Kind | Tag | Colour | For |
  | :--- | :--- | :--- | :--- |
  | `quote` | New quote | blue | a quote to send |
  | `itinerary` | Itinerary | purple | trips to enter or check from one |
  | `po` | PO | green | a PO or a signed contract to record |
  | `change` | Change | magenta | a booked trip or its quote to change |
  | `respond` | Respond | teal | a question to answer |
  | `form` | Form | cyan | a customer's form to fill in |
  | `invoice` | Invoice | gray | an invoice to send |

- **The kinds' words and colours live in `scheduler/to-do-list.js`.** The
  connector repeats the seven names, because it cannot load a browser file,
  and the database keeps a kind as plain text, so a new kind needs no change
  there.
- **A kind the panel does not know is drawn as its own word in gray,** so a
  row is never hidden by a name the page has not learned.
- **The tags are for reading.** Nothing filters the list by kind.
- **An agent's row is written in the four parts:** the person, or the company
  when no person is named; the group and the place in a few words; the days
  and any count on the detail's first line; one line of whatever else the
  office needs before it opens the email.
- **The open rows written as one sentence are rewritten once,** so the list
  reads one way from the day this ships.
- **A session cannot deploy the connector.** It hands rux the command, run
  from a scratch folder holding a copy of `scheduler/connector/index.ts`.

## Questions

None open.

## Tasks

- [ ] Try the three new columns on PGlite, nullable text with a length limit
      each, then show rux the SQL for `to_dos`.
- [ ] Read `to_dos_record_history`, and carry `who` into the line a tick
      writes to a trip's history.
- [ ] Draw a stored row in `scheduler/to-do-list.js` as tag, name and words,
      then its quiet lines, with the rules it needs in `scheduler/app.css`.
- [ ] Add Kind, Who and Detail to the row's edit form.
- [ ] Give `add_to_do`, `change_to_do` and `list_to_dos` the three fields in
      `scheduler/connector/index.ts`, each description saying what the field
      holds, and hand rux the deploy command.
- [ ] Rewrite how a row is written in the `inbox-review` skill, and the To do
      list in `scheduler/docs/screen-inventory.md`,
      `scheduler/docs/database-inventory.md` and
      `scheduler/docs/working-from-claude.md`.
- [ ] Rewrite each open agent row into the four parts with `change_to_do`.
- [ ] Check in Chrome on :8641, on a dark theme and a light one and at 402
      wide: a row of each kind, a typed row with no tag, a ticked row, and an
      edit form's save read back from `to_dos`.
