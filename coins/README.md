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

`import.html` takes a bank file into one account in four steps: the
account, which can be added there; the file, read on the device and never
uploaded; a check of the lines the account does not hold yet, each ticked;
and done. Earlier imports are listed with Undo, which deletes exactly that
import's lines.

## How it works

Seven tables named `coins_*` hold the household, its people, accounts,
imports, lines, bills and rules. Only an account that can open Coins **and**
is linked to a person in the household reads them; scheduler staff do not.
`docs/database-access.md` is the rule. Nothing about the household is ever
written here, because this repository is public.

| | |
| :--- | :--- |
| `data.js` | the reads and writes |
| `app.js` | money as text, the month and member in the address, the switch, totals |
| `bank-file.js` | an export read by its column layout, and each line's kind and merchant |
| `overview.js`, `import.js` | each page's own behaviour |
| `app.css` | the title row, the two-line rows and the step buttons, under `coins-` |

The local preview on :8640 has no log-in and reads nothing; use the cloud
preview on :8641 or the published site.

## Check

    npm run check        from the repository root
