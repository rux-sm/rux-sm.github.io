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

When the connector gains a tool, a new chat lists it. A chat already open
keeps the tools it started with.

An account that cannot open the scheduler is refused, because the connector
queries as whoever signed in.

## Ask it things

Plain questions, no particular wording:

- what needs attention, or what is not ready for tomorrow
- what does bus 12 have next week
- who is free to drive on the 3rd
- show me the trips for a customer
- what is on trip 100842
- the current insurance certificate for a school
- when does a driver's background check end

Availability counts a bus busy when it is on a trip or out of service, and a
driver busy when they are on a trip or on time off. A bus back at the yard
before the late-return hour, 4:00 AM unless the Settings page says otherwise,
came back the night before, so that day is free; the answer names it with the
time it is back, since a departure before then cannot be promised.

Claude can read a trip's own files too, the itineraries, POs and contracts
on its Files tab, as text, and check the trip against them and its email
thread: ask it to review a trip. It lists each place the trip differs from
the customer's latest word, with both values, and drafts the fixes as one
link. Only a PDF is read, and a scanned page has no text to read, which
Claude says rather than guess.

A document from the Documents page comes back with a link to its file. The link works for ten
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
with the changes filled in over it, and Reset takes them back out. A change
can set a saved stop's times, its days and what its wait counts as, such as
a hotel night marked off duty; each changed stop carries the blue bar on the
Route tab. A change can also lay a whole route again from a newer
itinerary: its stops replace the leg's, after the editor asks, each on its
own day. And it can fill a purchase order's number, day and amount, or mark
the contract signed with the day and who signed, each marked on the Billing
list; when the PO's amount is not the quoted price, the notice gives both.
One link is one trip, so a fix across several trips is a link for each.

Claude can press Save on such a link too, after you say yes in chat to
that change, as for any Save it makes.

## Keep the Tasks list

Claude can read the office's Tasks list, the one the board's toolbar opens,
and add to it. Ask in plain words:

- what tasks are open
- add a task to call the school about the PO, for Friday
- close the task about the PO, it arrived
- work on task 112

Every task has a number, shown at the end of its tile's first line, that
it keeps for good, so "task 112" always means the same one.

A task Claude adds shows in the list at once, for everyone, made by Ruxbot
with your name kept beside it. It shows what to do in a few words, then its
kind of work, such as New quote, PO or Respond, and who it is about; press
it for the rest, its trip, and Done and Email. Claude can change or close only the rows
Claude added. A row a person typed stays theirs: Claude says when it looks
done and leaves Done to them.

Claude sees the rows people and Claude wrote. What the scheduler works out by
itself, such as a follow-up due or a trip short of a bus, is not a row;
Claude reads those by the rules the board's Departures panel and the Trips
page use, and never adds a row for one.

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
  chosen from its list. A split's pickup days go on the pickup leg, which
  the trip's first save makes, and are named in the notice at the top. Its
  trip contacts, up to five, each go into their day's contacts on a split
  trip; the other day's are saved with the trip and named in the notice.
- It cannot mark a trip paid, assign a bus or a driver, or upload, replace
  or delete a document. A drafted PO or signed contract confirms a trip only
  once Save writes it.
- An unopened draft is deleted after 14 days.

## Saving from Claude Code

Claude Code, working in your own Chrome, can make a change in the trip editor
on the published site and press Save itself, but only after you say yes to
that change. It goes
through the editor rather than the connector, so the save runs the same
checks and history as yours. The save's update, Done marks and History entry
carry your name alone, as if you had made the change by hand.

How it reviews and enters trips, reads the customer's emails, and the office
rules it follows are the `trips` skill in `.claude/skills/trips/`, which it
adds to whenever you give it a new rule.
