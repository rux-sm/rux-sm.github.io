---
name: inbox-review
description: Review the team's email in Missive against the scheduler and keep the office's To do list. Read the team inbox, match each thread to its trip, and add a To do row for what an email asks of the office, change the row a thread already has, or close one whose work is done. Use when rux asks to review the inbox, check the email, see what came in, or update the to-do list from email. Reads Missive and never replies, archives, labels or snoozes there.
---

# Reviewing the team inbox

A review turns the day's email into rows of the office's To do list, the one
in the scheduler's header. `scheduler/docs/working-from-claude.md` is the list
from rux's side, and the `trips` skill beside this one is how a single trip's
thread is read in depth. `rules.md` there is the office's policy.

## The tools

| Tool | For | Never for |
| :--- | :--- | :--- |
| Missive, the Mac app, through computer use in the background | reading the team inbox | replying, archiving, labelling, snoozing, assigning or closing a conversation |
| Scheduler connector: `find_trips`, `get_trip` | matching a thread to its trip, and reading what the scheduler already warns of | |
| Scheduler connector: `list_to_dos`, `add_to_do`, `change_to_do`, `close_to_do` | the rows | a row a person wrote, which the tools refuse |

Missive is signed in in its Mac app and not in the Claude Chrome profile, and
signing in is rux's to do. Ask for the app with `request_access`, then work
with the `app_*` tools, which leave rux's screen and keyboard alone.

## The steps

1. **Open Team Inboxes** in the sidebar. It is the Office inbox.
2. **Read the whole list first,** before opening anything: scroll it and zoom
   on the list column. Each row gives the sender, the subject, the time, the
   first line or the team's last comment, and how many messages it holds.
3. **Sort the rows.** A thread about a trip or a quote is read. Mail that is
   not a trip, such as an audit notice, a receipt, a newsletter or a vendor's
   warranty, is left, and said in the report in one line.
4. **Open each thread to read** and zoom on the reading pane. The newest
   message is at the bottom; under it are the team's own comments, which say
   what the office already thinks, and any snooze.
5. **Match it to a trip** with `find_trips`: the sender as booking contact,
   then the customer and the day. A new request often has no trip, or only a
   placeholder. Read the trip's state: confirmed, PO, contract, quote sent,
   files.
6. **Decide whether it is a row.** It is one when the email asks something of
   the office or brings something to record: a PO or a signed contract to
   enter, a form to fill, a quote to send, trips to enter, a question to
   answer. It is not one when the scheduler already says it by itself, such as
   a follow-up due or a leg short of a bus: read `get_trip`'s warnings first.
7. **`list_to_dos`,** so a thread that already has an open row is changed and
   not doubled.
8. **Add the rows** with `add_to_do`, each in a few plain words as the office
   would say them, naming the person and the trip. Give the trip's id when
   there is one, the thread's key, and a day: today when the trip leaves
   tomorrow, tomorrow for the rest, none for a courtesy reply.
9. **Report.** The rows added, the urgent one first; anything odd found on
   the way, such as a request that looks like a trip already on the board;
   and what was not opened.

## rux's rules

- A review leaves an unread thread unread: read its line in the list, say it
  is there, and do not open it, because opening it clears rux's own unread
  mark.
- A row has no owner unless rux names one, so anyone in the office can take
  it.
- A row is added straight in and reported after, since a wrong one costs one
  delete.

## What the first run found about the tools

- Missive's text is not in the accessibility tree: every label comes back
  empty, so the inbox is read from pictures.
- A scroll of the list is raw and small: about eight rows for a `dy` of 14.
  Take a fresh picture before clicking a row by its place.
- A click on a row opens it in the pane and changes nothing else.
- Missive's link to a conversation sits in a menu the background tools cannot
  open, so a row's thread key is the sender and the subject in lower case,
  `pat lee | po attached, october 8`, which still keeps one open row a thread.
- A script run in Chrome can run twice. `add_to_do` with a thread key is safe
  to repeat; a second call changes the row the first made.

## Not run yet

Closing a row whose work the thread shows as done, and changing a row on a
second review of the same thread, are what `close_to_do` and `change_to_do`
are for. No review has done either. The first one that does adds what it
learned here.
