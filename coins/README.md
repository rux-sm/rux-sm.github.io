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

## How it works

Seven tables named `coins_*` hold the household, its people, accounts,
imports, lines, bills and rules. Only an account that can open Coins **and**
is linked to a person in the household reads them; scheduler staff do not.
`docs/database-access.md` is the rule. Nothing about the household is ever
written here, because this repository is public.

| | |
| :--- | :--- |
| `data.js` | the reads |
| `app.js` | money as text, the month and member in the address, the switch, totals |
| `overview.js` | the Overview page |
| `app.css` | the title row and the two-line rows, under `coins-` |

The local preview on :8640 has no log-in and reads nothing; use the cloud
preview on :8641 or the published site.

## Check

    npm run check        from the repository root
