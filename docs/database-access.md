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

**No rule may name `anon` or `public`.** The publishable key in `account.js`
and `data.js` is not a secret and belongs to the `anon` role, so a rule naming
it is a rule open to the internet. `anon` holds no table grants either.

**A page that works without a log-in calls a function, not a table.** The
driver share, the maintenance share, a trip document and the customer request
form each call a `SECURITY DEFINER` function with a token, which runs as its
owner and never consults these rules. Copy that pattern; never grant to `anon`.

**Eight tables carry no rule and no grant on purpose** — the share tables, the
driver statuses and confirmations, trip requests and trip history. Only a
definer function reaches them, which is the tightest arrangement there is.

**Live channels are closed the same way.** The scheduler's presence channel is
private, so joining it is a read of `realtime.messages`, which carries the same
`staff_all` rule as a table. A channel that is not private is joinable by
anyone holding the publishable key, whatever the tables say, because no rule is
consulted at all.

**TRUNCATE, TRIGGER and REFERENCES are revoked from `anon` and
`authenticated`.** Row security cannot filter them, so a rule cannot stop them;
only a revoke can. Supabase grants them again on every new table, so revoke
them in the same migration that creates one.

## Files

**Five buckets.** Notes' two are private and their rules ask for the owner.
`trip-documents`, `driver-photos` and `profile-photos` are public, and only
staff may upload, replace or delete in them.

**A public bucket serves its files to anyone holding the address**, whatever
its rules say, so those three keep a rule that names strangers for reading.
This is the one exception to the rule above, and it stands until the two
document share pages ask for a time-limited link rather than a permanent one.
Until then a trip's paperwork is readable by anyone who has, or guesses, its
address.

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
for anything but `SELECT`, and only for those three buckets.

**What the check cannot tell you.** It reads names and grants, not meaning. A
rule called `staff_all` that asks the wrong question still passes. The only
proof that a table is closed is asking for it from outside with the
publishable key and getting `401 permission denied`.
