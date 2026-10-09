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
  one line, and one quiet line of the trip, the detail's first line and the
  due day. What does not fit ends in an ellipsis, so every row is the same
  size.
- **A press on a row opens it in place,** to its words in full, every line of
  its detail, and who added it and when. A press on the open row, or on
  another, shuts it. It never opens on hover, because a phone has none.
- **An open row holds one row of buttons:** Done, Email and Trip in words,
  then a menu at its end with Edit and Delete, Delete in the danger colour,
  because five buttons in words are wider than the row on most themes. On a
  row ticked today, Undo stands where Done does.
- **Email opens the row's thread in a new tab, and Trip opens its trip on the
  board,** as the row's two links do now.
- **A button a row cannot use is disabled, not left out,** so every open row
  has the same buttons in the same places.
- **The tick box, the pencil and the face leave the row,** because the open
  row does what the first two did and says what the third showed.
- **A closed row has no link in it,** so the whole row is one press and the
  trip's name on its quiet line is words.
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

- [ ] Deploy the connector from the command a session hands rux, then read
      a row's kind, who and detail back through `list_to_dos`.
- [ ] Rewrite each open agent row into the four parts.
