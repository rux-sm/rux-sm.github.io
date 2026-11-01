---
type: reference
---

# Motion

Anything on these sites that moves follows Carbon's motion guidance: its
curves, its durations, and its rule that a larger move takes longer. The source
is Carbon's motion overview, on carbondesignsystem.com under Elements, and in
the gitignored quarry at `carbon-website/src/pages/elements/motion/`.

## Two styles

- **Productive** is for frequent working moves the person is busy around:
  moving through weeks, opening a row, a menu, a hover. Most motion here is
  productive.
- **Expressive** is for rare moments that should be noticed: a page or panel
  arriving, an alert, the primary action.

## Curves

| Curve | Productive | Expressive |
| :--- | :--- | :--- |
| Standard, moving on screen | `cubic-bezier(0.2, 0, 0.38, 0.9)` | `cubic-bezier(0.4, 0.14, 0.3, 1)` |
| Entrance, arriving | `cubic-bezier(0, 0, 0.38, 0.9)` | `cubic-bezier(0, 0, 0.3, 1)` |
| Exit, leaving | `cubic-bezier(0.2, 0, 1, 0.9)` | `cubic-bezier(0.4, 0.14, 1, 1)` |

## Durations

| Token | Duration | For |
| :--- | :--- | :--- |
| `fast-01` | 70ms | a button or toggle |
| `fast-02` | 110ms | a fade |
| `moderate-01` | 150ms | a small expansion, a short move |
| `moderate-02` | 240ms | an expansion, a toast |
| `slow-01` | 400ms | a large expansion or move |
| `slow-02` | 700ms | dimming the background |

A move picks its duration by how far it goes, the larger the longer, within
this scale; productive motion sits toward the short end of it.

## Where Carbon has no answer

A motion Carbon does not cover says so in a comment beside it, with what it
uses instead. Two exist now, both in `scheduler/data.js`:

- **Following a hand.** A trackpad gesture moves the board one to one, and its
  landing eases out from the hand's own speed, so its time comes from that
  speed rather than the scale.
- **A move whose end changes on the way.** A second arrow press while the board
  is still gliding carries the glide's speed into a critically damped spring,
  rather than starting a Carbon curve again from rest.

Where the computer asks for reduced motion, a move happens at once.
