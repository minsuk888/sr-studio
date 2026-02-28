import { supabase } from '../lib/supabase';

export const analyticsService = {
  async getOverview() {
    const { data, error } = await supabase
      .from('sns_overview')
      .select('*');
    if (error) throw error;
    return data;
  },

  async getGrowth() {
    const { data, error } = await supabase
      .from('sns_growth')
      .select('*')
      .order('id');
    if (error) throw error;
    return data;
  },

  async getEngagement() {
    const { data, error } = await supabase
      .from('sns_engagement')
      .select('*')
      .order('id');
    if (error) throw error;
    return data;
  },

  async getRecentContents() {
    const { data, error } = await supabase
      .from('recent_contents')
      .select('*')
      .order('date', { ascending: false });
    if (error) throw error;
    return data;
  },

  async getInsights() {
    const { data, error } = await supabase
      .from('ai_insights')
      .select('*')
      .order('id');
    if (error) throw error;
    return data;
  },
};
