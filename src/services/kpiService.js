import { supabase } from '../lib/supabase';

const API_BASE = import.meta.env.DEV ? '' : '';

export const kpiService = {
  async getAll() {
    const { data, error } = await supabase
      .from('kpi_items')
      .select('*')
      .order('period_end', { ascending: true });
    if (error) throw error;
    return data;
  },

  async create(kpi) {
    const { data, error } = await supabase
      .from('kpi_items')
      .insert(kpi)
      .select()
      .single();
    if (error) throw error;
    return data;
  },

  async update(id, updates) {
    const { data, error } = await supabase
      .from('kpi_items')
      .update({ ...updates, updated_at: new Date().toISOString() })
      .eq('id', id)
      .select()
      .single();
    if (error) throw error;
    return data;
  },

  async delete(id) {
    const { error } = await supabase
      .from('kpi_items')
      .delete()
      .eq('id', id);
    if (error) throw error;
  },

  async getHistory(kpiId, days = 90) {
    const fromDate = new Date();
    fromDate.setDate(fromDate.getDate() - days);
    const { data, error } = await supabase
      .from('kpi_history')
      .select('*')
      .eq('kpi_id', kpiId)
      .gte('recorded_date', fromDate.toISOString().split('T')[0])
      .order('recorded_date', { ascending: true });
    if (error) throw error;
    return data;
  },

  async recordValue(kpiId, value) {
    const today = new Date().toISOString().split('T')[0];
    const { error } = await supabase
      .from('kpi_history')
      .upsert(
        { kpi_id: kpiId, value, recorded_date: today },
        { onConflict: 'kpi_id,recorded_date' },
      );
    if (error) throw error;
  },

  async generateAiInsight(kpiItems) {
    const res = await fetch(`${API_BASE}/api/ai/analyze`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        feature: 'kpi',
        context: JSON.stringify(kpiItems),
        prompt: 'KPI 달성 현황을 분석하고, 위험 항목과 개선 전략을 제시해주세요.',
      }),
    });
    if (!res.ok) throw new Error('AI 분석 실패');
    return await res.json();
  },
};
