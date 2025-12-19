import crypto from 'crypto';

export function createTimelineRepository({ supabase, useMemoryStore }) {
  const memory = {
    accounts: [],
    events: [],
  };

  const insertAccountMemory = async (payload) => {
    const now = new Date().toISOString();
    const account = {
      id: crypto.randomUUID(),
      created_at: now,
      updated_at: now,
      ...payload,
    };
    memory.accounts.push(account);
    return account;
  };

  const updateAccountMemory = async (id, updates) => {
    const index = memory.accounts.findIndex((a) => a.id === id);
    if (index === -1) return null;
    const updated = { ...memory.accounts[index], ...updates, updated_at: new Date().toISOString() };
    memory.accounts[index] = updated;
    return updated;
  };

  const insertEventMemory = async (payload) => {
    const now = payload.created_at || new Date().toISOString();
    const event = {
      id: crypto.randomUUID(),
      created_at: now,
      ...payload,
    };
    memory.events.push(event);
    return event;
  };

  return {
    async createAccount(accountPayload) {
      if (useMemoryStore || !supabase) {
        return insertAccountMemory(accountPayload);
      }
      const { data, error } = await supabase.from('accounts').insert(accountPayload).select().single();
      if (error) throw error;
      return data;
    },

    async updateAccount(id, updates) {
      if (useMemoryStore || !supabase) {
        return updateAccountMemory(id, updates);
      }
      const { data, error } = await supabase.from('accounts').update(updates).eq('id', id).select().single();
      if (error) throw error;
      return data;
    },

    async getAccount(id) {
      if (useMemoryStore || !supabase) {
        return memory.accounts.find((a) => a.id === id) || null;
      }
      const { data, error } = await supabase.from('accounts').select('*').eq('id', id).single();
      if (error && error.code !== 'PGRST116') throw error;
      return data || null;
    },

    async listEvents(accountId, { limit = 50 } = {}) {
      if (useMemoryStore || !supabase) {
        return memory.events
          .filter((e) => e.account_id === accountId)
          .sort((a, b) => new Date(b.created_at) - new Date(a.created_at))
          .slice(0, limit);
      }
      const { data, error } = await supabase
        .from('events')
        .select('*')
        .eq('account_id', accountId)
        .order('created_at', { ascending: false })
        .limit(limit);
      if (error) throw error;
      return data || [];
    },

    async insertEvent(eventPayload) {
      if (useMemoryStore || !supabase) {
        return insertEventMemory(eventPayload);
      }
      const { data, error } = await supabase.from('events').insert(eventPayload).select().single();
      if (error) throw error;
      return data;
    },

    async upsertAccount(accountPayload) {
      const existing = accountPayload.id ? await this.getAccount(accountPayload.id) : null;
      if (!existing) {
        return this.createAccount(accountPayload);
      }
      return this.updateAccount(accountPayload.id, accountPayload);
    },
  };
}
