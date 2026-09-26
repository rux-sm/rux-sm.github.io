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
Edit turns it into its form, and `bill.html?new=1` adds one.

`import.html` takes a bank file into one account in four steps: the
account, which can be added there; the file, read on the device and never
uploaded; a check of the lines the account does not hold yet, each ticked;
and done. Earlier imports are listed with Undo, which deletes exactly that
import's lines.

## How it works

Eight tables named `coins_*` hold the household, its people, accounts,
imports, lines, bills, rules and the suggestions turned down. Only an account that can open Coins **and**
is linked to a person in the household reads them; scheduler staff do not.
`docs/database-access.md` is the rule. Nothing about the household is ever
written here, because this repository is public.

| | |
| :--- | :--- |
| `data.js` | the reads and writes |
| `app.js` | money as text, the month and member in the address, the switch, totals, where a bill stands |
| `bank-file.js` | an export read by its column layout, and each line's kind and merchant |
| `overview.js`, `transactions.js`, `bills.js`, `bill.js`, `import.js` | each page's own behaviour |
| `app.css` | the title row, filters, two-line rows and step buttons, under `coins-` |
| `overrides.css` | the side panel hidden when closed and full width on a phone |

The local preview on :8640 has no log-in and reads nothing; use the cloud
preview on :8641 or the published site.

## Check

    npm run check        from the repository root
