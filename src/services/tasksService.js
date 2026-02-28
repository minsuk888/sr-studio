import { supabase } from '../lib/supabase';

export const tasksService = {
  async getAll() {
    const { data, error } = await supabase
      .from('tasks')
      .select('*')
      .order('id');
    if (error) throw error;
    return data;
  },

  async create(task) {
    const { data, error } = await supabase
      .from('tasks')
      .insert(task)
      .select()
      .single();
    if (error) throw error;
    return data;
  },

  async update(id, updates) {
    const { data, error } = await supabase
      .from('tasks')
      .update(updates)
      .eq('id', id)
      .select()
      .single();
    if (error) throw error;
    return data;
  },

  async delete(id) {
    const { error } = await supabase
      .from('tasks')
      .delete()
      .eq('id', id);
    if (error) throw error;
  },
};
