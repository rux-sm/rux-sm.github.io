---
type: how-to
---

# Proving a Save without saving

For a session that changed what a Scheduler page writes. It presses the page's
real buttons on the preview, with live rows on screen, and reads back every
write the page tried to make. None is sent.

## What it proves

- Which writes a Save makes, in what order, with what in them.
- What the page does when a write is refused partway.
- What the page does when someone else saved the trip first.

It does not prove what the database does with a write: a trigger, a rule that
refuses it, or how a page reads the new row back. Only a real Save proves
those, and a session presses that on the published site, which runs only
checked code.

## Steps

1. Open the page on `http://localhost:8641/scheduler/` in the logged-in
   Chrome, and reload it, so the tab has the code being proved.
2. Start the recording. In the tab, run:

   ```js
   (0, eval)(await (await fetch('/scheduler/tools/record-writes.js', { cache: 'no-store' })).text());
   ```

3. Prove the recording before trusting it. Count a table's rows, insert a row
   through the page's client, and count again:

   ```js
   await Rux.account.client.from('to_dos').insert({ body: 'probe' });
   ```

   `__writes` holds one write and the count has not moved. Empty it with
   `__writes.length = 0`.
4. Drive the page as a person would: click its buttons, and type by setting a
   field's value and sending its `input` and `change` events.
5. Read `__writes`. Each is `{ table, op, payload, filters }`. A function call
   is `rpc:<name>`, and a file is `storage:<bucket>`.
6. Read the real tables for the names the test typed, and find none.
7. Reload the tab. That puts the page's own client back.

## A save that stops partway

Set `__failOn` to a function that picks the write to refuse:

```js
__failOn = write => write.table === 'trip_quote_lines';
```

That write is recorded, answered as refused, and the page carries on as it
would after a real refusal.

## A save somebody else got in ahead of

Save reads the trip's `updated_at` before it writes, and again once the update
box is answered. Set `__stampMoves` to say which read finds a new stamp:

```js
__stampMoves = read => read >= 2;
```

The second read then differs, and the conflict box opens after the update box.

## What trips a session up

- **Wait with `__wait(ms)`.** Chrome slows a timer in a tab left in the
  background, so a script that waits on `setTimeout` runs out of time.
- **A modal is open when it has the class `is-visible`.** Its computed
  visibility says visible for a closed one too.
- **A tab's name can carry a mark.** Route reads as more than its word once it
  is marked done, so find a tab by how its name starts.
- **Reset before leaving a trip.** An edit left in the editor asks before the
  tab moves on.
- **A new trip's files need its row.** The editor reads a new trip again by
  its id before it names a file, so the recording answers that read from the
  insert it kept.
