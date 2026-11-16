---
type: plan
---

# Plan: the quote PDF attached to the reply draft

## Goal

When Claude drafts a quote reply in Missive, the quote's PDF is already
attached to the draft. rux reads the draft, presses Send, and prints the
Office copy. Nobody saves a PDF or drags it into an email.

How a quote is sent today is in `scheduler/docs/booking.md`, section 2, and
step 12 of `.claude/skills/trips/SKILL.md`.

## Decisions

- **Chrome draws the PDF from the quote form.** The quote is drawn by
  `scheduler/print.js` alone, so a PDF drawn any other way, such as pdf-lib
  in an Edge Function, would be a second drawing of it that could come out
  different. An Edge Function cannot run Chrome, so the PDF is made on rux's
  Mac.
- **The PDF is made from the quote as rux's Chrome shows it.** That includes
  anything typed on the sheet, which is the last word on what the customer
  sees. Claude, in rux's Chrome, sends the form's two sheets to a tool
  listening on `127.0.0.1`. The tool loads them in headless Chrome with
  `print.css` and saves them with DevTools' `Page.printToPDF` at the form's
  own paper size. This loopback route is needed because Claude in Chrome
  returns only about 1,000 characters from a page.
- **`print.js` hands over the sheets itself.** A function beside
  `SchedulerForms` returns the form's sheets and paper as it would print
  them, so the tool never has to know how a form is drawn.
- **Both sheets go out: the quote and the Terms and Conditions.**
  `booking.md` says to send both.
- **The file is named as Save as PDF names it today:** `file-names.js`'s quote
  name, such as `2026-09-29_qte_utrgv-edinburg_100878.pdf`.
- **The draft is made through Missive's REST API, not the connector.** The
  connector's `compose_draft` cannot attach a file, and the API attaches
  files only when it creates a draft. So the tool creates the whole reply:
  it goes in the request's conversation, from the address the request was
  sent to, with `Re:` and the request's subject, the body Claude wrote by
  `emails.md`, the default signature, and the PDF. It never sets `send`.
- **One tool on the Mac does both steps:** `scheduler/tools/draft-quote-email.mjs`
  makes the PDF and creates the draft, and prints the draft's id. Claude runs it
  from a session on rux's Mac. On the phone or the web, the steps stay as
  they are today.
- **The Missive token is rux's own API token, kept in the macOS Keychain.**
  The tool reads it with `security find-generic-password`. It never goes in
  the repository, a file or the chat, because Missive tokens are personal
  and act as the person who made them.
- **The tool refuses a request over Missive's 10 MB limit and says so.** A
  two-sheet quote is far under it.
- **A page served from rux-sm.github.io is let through to the tool.** Chrome
  asks before a public page sends to a local address, so the tool answers
  that check. It accepts only that site and `http://localhost:8641`, and only
  while it is running.
- **The trip is not touched.** Quote sent is still rux's mark, made after he
  sends the email (the trips skill's step 13).

## Questions

- Is the team's Missive organisation on the Productive plan? Missive gives
  API tokens only on that plan, and this plan depends on one.
- What name should the Keychain item have? The plan assumes
  `missive-api-token` under rux's own account.
- If a quote reply is drafted again, should the tool delete Claude's earlier
  draft in that conversation? Missive cannot change a draft, so a second
  draft would otherwise sit beside the first.
- Should the same tool later attach other files, such as an insurance
  certificate from the Documents page? `scheduler-certificates.md` asks the
  same question. This plan builds the quote only.

## Tasks

- [ ] Add to `print.js` the function that returns the open form's sheets and
      its paper as they would print, and use it from the Forms page and
      from the board's panel.
- [ ] Write `scheduler/tools/draft-quote-email.mjs`. It listens on loopback
      for the sheets, makes the PDF in headless Chrome, and creates the
      Missive draft with the PDF attached, in the request's conversation,
      never sent. It prints the draft's id, or why it stopped.
- [ ] Add `scheduler/tools/check-quote-pdf.mjs` to `npm run check`. It runs
      the PDF step on an invented quote through `tools/lib/headless.mjs`
      and checks for two Letter pages and the right file name, without
      calling Missive.
- [ ] Rewrite step 12 of the trips skill and section 2 of `booking.md`:
      Claude drafts the reply with the PDF attached, the body still follows
      `emails.md`, and rux sends it and prints the Office copy.
- [ ] Draft one real quote reply this way in a session, open the draft in
      Missive, and confirm the attachment is the quote with anything typed
      on it. The session's report says what only a real send would prove.
