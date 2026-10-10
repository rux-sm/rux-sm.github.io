---
name: inbox-review
description: Review the team's email in Missive against the scheduler and keep the office's To do list. Read the team inbox, match each thread to its trip, and add a To do row for what an email asks of the office, change the row a thread already has, or close one whose work is done. Use when rux asks to review the inbox, check the email, see what came in, or update the to-do list from email. Reads Missive and never replies, archives, labels or snoozes there.
---

# Reviewing the team inbox

A review turns the day's email into rows of the office's To do list, which
the scheduler's board shows as Tasks. `scheduler/docs/working-from-claude.md` is the list
from rux's side, and the `trips` skill beside this one is how a single trip's
thread is read in depth. `rules.md` there is the office's policy.

## The tools

| Tool | For | Never for |
| :--- | :--- | :--- |
| Missive connector: `get_conversations`, `get_conversation_entries` | reading the team inbox | `compose_draft`, `deliver_draft`, `change_labels` and `manage_calendar_events`, which write to Missive |
| Scheduler connector: `find_trips`, `get_trip`, `find_availability`, `list_buses` | matching a thread to its trip, reading what the scheduler already warns of, and whether a bus is free on a row's day | |
| Scheduler connector: `list_to_dos`, `add_to_do`, `change_to_do`, `close_to_do` | the rows | a row a person wrote, which the tools refuse |

The Missive connector reads as rux and sees what he sees. Connecting it is
rux's to do, in the Claude app under Settings, Connectors; a session that has
no Missive tools says so and stops.

## The steps

1. **Read the team inbox,** `get_conversations` with `mailbox_id`
   `unassigned` and `include_content` true. It is the Office inbox, and its
   `total_count` is the number beside Team Inboxes.
2. **Read the whole list first,** before matching anything. A call gives 25
   threads: follow `next_cursor` until `has_more` is false.
3. **Sort the threads.** A thread about a trip or a quote is kept. Mail that
   is not a trip, such as an audit notice, a receipt, a newsletter or a
   vendor's warranty, is left and not reported.
4. **Read each kept thread** (see Reading Missive). The newest message is
   last, and after the messages are the team's own comments, each at its
   time, which say what the office already thinks.
5. **Match it to a trip** with `find_trips`: the sender as booking contact,
   then the customer and the day. A new request often has no trip, or only a
   placeholder. Read the trip's state: confirmed, PO, contract, quote sent,
   files.
6. **Decide whether it is a row.** It is one when the email asks something of
   the office or brings something to record: a PO or a signed contract to
   enter, a form to fill, a quote to send, trips to enter, a question to
   answer. It is not one when the scheduler already says it by itself, such as
   a follow-up due or a leg short of a bus: read `get_trip`'s warnings first.
7. **`list_to_dos`, with `include_closed`,** so a thread that already has an
   open row is changed and not doubled, and one whose row was marked Done is
   not asked again. A row is a thread's when its `thread_url` ends in the
   thread's id.
8. **Add the rows** with `add_to_do`, each in its four parts (see Writing a
   row). Give the trip's id when there is one, the conversation's `id` as its
   key, its `link`, which the row's Email button opens, and a day: today
   when the trip leaves tomorrow, tomorrow for the rest, none for a courtesy
   reply.
9. **Bring every open row up to date,** with new mail or without (see
   Closing and changing a row): close the one whose work is done, change the
   one whose words are behind, and leave the one that reads true as it is.
10. **Report.** The rows added, changed and closed, the urgent one first; the
    threads that are unread; anything odd on a thread that has no row, such
    as a request that looks like a trip already on the board; and what was
    not read, such as a picture or an attachment.

## rux's rules

- A review leaves rux's unread marks as they are. A read through the
  connector does not clear one, so an unread thread is read like any other
  and the report says it is unread; a review never opens a thread in Chrome,
  which does clear it.
- A row has no owner unless rux names one, so anyone in the office can take
  it.
- A row is added straight in and reported after, since a wrong one costs one
  delete.
- What a review learns goes on the row, because the office reads the rows
  and not the report: the report says which rows changed, and holds only
  what no row can.
- Mail that is not about a trip or a request for a quote is ignored, with no
  row and no line in the report, because the list is for trips.
- A thread whose row was marked Done gets no new row unless mail has come in
  on it since, because Done is the office saying that work is finished. A
  closed row gives when in `closed_at`.

## Writing a row

