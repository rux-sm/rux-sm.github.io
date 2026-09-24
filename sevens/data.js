/* ==========================================================================
   data.js — Sevens' reads, moves and live updates
   --------------------------------------------------------------------------
   Every move is a database function that checks it is the caller's to make
   (sevens_open, sevens_join, sevens_start, sevens_flip, sevens_stay,
   sevens_choose, sevens_deal, sevens_skip, sevens_leave); the rules run
   there, not here. Pages read the five sevens_ tables, which row security
   narrows to what the account may see, so a card still in the deck never
   reaches a page. The client is the account's, from /account.js.

   Live updates are Supabase's table changes. Any change calls `listen`'s
   callback, and the page reads again rather than patching, so a missed or
   repeated message cannot leave it wrong.
   ========================================================================== */
(() => {
  'use strict';

  const client = window.Rux?.account?.client ?? null;
  const fail = error => { if (error) throw error; };
  const rows = async query => { const { data, error } = await query; fail(error); return data; };

  const data = client && {
    async me() {
      const { data: { session } } = await client.auth.getSession();
      return session?.user?.id ?? null;
    },

    // Every table this account can see: the waiting ones, and its own.
    async lobby() {
      const [tables, seats] = await Promise.all([
        rows(client.from('sevens_tables').select('*').order('created_at', { ascending: false })),
        rows(client.from('sevens_seats').select('*').order('seat')),
      ]);
      return { tables, seats };
    },

    // One game as its players see it.
    async game(id) {
      const [tables, seats, cards, moves, messages] = await Promise.all([
        rows(client.from('sevens_tables').select('*').eq('id', id)),
        rows(client.from('sevens_seats').select('*').eq('table_id', id).order('seat')),
        rows(client.from('sevens_cards').select('*').eq('table_id', id).order('drawn')),
        rows(client.from('sevens_moves').select('*').eq('table_id', id).order('id', { ascending: false }).limit(12)),
        rows(client.from('sevens_messages').select('*').eq('table_id', id).order('id', { ascending: false }).limit(60)),
      ]);
      return { table: tables[0] ?? null, seats, cards, moves: moves.reverse(), messages: messages.reverse() };
    },

    async move(name, args = {}) {
      const { data: result, error } = await client.rpc(name, args);
      fail(error);
      return result;
    },

    async say(tableId, body) {
      fail((await client.from('sevens_messages').insert({ table_id: tableId, body })).error);
    },

    /* LIVE. With a table id, that table's changes; without one, any table's,
       for the Tables page. Returns a function that stops listening. */
    listen(tableId, onChange) {
      const filter = tableId ? { filter: `table_id=eq.${tableId}` } : {};
      const channel = client.channel(`sevens-${tableId || 'lobby'}-${Math.random().toString(36).slice(2)}`);
      const on = (table, extra = filter) => channel.on('postgres_changes', { event: '*', schema: 'public', table, ...extra }, onChange);
      if (tableId) {
        on('sevens_tables', { filter: `id=eq.${tableId}` });
        on('sevens_seats');
        on('sevens_moves');
        on('sevens_messages');
      } else {
        on('sevens_tables');
        on('sevens_seats');
      }
      channel.subscribe();
      return () => client.removeChannel(channel);
    },
  };

  window.Sevens = Object.assign(window.Sevens || {}, { data });
})();
