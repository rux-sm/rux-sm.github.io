---
type: plan
---

# Plan: upload, replace and delete a trip's files

## Goal

A trip's files, its itinerary, contract, purchase order and any other PDF, are
uploaded, replaced and deleted from the scheduler, as rux-ui does them, so
nobody has to leave the scheduler to attach a file.

## Decisions

- **Files are stored exactly as rux-ui stores them,** so a file uploaded in
  either app reads the same in both: the `trip-documents` bucket, at
  `<trip id>/<milliseconds>/<file name>`, and a `trip_documents` row with
  `trip_id`, `label`, `file_name`, `file_path` and `file_size`.
- **The file is named as rux-ui's `buildDocumentFileName` names it,** from the
  trip's saved row read at upload, so a download is recognisable:
  `<start date>_<client>_<label>_<trip ref>.pdf`. The client is `customer`,
  else `booking_contact_name`, `trip_contact_1_name`, `trip_contact_2_name`;
  each part is stripped of accents, lowercased and hyphenated, and the
  fallbacks are `unknown-date`, `unnamed`, `document`, and the trip id's first
  eight characters.
- **The Type list is rux-ui's three, Itinerary, Contract and PO, then Invoice,
  Hotel confirmation and Something else,** which asks for a name that is
  stored as the label; rux-ui shows a label it does not know as written. A
  name matching a listed type stores that type's label. Only PDFs are
  accepted: a file passes on its type or a `.pdf` name, as in rux-ui, and
  must also start with `%PDF-`, so a renamed file is refused before upload.
- **There is no size limit,** as the bucket and rux-ui set none, because the
  office files only small PDFs.
- **A file writes at once, not with Save,** because a file is not a field of
  the form. A trip not yet saved has no id to file under, so its Files tab
  asks for a save first.
- **A file change never makes the editor's Save conflict:** no trigger on
  `trip_documents` touches `trips`, so `updated_at` stays, and the scheduler
  writes nothing to `trips` for a file.
- **Uploading a PO turns the Billing tab's PO received switch on** when the
  trip is open in the editor, and Save writes it, as rux-ui does; an upload
  from anywhere else leaves the switch alone.
- **Every step's error is checked, and a failure part way leaves a file,
  never a row pointing at nothing,** where rux-ui ignores its removals:
  - Upload: store the file, then add its row; a failed row removes the stored
    file again.
  - Replace: upload the new file and add its row, then delete the old row,
    then remove the old file. The new file gets a new id.
  - Delete: delete the row, then remove the file. A failed removal leaves an
    unused stored file and is only logged.
- **Delete asks in a Carbon danger modal,** where rux-ui uses the browser's
  confirm.
- **Every change is written to the trip's history** with rux-ui's entry:
  `record_trip_history` with `p_action` `document_uploaded`,
  `document_replaced` or `document_deleted`, a snapshot of the trip's `id`,
  `trip_ref`, `start_date`, `end_date`, `customer` and `destination`, one
  `document` change, and `{ documentId, fileName }` as `p_metadata`.
  `p_actor_name` is the `display_name` of the signed-in account's
  `public.profiles` row. A replace writes `document_replaced`, which rux-ui
  defines but never reaches, so the history says what happened. A failed
  history write is logged and does not fail the file change, as in rux-ui.
- **The Files tab lists all three types,** newest first, each row tagged with
  its type, and keeps the Itinerary not needed switch above them. An
  itinerary that is not its trip's newest is tagged Previous, as rux-ui marks
  one Updated.
- **The Files tab's upload is Carbon's file uploader** from
  `design/sink/file-uploader.html`: a Type dropdown over a drop zone that also
  opens the file dialog, with the file's progress as a Carbon file item. Design
  ships its classes and markup and no module, so the scheduler wires the drop,
  the dialog and the item itself.
- **A file row opens its file, and its overflow menu holds Replace and
  Delete,** the two items the shared row menu carries. Opening is the itinerary
  panel for an itinerary and a new tab for a contract or PO; `listRow` gains
  the words for its row and menu, as the row menu already takes them.
- **A row shows its type as a tag, its upload date and its size,** in the
  columns payments use, with the file name on hover.
- **A bar with no itinerary offers Upload itinerary on its right-click menu,**
  which opens the file dialog and files the PDF as the trip's itinerary, as
  rux-ui's bar button does. It is offered on the trip open in the editor too,
  since a file does not touch the form. The shortcut slot and the itinerary
  panel's toolbar stay as they are.
- **After any change the Files tab redraws its own list from a fresh read,**
  and leaves the form alone, because the editor refuses a full redraw while
  it holds unsaved edits. The board then reads its week again, so the bar's
  No itinerary yet mark and the Open itinerary shortcut follow at once.
- **The itinerary panel follows its file:** a replaced itinerary it shows is
  swapped for the new one, and a deleted one closes the panel.
- **The storage stays as open as it is.** The bucket is public and the
  publishable key can already upload and delete; closing it is the staff
  sign-in plan's later work, and uploading from here adds no new exposure.

## Questions

None open.

## Tasks

- [ ] rux uploads, replaces and deletes a file on a real trip, then opens it in
      rux-ui.
