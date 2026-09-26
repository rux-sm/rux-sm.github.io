/* ==========================================================================
   data.js — Coins' reads and writes
   --------------------------------------------------------------------------
   Every call goes to a coins_ table, which row security narrows to the
   household the signed-in account is a member of; an account that is not a
   member reads and writes nothing. The client is the account's, from /account.js.
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
    people: () => all(() => client.from('coins_people').select('id, household_id, name, sort, user_id').order('sort')),
    accounts: () => all(() => client.from('coins_accounts').select('id, household_id, person_id, name, kind, last4, institution, closed').order('name')),
    rules: () => all(() => client.from('coins_rules').select('match, merchant, kind, category, sort').order('sort')),
    imports: () => all(() => client.from('coins_imports').select('*').order('created_at', { ascending: false })),

    async addAccount(row) {
      const { data: saved, error } = await client.from('coins_accounts').insert(row).select('id, household_id, person_id, name, kind, last4, institution, closed').single();
      fail(error);
      return saved;
    },

    // What one account already holds between two days, as the bank reported it.
    saved: (accountId, from, to) => all(() => client.from('coins_transactions')
      .select('day, description, amount, bank_type, occurrence')
      .eq('account_id', accountId).gte('day', from).lte('day', to).order('id')),

    /* SAVING A FILE. The import row first, then its lines in batches; a line
       the account already holds is skipped by the database's own key, so a
       repeat or an overlap adds nothing twice. Returns how many were added. */
    async saveImport(meta, lines) {
      const { data: made, error } = await client.from('coins_imports').insert(meta).select('id').single();
      fail(error);
      let added = 0;
      for (let i = 0; i < lines.length; i += 500) {
        const batch = lines.slice(i, i + 500).map(l => ({ ...l, import_id: made.id }));
        const { data: rows, error: e } = await client.from('coins_transactions')
          .upsert(batch, { onConflict: 'account_id,day,description,amount,bank_type,occurrence', ignoreDuplicates: true })
          .select('id');
        fail(e);
        added += rows.length;
      }
      fail((await client.from('coins_imports').update({ rows_added: added }).eq('id', made.id)).error);
      return { id: made.id, added };
    },

    // Undoing an import deletes it, and its lines go with it.
    async undoImport(id) {
      fail((await client.from('coins_imports').delete().eq('id', id)).error);
    },
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
