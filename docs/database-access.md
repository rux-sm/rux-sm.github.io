---
type: reference
---

# Who may read the database

The database has no repository, so this is the contract it is held to. The
project is `udnmqhayzhrbltxzzhjw`, and a change to it is SQL shown to rux and
applied on a yes as a named migration.

## The rule

**A table is closed unless a signed-in account passes `is_staff()`.** Almost
every table carries one rule, `staff_all`, which says exactly that. Where a
table needs finer grain it says so in the name: `staff_read`, `staff_add`,
`staff_remove`, `staff_update_own`, `staff_own`, `staff_join_lobby`,
`staff_leave_lobby`.
`trip_drafts` has `author_all`, because a draft belongs to whoever wrote it.
The Sevens tables ask `sevens_is_player()` instead, in `player_read` and
`player_chat`, because a game is its players' and a friend given only Sevens
is not staff; a waiting table is also readable by anyone `can_open_app('sevens')`
allows, so they can join it.
The Coins tables ask `coins_is_member()` in `member_all` and `member_read`:
the account can open Coins and is linked to a person in that household, so no
staff member reaches a household's money. Only the owner adds a household or a
person, in `owner_all`, because linking a login is what grants access.

**No rule may name `anon` or `public`.** The publishable key in `account.js`
and `data.js` is not a secret and belongs to the `anon` role, so a rule naming
it is a rule open to the internet. `anon` holds no table grants either.

**A page that works without a log-in calls a function, not a table.** The
driver share and the maintenance share each call a `SECURITY DEFINER`
function with a token, which runs as its owner and never
consults these rules; a trip document goes through the `trip-document-link`
Edge Function. Copy that pattern; never grant to `anon`.

**The key can call only those functions.** Every other function is revoked
from `anon` and `public`, and one a staff page calls checks for staff first.
The list the key may call is in `scheduler/docs/database-inventory.md` §1; a
new link-page function is granted to `anon` by name, and nothing else is.

**Seven tables carry no rule and no grant on purpose** — among them the share
tables, the driver statuses and confirmations, and trip history. Only a
definer function reaches them, which is the tightest arrangement there is.

**Live channels are closed the same way.** The scheduler's presence channel is
private, so joining it is a read of `realtime.messages`, which carries the same
`staff_all` rule as a table. A channel that is not private is joinable by
anyone holding the publishable key, whatever the tables say, because no rule is
consulted at all.

**TRUNCATE, TRIGGER and REFERENCES are revoked from `anon` and
`authenticated`.** Row security cannot filter them, so a rule cannot stop them;
only a revoke can. A new table in `public` no longer gets them, nor anything
for `anon`: the defaults give a signed-in account select, insert, update and
delete, which its rules govern, and a new function runs for signed-in accounts
only. Those defaults hold for objects the `postgres` user makes, which every
migration does.

## Files

**Five buckets.** Notes' two are private and their rules ask for the owner.
`trip-documents` and `driver-photos` are private: staff read them through
links signed for ten minutes, and the link pages through the
`trip-document-link` Edge Function, which signs one for a document's id. Only
staff may upload, replace or delete in any of the three scheduler buckets.

**`profile-photos` is the one exception to the rule above.** It is public, so
it serves a staff member's face to anyone holding the address, and keeps a rule
that names strangers for reading.

## The check

Run this against the project after any database change. **Every number is
meant to be zero.** A number above zero names something to look at, not
necessarily something broken — read the rule above it and decide.

```sql
select
  (select count(*) from pg_policies where schemaname='public'
     and (roles::text like '%anon%' or roles::text like '%public%'))
     as rules_naming_strangers,
  (select count(distinct table_name) from information_schema.role_table_grants
     where table_schema='public' and grantee='anon')
     as tables_the_key_can_touch,
  (select count(*) from pg_class c join pg_namespace n on n.oid=c.relnamespace
     where n.nspname='public' and c.relkind='r' and not c.relrowsecurity)
     as tables_with_row_security_off,
  (select count(*) from information_schema.role_table_grants
     where table_schema='public' and grantee in ('anon','authenticated')
       and privilege_type in ('TRUNCATE','TRIGGER','REFERENCES'))
     as ungovernable_grants;
```

To see which table a number is pointing at, drop the `count(*)` and select the
table name from the same `where`. For live channels, the same question is asked
of `pg_policies` where `schemaname='realtime'`: no rule there may name
strangers either. For files, it is asked of
`pg_policies` where `schemaname='storage'`: no rule there may name strangers
for anything but `SELECT`, and only for `profile-photos`. For functions, list
the ones `anon` can run — `has_function_privilege('anon', oid, 'EXECUTE')` over
`pg_proc` in `public` — and compare them with the inventory's list.

**What the check cannot tell you.** It reads names and grants, not meaning. A
rule called `staff_all` that asks the wrong question still passes. The only
proof that a table is closed is asking for it from outside with the
publishable key and getting `401 permission denied`.
