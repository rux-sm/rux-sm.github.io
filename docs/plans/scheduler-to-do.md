---
type: plan
---

# Plan: a to-do list in the scheduler

## Goal

One list, opened from the header on every Scheduler page, says what the office
has to do now. It gathers what the scheduler already works out about its
trips, what a person types, and what a Claude session adds after reading the
team's email, so nobody has to remember to look in three places.

## Decisions

- **It is called To do,** because rux-ui's Tasks list is the per-leg
  paperwork ticks, which the trip checklist now holds.
- **The list is the whole office's,** with an owner on each row.
- **Three kinds of row share the list,** told apart by how they arrive and how
  they leave:

  | Kind | How it arrives | How it leaves |
  | :--- | :--- | :--- |
  | Computed | nothing writes it; a rule finds it true of a trip | the trip is fixed |
  | Written | a person types it | a person ticks it |
  | Agent | a Claude session adds it after a review | that session closes it on a later review, or a person ticks it |

- **A computed row is never stored.** It is worked out each time from the
  trips, as the follow-up reminder and the trip checklist are, so it cannot go
  stale or be left behind.
- **Four rules make computed rows,** each read from the file that owns it:
  - **Follow-up due,** as `follow-up.js` decides it, which already covers an
    unconfirmed trip, a PO or payment not in, a missing itinerary and a
    balance unpaid within two weeks of leaving.
  - **Leaving soon with items open,** a leg leaving today or in the next two
    days with an item open in its checklist's Customer or Buses group, as
    `checklist.js` decides it. Entered, Paperwork and Extras are left to the
    Departures list, because they are open on nearly every leg about to
    leave, and a row on every departure says nothing.
  - **Short of buses,** a confirmed trip leaving within 30 days with a leg
    that has fewer buses than it needs.
  - **No times,** a confirmed trip leaving within a week with no time on any
    stop of its route.
- **A leaving-soon row leaves out what another row on the trip already
  says,** so one fault is one line.
- **A trip covered by another company's bus keeps its Short of buses row,**
  because saying so on the trip is a plan of its own, named in
  `docs/status.md`.
- **No other rule is added without a reason to,** because a mark that sits on
  most trips says nothing.
- **A computed row has no tick and no dismiss.** It asks while it is true, as
  a follow-up reminder does, so a row cannot disappear while its trip is still
  wrong.
- **A follow-up is put off by writing an update on the trip,** which is what
  restarts the office's wait today and leaves a record of what was said.
- **What a trip does not need is said on the trip,** with the Not needed the
  itinerary and the trip contact already have, so it never becomes a row.
- **A written row is a line of words,** with an owner, a due date and a trip,
  each optional. A row with no owner is anyone's.
- **A written or agent row has a checkbox.** A tick keeps who and when; the
  row stays under Done, struck through, with Undo, for the rest of that day,
  and then leaves the list.
- **A row is put off by changing its due date,** so there is no separate
  snooze to explain.
- **Delete is in the row's menu,** for a row made by mistake.
- **A tick on a row attached to a trip enters that trip's history,** so the
  trip's record says the work was done and by whom.
- **An agent row is written straight in, through the connector,** as made by
  Ruxbot, with the person whose session added it kept beside it. A wrong row
  costs one delete, and approving each row first would take back the time the
  list saves.
- **Ruxbot is a profile with no log-in,** with a name, a picture and a colour
  like any staff member's, so its rows carry a face and it can do nothing the
  to-do tools do not. It is never among the faces of who has the Scheduler
  open, since it is on no page.
- **The connector is the only way an agent writes a row.** A direct write to
  the database skips the rules and the name of who wrote it, and driving the
  page breaks when the page changes.
- **The connector still writes no trip.** Its new tools add, change and close
  to-do rows and nothing else.
- **An agent row carries its email thread,** as a link and as a key, and one
  open row is allowed per thread, so a second review changes the row it made
  instead of adding a copy.
- **A session closes only rows an agent made,** with the reason, such as the
  reply having gone out. A written row that looks done is said in the review
  and left for a person to tick.
- **A closed agent row sits under Done with Undo** like any tick, so a wrong
  close is seen and taken back the same day.
- **The connector serves stored rows only.** Before adding a row about a trip,
  a session reads that trip's warnings, so it does not write what a computed
  row already says.
