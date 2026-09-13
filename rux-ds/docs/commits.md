# Commits

Conventional Commits header, Tim Pope's seven rules for the rest.
Enforced by `.githooks/commit-msg` — enable per clone with
`git config core.hooksPath .githooks`.

## Structure

```
<type>(<scope>)!: <Subject>
<blank>
<body>
<blank>
<footer>
```

## The seven rules

| # | Rule | Enforced |
|---|---|---|
| 1 | Blank line between subject and body | yes |
| 2 | Subject line ≤ 50 characters | yes |
| 3 | Capitalise the first letter of the subject | yes |
| 4 | No trailing period on the subject | yes |
| 5 | Imperative mood — "Add", not "Added" or "Adds" | common cases |
| 6 | Wrap the body at 72 | yes |
| 7 | Body explains **what and why**, not how | by review |

Rule 5 can only be checked on the first word, and only against the obvious
inflections. `Update` is imperative and `Updated` is not, but no script can tell you
that `Improve` was the wrong verb.

Rule 2 counts the **whole** subject line, prefix included. `feat(build): ` costs 13
characters, so the description gets about 35. That is the point — it forces the detail
into the body.

## Deviation, recorded

Conventional Commits says the description is **lowercase**. Pope's rule 3 says
**capitalise** it. They conflict; this repository capitalises. Decided 2026-08-26,
because forcing lowercase mangles subjects that open on a proper noun.

## Types

`feat` `fix` `docs` `style` `refactor` `perf` `test` `chore` `build` `ci` `revert`

`!` before the colon marks a breaking change, and the footer explains it.

## Scopes

A domain, never a directory.

**Now** — `build` `sink` `gates` `icons` `tokens` `themes` `grid` `extract` `deps`
**From Phase 3** — the component's name: `button` `dropdown` `text-input` `ui-shell`
**From Phase 7** — a foundation document's name: `color` `type` `layout` `naming`

Scope is optional. `docs: Add roadmap and README` is fine.

## Footer

```
BREAKING CHANGE: The g90 theme is no longer compiled.
Closes #124
Refs docs/roadmap.md 4.3
```

## Identity

Always `rux <rux.dev@pm.me>`, lowercase. Set once per machine with
`git config --global`, as `docs/operating-card.html` says; every hook in the
family refuses any other name or address. A conditional include was described
here until 2026-09-02 and existed on no machine.

**No AI authorship credit.** No `Co-Authored-By:`, no "Generated with" line, no
assistant named anywhere in the message. rux-ui accumulated 257 such trailers before
this rule existed; those stay as history, and this rule is forward-only.

The hook blocks a wrong identity and any AI attribution.

## Examples

```
chore(deps): Add Carbon dependencies
feat(build): Compile Carbon under rux prefix
fix(sink): Add checkbox wrapper
feat(build)!: Drop the g90 theme
```

Not:

```
update styles                    no type, no capital, no information
feat(sink): Added sections       past tense, and says nothing the diff does not
fix: Checkbox bug                which bug?
feat(build): Build all 75 Carbon components under the rux prefix
                                 64 chars; the detail belongs in the body
```

## Note on rux-ui

rux-ui uses the same `type(scope)` header but longer, lowercase, non-imperative
subjects — median 73 characters, often two clauses. That suits a repository amending a
settled foundation, where what a change *revealed* is the interesting part. rux-ds
follows the stricter standard instead. Neither repository's history is being rewritten.
