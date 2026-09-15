---
type: plan
---

# Plan: a trip's attached itinerary, visible

## Goal

A trip's attached itinerary is seen without hunting for it, and read inside the
scheduler beside the trip it belongs to. Today the scheduler only knows one
exists behind the selected bar's Open itinerary slot and its right-click menu,
which open it in a new tab; the bars say nothing, and the trip editor, with its
Details, Billing, Fleet and Route tabs, never mentions the trip's documents.
rux-ui still uploads them, into `trip_documents` and the public
`trip-documents` bucket.

## Decisions

- **The itinerary is the trip's newest document labelled Itinerary,** as
  `latestItinerary` in `scheduler/data.js` and rux-ui both pick it, so every
  place shows the same file.
- **A bar marks a trip still missing its itinerary,** as rux-ui's Pending
  itinerary does: no document labelled Itinerary and `itinerary_not_needed`
  off. A trip that has one, or does not need one, draws nothing.
- **The mark is Carbon's attachment icon in the bar's warning chip layout,**
  on the drivers row and again on the destination row, as the requirement
  warnings are, titled No itinerary yet, the shortcut's own words.
- **An itinerary opens in a Carbon side panel on the left,** size lg, 40rem,
  so it reads beside the trip editor's md panel on the right, as rux-ui's
  floating viewer keeps its form in view. The scheduler opens and closes it
  with its own code, as it does the editor's panel.
- **The panel fetches the file and frames it from a blob address,** which the
  bucket's open CORS allows, because a same-origin frame is the only one the
  page may print.
- **The browser's PDF toolbar is hidden, and the panel has its own,** because
  Chrome's needs about 50rem and scrolls sideways in 40rem. It is Carbon's
  action toolbar under the head: Zoom out, Fit to width, Zoom in, Print,
  Download and Open in new tab, with the upload date as mm/dd/yyyy at its end.
- **Print opens the print dialog on the frame directly.** Zoom reloads the
  frame at the new zoom, which returns it to the first page. Page search,
  thumbnails and rotate are in the browser's own viewer, through Open in new
  tab, which is also Safari's way to print.
- **The head is the destination, after an attachment icon, and Close,** laid
  out as the trip editor's head is.
- **Below Carbon's xlg breakpoint, 82rem, an itinerary opens in a new tab**
  through `scheduler/share/document.html`, as today, because the two panels no
  longer fit side by side and a phone shows an embedded PDF badly.
- **The trip editor is Carbon's md panel, 30rem, and its Schedule tab is
  Route,** so its five tabs, split evenly, keep whole labels.
- **The Files tab rows, the Open itinerary shortcut and the right-click menu
  all open the panel.** One more itinerary opened replaces the one showing.
- **The panel stays open through week changes and other selections,** as the
  editor does, and closes with Close or Escape.
- **The trip editor gets its Files tab,** after Route, as
  `scheduler/docs/screen-inventory.md` lists it. It lists the trip's
  itineraries only, in a Carbon contained list, the newest first, each row its
  upload date as mm/dd/yyyy and an action that opens it. A trip with none shows
  the empty state.
- **The Files tab carries the Itinerary not needed switch,** above the list,
  writing `itinerary_not_needed` with the editor's Save and its `updated_at`
  check, like every other field.
- **Documents are read, not written.** Upload, replace and delete wait for
  Design's file uploader and for the trip documents' storage to be closed,
  both on the status list; rux-ui keeps doing them. Closing the storage
  changes the panel's fetch to a signed address.
- **The board reads `itinerary_not_needed` with the trip and `file_name` and
  `file_path` with each document,** and makes no new query: the documents
  already come with the trips.
- **A document uploaded in rux-ui shows after the board next reloads its
  week,** because the scheduler has no realtime refresh; a Save of the switch
  reloads it.

## Questions

None open.

## Tasks

- [ ] rux reads itineraries beside the editor, prints one from the toolbar and
      flips the switch on real trips, in Chrome, Safari and on the phone.
