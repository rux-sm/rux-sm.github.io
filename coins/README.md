# Coins

The household's money in one place: every member's income, spending,
accounts, debts, bills and subscriptions — one app on
[design](../design/), served at **rux-sm.github.io/coins/**.

The repository root's `AGENTS.md` is the policy, and
`docs/plans/coins-app.md` is what is still to build.

## What it is

`index.html` is the Overview: the month's money in and out against the
month before, the bills still to pay, what is left once they are paid, and
the bills due in the next seven days. The month has arrows, and a switch
shows both members or one; a member sees the accounts that are theirs alone,
so a joint account counts only under Both.

`transactions.html` lists every line of the month, newest first, with
search, an account and a kind filter, and the month's in, out and net; a
table on a wide screen and a list a day on a phone. A dot marks a line
nobody has looked at yet. A line opens in a side panel to change its
category, kind and note, and a tick there makes it a rule, which sorts every
saved line that contains its text now and every line imported later.

`bills.html` has this month's bills in three groups, due in the next
seven days with any late, later this month, and paid, or every bill, or the
ones with keep or cancel still to decide, under the month's totals. A bill
finds its payments by text: every money-out line whose merchant or
description contains its match is linked to it, when it is saved and when a
file is imported. Payments that repeat without a bill, charged in three of
the last twelve months at a steady amount, are offered as bills, and one
turned down is not offered again. `bill.html?id=` is one bill: its usual,
latest and yearly cost, a price rise when the latest is over $1.99 and 5%
above usual, where it is paid from, its website and login, and its payments;
Edit turns it into its form, and `bill.html?new=1` adds one. The To check
view lists every bill not yet confirmed, or whose login is not yet on the
household's main address, which is kept in the database rather than here; a
bill's page marks it checked, or its login moved to that address.

`accounts.html` has every account in three groups: bank accounts with their
balance, cards with what is owed and the share of the limit it is, and loans
with when they are paid off; above them what is in the bank, what is owed
and the two together, and below the cards what paying more than the
minimums each month, highest interest first, would clear and save. A bank
account's balance is saved from its latest file; a card's or a loan's is
typed into the account's side panel, since no export states one.

`budget.html` is the month's plan in three parts: fixed, the bills of each
kind and the cards' minimums, against what was paid; flexible, one amount a
category against the month's bought lines of that category, with the rest
under Not in the budget; and once a year, costs spread over twelve months.
A category or yearly cost is added, changed and deleted in the side panel.

A bill with no match text is paid inside another, like an app billed through
Apple: it shows on its own with its yearly cost, but has no month of its own
and leaves every total to the bill that holds it.

`import.html` takes a bank file into one account in four steps: the
account, which can be added there; the file, read on the device and never
uploaded; a check of the lines the account does not hold yet, each ticked;
and done. A file that states a balance, newer than the account's, saves it,
even when it has no new lines. Earlier imports are listed with Undo, which deletes exactly that
import's lines.

## How it works

Nine tables named `coins_*` hold the household, its people, accounts,
imports, lines, bills, rules, the suggestions turned down and the budget. Only an account that can open Coins **and**
is linked to a person in the household reads them; scheduler staff do not.
`docs/database-access.md` is the rule. Nothing about the household is ever
written here, because this repository is public.

| | |
| :--- | :--- |
| `data.js` | the reads and writes |
| `app.js` | money as text, the month and member in the address, the switch, totals, where a bill stands |
| `bank-file.js` | an export read by its column layout, its stated balance, and each line's kind and merchant |
| `overview.js`, `transactions.js`, `bills.js`, `bill.js`, `accounts.js`, `budget.js`, `import.js` | each page's own behaviour |
| `app.css` | the title row, filters, two-line rows and step buttons, under `coins-` |
| `overrides.css` | the side panel hidden when closed and full width on a phone |

The local preview on :8640 has no log-in and reads nothing; use the cloud
preview on :8641 or the published site.

## Check

    npm run check        from the repository root
