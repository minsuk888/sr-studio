import { supabase } from '../lib/supabase';

export const ticketService = {
  // ---- Rounds ----
  async getRounds() {
    const { data, error } = await supabase
      .from('ticket_rounds')
      .select('*')
      .order('event_date', { ascending: false });
    if (error) throw error;
    return data;
  },

  async createRound(round) {
    const { data, error } = await supabase
      .from('ticket_rounds')
      .insert(round)
      .select()
      .single();
    if (error) throw error;
    return data;
  },

  async updateRound(id, updates) {
    const { data, error } = await supabase
      .from('ticket_rounds')
      .update(updates)
      .eq('id', id)
      .select()
      .single();
    if (error) throw error;
    return data;
  },

  async deleteRound(id) {
    const { error } = await supabase
      .from('ticket_rounds')
      .delete()
      .eq('id', id);
    if (error) throw error;
  },

  // ---- Sales ----
  async getSales(roundId) {
    const { data, error } = await supabase
      .from('ticket_sales')
      .select('*')
      .eq('round_id', roundId)
      .order('sale_date', { ascending: true });
    if (error) throw error;
    return data;
  },

  async upsertSale({ round_id, sale_date, sales, memo }) {
    const { data, error } = await supabase
      .from('ticket_sales')
      .upsert(
        { round_id, sale_date, sales, memo },
        { onConflict: 'round_id,sale_date' },
      )
      .select()
      .single();
    if (error) throw error;
    return data;
  },

  async deleteSale(id) {
    const { error } = await supabase
      .from('ticket_sales')
      .delete()
      .eq('id', id);
    if (error) throw error;
  },
};
