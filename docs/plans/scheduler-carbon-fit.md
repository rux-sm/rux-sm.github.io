---
type: plan
---

# Plan: the scheduler on Carbon's scales

## Goal

`scheduler/tools/check-drawn.mjs` passes in every theme on every board: no
type under 12px, every size on its tracking, every text 4.5 to 1, every gap
on Carbon's spacing scale and every mark pressed on 24px by 18px. It passes
on the Full board in nine of the eleven themes; Gray 90 and Geist Dark wait
on the two questions below.

## Decisions

- **The check reads what every board draws.** It reads the components page
  on its Full board now; the Compact board and the list pages are read the
  same way before a rule is called held.

## Questions

1. **Gray 90's link on the trip card.** The card floats on Layer 02, and
   Carbon's own Gray 90 link blue there is 3.3 to 1, so its title's ghost
   button fails. Recommended: the floating card on Layer 01 in Gray 90, as
   in Gray 100, where the link is 4.5 or more. The other way is a Gray 90
   link token of Design's own, which leaves Carbon's.
2. **A third driver on a narrow bar.** The crew row keeps every name whole
   and cuts at the bar's end, so in Geist Dark's wider letters a third
   driver's mark is sliced at the edge. Recommended: the names give way in
   an ellipsis before any mark is cut, so every seat's mark shows whole.

## Tasks

- [ ] Settle question 1 and pass Gray 90.
- [ ] Settle question 2 and pass Geist Dark.
- [ ] Have `check-drawn.mjs` read the components page's Compact board and
  the list pages, and add here what it finds.
