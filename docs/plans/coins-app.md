---
type: plan
---

# Plan: Coins, the household's money in one app

## Goal

A new app, Coins, at `/coins/`, where the household sees all of its money in
one place: every member's income, spending, accounts, debts, bills and
subscriptions, with the due date of each bill and the login email each
service is under. It replaces the private money folder on rux's Mac, whose
tools and review page it grows out of.

## Decisions

- **One household, shared by its members.** A household holds its people,
  and every account, bill and budget belongs to it. Every page can show the
  whole household or one member, so "what we earn" and "what I earn" are the
  same numbers filtered.
- **A person is not the same as a login.** A member can be in the household
  without an account on the site, so their bank files can still be counted.
  A person gets a login only if they want to open the app.
- **The data lives in the Supabase project, in its own tables** named
  `coins_*`, bank rows included, so nothing stays only on the Mac. Nothing
  about the household is ever written into this repository, because the
  repository is public: code only, and Design's pages for it use invented
  content.
- **Only household members can read it, not staff.** Every other table asks
  `is_staff()`, which means the scheduler's company staff. The Coins tables
  ask a new `coins_is_member()` instead: the account can open Coins *and* is
  linked to a person in the household. Ticking Coins for someone is not
  enough on its own, and no scheduler staff member sees a penny.
- **Bank files are dropped onto the Import page.** The browser reads the
  export, shows the rows it found, and saves them on a yes. The raw file is
  not uploaded or kept. Exports overlap, so a row already saved is skipped,
  the way the Mac tool does it today.
- **The importer knows each export by its column layout,** not by the
  bank's name, so the public code does not say where the household banks.
  The four layouts the Mac tool reads today all carry over, including the
  one whose signs are the wrong way round.
- **Rules about the household are rows, not code.** Which name on a bank
  line is rent, which transfers are between members, and which merchant
  names are one service are saved in the database and edited on a page.
  Today they are written into the Mac tool, which could never go public.
- **Every transaction gets one kind:** bought or earned, fee, moved between
  own accounts, card payment, or moved between members. Only the first two
  count toward totals, so no money is counted twice.
- **A bill is anything that comes back:** a subscription, a utility, rent,
  a loan or a card payment. Each has an amount, a due day, the account it
  is paid from, the website, the login email it is under, a keep or cancel
  mark and notes. Bills are found from the transactions, as the review page
  does now, and can also be added by hand.
- **A bill's login comes from the household's mail,** already read into a
  list in the private money folder on rux's Mac: the Proton mailbox through
  Proton Mail Bridge, and the Gmail ones through Claude's Gmail connector,
  one account at a time. Only the address each service uses goes into the
  bill's login in the database; the list and any mail stay on the Mac.
- **Claude tidies after each import, on a yes.** A session reads the lines no
  rule sorted, proposes categories, rules and bills in one table, and saves
  what rux accepts as rules, so the rules do the routine work and each month
  leaves less to sort. It never changes the household's rows unasked.
- **No passwords, ever.** The login email or username only; the password
  stays in a password manager. Accounts are stored by name and last four
  digits, never the full number.
- **Debts are accounts.** A card or loan carries its balance, limit,
  interest rate, minimum payment and due day, so the Accounts page can show
  what is owed and what it costs each month.
- **The budget comes last,** written from the real numbers once a year of
  every member's statements is in.
- **Every page has a Both, first member, second member switch,** and the
  month pages a month with arrows. An account belongs to one member or to
  both, and its transactions follow it.
- **Six pages in a side nav,** each started from a Design template:
  - **Overview** leads with Left this month, then money in, money out and
    bills still to pay; a notice when an import is waiting for a look; the
    bills due in the next seven days; spending against the budget as bars.
  - **Transactions** is one list for every account with search and filters,
    the month's in, out and net above it, and a dot on each line nobody has
    looked at yet. A line opens in a side panel to change its category, kind,
    bill and note, with a tick to make that a rule for every line like it.
  - **Bills** has totals still to pay, paid, subscriptions a year and to
    decide; a notice offering the repeating payments an import found, which
    become bills only when confirmed; and lists due in seven days, later this
    month and paid. A bill is paid when a matching line arrives, late when
    none has by its day, and flagged when it costs more than usual. A bill
    opens on its own page with its usual and latest price, its yearly cost,
    the website, the login and a button to open the website.
  - **Accounts** totals what is in the bank, owed and the two together, then
    lists bank accounts, cards with the share of the limit used as a bar that
    turns red when high, and loans; one line says what paying a little more
    each month would clear and save.
  - **Budget** has three parts: fixed bills from the Bills page, one amount
    for day-to-day spending split by category, and yearly costs spread over
    twelve months.
  - **Import** is four steps, account, file, check and done. Check counts the
    lines found, already saved, new and bills matched, lists the new lines
    ticked, and saves them; an import can be undone.
- **On a phone** the side nav sits behind the menu button, tables become
  lists of two-line rows with the amount on the right, number tiles sit two
  to a row, transactions are grouped by day and a bill opens full screen.
- **The app is called Coins:** folder and address `coins/`, header Rux
  Coins, class prefix `coins-`, commit scope `coins`.
- **Every member sees everything.** No account is private to its owner,
  so every total reads the same for both.
- **The second member already has a login.** It gets Coins ticked on the
  Access page and is linked to its person in the household; its other apps
  stay as they are.
- **One account is shared.** Each member keeps a checking account of their
  own and transfers into a shared one that pays most bills; the second
  member also pays some bills from their own. The shared account belongs to
  both, and a transfer into it is money the household already has.
- **A contribution plan, once the picture is full.** From a year of every
  account: what the shared account pays each month, bills and day-to-day,
  split between the members by the rule they choose; so what each transfers,
  how often, how much the shared account keeps in reserve, and what each is
  left to spend from their own. It lives on the Budget page.
- **The money folder on the Mac stays until Coins matches it.** The same
  bank files imported into Coins must give the same yearly totals the Mac
  tool gives, to the cent, before the folder is retired.

## Questions

- **How is the shared account split?** Half each, or in proportion to what
  each earns. The plan shows both; the household picks one.
- **Which bills belong to the shared account?** Some personal subscriptions
  are paid from it today, and some shared bills from the second member's own
  account.
- **How much reserve should the shared account hold?** Recommended one
  month of its bills, so a late transfer never makes a bill fail.

## Tasks

- [ ] Tick Coins for the second member on the Access page.
- [ ] Offer a bill in the Transactions panel, to link or unlink one line by
      hand.
- [ ] Tidy the first imports with rux, then make the tidy a skill.
- [ ] Build Overview.
- [ ] Once every bill's login is confirmed, go through the bills with the
      household and set each one's whose to one member or both, apart from
      the account it is paid from; power, water and internet are both.
- [ ] Import a full year of the second member's card, which today holds one
      month.
- [ ] Build the contribution plan on the Budget page, once the questions
      above are answered.
- [ ] Retire the money folder on the Mac, and update
      `~/claude-config/developer/CLAUDE.md` that describes it.
