---
type: reference
---

# Writing a customer email

rux keeps the master copy of these rules in a claude.ai project, which Claude
Code cannot open. This is his copy; when he changes the project, ask him for
the new text and replace this file with it.

## Before writing

- The quote is the source of truth: price, dates, buses, discounts. Never invent a detail; if the request and the quote disagree, tell rux first.
- Look up in the scheduler the customer's past trips (mention one only if it fits a short sentence), the trip's dates, buses and status, any drivers asked for (report them, never promise them), and bus availability before saying buses are free or held.
- Never put another customer's trips in an email.
- Read every attached document before calling it attached or current, and warn when an insurance policy has expired or ends within 30 days.

## Voice

- Professional, friendly, short: two or three sentences and under 50 words by default, four paragraphs at most.
- Simple words and contractions. No em dashes, bullet points or bold.
- Leave out what the customer already knows or has on the quote: dates, terms, requirements, the driver hotel policy.
- Never ask the customer for a headcount, even when the itinerary gives none, because rux leaves it out of his emails.
- Good: "Thanks for reaching out." "I've attached the updated quote." "Please take a look and let me know if you have any questions." "We'd be happy to work with you again."
- Never: "I hope this email finds you well", "do not hesitate", "kindly", "I wanted to reach out", "Just a friendly reminder", sales pressure, more than one exclamation point, thanking twice, repeating their email back.

## Never promise

- A driver: only "we'll do our best, depending on availability".
- Availability that is not confirmed, or a discount beyond the quote.
- A booking before signed paperwork and a deposit or PO; a PO in progress is "we'll hold the buses while it goes through".
- A changed date or route may change the price.
- A partner company covering buses we lack, since it may not be possible when the day comes.

## By type

- **Quote:** a friendly line that the quote they asked for is attached, personal to their trip, answering any question in their email and inviting questions. Do not state the amount, which the quote shows, unless rux gives a price fact such as a matched price.
- **Lower price:** only a confirmed discount; ask for their budget if they want one.
- **PO:** thank them, name the buses and dates, and say the buses are held while it goes through.
- **Follow-up:** one or two sentences, any urgency stated as fact.
- **Payment:** polite and direct, asking for the check number.
- **Cancellation:** confirm which trip and date; no fees unless asked.

## What to send back to rux

Every draft is made in Missive, in the customer's thread, as `SKILL.md`
describes under Missive, because rux reviews and sends it there; the chat
reply says it is there and gives the same text. It goes out only when rux
sends it himself or asks in chat for it to be sent, and never from Gmail,
which is his personal mail.

"Note:" lines first, one each, only for what rux must act on. Then the email
alone: no preamble, no quotation marks, no subject line unless asked, ending
with "Thank you," and no name after it, because Missive adds his signature,
which already carries his name. If something missing blocks an accurate reply,
ask one short question instead.
