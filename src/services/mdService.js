import { supabase } from '../lib/supabase';

export const mdService = {
  // ── Categories ──────────────────────────────────────────────────────────────
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

  // ── Items ───────────────────────────────────────────────────────────────────
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

  // ── Stock Logs ──────────────────────────────────────────────────────────────
  async getLogs({ itemId, logType, dateFrom, dateTo } = {}) {
    let query = supabase
      .from('md_stock_logs')
      .select('*, md_items(name, category_id, brand)')
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

  // ── Stock Summary (VIEW) ────────────────────────────────────────────────────
  async getStockSummary() {
    const { data, error } = await supabase
      .from('md_stock_summary')
      .select('*');
    if (error) throw error;
    return data;
  },

  // ── Events ──────────────────────────────────────────────────────────────────
  async getEvents() {
    const { data, error } = await supabase
      .from('md_events')
      .select('*')
      .order('sort_order', { ascending: true });
    if (error) throw error;
    return data;
  },

  async updateEvent(id, updates) {
    const { data, error } = await supabase
      .from('md_events')
      .update(updates)
      .eq('id', id)
      .select()
      .single();
    if (error) throw error;
    return data;
  },

  // ── PnL Config ──────────────────────────────────────────────────────────────
  async getPnlConfig() {
    const { data, error } = await supabase
      .from('md_pnl_config')
      .select('*')
      .limit(1)
      .single();
    if (error) throw error;
    return data;
  },

  async updatePnlConfig(id, updates) {
    const { data, error } = await supabase
      .from('md_pnl_config')
      .update({ ...updates, updated_at: new Date().toISOString() })
      .eq('id', id)
      .select()
      .single();
    if (error) throw error;
    return data;
  },

  // ── PnL 시나리오 계산 (클라이언트-사이드) ───────────────────────────────────
  calculatePnl({ stockSummary, pnlConfig, sellThroughRate }) {
    const activeItems = (stockSummary || []).filter((s) => s.is_active);

    // 완판 시 최대 매출 = sum(판매수량 * 판매가)
    const maxRevenue = activeItems.reduce(
      (acc, item) => acc + (item.initial_stock || 0) * (item.selling_price || 0),
      0,
    );

    // 총 제작비 = sum((initial_stock + initial_jaso) * production_cost)
    const srItems = activeItems.filter((s) => s.brand === 'SR');
    const oneItems = activeItems.filter((s) => s.brand === 'ONE');

    const srCost = srItems.reduce(
      (acc, item) => acc + ((item.initial_stock || 0) + (item.initial_jaso || 0)) * (item.production_cost || 0),
      0,
    );
    const oneCost = oneItems.reduce(
      (acc, item) => acc + ((item.initial_stock || 0) + (item.initial_jaso || 0)) * (item.production_cost || 0),
      0,
    );
    const totalProductionCost = srCost + oneCost;

    const rate = sellThroughRate / 100;
    const revenue = Math.round(maxRevenue * rate);

    const config = pnlConfig || {};
    const eventCount = config.total_events || 6;
    const eventOpsCost = config.event_ops_cost || 1500000;
    const onlineRatio = parseFloat(config.online_ratio) || 0.35;
    const onlineFeeRate = parseFloat(config.online_fee_rate) || 0.037;

    const offlineRevenue = Math.round(revenue * (1 - onlineRatio));
    const onlineRevenue = Math.round(revenue * onlineRatio);
    const eventOpsTotalCost = eventCount * eventOpsCost;
    const onlineFeeCost = Math.round(onlineRevenue * onlineFeeRate);

    const totalCost = totalProductionCost + eventOpsTotalCost + onlineFeeCost;
    const operatingProfit = revenue - totalCost;
    const profitRate = revenue > 0 ? operatingProfit / revenue : 0;

    // 손익분기점 소진율
    const fixedCost = totalProductionCost + eventOpsTotalCost;
    const marginPerUnit = maxRevenue > 0 ? (maxRevenue - maxRevenue * onlineRatio * onlineFeeRate) / maxRevenue : 0;
    const breakEvenRevenue = marginPerUnit > 0 ? fixedCost / marginPerUnit : 0;
    const breakEvenRate = maxRevenue > 0 ? (breakEvenRevenue / maxRevenue) * 100 : 0;

    return {
      maxRevenue,
      revenue,
      offlineRevenue,
      onlineRevenue,
      srCost,
      oneCost,
      totalProductionCost,
      eventOpsTotalCost,
      onlineFeeCost,
      totalCost,
      operatingProfit,
      profitRate,
      breakEvenRate: Math.min(breakEvenRate, 100),
      sellThroughRate,
    };
  },

  // ── 이벤트별 배분 계산 ──────────────────────────────────────────────────────
  calculateEventAllocations({ events, stockSummary, offlineRatio }) {
    const activeEvents = (events || []).filter((e) => !e.is_excluded);
    const totalWeight = activeEvents.reduce((acc, e) => acc + parseFloat(e.weight || 0), 0);

    const activeItems = (stockSummary || []).filter((s) => s.is_active);
    const totalSaleQty = activeItems.reduce((acc, s) => acc + (s.initial_stock || 0), 0);
    const offlineQty = Math.round(totalSaleQty * (offlineRatio || 0.65));

    return (events || []).map((event) => {
      if (event.is_excluded) {
        return { ...event, allocatedQty: 0, targetRevenue: 0, ratio: 0 };
      }
      const weight = parseFloat(event.weight || 0);
      const ratio = totalWeight > 0 ? weight / totalWeight : 0;
      const allocatedQty = Math.round(offlineQty * ratio);

      const maxRevenue = activeItems.reduce(
        (acc, item) => acc + (item.initial_stock || 0) * (item.selling_price || 0),
        0,
      );
      const targetRevenue = Math.round(maxRevenue * 0.85 * (1 - 0.35) * ratio);

      return { ...event, allocatedQty, targetRevenue, ratio };
    });
  },

  // ── Dashboard Summary ───────────────────────────────────────────────────────
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
