---
type: plan
---

# Plan: a team chat in the Scheduler

## Goal

The office staff talk to each other from any Scheduler page, wherever each of
them is, and see a message the moment it is sent. A message can point at what
it is about, a trip, a customer, a contact, a driver, a bus, a location or a
Missive thread, and a press on that link opens it. An urgent message opens the
chat on the screen of the person it is for, so it is seen at once. This is the
staff talking to each other; asking Claude about the schedule is
`scheduler-chat.md`'s, a separate box.

## Decisions

- **One room for the whole staff,** because the office is a handful of people
  and every message is about the same schedule.
- **A header action on every Scheduler page, beside the faces of who is
  here,** opening Carbon's header panel as the Account action does; the
  conversation and the box are the scheduler's own, under `scheduler-team-`,
  every colour a `--rux-*` token, in `scheduler/team-chat.js`.
- **Unread shows as a dot on the action, and a new message as a toast,** with
  who sent it and its first line, which opens the chat when pressed. The
  panel never opens by itself for an ordinary message, because it would cover
  a trip someone is typing into.
- **An urgent message opens the panel on the screen of each person it names,
  or of everyone when it names no one,** and leaves the focus where it was,
  so nothing typed is lost. It is marked in the urgent colour, and shows who
  has read it.
- **A person is named with `@` and the name,** chosen from a list as it is
  typed, and a message that names someone counts as theirs: their dot is the
  urgent colour until they read it.
- **New tables, and the old app's are dropped.** `team_messages`,
  `team_message_reactions` and `team_chat_reads` let any staff member rewrite
  or delete anyone's message and take the sender's name from what the page
  sends, so a name could be forged. The new ones are `chat_messages`,
  `chat_mentions`, `chat_links` and `chat_reads`.
- **The sender is the person logged in, set by the database,** never by the
  page; the name and photo are read from `profiles` when a message is drawn,
  so a renamed person shows their new name.
- **Every staff member reads every message; each writes, edits and deletes
  only their own.** An edited message says Edited, and a deleted one stays as
  Message deleted, so a reply never points at nothing. An owner may delete
  anyone's.
- **What has been read is kept per person in the database,** the newest
  message each has seen, so the dot is right on every computer and phone.
- **Messages arrive live** through Supabase Realtime on `chat_messages`, as
  the board's tables do, staff only by the same rule.
- **A link is a kind and an id, drawn from the record as it is now.** A trip
  shows its estimate number, place and date; a driver their name; a bus its
  number. The label at the time of sending is kept too, so a record since
  deleted still says what it was, marked removed.
- **Where each link goes:** a trip to the board with it open,
  `./?trip=<id>&date=<date>`; a customer, contact, driver, bus or location to
  its own page by `?id=`; a Missive thread to Missive, in a new tab.
- **A link is made three ways:** typing `#` and part of a trip's number,
  place or customer, or a driver's, bus's or customer's name, and picking from
  the list; pasting a Scheduler or Missive address, which becomes a link; and
  Send to chat on a trip bar's menu and on a driver's, bus's or customer's
  page, which starts a message with that link in it.
- **A driver's link offers Call and Text,** from the driver's `phone` and
  `texting_url`, because the office often has to reach a driver about what the
  message says.
- **Text and links only.** No pictures or files: a trip's papers belong in its
  Files, where the driver page finds them, and a chat link to the trip reaches
  them.
- **A message is at most 2,000 characters,** as the old table held.
- **Messages are kept for good,** so last season's conversation about a
  customer can be found again.
- **On a phone the panel fills the screen,** with the box above the home bar.
- **The browser's own notifications are offered, never asked for on load:**
  a switch in the panel asks once, and then an urgent message or one that
  names the person shows a notification while the Scheduler is open in a tab
  behind others.
- **Nothing reaches a person whose Scheduler is shut** in this plan. Push to a
  phone needs a service worker and keys of its own, and is a plan of its own
  once the chat is in use.
- **Drivers have no chat.** Their pages are links without a log-in, and the
  office reaches them by phone and text.
- **No `chat_` table is ever readable without a staff log-in,** and no message
  text goes into the public site, a commit or a document.

## Questions

- **Do you also want private messages between two people,** or is the one
  room enough with `@` names? One room is simpler and the plan assumes it.
- **Should an urgent message play a sound?** If yes, a short one, with a
  switch in the panel to turn it off.
- **The old app's 14 messages, the newest from 9 September:** bring them into
  the new chat, or let them go with the old tables? The plan lets them go.
- **May anyone send an urgent message,** or only owners? The plan lets
  anyone.

## Tasks

- [ ] Write the four tables, their rules, the sender trigger and the
      Realtime entry; try them on PGlite, including a staff member editing
      another's message and a page sending another person's id, both
      refused; then show rux the SQL and apply it on his yes as a named
      migration.
- [ ] Draw the header action and its panel on every Scheduler page: the
      conversation, newest at the foot, each message's sender, photo, time,
      Edited and Message deleted, and the box with its urgent switch.
- [ ] Send, edit and delete a message, read the room on opening, and take new
      ones live; keep the person's read mark as the panel shows the newest.
- [ ] The dot, the toast for a new message, and the panel opening for an
      urgent one, with who has read it.
- [ ] `@` names: the list as it is typed, `chat_mentions`, and the urgent dot
      for a message that names the person.
- [ ] Links: the `#` list, pasted addresses, each link's label from its
      record with the kept label for a removed one, the press that opens it,
      and Call and Text on a driver's.
- [ ] Send to chat on a trip bar's menu and on the Drivers, Fleet and
      Customers pages.
- [ ] The phone layout and the browser notification switch.
- [ ] Drop the old app's three tables, shown to rux as their own migration.
- [ ] Write the chat into `scheduler/docs/database-inventory.md` and
      `scheduler/docs/screen-inventory.md`, in place of the old team chat's
      lines.
- [ ] Check in Chrome on :8641 with two tabs: a message arriving live in the
      other, the dot and toast, an urgent message opening the other tab's
      panel while a trip is being typed into there, a name, every kind of
      link opening its record, an edit and a delete, and a phone width; and
      report what two tabs of one account cannot prove, a second person
      receiving it.
