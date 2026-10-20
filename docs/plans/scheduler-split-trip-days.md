---
type: plan
---

# Plan: Each day of a split trip its own itinerary and contacts

## Goal

A split trip whose customer sends a paper and contacts for each day hands
each day's drivers that day's file and that day's people, on the card, the
envelope and the driver's itinerary sheet, while the trip keeps one quote,
one contract and one invoice. The office enters a day's own things by
switching the trip to that day. A trip whose papers and contacts cover both
days is entered once and works as it does now.

## Decisions

### Order

- **This plan is built first,** as `scheduler-fixes.md`'s Order decision
  says.
- **The drivers' side ships first:** the columns, then every reader, then
  the editor's switch, so a trip's legs can be set before the switch exists
  and each day's drivers are handed their own papers.
- **A driver is sent the scheduler's own link,** because one whose old link
  opens rux-ui's `driver.html` is handed the trip's newest file whatever the
  day, until `rux-ui-retirement.md` redirects it.
- **`scheduler-trip-shapes.md` builds on it.** A file and a contact name a leg,
  never a route, so every route of a leg is handed the leg's; a route's own
  sheet is the itinerary `print.js` draws.

### The day switch

- **A split trip's editor has a Drop-off and Pickup switch above its tabs,**
  Carbon's content switcher, opening on the leg of the bar pressed.
- **Everything that is one leg's follows it:** the Route tab, the Buses
  tab's vehicles, the Details tab's trip contacts, and which leg an itinerary
  is added for. A trip not saved as a split yet lists both legs' vehicles. The customer, the booking contact, Billing and the updates
  are the trip's and look the same under both.
- **The dates stay together on the Details tab,** because they make the two
  legs and a new split trip needs both before its first save.
- **Switching with unsaved changes asks Save changes first, as opening the
  other leg's bar does,** because the editor holds one leg's route at a time.
- **On a split trip not saved yet, Pickup is disabled,** because the pickup
  leg is made from the drop-off leg's places on the first save.
- **The route switcher `scheduler-trip-shapes.md` adds sits inside the Route tab,
  under this one,** so a leg is chosen first and a route within it.

### What stays the trip's

- **Billing stays the trip's.** Each day's Bus rental line already carries
  its leg, and the contract, the PO, the payments and the invoice are one per
  trip.
- **Itinerary not needed stays one mark for the trip,** since a customer who
  sends no paper sends none for either day.

### How a leg is kept

- **A file and a trip contact carry the leg they were entered under:** a
  nullable `leg` on `trip_documents`, and `trip_contact_1_leg` to
  `trip_contact_5_leg` on `trips`, each `outbound` or `return`. One with
  none, which is every one saved before this and every row rux-ui writes,
  reads as the drop-off's.
- **The pickup takes the drop-off's until it has its own,** so a customer's
  one paper and one set of contacts for the whole trip are entered once, on
  Drop-off, and every split trip there is now reads as it does today. The
  office moves the coming trips' files and contacts once the switch is
  built.
- **Only a split trip reads a leg.** Only a drop-off and pickup has a return
  leg of its own, so on any other trip every file and contact is the trip's
  whatever its leg says, and changing a trip's type loses nothing.
- **One small rule file, `scheduler/leg-papers.js`, picks what a leg is
  handed,** with its sample cases in `scheduler/tools/check-leg-papers.mjs`,
  because the itinerary rule is written out in seven files and the contact
  rule in four, and the driver card reads two of the five contact slots where
  the envelope reads all five.

### The itinerary

- **A leg is handed its own newest Itinerary,** and the pickup, with none of
  its own, the drop-off's newest.
- **Every reader of a leg's itinerary takes it by that rule:** the bar's Open
  itinerary, the Departures line, the driver card, the driver text, the
  staff's driver view and the Forms page's itinerary tick.
- **Prep, the checklist and the follow-up reminder read each leg by the same
  rule,** so a drop-off whose only file is the pickup's says Itinerary
  missing.
- **Accept's kept view follows the rule,** so a driver who accepted while
  handed the other day's file is asked again with New itinerary, because
  their paper changed.

### The Files tab

- **The list stays the trip's,** every file of both legs, since a contract
  or a PO is the trip's.
- **An itinerary added is for the leg on screen,** and on a split trip the
  What is this file? dialog says which under Itinerary, so no file goes
  under the wrong day unseen. The bar's Upload itinerary is for the bar's
  leg.
- **Each Itinerary tile on a split trip names its leg,** and its menu has
  Move to pickup or Move to drop-off beside Replace and Delete, which writes
  at once with a history entry, as Replace does. Replace keeps the leg.
- **Earlier versions fold under each leg's newest,** so a split trip with a
  file for each day shows two current itineraries.

### The contacts

- **Each day has its own set of contacts.** The Details tab's trip contacts
  are the leg on screen's, titled Drop-off contacts or Pickup contacts on a
  split trip; one added on the pickup is saved as the pickup's, and any other
  with no leg, the drop-off's. Both legs share the five slots.
- **Pickup with none of its own shows the drop-off's under Same as
  drop-off,** to read and not to edit, with Add pickup contact to start its
  own; removing the last of its own goes back to the drop-off's.
- **A leg's contacts are its own, in slot order, and the pickup's with none
  are the drop-off's.** The booking contact stands in only where a leg has
  none, as now.
- **The driver card lists every contact of the leg,** the first under
  Contact and the rest under Backup, each with Call and Text.
- **The envelope and the driver's itinerary sheet print the leg's first
  two,** as Contact and Backup, because the envelope's table has room for
  one more row and not four.
- **The leg moves with its contact** wherever the editor packs the slots,
  and a contact picked from the list takes the leg on screen.
- **The bar's Contact list, the card's Trip contact missing and Prep's
  Contact line read the bar's leg,** so a pickup with nobody of its own or
  the drop-off's says so.
- **A contact's change still updates the driver card without asking,**
  because Accept keeps no contact.

### The connector

- **`get_trip` answers each contact slot's and each document's leg, and
  `read_trip_document` the file's,** null reading as the drop-off's.
- **A draft carries all five contact slots, each with its leg,** where it
  carries two with none, so a reading of each day's papers fills both days.
- **A draft cannot set a file's leg,** because a file is written at once and
  never by Save; Claude says which day a file is for, and the office moves
  it on the Files tab.

### The database

- **The columns and the change to `get_driver_share_trips` are one named
  migration,** shown to rux and applied on a yes before any code that reads
  them is pushed, because a page that asks for a column the table lacks
  fails its read.

## Questions

None open.

## Tasks

- [ ] Give a draft all five contact slots, each with its leg, in
      `scheduler/draft-fields.js` and `scheduler/tools/check-draft-fields.mjs`,
      laid onto the editor's slots whichever leg the link opens, and rebuild
      the connector's rules with `scheduler/tools/build-connector-rules.mjs`.
- [ ] Hand rux the connector's deploy, which carries the legs `get_trip` and
      `read_trip_document` answer and the rebuilt rules, then call `get_trip`
      on a split trip and read each document's and contact's leg back.
