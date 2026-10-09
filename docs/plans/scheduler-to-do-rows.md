---
type: plan
---

# Plan: To do rows that read at a glance

## Goal

A row of the To do list says what kind of work it is, who it is about and
what to do before anyone reads a sentence. A coloured tag names the kind, the
name is in bold, the words are a few, and everything else is a quiet line
under them. Every closed row is the same size, and a press opens it to its
full words and its actions.

## Decisions

- **A stored row has up to four parts:** its kind, who it is about, what to
  do, and its detail. `body` stays what to do, in a few words; `kind`, `who`
  and `detail` are new columns of `to_dos`, each empty on a row that has none.
- **The tag is the row's first line, and the name leads the words in bold,**
  so the kinds line up down the list and can be read without the rest.
- **A closed row is three lines and no more:** the tag, the name and words on
  one line, and one quiet line of the trip, the detail's first line, the due
  day and Email. What does not fit ends in an ellipsis, so every row is the
  same size.
- **A press on a row opens it in place,** to its words in full, every line of
  its detail, and who added it and when. A press on the open row, or on
  another, shuts it. It never opens on hover, because a phone has none.
- **An open row holds its actions:** Done, then Edit, then Delete apart at the
  end in the danger colour, so the one used most is first and the one that
  cannot be taken back is away from it. On a row ticked today, Undo stands
  where Done does.
- **The tick box, the pencil and the face leave the row,** because the open
  row does what the first two did and says what the third showed.
- **The trip and Email are links in a closed row too,** so the email stays
  one press away.
- **A row with no kind carries the tag To do, in Design's outline tag,** so a
  row a person types is the same size as the rest. A kind the panel does not
  know is drawn the same way, as its own word.
- **A person picks a kind from the row's Edit, and need not.** The add box at
  the top stays one field.
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
- **The tags are for reading.** Nothing filters the list by kind.
- **The rows the scheduler works out stay as they are:** a mark, their words,
  and one press that opens the trip.
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
- [ ] Read Design's accordion and expandable tile, and build the row that
      opens from the one that fits; write its rules under `scheduler-to-do__`
      in `scheduler/app.css` only where neither does.
- [ ] Draw a stored row in `scheduler/to-do-list.js` closed in three lines
      and open in full, with Done, Edit and Delete in the open row, and take
      the tick box, the pencil and the face out.
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
      wide: a row of each kind, a typed row under To do, a long row cut with
      an ellipsis, a row opened and shut by press and by keyboard, Done and
      Undo, and an Edit's save read back from `to_dos`.
