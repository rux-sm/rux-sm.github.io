---
type: reference
---

# The printed Document

What every LN Guide Document puts on paper, in order, and the rules each part
follows. A guide that misses a part is unfinished; the work to close it is in
`docs/plans/` at the repository root.

## The parts, in order

1. **Brand block**, on the first page only: the Rux mark and LN Notes, the
   module, the team's process code and the role where the guide has them,
   and Client and Prepared by lines.
   The page builds them empty, because the site is public. On the owner's
   own copy, after log-in, Prepared by carries the account's name and Client
   reads LN training environment; anyone else's stays empty to write on.
2. **Title and purpose**: one sentence saying what the guide achieves.
3. **Summary**: one row per task with what you do, its result and its number
   of steps.
4. **Before you start**: what must exist before the first step, such as a
   customer, an item with stock and a warehouse that holds it.
5. **Procedure**, task by task: its result, its session and how to open it,
   Why LN works this way, the steps, each with the value the test run used
   where it typed one, and If something goes wrong.
6. **Variations**: the cases that change a step or a task.
7. **Sessions used**: each session with its code and how to open it.
8. **Check the result**: one row per task, its result as a fact a tester can
   tick, and boxes for Pass and Fail.
9. **Sign-off**: Prepared by a consultant, Reviewed by a key user and
   Approved by a process owner, each with name, signature and date lines.
   The owner's own copy fills the Prepared by name, as on the first page.

Every page's footer gives the title, LN Notes, the Updated date, the day the
content last changed, and Page N of M. Paper is Letter at 10 point, divided by
rules rather than fills. What comes next, Reference and Known gaps stay on
screen, because a printed copy stands on its own and says only what is known.

## Steps

- **One action per row**, in three columns: Step, Action and You should see.
- **A step is numbered by its task and its place**, such as 2.3, so a pointer
  to it reads the same on paper and aloud.
- **A figure worth keeping gets a line** under Write down, so the printed copy
  is also the record of the run.

## Test values

- **The public page gives values anyone could type**: an order type, a date,
  a quantity, a test item. It never names a customer, an item, a warehouse or
  an order of a real environment.
- **The team's page, after log-in, gives the real records** the walk used,
  such as the customer, the item and the warehouse.

## Screenshots

Screenshots show only after log-in, to an account that can open LN Notes,
because a public page cannot carry captures of a client's LN. They are kept
in a private Supabase bucket, and Print waits for them, so paper carries them
too.

- **One per task**, under the step that is hardest to follow in words, most
  often a menu path.
- **A caption** names the step and the screen, such as Step 4.5 · Warehousing
  Order, Outbound Lines Actions menu.
- **Cropped to what the step uses**, never the whole screen, so its text can
  be read on paper.
- **The field or menu item is boxed in red.**
- **No pointer, user name or company number** shows.
- **Taken in the task's recorded walk**, so its date is the walked date the
  footer prints.

## Left out, and why

- **Several actions in one step**, because a reader skips the middle one.
- **A revision log**, because git records every change and the footer gives
  the Updated date.
- **Fields left blank to fill in later**, because a blank ID reads as
  unfinished.
- **A screenshot for every step**, because it triples the length and every LN
  update can make one wrong.
