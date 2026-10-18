---
type: plan
---

# Plan: Coins live, from alert emails and a daily bank feed

## Goal

Coins shows every transaction within a minute of it happening and marks a
bill paid as soon as its confirmation arrives, without anyone downloading a
bank file. Two feeds do it: the banks' alert emails for the live view, and
SimpleFIN Bridge once a day for the complete record that corrects the
alerts. The Import page stays for any account neither feed reaches.

## Decisions

- **No bank password is stored anywhere,** in Coins, in Supabase, or with
  Claude. Each bank is connected once on SimpleFIN's own site by its owner,
  and the alerts are emails the banks already send.
- **Alert emails go to one address on a Cloudflare domain.** Cloudflare Email
  Routing hands each message to an Email Worker, which posts it to a Supabase
  Edge Function with a shared secret. No inbox is read and no mail password
  is held.
- **The raw email is never kept.** The function reads the sender, the date,
  the amount, the merchant and the last four digits, saves those, and drops
  the message, the way the Import page drops a file.
- **The readers are rows, not code.** Which sender is which account, and the
  pattern that finds the amount and merchant in its alerts, live in a
  `coins_feeds` table edited on a page, because this repository is public and
  must not say where the household banks.
- **An alert line is provisional.** It is saved with `source = 'alert'` and
  shown with a mark; when the daily feed brings the same account, amount and
  a day within three of it, the bank's line takes its place and keeps its
  category, note and bill. An alert with no match after five days is shown
  as unconfirmed, never deleted silently.
- **A bill confirmation email marks the bill paid at once.** It is matched to
  the bill by its sender and, where the email states one, the amount, and
  saved as a provisional payment that the bank line replaces in the same way.
- **SimpleFIN runs once a day on a schedule.** A `pg_cron` job calls an Edge
  Function that asks SimpleFIN for every connected account since the last
  run, saves the new lines as one import per account so Undo still works,
  skips lines it already holds by SimpleFIN's own id, and saves each balance.
- **Secrets stay in Supabase.** The SimpleFIN access URL and the email shared
  secret are Edge Function secrets; neither is ever in a file here.
- **A quiet account is flagged.** An account with no line from either feed
  for three days shows a notice on the Overview, since a bank link expiring
  is the usual failure.
- **Rules and bill links run on every new line,** whichever feed brought it,
  through the same code the Import page uses.
- **Each member connects their own accounts,** and only on their own say.

## Questions

- **Which domain receives the alerts?** It must be on Cloudflare with Email
  Routing; recommended a new address used for nothing else.
- **Which accounts join SimpleFIN first?** Recommended the shared account and
  the first member's own checking and card, with the second member's added
  when they choose.
- **Should alerts be set for every transaction or only above an amount?**
  Recommended every transaction, so the live view is complete.

## Tasks

- [ ] Confirm SimpleFIN Bridge's price and that it reaches every account the
      household uses, before anything is paid.
- [ ] Add the schema: `source`, `external_id` and `provisional` on
      `coins_transactions`, a `coins_feeds` table for senders and patterns,
      and a feed's last run on `coins_accounts`, with member-only rules.
- [ ] Build the email Edge Function and the Cloudflare Email Worker, test it
      with invented alert emails, and deploy both on a yes.
- [ ] Add the Feeds page: each sender, the account it fills, its pattern,
      and the last alert it read.
- [ ] Turn on every transaction alert at each bank and every bill's email
      confirmation, sent to the new address.
- [ ] Build the SimpleFIN Edge Function and its daily `pg_cron` job, map each
      SimpleFIN account to its Coins account, and run it beside one manual
      import to prove the two agree to the cent.
- [ ] Replace provisional lines with bank lines, and show alert lines, quiet
      accounts and unconfirmed alerts on the Overview and Transactions pages.
- [ ] Update `coins/README.md` and `docs/database-access.md` for the new
      tables and functions.
