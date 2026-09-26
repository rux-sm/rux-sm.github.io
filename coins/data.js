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
  // Plain text as an ilike pattern that contains it: % and _ escaped.
  const likeOf = text => `%${String(text).replace(/[\\%_]/g, c => '\\' + c)}%`;
  // Today as an ISO date, on this device's calendar.
  const todayIso = () => { const d = new Date(); return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`; };

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
    // The household, with the address every bill's login is moving to.
    async household() {
      const { data: rows, error } = await client.from('coins_households').select('id, name, main_login').limit(1);
      fail(error);
      return rows[0] ?? null;
    },
    async checkBill(id, patch = {}) {
      const { data: bill, error } = await client.from('coins_bills').update({ ...patch, checked_on: todayIso() }).eq('id', id).select('*').single();
      fail(error);
      return bill;
    },
    people: () => all(() => client.from('coins_people').select('id, household_id, name, sort, user_id').order('sort')),
    accounts: () => all(() => client.from('coins_accounts').select('*').order('name')),
    async updateAccount(id, patch) {
      const { data: saved, error } = await client.from('coins_accounts').update(patch).eq('id', id).select('*').single();
      fail(error);
      return saved;
    },
    rules: () => all(() => client.from('coins_rules').select('*').order('sort').order('created_at')),
    imports: () => all(() => client.from('coins_imports').select('*').order('created_at', { ascending: false })),

    async addAccount(row) {
      const { data: saved, error } = await client.from('coins_accounts').insert(row).select('*').single();
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

    // Every field a line shows and edits, for the Transactions page.
    lines: (from, to) => all(() => client.from('coins_transactions')
      .select('id, account_id, day, description, amount, kind, kind_by_hand, category, bank_category, merchant, note, seen, bill_id')
      .gte('day', from).lt('day', to).order('day', { ascending: false }).order('id')),

    async updateLine(id, patch) {
      fail((await client.from('coins_transactions').update(patch).eq('id', id)).error);
    },

    async markSeen(ids) {
      for (let i = 0; i < ids.length; i += 200) {
        fail((await client.from('coins_transactions').update({ seen: true }).in('id', ids.slice(i, i + 200))).error);
      }
    },

    /* A RULE, added or changed, and every line it already fits. A line whose
       kind was set by hand keeps it; the rule's merchant and category still
       reach it. The match is plain text, so % and _ are escaped for ilike.
       Returns the rule and how many lines changed. */
    async saveRule(rule) {
      const q = rule.id ? client.from('coins_rules').update(rule).eq('id', rule.id) : client.from('coins_rules').insert(rule);
      const { data: made, error } = await q.select('*').single();
      fail(error);
      const like = likeOf(rule.match);
      const set = {};
      if (rule.merchant) set.merchant = rule.merchant;
      if (rule.category) set.category = rule.category;
      let changed = 0;
      if (Object.keys(set).length) {
        const { data: rows, error: e } = await client.from('coins_transactions').update(set).ilike('description', like).select('id');
        fail(e); changed = rows.length;
      }
      if (rule.kind) {
        const { data: rows, error: e } = await client.from('coins_transactions').update({ kind: rule.kind }).ilike('description', like).eq('kind_by_hand', false).select('id');
        fail(e); changed = Math.max(changed, rows.length);
      }
      return { rule: made, changed };
    },

    // Deleting a rule leaves the lines it sorted as they are.
    async deleteRule(id) {
      fail((await client.from('coins_rules').delete().eq('id', id)).error);
    },

    // How many saved lines a rule's text is found in.
    async ruleLines(match) {
      const { count, error } = await client.from('coins_transactions').select('id', { count: 'exact', head: true }).ilike('description', likeOf(match));
      fail(error);
      return count;
    },

    // Money that left from `from` on, with what a bill or a suggestion needs.
    outgoing: from => all(() => client.from('coins_transactions')
      .select('id, account_id, day, amount, kind, merchant, description, bill_id')
      .gte('day', from).lt('amount', 0).order('day').order('id')),

    // Every line a bill has, however old.
    billLines: billId => all(() => client.from('coins_transactions')
      .select('id, account_id, day, amount, kind, merchant, description, bill_id')
      .eq('bill_id', billId).order('day').order('id')),

    skips: () => all(() => client.from('coins_bill_skips').select('merchant')),
    async skip(householdId, merchant) {
      fail((await client.from('coins_bill_skips').insert({ household_id: householdId, merchant })).error);
    },

    /* SAVING A BILL, and linking its lines. The lines it had are let go and
       every money-out line whose merchant or description contains its match
       is linked again, so a changed match moves the right lines. A line
       another bill already holds stays with that bill. */
    async saveBill(row) {
      const q = row.id ? client.from('coins_bills').update(row).eq('id', row.id) : client.from('coins_bills').insert(row);
      const { data: bill, error } = await q.select('*').single();
      fail(error);
      fail((await client.from('coins_transactions').update({ bill_id: null }).eq('bill_id', bill.id)).error);
      const m = String(bill.match || '').trim();
      if (m.length >= 3) {
        const like = likeOf(m);
        for (const field of ['merchant', 'description']) {
          fail((await client.from('coins_transactions').update({ bill_id: bill.id })
            .is('bill_id', null).lt('amount', 0).ilike(field, like)).error);
        }
      }
      return bill;
    },

    async deleteBill(id) {
      fail((await client.from('coins_bills').delete().eq('id', id)).error);
    },

    // The plan's flexible and yearly lines; fixed bills come from coins_bills.
    budget: () => all(() => client.from('coins_budget').select('*').order('part').order('sort').order('name')),
    async saveBudget(row) {
      const q = row.id ? client.from('coins_budget').update(row).eq('id', row.id) : client.from('coins_budget').insert(row);
      const { data: saved, error } = await q.select('*').single();
      fail(error);
      return saved;
    },
    async deleteBudget(id) {
      fail((await client.from('coins_budget').delete().eq('id', id)).error);
    },

    // Whether anything has ever been imported, for the empty notice.
    async anyTransactions() {
      const { count, error } = await client.from('coins_transactions').select('id', { count: 'exact', head: true });
      fail(error);
      return count > 0;
    },
  };

  window.Coins = Object.assign(window.Coins || {}, { data });
})();
