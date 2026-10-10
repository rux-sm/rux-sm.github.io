---
type: how-to
---

# Working the scheduler from the Claude app

Ask about the schedule in plain words, from the desktop, the web or the phone,
and hand Claude an itinerary to fill a trip in. Claude reads the live
database and writes no trip: a new trip or a change comes back as a link that
opens the trip editor already filled, and pressing Save there is what writes
it.

What the connector is, and every tool it serves, is section 4 of
`database-inventory.md`.

## Connect it, once per person

Each person does this on their own Claude plan, with their own staff account.

1. In the Claude app, **Settings → Connectors → Add**.
2. Name it `Scheduler`, and give it the address
   `https://udnmqhayzhrbltxzzhjw.supabase.co/functions/v1/scheduler-connector`.
3. Press **Connect**. It sends you to the site's own Allow screen, which names
   what is being asked for. Approve it.

An account that cannot open the scheduler is refused, because the connector
queries as whoever signed in.

## Ask it things

Plain questions, no particular wording:

- what does bus 12 have next week
- who is free to drive on the 3rd
- show me the trips for a customer
- what is on trip 100842
- the current insurance certificate for a school
- when does a driver's background check end

Availability counts a bus busy when it is on a trip or out of service, and a
driver busy when they are on a trip or on time off.

A document comes back with a link to its file. The link works for ten
minutes and only for staff; ask again for a fresh one. Claude finds documents
and cannot upload, replace or delete one, which the Documents page does.

## Enter a trip from an itinerary

Attach the itinerary to the Claude app and ask it to enter the trip. Claude
reads the file itself and sends the connector only the details it found, so
the file never reaches the database — attach the real one to the trip
yourself, on the editor's Files tab.

What comes back is a link. Open it and the trip editor opens filled in:

- Every field the draft filled carries a blue bar down its side. That is the
  mark to check, not a sign anything is wrong.
- A notice above them says what Claude could not work out.
- The same notice names anything it filled that the editor has no field for,
  with the value, so it can be typed in rather than lost.
- The pickup and drop-off addresses must be chosen from their lists on the
  Route tab. Typing alone only searches, and an address left unpicked is not
  saved. The notice says which ones are waiting.

Press **Save** and the trip is written. Press **Close** and nothing is. Either
way the draft is spent and the link does not open twice.

A change to an existing trip works the same way: the link opens that trip,
with the changes filled in over it, and Reset takes them back out.

## Keep the Tasks list

Claude can read the office's Tasks list, the one the board's toolbar opens,
and add to it. Ask in plain words:

- what is on the to-do list
- add a to-do to call the school about the PO, for Friday
- close the to-do about the PO, it arrived

A to-do Claude adds shows in the list at once, for everyone, made by Ruxbot
with your name kept beside it. It carries a tag for its kind of work, such
as New quote, PO or Respond, then who it is about and what to do in a few
words; press it for the rest, and for Done, Email and Trip. Claude can change or close only the rows
Claude added. A row a person typed stays theirs: Claude says when it looks
done and leaves Done to them.

Claude sees the rows people and Claude wrote. What the scheduler works out by
itself, such as a follow-up due or a trip short of a bus, is not a row;
Claude reads those from the trip.

Ask Claude Code to review the inbox and it reads the team's email in Missive,
matches each thread to its trip and adds the rows. It reads every open row
again too: one whose work is done is closed, and one whose words are behind,
such as whether a bus is free, is changed. How it does that is the
`inbox-review` skill in `.claude/skills/inbox-review/`.

It reads Missive through Missive's own connector, which each person connects
once: in the Claude app, **Settings → Connectors**, find Missive and press
**Connect**, then approve it in Missive with only the read permissions
ticked. Before that a Missive owner or admin turns the connector on for the
organization, in Missive under **Settings → Organizations → Overview → MCP
server**.

## What it will not do

- It never writes or changes a trip. Only Save in the editor does. The Tasks
  list's rows are the one thing it writes itself.
- A draft can fill only the trip fields the connector lists. Anything else is
  refused, with the list, rather than written. A new trip's draft can carry
  its stops, which the editor lays out on the Route tab marked to check: a
  place that is a saved location is set to it, and any other waits to be
  chosen from its list.
- It cannot confirm a trip, mark one paid, assign a bus or a driver, or touch
  a document.
- An unopened draft is deleted after 14 days.

## Saving from Claude Code

Claude Code, working in your own Chrome, can make a change in the trip editor
and press Save itself, but only after you say yes to that change. It goes
through the editor rather than the connector, so the save runs the same
checks and history as yours.

How it reviews and enters trips, reads the customer's emails, and the office
rules it follows are the `trips` skill in `.claude/skills/trips/`, which it
adds to whenever you give it a new rule.