A closed row is three lines of one size: a tag, a name and a few words, and
one quiet line. Each part is short, and the rest shows when the row is
opened.

- **`kind`** is the work the email asks for, shown as the tag: `quote`, a
  quote to send; `itinerary`, trips to enter or check from one; `po`, a PO
  or a signed contract to record; `change`, a booked trip or its quote to
  change; `respond`, a question to answer; `form`, a customer's form to fill
  in; `invoice`, an invoice to send. A thread that asks two things takes the
  kind of the one the office does first.
- **`who`** is the person who wrote, by the name they sign with, or the
  company when no person is named.
- **`body`** is what the work is about, in a few words that fit one line:
  the group and the place, such as "varsity cheer to Fort Worth". The kind
  says the work and `who` the person, so neither is said again.
- **`detail`** is short lines. The first is the days and any count, such as
  "Jan 14 to 17, 2027 · 30 passengers", and shows on the closed row; the
  place is left out when the row has a trip, whose name stands on that line.
  The lines after it show when the row is opened: what the office needs to
  know before it opens the email, one fact a line, and what the team's
  comments say the work waits on.

## Reading Missive

- **The team inbox is the mailbox `unassigned`,** which `search_teams` with
  `any_team` gives as the Office team's. Its `unseen_count` is how many of
  its threads are unread, and a call with `unseen` true and `include_content`
  false lists them.
- **A thread read without its content is a subject, a team and its labels,**
  with no sender and no time, so the list is read with content.
- **A thread's messages come oldest first,** each with its sender, its time,
  which is in UTC, and its `direction`: inbound from the customer, outbound
  from the office. The team's comments follow under `internal`, each with
  its author and time. `Status: Completed` in the metadata is a closed
  conversation. A thread cut short carries `next_entries_before`, and
  `get_conversation_entries` reads the older part.
- **A message's body ends at `* * *` where the sender quoted earlier mail.**
  The quoted mail is another message of the thread, or another thread with
  the same person.
- **A picture shows as `(image)` in the body,** and a table pasted into an
  email is one. The connector hands over no picture, so the report names the
  thread as holding one.
- **An attachment is a name.** With `include_attachments` true each one
  gives its file name, type and size. A review reads no file; the `trips`
  skill says how one is read.
- **The thread's id is the conversation's `id`, and its link the
  conversation's `link`,**
  `https://mail.missiveapp.com/#archive/conversations/<id>`, which opens it
  in Missive. The id is the row's `thread_key` and the link its
  `thread_url`. A row's link may sit under `#unassigned/` or `#inbox/` in
  place of `#archive/`; the id at its end is what matches.
- **Some rows carry the sender and the subject in lower case as their key,**
  `pat lee | po attached, october 8`. Such a row is found by the id in its
  `thread_url` and changed with `change_to_do`; an `add_to_do` under the id
  would add a second row.
- `add_to_do` with a thread key is safe to repeat; a second call changes the
  row the first made.

## Closing and changing a row

- **Every open row is read again at each review,** its thread by the id at
  the end of its link and its trip when it has one, because a row goes stale
  with no new mail: a quote goes out, a bus frees up, a second request turns
  out to be the same job.
- **A row that says whether a bus is free, or waits on one, has its day
  checked with `find_availability`.** The free buses less
  `buses_still_needed` are the ones to offer, since a trip short of a bus
  takes a free one, and a need the email names, such as seats or a lift,
  counts: `list_buses` gives each bus's. The line is changed when it no
  longer reads true.
- **What the review learns about a row's work goes in its detail,** one fact
  a line, such as that another row is the same job or that no free bus has
  the seats asked for. The row's other lines stay as they are.
- **A row that reads true is left exactly as it is,** so a review changes
  only what moved.
- **An open row whose thread has left Team Inboxes is likely done,** because
  the office closes a conversation as it answers. Read the thread by the id
  at the end of the row's link: an outbound message after the customer's
  last one, with `Status: Completed` in the metadata, is the work done, and
  a trip's `quote_sent_on` confirms a quote. Close the row with what went
  out and when.
- **Match a row to the list by the id alone.** The office retitles a thread,
  and a sender shows under another form of their name, so the list's line may
  share no words with the row.
- **Change a row whose words are wrong or behind:** a date the email gives
  differently, a count, or an answer the office was waiting on that came in on
  another thread. `change_to_do` takes the row's id.
- **The team's comments say what a row waits on.** New comments alone leave a
  row as it is, unless what they name has arrived.
