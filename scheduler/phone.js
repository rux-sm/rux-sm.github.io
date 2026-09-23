/* ==========================================================================
   Rux Scheduler — A PHONE NUMBER AS THE APP SHOWS IT
   --------------------------------------------------------------------------
   One way to write a number, loaded by every page that shows one: the board,
   the forms, and the Contacts, Customers and Drivers pages. A US number of
   ten digits reads (956) 994-1169, the way the letterhead writes the
   office's own, however it was typed.

   IT FORMATS WHAT IS SHOWN, NEVER WHAT IS STORED. A number is saved as it
   was typed, rux-ui still writes the same columns in whatever form its users
   type, and matching already compares digits alone, so the stored spelling
   decides nothing but how a number looks. A field that edits a number keeps
   it as typed.

   ANYTHING IT CANNOT READ FOR CERTAIN IS SHOWN AS TYPED: an extension, a
   word, another country's code, seven digits with no area code. A number is
   never shown wrong to be shown tidy.
   ========================================================================== */
(() => {
  'use strict';

  function format(value) {
    const typed = String(value ?? '').trim();
    // Digits and the marks people type between them, and nothing else.
    if (!/^\+?[\d\s().-]+$/.test(typed)) return typed;
    // A + before anything but 1 is another country's number.
    if (/^\+(?!\s*1)/.test(typed)) return typed;
    const digits = typed.replace(/\D/g, '').replace(/^1(?=\d{10}$)/, '');
    if (digits.length !== 10) return typed;
    return `(${digits.slice(0, 3)}) ${digits.slice(3, 6)}-${digits.slice(6)}`;
  }

  window.SchedulerPhone = { format };
})();