- **The scheduler never reads email.** A review is a Claude session reading
  the team inbox in the person's own browser, checking it against the
  schedule, and writing rows; how is a skill, kept beside the trips skill.
- **Nothing here runs a review on a timer.** A person asks for one.
- **The list opens from a header action, left of Account,** with a count on
  it, because the header is the one thing on every Scheduler page and the side
  nav stays closed until asked for.
- **It opens in the header panel the switcher uses,** so the page under it
  stays in view and Escape or a press outside closes it.
- **It takes the place kept for Notifications,** because a notice that asks
  for something is a to-do, and one action is enough.
- **The Tasks page in the screen inventory stays later.** The panel comes
  first, and a page is built only if the list outgrows it.
- **Rows are grouped Overdue, Today, This week, Later and No date.** A
  computed row is in Today for as long as it is true, ordered by the day its
  trip leaves.
- **A row is one line:** what, the trip and its customer, who, and when. A
  press on a row with a trip opens that trip.
- **Rows about one trip sit together,** so an agent row beside a computed row
  reads as one matter.
- **More than five computed rows of one kind fold into one line** that opens
  the Trips page filtered to them, so one kind cannot bury the rest.
- **Follow-ups always fold,** because most upcoming trips wait on something.
  A trip leaving within a week that still waits, which `follow-up.js` calls
  due, keeps a row of its own beside the folded line.
- **Mine and Everyone switch the list.** Mine is rows that are mine or
  nobody's, and computed rows, which are everybody's.
- **The count is the Overdue and Today rows under Mine,** after folding.
- **A field at the top adds a written row,** owned by whoever typed it and
  dated today until changed.
- **Stored rows are one table, `to_dos`:** the words, where it came from
  (person or agent), who made it and, for an agent row, whose session it was,
  its owner, due date, trip, thread link and thread key, and who closed it,
  when and why. Staff only, nothing for an
  account that is not signed in, and broadcast on realtime so the count is
  live for everyone.
- **A trip's rows go with the trip** when it is deleted.
- **Who made a row and who closed it are stamped by the database,** never
  taken from the page or the connector, so neither can be forged.
- **A tick's history entry is an Updated entry with one To do line,** because
  both apps already draw that kind.
- **The rules are one file, `scheduler/to-do.js`,** which
  `scheduler/tools/check-to-do.mjs` runs against sample trips in the check.
  It is handed each leg's buses and seats, as the checklist is.
- **Every page reads the trips the rules need itself,** because only the
  board holds them otherwise.
- **The count is Design's badge indicator on the header action, and the panel
  is its header panel.** The panel's width and the row are the scheduler's
  own, `scheduler-to-do`, holding Design's checkbox and overflow menu, because
  Carbon has no such row and its panel is a switcher's width.

## Questions

None open.

## Tasks

- [ ] Apply the SQL for `to_dos`, its rules, its realtime broadcast, the
      trip-history entry for a tick and Ruxbot's profile as a named migration
      on rux's yes, then check its grants and rules on the live database.
- [ ] Give Ruxbot its picture: the file put in `profile-photos` from a staff
      session and its path set on the profile by SQL, each on rux's yes.
- [ ] Move the board's reading of a leg's buses and seats and of the trip
      contact out of `data.js` into a file every Scheduler page loads, with
      the checklist's counts on the board unchanged.
- [ ] Have every Scheduler page read the trips the four rules need.
- [ ] Add the header action and panel to every Scheduler page: the groups,
      Mine and Everyone, the add field, tick, Undo, due date, owner, trip and
      delete.
- [ ] Give the Trips page a Show choice for each kind that can fold. It has
      one for follow-ups only.
- [ ] Add the connector's tools to list, add, change and close to-do rows,
      and deploy the function.
- [ ] Write the review skill: reading the team inbox, checking each thread
      against the schedule, and adding, changing and closing rows.
- [ ] Bring `scheduler/docs/screen-inventory.md`,
      `scheduler/docs/database-inventory.md` and
      `scheduler/docs/working-from-claude.md` in line, in the commits that
      change what they describe.
- [ ] Check the panel in Chrome on :8641 at desk and phone widths, in each
      theme, with two accounts open to see the count change live.
