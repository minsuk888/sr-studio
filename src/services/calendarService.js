import { supabase } from '../lib/supabase';

export const calendarService = {
  async getAll() {
    const { data, error } = await supabase
      .from('calendar_events')
      .select('*')
      .order('date');
    if (error) throw error;
    return data;
  },

  async create(event) {
    const { data, error } = await supabase
      .from('calendar_events')
      .insert(event)
      .select()
      .single();
    if (error) throw error;
    return data;
  },

  async delete(id) {
    const { error } = await supabase
      .from('calendar_events')
      .delete()
      .eq('id', id);
    if (error) throw error;
  },
};
