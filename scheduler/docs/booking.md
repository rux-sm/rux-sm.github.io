---
type: how-to
---

# Booking a trip

How a sent quote becomes a confirmed trip, and what to tell the customer at
each step. Most often it answers "what are the next steps to secure the
reservation?"

The customer signs the printed quote's wording, which lives in `../print.js`:
`QUOTE_TERMS` on the quote and `AGREEMENT_POLICIES` on the Terms and Conditions
Agreement Form printed behind it. If this page and that wording ever disagree,
the signed wording wins and this page gets fixed. Prices and rates stay off this
page because the repository is public. `quote-calculator.md` covers pricing.

## 1. A request from the website

The company website's quote form puts each request on the board's To do list as a
New quote, due the day it came in and added by Website. Its lines are the
request's number, the customer's name, phone and email, whether a purchase
order pays, when the trip leaves and comes back, a wheelchair lift where they
need one, and their own words. A request sent in Spanish says so; answer it in
Spanish.

1. Open the row and press **Start trip**. The trip editor opens filled in from
   the request, with a notice of what it said beyond its fields. Choose the
   pickup and the destination from their lists on the Route tab, check the
   marked fields, price the trip and Save. The request and the row now name
   the trip, and the row's Trip opens it.
2. Send the quote as the next step says, writing from Missive to the email on
   the request. The customer has no copy of what they asked, so a question
   about it goes in that email.
3. Tick the row Done once the quote is sent. A trip leaving in the next few
   days was asked to call; one that has not, call.

## 2. Send the quote

Print the customer quote from the trip on `print.html` and save it as a PDF.
The PDF is two sheets, the quote and the Terms and Conditions form. Always send
both.

The quote's Estimate no. is the trip's six-digit number. Type the same number
into the QuickBooks estimate's Estimate no., so the customer, the estimate and
the trip share one number until QuickBooks gives the invoice its own.

When the customer asks for something to appear on the quote, add it as a line
under the first line item, so the copy they sign carries it:

- their bid, reference or P.O. request number, with Add a line on the sheet
- a requirement they need in writing, such as an ADA-accessible bus with a
  driver trained on its wheelchair lift and securement, the same way
- a discount, as a line of its own on the trip's Billing tab, because the
  sheet's prices are the trip's and are not typed over

Before a trip is confirmed the customer has to know the following. The quote
and its Terms and Conditions form say most of it, so the email that goes with
them stays short; `.claude/skills/trips/emails.md` is how that email is
written.

- The quote is held on the calendar for one week, and we extend the hold when
  asked. The office says this; it is on no sheet the customer signs.
- The trip is confirmed once we receive the **signed quote** and the **signed
  Terms and Conditions form**, plus a **20% down payment**. A school district can
  send a **purchase order** in place of the down payment.
- Full payment is due at least one week before departure. A school district
  with a P.O. is billed against the P.O.
- A credit card payment carries a 4% processing fee.
- Payments go to the office by mail or hand delivery, and P.O.s and signed forms
  can also be emailed. Nothing is ever handed to a driver.
- We need a detailed itinerary: departure and arrival times, every place
  visited, and a primary and an alternate contact, each with full name, cell
  phone and email.
- A school sends the final itinerary before the P.O., because the price can
  change with the itinerary.

## 3. Follow up

If the customer has not answered after the office's follow-up wait, the trip
shows under Needs follow-up on `trips.html`, and its bar on the board counts
the reminder among its alerts. The wait runs from the last update, or from the
day the quote is marked sent. A quote not answered yet is chased only once its
trip is inside the office's chase window, 60 days unless the Follow-ups dialog
says otherwise. A trip leaving within a week that still waits on something
shows there too, however recent its updates. A reminder cannot be dismissed:
it stays until the missing thing arrives or an update is written. Send a short
check-in. It can say that we price-match and can work with their budget.

## 4. When the customer says yes

Reply the same day with the next steps, in this order:

1. **Read the trip back.** Name the dates, the destination and the number of
   buses, and say they are still held. If the acceptance names a different city
   or date than the quote, ask which one is right. Requote if the change moves
   the miles.
2. **What we still need.** The signed quote and the signed Terms and Conditions
   form. If they never received the form, attach it again.
3. **The final itinerary,** with its two contacts. A school sends it before the
   P.O.
4. **The P.O. or the 20% down payment,** then full payment one week before
   departure.
5. **Driver hotel,** on an overnight trip. The customer provides the drivers' hotel room,
   separate from the passengers. Two drivers need at least one room with two
   separate beds, and a sofa bed does not count.
6. **Where to send it:** 2801 Zinnia Ave., McAllen, TX 78504, or email for the
   P.O. and forms, and (956) 994-1169 for questions.

When a customer asks for particular drivers, say we will do our best. Do not
promise anyone until dispatch has assigned them.

## 5. Record it on the trip

Record each piece as it arrives, on the trip editor's Billing tab: the contract
signed, the P.O. with its number and amount, or the deposit as a payment. The
tab shows when the trip counts as confirmed, which follows the office's billing
workflow in `../billing.js`.

On the trip itself:

- Mark ADA Lift on the vehicle that needs it, in its window on the Buses tab,
  and pick a unit that has a lift.
- Add a Hotel line on the Billing tab only when the office books the drivers'
  room itself, with its price. It does not mean the trip is overnight. Typing
  the confirmation number in the line's window marks it booked, as the bar
  menu's Mark hotel booked does.
- Add a fuel card from the Route tab's menu, on its first day's line, or
  from the note the Route tab shows when a trip is past the office's miles
  or days.
- Attach the final itinerary when it comes in, and fill in the trip contacts
  from it.
