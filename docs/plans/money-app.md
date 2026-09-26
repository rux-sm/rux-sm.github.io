---
type: plan
---

# Plan: Money, the household's money in one app

## Goal

A new app, Money, at `/money/`, where the household sees all of its money in
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
  `money_*`, bank rows included, so nothing stays only on the Mac. Nothing
  about the household is ever written into this repository, because the
  repository is public: code only, and Design's pages for it use invented
  content.
- **Only household members can read it, not staff.** Every other table asks
  `is_staff()`, which means the scheduler's company staff. The money tables
  ask a new `money_is_member()` instead: the account can open Money *and* is
  linked to a person in the household. Ticking Money for someone is not
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
- **Every transaction gets one kind:** earned, spent, moved between own
  accounts, moved between members, card payment, or fee. Only earned and
  spent count toward totals, so no money is counted twice.
- **A bill is anything that comes back:** a subscription, a utility, rent,
  a loan or a card payment. Each has an amount, a due day, the account it
  is paid from, the website, the login email it is under, a keep or cancel
  mark and notes. Bills are found from the transactions, as the review page
  does now, and can also be added by hand.
- **No passwords, ever.** The login email or username only; the password
  stays in a password manager. Accounts are stored by name and last four
  digits, never the full number.
- **Debts are accounts.** A card or loan carries its balance, limit,
  interest rate, minimum payment and due day, so the Accounts page can show
  what is owed and what it costs each month.
- **The budget comes last,** written from the real numbers once a year of
  every member's statements is in.
- **Six pages,** each started from a Design template:
  - **Overview** — this month in and out, what is left, and bills due soon.
  - **Transactions** — every row, filtered by member, account, month and kind.
  - **Bills** — the review page, saved to the database instead of the browser.
  - **Accounts** — every account and debt, with balances and due days.
  - **Budget** — the plan per category against what was actually spent.
  - **Import** — drop a bank file, check it, save it.
- **It works on the phone,** as every app here does, because bills get paid
  from there.
- **Every member sees everything.** No account is private to its owner,
  so every total reads the same for both.
- **The second member already has a login.** It gets Money ticked on the
  Access page and is linked to its person in the household; its other apps
  stay as they are.
- **The money folder on the Mac stays until Money matches it.** The same
  bank files imported into Money must give the same yearly totals the Mac
  tool gives, to the cent, before the folder is retired.

## Questions

- **What is the app called?** Money is the working name. It gives the
  folder, the address, the header and the class prefix, so it is picked
  before the first page is built.

## Tasks

- [ ] Write the tables, the member rule and their grants as one migration,
      test it offline first, show it to rux and apply it on a yes. Run the
      check in `docs/database-access.md` after.
- [ ] Prove the tables are closed: from outside with the publishable key,
      and signed in as an account that is staff but not a member.
- [ ] Start `money/` from a Design template and add it to `switcher.json`.
- [ ] Build Import, porting the Mac tool's reading and overlap rules.
- [ ] Import every file in the money folder and match its yearly totals to
      the cent.
- [ ] Build Transactions and the rules page.
- [ ] Build Bills, and carry over any keep or cancel marks the old review
      page saved in rux's browser.
- [ ] Build Accounts, with the debt fields.
- [ ] Build Overview.
- [ ] Build Budget.
- [ ] Retire the money folder on the Mac, and update
      `~/claude-config/developer/CLAUDE.md` that describes it.
