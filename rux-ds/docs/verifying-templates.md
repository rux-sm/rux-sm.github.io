# Verifying a template against Carbon

A fragment is a still. A template RUNS: it carries the behaviour layer, and
someone copies it expecting the thing to work. So a template needs a kind of
evidence `sink/*.html` never did, and `check-provenance` asks every template
for it as a `BEHAVIOUR:` comment.

## The rule

**A claim about how Carbon behaves is only as good as the running page it was
read from.** `docs/carbon-*.json` records structure. `css/rux.css` records
mechanism. Neither records intent, and a template is mostly intent.

## Why this document exists

Four claims about the UI shell were made in one sitting from the stylesheet
alone, each confident and each wrong:

| claimed | actually |
|---|---|
| the content region reflows as the nav opens | at desktop the nav does not open or close; the panel is persistent |
| `--side-nav--ux` is the 3rem rail | it is 16rem; `--side-nav--rail` is the rail |
| a hamburger belongs in the shell at every width | `header__menu-toggle__hidden` hides it above 66rem |
| a grid offset clears the nav | it is proportional, the nav is fixed; at 1100 the content sat 4px inside it |

Every one was caught by a person looking at a screen, and the last two were
settled in minutes by opening `carbondesignsystem.com` and reading the DOM.
The stylesheet had been telling the truth the whole time about mechanism. It
was never asked the right question.

## How to verify

1. **Find a running reference.** `carbondesignsystem.com` is built on the real
   shell. The Storybook at `react.carbondesignsystem.com` runs the components
   themselves. Prefer the one that actually renders the thing being claimed.
2. **Read the DOM, not the screenshot.** The classes on the element, and
   `getComputedStyle` for the properties in question. A screenshot shows you
   the result and hides the reason.
3. **Compare the specific property**, at the specific widths where behaviour
   changes. Every shell defect this project has shipped lived at a breakpoint
   or in a state, not in the default view.
4. **Separate Carbon from the site.** carbondesignsystem.com is
   `gatsby-theme-carbon`. A class named `Something-module--x--a1b2c3` is the
   docs site's and proves nothing about the component. `cds--*` is Carbon.
   This distinction has already produced one wrong conclusion.
5. **Record it** in the template's `BEHAVIOUR:` comment: the URL, the date, the
   properties compared — and what was NOT covered, which is the half a reader
   cannot reconstruct later.

## What the gate can and cannot do

`check-provenance` enforces that the claim is made, names a URL, and carries a
date. It cannot tell whether the page was ever opened, exactly as it cannot
tell whether a `rendered-dom` label is true. `carbon-css` is allowed and is
the honest label for a claim derived from the stylesheet: weaker, and not
pretending otherwise.

## Reading a live page without leaving the terminal

The browser tooling can navigate to a Carbon URL and evaluate against it —
class lists, `getComputedStyle`, element rectangles, before and after a click,
at an emulated width. Two traps, both of which have already produced a wrong
conclusion here:

- **Read after the transition settles.** Carbon animates; an automated pane's
  animation clock does not advance on its own. Suppress transitions first —
  `*{transition:none!important;animation:none!important}` — or wait.
- **A resize reaches CSS before it reaches JS.** Media-query rules apply at
  once; a `matchMedia` change listener lags. A measurement taken too soon
  reports the previous width's state.
