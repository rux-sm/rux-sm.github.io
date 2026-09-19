---
type: plan
---

# Plan: one margin and one outline, at every width

## Goal

The scheduler's board stands on 16px of page at every width, and the schedule
carries its four sides and its 12px corners at every width. Neither changes at
any breakpoint. The compact board still draws seven blocks on a phone, which is
a decision about the week and not about the box around it.

## Decisions

### 16px of page, at every width, in this app only

The scheduler is the densest workspace on the site, so its margin is the
smallest one that still reads as a margin: `spacing-05` rather than Carbon's
`spacing-07`, which buys the board 32px of width.

It is already this app's alone. The rule sits in the scheduler's own
`overrides.css`, which only its pages link, so Home, Notes and Design keep
Carbon's own padding untouched.

16px is also what a panel in front of the board and the toast already inset
themselves by, so the page's margin and the cards standing on it become one
number.

16px rather than more, because the compact board has to fit seven days: at
16px a 402px phone leaves the week 368px and it draws without scrolling
sideways, at 375px it leaves 343px and still does, and at 48px it leaves 306px
against the 312px seven days need and the week starts scrolling.

### The schedule's outline never changes

A side line and a rounded corner want a page behind them, and with 16px at
every width there is always one. So nothing takes the edge away: not a week
that scrolls, not a panel in front, not the phone.

### Two rules come out

`theme.css` drops the sides and corners while the week scrolls with nothing
beside it, which starts around 986px. `app.css` drops the whole edge on the
compact board. Both go.

`data-week` has one reader and the `crowded` value behind it has none, so the
attribute, the value `fit` keeps and the `crowded` entry on `Rux.schedule` come
out with the first of them. `fitColumns` keeps its own internal answer, which is
what decides whether the day columns take the remainder.

### The compact board keeps only what it is about

The day columns, the block's height, the day band's numbers and the docked
sheet. It stops touching the frame's border, its radius token and the
last-rule trade, because the board it draws now sits on a page like any other.

### The last row keeps its own rule nowhere

With the edge never coming off, the frame's bottom border closes both lists at
every width, so `--scheduler-last-rule` stays at the 0 the geist block already
gives it and no width hands the rule back.

## Questions

- **Does the 16px apply above and below the board as well as beside it?** The
  sides are what this plan measures. Carbon's own 32px still stands top and
  bottom, and matching them to the sides changes how far the toolbar sits under
  the shell header on every page in the app.

## Tasks

- [ ] Give `.rux--content` 16px of inline padding at every width in
      `scheduler/overrides.css`, keeping the landscape safe areas and the home
      bar the foot already clears, and confirm `fitHeight` still stops the grid
      above the bar.
- [ ] Take the crowded rule out of `scheduler/theme.css`, and the `data-week`
      write, the `crowded` value and its `Rux.schedule` entry out of
      `scheduler/app.js`.
- [ ] Take the border, the radius token and the last-rule trade out of the
      compact rule in `scheduler/app.css`, leaving it the day columns, the
      block, the day band and the docked sheet.
- [ ] Check the docked sheet is still square with the radius token back at
      12px: it sets its own `border-radius: 0`, but `.scheduler-bar-shortcut`'s
      `:last-child` rule reads the token and the sheet's last child is a slot.
- [ ] Read the schedule in geist at 1440, 1000, 900, 700, 660 and 402, alone
      and with the roster, the trip editor and the document viewer, and confirm
      the box is the same box at every one.
- [ ] Read a phone at 402 and 375 and confirm the week still draws seven days
      without scrolling sideways, and that the board reads as a card rather
      than as the screen.
- [ ] Read the same widths in ant-dark, g100, g10 and spotify-dark, and the
      other scheduler pages, which take the same new margin.
