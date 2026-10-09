---
type: plan
---

# Plan: read an itinerary and a PO into the trip

## Goal

An itinerary already on a trip fills the trip's route, and a PO or a signed
contract fills Billing, each as a draft the office checks and saves. A reading
says what the paper leaves open and where it disagrees with the trip. It
saves nothing itself.

## Decisions

- **Claude reads the file through the Claude API, called from a third Edge
  Function, `trip-file-reader`,** source in `scheduler/trip-file-reader/`,
  because the key that pays for a reading cannot sit in a public page.
- **The function runs as the person signed in and refuses anyone not staff,**
  and fetches the file from the `trip-documents` bucket itself, so a reading
  opens only what its caller could.
- **It takes a stored file's id and answers with what it read; it writes
  nothing.** The page lays the answer into the editor as a draft's fields
  are, each marked to check, and the editor's Save stays the only writer of
  a trip.
- **An itinerary answers** the pickup with its meeting and leaving times, the
  places between in order with each one's arrive and leave times, the
  return, the headcount and the day-of contacts, in the shape a draft's
  `stops` take, so the Route tab lays them out as it does a draft's: a saved
  location is set, and any other waits to be chosen from its list.
- **A stop carries its day on a leg of more than one day,** which a draft's
  stops do not yet, because a paper for several days says which day each
  place is.
- **What the paper leaves open comes back as a note, never a guess:** a time
  marked TBD, two endings that hang on a result, a place with no address.
  The note is the notice at the top of the editor, as a draft's is.
- **A PO answers** its number, its date, its amount, and the buses and days
  it names. **A contract answers** whether it is signed, by whom and when,
  which is what marking Contract signed needs.
- **A file is sent to the API only when someone presses its Read,** and rux
  has agreed that a customer's itinerary, PO or contract may be.
- **A reading into a route that has stops asks first, then replaces them,**
  because a newer itinerary is the whole route again; Reset takes it back.
- **A disagreement is said, not fixed.** Where the paper's bus count, days or
  amount differ from the trip's, Billing warns with both figures, and the
  office decides which is right.
- **The reading is offered where the gap is,** and waits for a press: a
  notice on the Route tab while the trip has an itinerary file and no stop
  with a time, a notice on Billing while it has a PO or contract file and a
  purchase order with no number, and each file's own menu on the Files tab,
  for reading a newer file.
- **The reading fills the route on screen.** `scheduler-routes.md` gives a
  leg more than one route; until it does, a paper that describes two groups
  of buses comes back as a note.
- **Only a PDF is read, and only one within the API's limits,** 32 MB and
  600 pages. Every itinerary, PO and contract on a trip today is a PDF. A
  file that cannot be read says why where the offer would be.
- **The model is `claude-opus-5-5`, answering in a fixed shape,** so the page
  never reads prose.
- **The key is a secret of the function that rux sets himself,** and a
  session cannot deploy a function. A session hands rux both commands and
  never types or sees the key.
- **Spend is capped and counted in the Claude Console,** by a spend limit on
  the key's workspace and on its Cost page. The scheduler keeps no count.
- **The examples and tests are invented.** The repository is public, so the
  itineraries and POs kept beside the function are written for the purpose.

## Questions

- Which Claude Console organization takes the plan's API credits? The link
  is rux's to make and cannot be changed without Anthropic's support.

## Tasks

- [ ] Write five invented itineraries and three invented POs, with what each
      should read as: a one-day round trip, several days with a hotel, a
      return past midnight, times left TBD, two endings, and a PO whose
      count and amount differ from its trip's.
- [ ] Write `scheduler/trip-file-reader/index.ts`: the staff check as the
      caller, the file fetched by its `trip_documents` id, one call to the
      Claude API with the PDF and a fixed answer shape for each kind of
      file, and the answer returned.
- [ ] Hand rux the two commands, the key as the function's secret and the
      deploy, then read each invented file through the deployed function
      and compare it with what it should read as.
- [ ] Give a drafted stop its day, so the Route tab lays out a leg of more
      than one day.
- [ ] Offer the reading in the Route tab's notice and on a file's menu, lay
      the answer out marked to check, and put what it left open in the
      editor's notice.
- [ ] Offer the reading in Billing for a PO, fill the purchase order's
      number, date and amount marked to check, and warn where the paper and
      the trip disagree.
- [ ] Offer the reading in Billing for a contract, and turn Contract signed
      on with who signed and when in its note, marked to check.
- [ ] Ask before a reading replaces a route's stops.
- [ ] Say why where a file cannot be read: not a PDF, over the limits, or an
      answer the API declined.
- [ ] Write the reader into `scheduler/docs/database-inventory.md` beside the
      other two functions, and the offers into
      `scheduler/docs/screen-inventory.md` under the Route, Billing and
      Files tabs.
- [ ] Check in Chrome on :8641 on three coming trips that have an itinerary
      and no route times: read, compare each stop and time with the paper,
      and Reset, saving nothing.
