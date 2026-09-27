---
type: plan
---

# Plan: the Route tab as the office's itinerary

## Goal

The office enters a customer's itinerary on the Route tab, stop by stop, and
the tab works out what the office needs from it: when the bus leaves and
reaches the yard, the miles, the driving and the on-duty time. A trip like the
Laredo volleyball trip of Sep 22 goes in whole, without workarounds.

## Decisions

- **On duty runs from the yard departure to the yard return,** less waits
  marked off duty or sleeper berth. It counts no inspection time before or
  after, which is why the Laredo trip reads 10 h 10 where its itinerary says
  13 h 45: 25 minutes before the yard, 10 after it, and the 2 h 45 sleeper.

## Questions

- Should on duty add a fixed pre-trip time before the yard departure and a
  post-trip time after the yard return, and how long is each? The Laredo
  itinerary uses 25 minutes before and 10 after.
- Should a wait marked sleeper berth count off the clock, as it does now, or
  stay on duty as the Laredo itinerary counts it?

## Tasks

- [ ] Count on duty the way the two answers above say, in the Stops totals
  and each day's figures.
