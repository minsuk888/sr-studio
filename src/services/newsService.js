import { supabase } from '../lib/supabase';

export const newsService = {
  async getAll() {
    const { data, error } = await supabase
      .from('news_articles')
      .select('*')
      .order('date', { ascending: false });
    if (error) throw error;
    return data;
  },

  async getBySource(source) {
    const { data, error } = await supabase
      .from('news_articles')
      .select('*')
      .eq('source', source)
      .order('date', { ascending: false });
    if (error) throw error;
    return data;
  },

  async search(keyword) {
    const { data, error } = await supabase
      .from('news_articles')
      .select('*')
      .or(`title.ilike.%${keyword}%,summary.ilike.%${keyword}%`)
      .order('date', { ascending: false });
    if (error) throw error;
    return data;
  },
};
