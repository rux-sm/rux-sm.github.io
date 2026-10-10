---
type: plan
---

# Plan: a chat box in the scheduler

## Goal

Anyone on the staff an owner allows asks the schedule a question in plain
words, from any Scheduler page, and gets the answer the Claude app's
connector gives, without a Claude plan of their own: whether a day is free,
who should drive a trip, a driver's days off to hold. Whatever would change
the schedule comes back as something to press, and is never done by itself.

## Decisions

- **The chat is the connector's tools behind the Claude API,** in a further
  Edge Function, `scheduler-chat`, source in `scheduler/chat/`, because the
  connector needs each person's own Claude plan and most of the staff have
  none.
- **The tools are one file that both functions read,** so a question gets
  the same answer in the Claude app and in the scheduler.
- **Every tool runs as the person signed in,** so the chat sees what that
  person's pages show and no more.
- **An owner turns chat on for a person,** in Access on the Account page,
  beside the apps that person may open, and it is off for everyone until
  then. The function refuses a person it is off for.
- **One office key pays, a secret of the function that rux sets himself.**
- **An owner sets how much chat may use in a month,** in Access on the
  Account page, beside the switches: all of the plan's credit, or an amount
  in dollars. Money is an owner's to limit, and Access is the one place only
  an owner opens.
- **The function keeps the count that the limit is held against.** It adds
  what each answer cost, from the tokens the API reports and the price of
  the model it called, to a row for the month in `chat_usage`, and once the
  month's sum reaches the amount it answers that the limit is reached and
  calls nothing. Access shows the month's sum beside the limit.
- **The count is the scheduler's own sum, and the Console's bill is the
  truth.** With no amount set, the plan's credit is the only limit: when it
  is spent the API answers nothing more until it refreshes, and no card is
  charged.
- **It reads freely and changes nothing by itself.** It reads trips, free
  buses and drivers, contacts, company documents and the To do list. A
  change comes back as a card in the conversation with its own button, and
  the press writes it as that person: a trip as a draft link, as the
  connector gives one; a To do row; a driver's time off.
- **Two tools are new, and the connector gets them too.** `recommend_drivers`
  answers the free drivers for a trip's leg in the order Assign best takes
  them, each with why; `draft_time_off` parks a driver's days off for a
  press.
- **A recommendation is the page's own rule, not a second copy of it.** The
  order Assign best uses joins the rule file `scheduler-fixes.md` builds for
  the connector.
- **The chat says who should drive and does not seat them.** A driver goes on
  a trip in the editor, whose Save is the only writer of a trip.
- **A pressed time off is written to `driver_time_off` as the Drivers page
  writes it,** so the roster and the pickers read it at once. Anyone with
  chat may hold one, as anyone on the staff may on the Drivers page.
- **The office's rules are the chat's instructions,** the `trips` skill's
  `rules.md`, copied beside the function when it is built, so it never
  recommends a new driver alone on a bus or an owner ahead of a free driver.
- **The box is a header action on every Scheduler page,** in Design's
  header panel, drawn only for a person chat is on for.
- **A conversation is the person's own and lasts the visit.** It is kept in
  the tab, so it follows from page to page, and never in the database.
- **What a tool returns is read as data.** A customer's words in a trip or a
  To do row cannot give the chat an order, and since only a press writes,
  nothing it reads can change the schedule.
- **The model is `claude-opus-5-5`, and the answer shows as it is written.**
- **It reads no file and no email.** A trip's files are
  `scheduler-file-reading.md`'s, and the office email has no door yet.

## Questions

None open.

## Tasks

- [ ] Move the connector's tools into one file both functions import, and
      ask each tool the same thing through the Claude app before and after.
- [ ] Add `recommend_drivers` from the order Assign best uses, joined into
      the connector's generated rule file.
- [ ] Add `draft_time_off`, and the card and press that write it.
- [ ] Try the per-person switch, the month's limit, `chat_usage` and their
      owner-only functions on PGlite, then show rux the SQL.
- [ ] Add to Access on the Account page the switch for each person, and the
      limit with the month's sum beside it.
- [ ] Write `scheduler/chat/index.ts`: the staff and switch checks as the
      caller, the limit held against the month's sum, the Claude API with
      the tools and the office rules, the answer streamed back, and its cost
      added to the month.
- [ ] Hand rux the two commands, the chat key as the function's secret and
      the deploy.
- [ ] Draw the chat's header action and panel on every Scheduler page: the
      conversation, the box, and a card with its button for each change.
- [ ] Write the press for each card: a draft link opens the editor, a To do
      row is added, a time off is written.
- [ ] Write the chat into `scheduler/docs/database-inventory.md` and
      `scheduler/docs/screen-inventory.md`, and beside the Claude app in
      `scheduler/docs/working-from-claude.md`.
- [ ] Check in Chrome on :8641: a free day, a driver recommendation and a
      time off, each against the pages; a person with chat off sees no
      action and is refused by the function; each card's press read back
      from its table; a limit set under the month's sum, which stops the
      next answer and says why; and a trip whose text holds an instruction,
      which the chat reports and does not follow.
