---
type: how-to
---

# Working the scheduler from the Claude app

Ask about the schedule in plain words, from the desktop, the web or the phone,
and hand Claude an itinerary to fill a trip in. Claude reads the live
database and writes no trip: a new trip or a change comes back as a link that
opens the trip editor already filled, and pressing Save there is what writes
it.

What the connector is, and every tool it serves, is section 5 of
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
- what is on trip TRP260921-001

Availability counts a bus busy when it is on a trip or out of service, and a
driver busy when they are on a trip or on time off.

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

## What it will not do

- It never writes or changes a trip. Only Save in the editor does.
- A draft can fill only the trip fields the connector lists. Anything else is
  refused, with the list, rather than written.
- It cannot confirm a trip, mark one paid, assign a bus or a driver, or touch
  a document.
- An unopened draft is deleted after 14 days.
