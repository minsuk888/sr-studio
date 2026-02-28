import { supabase } from '../lib/supabase';

export const membersService = {
  async getAll() {
    const { data, error } = await supabase
      .from('members')
      .select('*')
      .order('id');
    if (error) throw error;
    return data;
  },

  async create(member) {
    const { data, error } = await supabase
      .from('members')
      .insert(member)
      .select()
      .single();
    if (error) throw error;
    return data;
  },

  async update(id, updates) {
    const { data, error } = await supabase
      .from('members')
      .update(updates)
      .eq('id', id)
      .select()
      .single();
    if (error) throw error;
    return data;
  },

  async delete(id) {
    const { error } = await supabase
      .from('members')
      .delete()
      .eq('id', id);
    if (error) throw error;
  },
};
