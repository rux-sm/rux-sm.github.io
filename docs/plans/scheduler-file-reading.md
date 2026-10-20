---
type: plan
---

# Plan: read the customer's papers and thread into the trip

## Goal

Claude in the chat reads a trip's itinerary, PO or contract and drafts what
it finds into the trip: its whole route, its purchase order and its signed
contract, each marked to check, and the office saves. For the rare person
with no Claude, the trip editor gets a Read button that does the same from
the Files tab. Either way a reading says what the paper leaves open and where
it disagrees with the trip, and saves nothing itself.

## Decisions

### The draft fills what a reading finds

These are the draft's own, so the chat and the Read button both use them.

- **A change can carry `stops`,** and they replace the opened leg's stops
  between the pickup and the drop-off, because a newer itinerary is the
  whole route again. The editor asks before it replaces stops the leg
  already has, and Reset takes them back.
- **A drafted stop carries its day,** `date` and `leave_date` as
  YYYY-MM-DD, because a paper for several days says which day each place is.
- **A draft can carry `purchase_order`,** `{ ref, date, amount }`, laid onto
  the Billing list marked to check: a purchase order with the same number is
  filled, else the one with no number, else one is added.
- **A draft can carry `contract`,** `{ signed_on, signed_by }`, which becomes
  the Billing list's Contract signed row, with who signed as its note, marked
  to check.
- **A PO amount that differs from the quoted price is said in the notice,**
  with both figures, and the office decides which is right.
- **Money stays the office's to save:** a draft fills the dialog's fields a
  person would, and nothing is written until Save.

### The editor's Read button

- **It is for the rare person with no Claude,** so the chat stays the usual
  way, on each person's own plan with no API cost.
- **Claude reads the file through the Claude API, called from a third Edge
  Function, `trip-file-reader`,** source in `scheduler/trip-file-reader/`,
  because the key that pays for a reading cannot sit in a public page.
- **The function runs as the person signed in and refuses anyone not staff,**
  and fetches the file from the `trip-documents` bucket itself, so a reading
  opens only what its caller could.
- **It takes a stored file's id and answers with what it read, in a
  draft's fields; it writes nothing.** The page lays the answer in as it
  lays a draft, so everything above applies, and the editor's Save stays the
  only writer of a trip.
- **An itinerary answers** the pickup with its meeting and leaving times, the
  places between in order with each one's arrive and leave times, the
  return, the headcount and the day-of contacts, in the shape a draft's
  `stops` take, so the Route tab lays them out as it does a draft's: a saved
  location is set, and any other waits to be chosen from its list.
- **What the paper leaves open comes back as a note, never a guess:** a time
  marked TBD, two endings that hang on a result, a place with no address.
  The note is the notice at the top of the editor, as a draft's is.
- **A PO answers** its number, its date, its amount, and the buses and days
  it names. **A contract answers** whether it is signed, by whom and when,
  which is what the Billing list's Contract signed row holds.
- **A file is sent to the API only when someone presses its Read,** and rux
  has agreed that a customer's itinerary, PO or contract may be.
- **The reading is offered where the gap is,** and waits for a press: a
  notice on the Route tab while the trip has an itinerary file and no stop
  with a time, a notice on Billing while it has a PO or contract file and a
  purchase order with no number, and each file's own menu on the Files tab,
  for reading a newer file.
- **The reading fills the route on screen.** `scheduler-trip-shapes.md` gives a
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

### The editor's Read button

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
- [ ] Offer the reading in the Route tab's notice and on a file's menu, lay
      the answer out marked to check, and put what it left open in the
      editor's notice.
- [ ] Offer the reading in Billing for a PO or a contract file.
- [ ] Say why where a file cannot be read: not a PDF, over the limits, or an
      answer the API declined.
- [ ] Write the reader into `scheduler/docs/database-inventory.md` beside the
      other two functions, and the offers into
      `scheduler/docs/screen-inventory.md` under the Route, Billing and
      Files tabs.
- [ ] Check in Chrome on :8641 on three coming trips that have an itinerary
      and no route times: read, compare each stop and time with the paper,
      and Reset, saving nothing.
