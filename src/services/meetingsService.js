import { supabase } from '../lib/supabase';

const API_BASE = import.meta.env.DEV ? '' : '';

export const meetingsService = {
  async getAll() {
    const { data, error } = await supabase
      .from('meetings')
      .select('*, meeting_attendees(member_id), meeting_agendas(*), meeting_minutes(*), meeting_action_items(*)')
      .order('date', { ascending: false });
    if (error) throw error;
    return data;
  },

  async getById(id) {
    const { data, error } = await supabase
      .from('meetings')
      .select('*, meeting_attendees(member_id), meeting_agendas(*), meeting_minutes(*), meeting_action_items(*)')
      .eq('id', id)
      .single();
    if (error) throw error;
    return data;
  },

  async create(meeting) {
    const { data, error } = await supabase
      .from('meetings')
      .insert(meeting)
      .select()
      .single();
    if (error) throw error;
    return data;
  },

  async update(id, updates) {
    const { data, error } = await supabase
      .from('meetings')
      .update({ ...updates, updated_at: new Date().toISOString() })
      .eq('id', id)
      .select()
      .single();
    if (error) throw error;
    return data;
  },

  async delete(id) {
    const { error } = await supabase
      .from('meetings')
      .delete()
      .eq('id', id);
    if (error) throw error;
  },

  // 참석자
  async setAttendees(meetingId, memberIds) {
    await supabase.from('meeting_attendees').delete().eq('meeting_id', meetingId);
    if (memberIds.length > 0) {
      const rows = memberIds.map((mid) => ({ meeting_id: meetingId, member_id: mid }));
      const { error } = await supabase.from('meeting_attendees').insert(rows);
      if (error) throw error;
    }
  },

  // 안건
  async addAgenda(meetingId, agenda) {
    const { data, error } = await supabase
      .from('meeting_agendas')
      .insert({ meeting_id: meetingId, ...agenda })
      .select()
      .single();
    if (error) throw error;
    return data;
  },

  async removeAgenda(id) {
    const { error } = await supabase.from('meeting_agendas').delete().eq('id', id);
    if (error) throw error;
  },

  async updateAgenda(agendaId, updates) {
    const { data, error } = await supabase
      .from('meeting_agendas')
      .update(updates)
      .eq('id', agendaId)
      .select()
      .single();
    if (error) throw error;
    return data;
  },

  // 회의록
  async saveMinutes(meetingId, content) {
    const { data, error } = await supabase
      .from('meeting_minutes')
      .upsert(
        { meeting_id: meetingId, content, updated_at: new Date().toISOString() },
        { onConflict: 'meeting_id' },
      )
      .select()
      .single();
    if (error) throw error;
    return data;
  },

  async saveAiSummary(meetingId, aiSummary) {
    const { error } = await supabase
      .from('meeting_minutes')
      .update({ ai_summary: aiSummary })
      .eq('meeting_id', meetingId);
    if (error) throw error;
  },

  // 액션 아이템
  async addActionItem(meetingId, item) {
    const { data, error } = await supabase
      .from('meeting_action_items')
      .insert({ meeting_id: meetingId, ...item })
      .select()
      .single();
    if (error) throw error;
    return data;
  },

  async updateActionItem(id, updates) {
    const { data, error } = await supabase
      .from('meeting_action_items')
      .update(updates)
      .eq('id', id)
      .select()
      .single();
    if (error) throw error;
    return data;
  },

  async removeActionItem(id) {
    const { error } = await supabase.from('meeting_action_items').delete().eq('id', id);
    if (error) throw error;
  },

  // AI 요약
  async generateSummary(meetingData) {
    const res = await fetch(`${API_BASE}/api/meetings/summary`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(meetingData),
    });
    if (!res.ok) throw new Error('AI 요약 생성 실패');
    return await res.json();
  },
};
