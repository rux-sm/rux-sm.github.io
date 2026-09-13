# The page shell is this project's own

**Decided 2026-09-10, measured not argued.** Moved out of `AGENTS.md` on
2026-09-11: the rule belongs in the policy, the argument for it belongs here.
`AGENTS.md` carries the ruling and points at this.

rux-ds built `templates/document-page.html` on 2026-09-08 in answer to
`exchange/SEND-DS.md`, and the open question was whether `tools/build.mjs`
should derive its shell from it and record the commit. It should not, for
three reasons.

**Adopting it would re-import what this repository removed on evidence the
same week.** Of the 32 classes the template carries and these pages do not,
six are `rux--tag--blue`, `--cool-gray`, `--purple`, `--red` and the four
`rux--breadcrumb*` — the seven-colour token scheme replaced by four
registers, and the route-as-breadcrumb built and reverted on three findings.
A shell that pulls those back in is not a parent worth having.
**The mechanism the adoption was designed around no longer exists.**
`SEND-DS.md` §6 proposed recording the derivation the way `vendor/rux-ds/PIN`
recorded the stylesheet's commit. There is no `vendor/` and no rux-ds pin —
since 2026-09-10 rux-ds is read live. A recorded derivation commit would be
a number nothing checks and nothing updates, which is precisely the kind of
line this repository has been wrong about four times.
**The overlap is already high and the remainder is content-kind, not shell.**
70 classes are shared. The 27 these pages have and the template does not are
what a guide has and a generic document does not: the notepad, the step-table
container, the registers. The template's extras are largely its own demo
content. The one thing it had that these pages lacked — a reading measure
capped rather than spanned — was taken on its merits and is in `build.mjs`.
**What is taken from it is the habit, not the markup**: rule by measuring the
rendered thing. That is what produced the breadcrumb ruling, the correction
to it, and the reading-measure cap.
