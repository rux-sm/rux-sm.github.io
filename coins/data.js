/* ==========================================================================
   data.js — Coins' reads
   --------------------------------------------------------------------------
   Every read goes to a coins_ table, which row security narrows to the
   household the signed-in account is a member of; an account that is not a
   member reads nothing. The client is the account's, from /account.js.
   ========================================================================== */
(() => {
  'use strict';

  const client = window.Rux?.account?.client ?? null;
  const fail = error => { if (error) throw error; };

  // Supabase answers at most 1000 rows a request, so a long read is paged.
  const all = async make => {
    const out = [];
    for (let from = 0; ; from += 1000) {
      const { data, error } = await make().range(from, from + 999);
      fail(error);
      out.push(...data);
      if (data.length < 1000) return out;
    }
  };

  const data = client && {
    people: () => all(() => client.from('coins_people').select('id, name, sort, user_id').order('sort')),
    accounts: () => all(() => client.from('coins_accounts').select('id, person_id, name, kind, last4, closed').order('name')),
    bills: () => all(() => client.from('coins_bills').select('*').order('name')),

    // Lines whose day falls in [from, to), both ISO dates.
    transactions: (from, to) => all(() => client.from('coins_transactions')
      .select('id, account_id, day, amount, kind, bill_id')
      .gte('day', from).lt('day', to).order('day').order('id')),

    // Whether anything has ever been imported, for the empty notice.
    async anyTransactions() {
      const { count, error } = await client.from('coins_transactions').select('id', { count: 'exact', head: true });
      fail(error);
      return count > 0;
    },
  };

  window.Coins = Object.assign(window.Coins || {}, { data });
})();
