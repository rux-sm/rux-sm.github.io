---
type: plan
---

# Plan: upload, replace and delete a trip's files

## Goal

A trip's itinerary, contract and purchase order are uploaded, replaced and
deleted from the scheduler, as rux-ui does them, so nobody has to leave the
scheduler to attach a file. Today the scheduler only reads `trip_documents`:
the Files tab lists itineraries and the itinerary panel shows one.

## Decisions

- **Files are stored exactly as rux-ui stores them,** so a file uploaded in
  either app reads the same in both: the `trip-documents` bucket, at
  `<trip id>/<milliseconds>/<file name>`, and a `trip_documents` row with
  `trip_id`, `label`, `file_name`, `file_path` and `file_size`.
- **The file is renamed as rux-ui renames it:**
  `<start date>_<organization or first contact>_<label>_<trip ref>.pdf`,
  each part lowercased with hyphens, so a download is recognisable.
- **The labels are rux-ui's three, Itinerary, Contract and PO,** and only PDFs
  are accepted, as rux-ui accepts only PDFs. There is no size limit, as the
  bucket and rux-ui set none.
- **A file writes at once, not with Save,** because a file is not a field of
  the form. A trip not yet saved has no id to file under, so its Files tab
  asks for a save first.
- **Replace uploads the new file before deleting the old one,** so a failure
  part way leaves a file, never none.
- **Delete asks in a Carbon danger modal,** then removes the stored file and
  its row.
- **Every upload, replace and delete is written to the trip's history** with
  the entry rux-ui writes, so the history reads the same whichever app made
  the change: `record_trip_history` with the action, the trip's snapshot and
  the change. The actor is the display name of the signed-in account's
  `public.profiles` row, the name rux-ui records for the same person.
- **The Files tab lists all three types,** newest first, each row tagged with
  its type, and keeps the Itinerary not needed switch above them.
- **The Files tab's upload is Carbon's file uploader** from
  `design/sink/file-uploader.html`: a Type dropdown over a drop zone that also
  opens the file dialog, with the file's progress as a Carbon file item. Design
  ships its classes and markup and no module, so the scheduler wires the drop,
  the dialog and the item itself.
- **Uploading a PO turns the Billing tab's PO received switch on,** as rux-ui
  does, when the trip is open in the editor; Save writes it, like any field.
- **A file row opens its file, and its overflow menu holds Replace and
  Delete,** the two items the shared row menu carries. Opening is the itinerary
  panel for an itinerary and a new tab for a contract or PO; `listRow` gains
  the words for its row and menu, as the row menu already takes them.
- **A row shows its type as a tag, its upload date and its size,** in the
  columns payments use, with the file name on hover.
- **A bar with no itinerary offers Upload itinerary on its right-click menu,**
  which opens the file dialog and files the PDF as the trip's itinerary. The
  shortcut slot and the itinerary panel's toolbar stay as they are.
- **After any change the board reads its week again,** so the bar's No
  itinerary yet mark and the Open itinerary shortcut follow at once.
- **The storage stays as open as it is.** The bucket is public and the
  publishable key can already upload and delete; closing it is the staff
  sign-in plan's later work, and uploading from here adds no new exposure.
- **Design's file uploader request leaves the status list,** because the
  scheduler builds on the classes Design already has.

## Questions

None open.

## Tasks

- [ ] Add upload, replace and delete to `scheduler/data.js`, with rux-ui's
      naming, paths and history entries.
- [ ] Build the Files tab's uploader, its list of all three types, and each
      row's overflow menu.
- [ ] Add Upload itinerary to the bar's right-click menu.
- [ ] Remove the file uploader request from `docs/status.md`, and update
      `scheduler/docs/screen-inventory.md`.
- [ ] rux uploads, replaces and deletes a file on a real trip, then opens it in
      rux-ui.
