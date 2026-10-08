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
| Missive, in rux's Chrome through Claude in Chrome | reading the team inbox | replying, archiving, labelling, snoozing, assigning or closing a conversation |
| Scheduler connector: `find_trips`, `get_trip` | matching a thread to its trip, and reading what the scheduler already warns of | |
| Scheduler connector: `list_to_dos`, `add_to_do`, `change_to_do`, `close_to_do` | the rows | a row a person wrote, which the tools refuse |

Missive is signed in in rux's Chrome, where its pages read as text, and
signing in is rux's to do. Work in a tab of the session's own and close it at
the end.

## The steps

1. **Open Team Inboxes,** `https://mail.missiveapp.com/#unassigned`. It is
   the Office inbox.
2. **Read the whole list first,** before opening anything, as the page's
   text (see Reading Missive in Chrome). Each row gives the sender, the
   subject, the time, the first line or the team's last comment, and how many
   messages it holds.
3. **Sort the rows.** A thread about a trip or a quote is read. Mail that is
   not a trip, such as an audit notice, a receipt, a newsletter or a vendor's
   warranty, is left and not reported.
4. **Open each thread to read** by its link, and take the page's text again.
   The newest message is last; among the messages, each at its time, are the
   team's own comments, which say what the office already thinks, and when
   the conversation was closed, reopened or snoozed.
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
   open row is changed and not doubled, and one whose row was ticked is not
   asked again. A row is a thread's when its `thread_url` ends in the
   thread's id. An open row whose thread has no mail since the row was made,
   and whose trip reads as it did, is left as it is.
8. **Add the rows** with `add_to_do`, each in a few plain words as the office
   would say them, naming the person and the trip. Give the trip's id when
   there is one, the thread's id as its key, the thread's link, so the row
   opens the email it came from, and a day: today when the trip leaves
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
- Mail that is not about a trip or a request for a quote is ignored, with no
  row and no line in the report, because the list is for trips.
- A thread whose row was ticked gets no new row unless mail has come in on
  it since the tick, because the tick is the office saying that work is
  done. A closed row gives when in `closed_at`.

## Reading Missive in Chrome

- **The page's text is the list, then the open thread.** `get_page_text`
  returns both whole. A script's answer is cut near 1,000 characters, so a
  script is for the ids alone, asked for in slices.
- **The list draws only the rows near the view,** and loads the mail under
  This Week and each month once it is scrolled to its end. Scroll to the end
  and read again until the rows counted match the number beside Team Inboxes
  in the sidebar.
- **A row of the list is a `.conversation-preview`, and its
  `data-conversation-id` is the thread's id.** The thread's link is
  `https://mail.missiveapp.com/#unassigned/conversations/<id>`, which opens
  it, with `#inbox/` in place of `#unassigned/` for a thread outside the
  team's inboxes. The id is the row's `thread_key` and the link its
  `thread_url`.
- **A read row's marker holds `.icon-seen`.** A row without it is unread, and
  is not opened.
- **Some rows carry the sender and the subject in lower case as their key,**
  `pat lee | po attached, october 8`. Such a row is found by the id in its
  `thread_url` and changed with `change_to_do`; an `add_to_do` under the id
  would add a second row.
- A script run in Chrome can run twice. `add_to_do` with a thread key is safe
  to repeat; a second call changes the row the first made.

## Not run yet

Closing a row whose work the thread shows as done, and changing a row on a
second review of the same thread, are what `close_to_do` and `change_to_do`
are for. No review has done either. The first one that does adds what it
learned here.
