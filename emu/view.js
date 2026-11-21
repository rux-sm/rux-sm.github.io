/* THE ROOM'S FRAME, BEFORE THE PAGE DRAWS. Where Rux Emu Helper answered the
   last time this browser opened the Library, the page is the room, and its
   frame is the room's tile (app.css). room.js keeps `emu.room` as it draws,
   and this says it on the root in the head, so the header's contents stand
   on the tile's edges from the first paint rather than moving there once
   the helper answers. */
(() => {
  try {
    if (localStorage.getItem('emu.room') === 'mac') document.documentElement.dataset.emuRoom = 'mac';
  } catch { /* A browser that keeps nothing is framed once the helper answers. */ }
})();
