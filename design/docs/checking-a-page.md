---
type: how-to
---

# Checking a page you composed

`docs/composing-pages.md` says how to put a page together. This says how to
check the one you built, because the gates run against the sink by default and
a page of your own is not in it.

## Verify by opening the page

**The gates cannot see everything, so looking is not optional.** Defects that
passed every gate include chevrons rotated from the wrong base glyph, missing
wrappers, and menu specimens that were `visibility: hidden`.

Run the browser gates against **your page**, not only the sink. `check-a11y`,
`check-runtime-classes` and `check-spacing` take **no page argument**: they read
whatever document they are evaluated in, so load your page and run the tool
there. Fetch it from the server rather than pasting, so the file on disk is what
runs.

`check-rendered` cannot be pointed at an arbitrary page: its unit is the
`.ks-sec` section no template has, and it throws. `check-behaviour` can: it
scopes each case to the sink section where one exists and to the document where
not, and reports a component the page lacks as **skipped**. Read it on your page
as a diagnostic; the required coverage is still the sink's.

`docs/verifying-templates.md` covers behaviour: a template's behaviour is
verified against a **running Carbon page**, never derived from `css/rux.css`,
because the stylesheet gives the mechanism and not the intent.
