import { supabase } from '../lib/supabase';

export const mdService = {
  // ---- Categories ----
  async getCategories() {
    const { data, error } = await supabase
      .from('md_categories')
      .select('*')
      .order('sort_order', { ascending: true });
    if (error) throw error;
    return data;
  },

  async createCategory(category) {
    const { data, error } = await supabase
      .from('md_categories')
      .insert(category)
      .select()
      .single();
    if (error) throw error;
    return data;
  },

  async updateCategory(id, updates) {
    const { data, error } = await supabase
      .from('md_categories')
      .update(updates)
      .eq('id', id)
      .select()
      .single();
    if (error) throw error;
    return data;
  },

  async deleteCategory(id) {
    const { error } = await supabase
      .from('md_categories')
      .delete()
      .eq('id', id);
    if (error) throw error;
  },

  // ---- Items ----
  async getItems() {
    const { data, error } = await supabase
      .from('md_items')
      .select('*, md_categories(id, name, color, icon)')
      .eq('is_active', true)
      .order('created_at', { ascending: false });
    if (error) throw error;
    return data;
  },

  async getAllItems() {
    const { data, error } = await supabase
      .from('md_items')
      .select('*, md_categories(id, name, color, icon)')
      .order('created_at', { ascending: false });
    if (error) throw error;
    return data;
  },

  async createItem(item) {
    const { data, error } = await supabase
      .from('md_items')
      .insert(item)
      .select()
      .single();
    if (error) throw error;
    return data;
  },

  async updateItem(id, updates) {
    const { data, error } = await supabase
      .from('md_items')
      .update({ ...updates, updated_at: new Date().toISOString() })
      .eq('id', id)
      .select()
      .single();
    if (error) throw error;
    return data;
  },

  async toggleItemActive(id, isActive) {
    const { data, error } = await supabase
      .from('md_items')
      .update({ is_active: isActive, updated_at: new Date().toISOString() })
      .eq('id', id)
      .select()
      .single();
    if (error) throw error;
    return data;
  },

  // ---- Stock Logs ----
  async getLogs({ itemId, logType, dateFrom, dateTo } = {}) {
    let query = supabase
      .from('md_stock_logs')
      .select('*, md_items(name, category_id)')
      .order('log_date', { ascending: false })
      .order('created_at', { ascending: false });

    if (itemId) query = query.eq('item_id', itemId);
    if (logType) query = query.eq('log_type', logType);
    if (dateFrom) query = query.gte('log_date', dateFrom);
    if (dateTo) query = query.lte('log_date', dateTo);

    const { data, error } = await query;
    if (error) throw error;
    return data;
  },

  async createLog(log) {
    const { data, error } = await supabase
      .from('md_stock_logs')
      .insert(log)
      .select()
      .single();
    if (error) throw error;
    return data;
  },

  async deleteLog(id) {
    const { error } = await supabase
      .from('md_stock_logs')
      .delete()
      .eq('id', id);
    if (error) throw error;
  },

  // ---- Stock Summary (VIEW) ----
  async getStockSummary() {
    const { data, error } = await supabase
      .from('md_stock_summary')
      .select('*');
    if (error) throw error;
    return data;
  },

  // ---- Dashboard Summary ----
  async getDashboardSummary() {
    const summary = await this.getStockSummary();
    const now = new Date();
    const monthStart = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-01`;

    const { data: monthLogs, error } = await supabase
      .from('md_stock_logs')
      .select('log_type, quantity, unit_price')
      .gte('log_date', monthStart);
    if (error) throw error;

    const activeItems = (summary || []).filter((s) => s.is_active);
    const totalItems = activeItems.length;
    const lowStock = activeItems.filter((s) => s.current_stock > 0 && s.current_stock <= 5).length;
    const outOfStock = activeItems.filter((s) => s.current_stock <= 0).length;

    let monthRevenue = 0;
    let monthJaso = 0;
    (monthLogs || []).forEach((l) => {
      if (l.log_type === 'sale') monthRevenue += l.quantity * l.unit_price;
      if (l.log_type === 'jaso') monthJaso += l.quantity;
    });

    return { totalItems, lowStock, outOfStock, monthRevenue, monthJaso };
  },
};
