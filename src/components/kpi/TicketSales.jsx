import { useState, useEffect, useMemo, useCallback } from 'react';
import {
  Plus,
  X,
  Trash2,
  Pencil,
  Loader,
  MapPin,
  Calendar,
  Target,
  TrendingUp,
  Ticket,
} from 'lucide-react';
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ReferenceLine,
  ResponsiveContainer,
} from 'recharts';
import { ticketService } from '../../services/ticketService';

const CHART_COLORS = ['#3b82f6', '#10b981', '#f59e0b', '#8b5cf6', '#ec4899', '#06b6d4', '#f97316'];

export default function TicketSales() {
  const [rounds, setRounds] = useState([]);
  const [selectedRoundId, setSelectedRoundId] = useState(null);
  const [sales, setSales] = useState([]);
  const [loaded, setLoaded] = useState(false);
  const [salesLoading, setSalesLoading] = useState(false);

  // Round modal
  const [showRoundModal, setShowRoundModal] = useState(false);
  const [editingRound, setEditingRound] = useState(null);
  const [roundForm, setRoundForm] = useState({
    name: '', event_date: '', venue: '', total_seats: '', goal: '', seat_types: [], status: 'active',
  });
  const [newSeatName, setNewSeatName] = useState('');
  const [newSeatTotal, setNewSeatTotal] = useState('');

  // Sale input
  const [showSaleForm, setShowSaleForm] = useState(false);
  const [saleDate, setSaleDate] = useState(new Date().toISOString().split('T')[0]);
  const [saleInputs, setSaleInputs] = useState({});
  const [saleMemo, setSaleMemo] = useState('');
  const [saving, setSaving] = useState(false);

  const selectedRound = useMemo(
    () => rounds.find((r) => r.id === selectedRoundId),
    [rounds, selectedRoundId],
  );

  const seatTypes = useMemo(
    () => (selectedRound?.seat_types || []),
    [selectedRound],
  );

  // ---- Load rounds ----
  useEffect(() => {
    (async () => {
      try {
        const data = await ticketService.getRounds();
        setRounds(data || []);
        if (data?.length > 0) setSelectedRoundId(data[0].id);
      } catch (err) {
        console.error('라운드 로드 실패:', err);
      } finally {
        setLoaded(true);
      }
    })();
  }, []);

  // ---- Load sales when round changes ----
  useEffect(() => {
    if (!selectedRoundId) { setSales([]); return; }
    (async () => {
      setSalesLoading(true);
      try {
        const data = await ticketService.getSales(selectedRoundId);
        setSales(data || []);
      } catch (err) {
        console.error('판매 데이터 로드 실패:', err);
      } finally {
        setSalesLoading(false);
      }
    })();
  }, [selectedRoundId]);

  // ---- Summary stats ----
  const summary = useMemo(() => {
    if (!selectedRound || sales.length === 0) return null;
    const totals = {};
    seatTypes.forEach((st) => { totals[st.name] = 0; });
    let grandTotal = 0;
    sales.forEach((s) => {
      const saleData = s.sales || {};
      Object.entries(saleData).forEach(([key, val]) => {
        const num = Number(val) || 0;
        totals[key] = (totals[key] || 0) + num;
        grandTotal += num;
      });
    });
    const goalPct = selectedRound.goal > 0 ? Math.round((grandTotal / selectedRound.goal) * 100) : 0;
    return { totals, grandTotal, goalPct };
  }, [sales, selectedRound, seatTypes]);

  // ---- Cumulative chart data ----
  const chartData = useMemo(() => {
    if (sales.length === 0 || seatTypes.length === 0) return [];
    const cumulative = {};
    seatTypes.forEach((st) => { cumulative[st.name] = 0; });
    let cumulativeTotal = 0;

    return sales.map((s) => {
      const saleData = s.sales || {};
      let dayTotal = 0;
      seatTypes.forEach((st) => {
        const val = Number(saleData[st.name]) || 0;
        cumulative[st.name] += val;
        dayTotal += val;
      });
      cumulativeTotal += dayTotal;
      return {
        date: s.sale_date.slice(5),
        ...Object.fromEntries(seatTypes.map((st) => [st.name, cumulative[st.name]])),
        합계: cumulativeTotal,
      };
    });
  }, [sales, seatTypes]);

  // ---- Round CRUD ----
  const openCreateRound = () => {
    setEditingRound(null);
    setRoundForm({ name: '', event_date: '', venue: '', total_seats: '', goal: '', seat_types: [], status: 'active' });
    setNewSeatName('');
    setNewSeatTotal('');
    setShowRoundModal(true);
  };

  const openEditRound = () => {
    if (!selectedRound) return;
    setEditingRound(selectedRound);
    setRoundForm({
      name: selectedRound.name,
      event_date: selectedRound.event_date || '',
      venue: selectedRound.venue || '',
      total_seats: selectedRound.total_seats || '',
      goal: selectedRound.goal || '',
      seat_types: [...(selectedRound.seat_types || [])],
      status: selectedRound.status || 'active',
    });
    setNewSeatName('');
    setNewSeatTotal('');
    setShowRoundModal(true);
  };

  const addSeatType = () => {
    if (!newSeatName.trim()) return;
    setRoundForm((prev) => ({
      ...prev,
      seat_types: [...prev.seat_types, { name: newSeatName.trim(), total: Number(newSeatTotal) || 0 }],
    }));
    setNewSeatName('');
    setNewSeatTotal('');
  };

  const removeSeatType = (idx) => {
    setRoundForm((prev) => ({
      ...prev,
      seat_types: prev.seat_types.filter((_, i) => i !== idx),
    }));
  };

  const handleSaveRound = async () => {
    if (!roundForm.name.trim()) return;
    setSaving(true);
    try {
      const payload = {
        ...roundForm,
        total_seats: Number(roundForm.total_seats) || 0,
        goal: Number(roundForm.goal) || 0,
      };
      if (editingRound) {
        const updated = await ticketService.updateRound(editingRound.id, payload);
        setRounds((prev) => prev.map((r) => (r.id === editingRound.id ? updated : r)));
      } else {
        const created = await ticketService.createRound(payload);
        setRounds((prev) => [created, ...prev]);
        setSelectedRoundId(created.id);
      }
      setShowRoundModal(false);
    } catch (err) {
      alert('저장 실패: ' + err.message);
    } finally {
      setSaving(false);
    }
  };

  const handleDeleteRound = async () => {
    if (!selectedRound || !confirm(`"${selectedRound.name}" 라운드를 삭제하시겠습니까? 모든 판매 기록도 삭제됩니다.`)) return;
    try {
      await ticketService.deleteRound(selectedRound.id);
      setRounds((prev) => prev.filter((r) => r.id !== selectedRound.id));
      setSelectedRoundId(rounds.length > 1 ? rounds.find((r) => r.id !== selectedRound.id)?.id : null);
    } catch (err) {
      alert('삭제 실패: ' + err.message);
    }
  };

  // ---- Sale CRUD ----
  const openSaleForm = useCallback(() => {
    setSaleDate(new Date().toISOString().split('T')[0]);
    const inputs = {};
    seatTypes.forEach((st) => { inputs[st.name] = ''; });
    setSaleInputs(inputs);
    setSaleMemo('');
    setShowSaleForm(true);
  }, [seatTypes]);

  const handleSaveSale = async () => {
    if (!selectedRoundId) return;
    setSaving(true);
    try {
      const salesData = {};
      Object.entries(saleInputs).forEach(([key, val]) => {
        salesData[key] = Number(val) || 0;
      });
      const result = await ticketService.upsertSale({
        round_id: selectedRoundId,
        sale_date: saleDate,
        sales: salesData,
        memo: saleMemo || null,
      });
      setSales((prev) => {
        const existing = prev.findIndex((s) => s.sale_date === saleDate);
        if (existing >= 0) {
          return prev.map((s, i) => (i === existing ? result : s));
        }
        return [...prev, result].sort((a, b) => a.sale_date.localeCompare(b.sale_date));
      });
      setShowSaleForm(false);
    } catch (err) {
      alert('저장 실패: ' + err.message);
    } finally {
      setSaving(false);
    }
  };

  const handleDeleteSale = async (sale) => {
    if (!confirm(`${sale.sale_date} 판매 기록을 삭제하시겠습니까?`)) return;
    try {
      await ticketService.deleteSale(sale.id);
      setSales((prev) => prev.filter((s) => s.id !== sale.id));
    } catch (err) {
      alert('삭제 실패: ' + err.message);
    }
  };

  // ---- Loading ----
  if (!loaded) {
    return (
      <div className="flex items-center justify-center h-64 text-gray-500">
        <Loader className="w-6 h-6 animate-spin mr-2" />
        데이터를 불러오는 중...
      </div>
    );
  }

  // ---- Empty state ----
  if (rounds.length === 0) {
    return (
      <div className="bg-surface-800 rounded-xl shadow-sm p-12 text-center border border-surface-700">
        <Ticket size={48} className="text-gray-600 mx-auto mb-4" />
        <h3 className="text-lg font-semibold text-gray-400 mb-2">라운드를 추가해보세요</h3>
        <p className="text-sm text-gray-500 mb-4">티켓 판매 현황을 추적하려면 먼저 라운드를 등록하세요.</p>
        <button
          onClick={openCreateRound}
          className="inline-flex items-center gap-1.5 px-4 py-2 bg-red-500 text-white text-sm font-medium rounded-lg hover:bg-red-600 transition-colors"
        >
          <Plus size={15} /> 새 라운드
        </button>
        {renderRoundModal()}
      </div>
    );
  }

  // ---- Render helpers ----
  function renderRoundModal() {
    if (!showRoundModal) return null;
    return (
      <div className="fixed inset-0 bg-black/40 backdrop-blur-sm flex items-center justify-center z-50 p-4" onClick={() => setShowRoundModal(false)}>
        <div className="bg-surface-800 rounded-2xl shadow-2xl w-full max-w-lg max-h-[85vh] overflow-y-auto" onClick={(e) => e.stopPropagation()}>
          <div className="p-6">
            <div className="flex items-center justify-between mb-5">
              <h2 className="text-lg font-bold text-white">{editingRound ? '라운드 수정' : '새 라운드'}</h2>
              <button onClick={() => setShowRoundModal(false)} className="p-1 rounded-full hover:bg-white/5 text-gray-400"><X size={20} /></button>
            </div>
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-300 mb-1">라운드명</label>
                <input type="text" value={roundForm.name} onChange={(e) => setRoundForm({ ...roundForm, name: e.target.value })} placeholder="예: Round 1" className="w-full px-3 py-2.5 border border-surface-700 bg-surface-900 text-white rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-red-500" />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-sm font-medium text-gray-300 mb-1">이벤트 날짜</label>
                  <input type="date" value={roundForm.event_date} onChange={(e) => setRoundForm({ ...roundForm, event_date: e.target.value })} className="w-full px-3 py-2.5 border border-surface-700 bg-surface-900 text-white rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-red-500" />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-300 mb-1">장소</label>
                  <input type="text" value={roundForm.venue} onChange={(e) => setRoundForm({ ...roundForm, venue: e.target.value })} placeholder="예: 용인 에버랜드" className="w-full px-3 py-2.5 border border-surface-700 bg-surface-900 text-white rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-red-500" />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-sm font-medium text-gray-300 mb-1">총 좌석 수</label>
                  <input type="number" value={roundForm.total_seats} onChange={(e) => setRoundForm({ ...roundForm, total_seats: e.target.value })} placeholder="6000" className="w-full px-3 py-2.5 border border-surface-700 bg-surface-900 text-white rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-red-500" />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-300 mb-1">판매 목표</label>
                  <input type="number" value={roundForm.goal} onChange={(e) => setRoundForm({ ...roundForm, goal: e.target.value })} placeholder="5000" className="w-full px-3 py-2.5 border border-surface-700 bg-surface-900 text-white rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-red-500" />
                </div>
              </div>

              {/* seat types */}
              <div>
                <label className="block text-sm font-medium text-gray-300 mb-2">좌석 종류</label>
                {roundForm.seat_types.length > 0 && (
                  <div className="space-y-1.5 mb-2">
                    {roundForm.seat_types.map((st, idx) => (
                      <div key={idx} className="flex items-center gap-2 bg-surface-700/50 rounded-lg px-3 py-2">
                        <span className="text-sm text-white flex-1">{st.name}</span>
                        <span className="text-xs text-gray-400">{st.total}석</span>
                        <button onClick={() => removeSeatType(idx)} className="p-0.5 rounded hover:bg-red-500/10 text-gray-500 hover:text-red-400 transition-colors cursor-pointer">
                          <X size={14} />
                        </button>
                      </div>
                    ))}
                  </div>
                )}
                <div className="flex items-center gap-2">
                  <input type="text" value={newSeatName} onChange={(e) => setNewSeatName(e.target.value)} onKeyDown={(e) => { if (e.key === 'Enter') addSeatType(); }} placeholder="좌석명 (예: VIP)" className="flex-1 px-3 py-2 border border-surface-700 bg-surface-900 text-white rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-red-500" />
                  <input type="number" value={newSeatTotal} onChange={(e) => setNewSeatTotal(e.target.value)} onKeyDown={(e) => { if (e.key === 'Enter') addSeatType(); }} placeholder="좌석 수" className="w-24 px-3 py-2 border border-surface-700 bg-surface-900 text-white rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-red-500" />
                  <button onClick={addSeatType} disabled={!newSeatName.trim()} className="p-2 rounded-lg bg-brand-500/10 text-brand-400 hover:bg-brand-500/20 disabled:opacity-30 transition-colors cursor-pointer">
                    <Plus size={16} />
                  </button>
                </div>
              </div>

              <button onClick={handleSaveRound} disabled={saving || !roundForm.name.trim()} className="w-full flex items-center justify-center gap-2 py-2.5 bg-red-500 text-white text-sm font-medium rounded-lg hover:bg-red-600 transition-colors disabled:opacity-50">
                {saving ? <><Loader size={15} className="animate-spin" /> 저장 중...</> : editingRound ? '수정 완료' : '라운드 추가'}
              </button>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-5">
      {/* Round selector */}
      <div className="bg-surface-800 rounded-xl border border-surface-700 p-4">
        <div className="flex items-center gap-3 flex-wrap">
          <select
            value={selectedRoundId || ''}
            onChange={(e) => setSelectedRoundId(Number(e.target.value))}
            className="px-3 py-2 rounded-lg bg-surface-700 border border-surface-600 text-sm text-white focus:outline-none focus:ring-2 focus:ring-brand-500/30 cursor-pointer"
          >
            {rounds.map((r) => (
              <option key={r.id} value={r.id}>{r.name}</option>
            ))}
          </select>

          {selectedRound && (
            <div className="flex items-center gap-3 text-xs text-gray-400">
              {selectedRound.venue && (
                <span className="flex items-center gap-1"><MapPin size={12} /> {selectedRound.venue}</span>
              )}
              {selectedRound.event_date && (
                <span className="flex items-center gap-1"><Calendar size={12} /> {selectedRound.event_date}</span>
              )}
              <span className="flex items-center gap-1"><Target size={12} /> 목표 {(selectedRound.goal || 0).toLocaleString()}석</span>
              <span>총 {(selectedRound.total_seats || 0).toLocaleString()}석</span>
            </div>
          )}

          <div className="flex items-center gap-1.5 ml-auto">
            <button onClick={openEditRound} className="p-1.5 rounded-lg hover:bg-white/5 text-gray-400 hover:text-gray-200 transition-colors cursor-pointer">
              <Pencil size={14} />
            </button>
            <button onClick={handleDeleteRound} className="p-1.5 rounded-lg hover:bg-red-500/10 text-gray-400 hover:text-red-400 transition-colors cursor-pointer">
              <Trash2 size={14} />
            </button>
            <button onClick={openCreateRound} className="flex items-center gap-1 px-3 py-1.5 bg-red-500 text-white text-xs font-medium rounded-lg hover:bg-red-600 transition-colors cursor-pointer">
              <Plus size={13} /> 새 라운드
            </button>
          </div>
        </div>
      </div>

      {/* Summary cards */}
      {summary && (
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <div className="bg-surface-800 rounded-xl shadow-sm p-4 border border-surface-700">
            <div className="flex items-center gap-2 mb-2">
              <div className="p-1.5 rounded-lg bg-blue-500/10"><Ticket size={14} className="text-blue-500" /></div>
              <span className="text-xs font-medium text-gray-400">총 판매</span>
            </div>
            <p className="text-2xl font-bold text-white">{summary.grandTotal.toLocaleString()}</p>
          </div>
          <div className="bg-surface-800 rounded-xl shadow-sm p-4 border border-surface-700">
            <div className="flex items-center gap-2 mb-2">
              <div className="p-1.5 rounded-lg bg-brand-500/10"><Target size={14} className="text-brand-400" /></div>
              <span className="text-xs font-medium text-gray-400">달성률</span>
            </div>
            <p className={`text-2xl font-bold ${summary.goalPct >= 100 ? 'text-emerald-400' : summary.goalPct >= 70 ? 'text-blue-400' : 'text-white'}`}>
              {summary.goalPct}%
            </p>
          </div>
          {seatTypes.slice(0, 2).map((st, idx) => (
            <div key={st.name} className="bg-surface-800 rounded-xl shadow-sm p-4 border border-surface-700">
              <div className="flex items-center gap-2 mb-2">
                <div className="p-1.5 rounded-lg" style={{ backgroundColor: `${CHART_COLORS[idx]}15` }}>
                  <TrendingUp size={14} style={{ color: CHART_COLORS[idx] }} />
                </div>
                <span className="text-xs font-medium text-gray-400">{st.name}</span>
              </div>
              <p className="text-2xl font-bold text-white">{(summary.totals[st.name] || 0).toLocaleString()}</p>
              {st.total > 0 && (
                <p className="text-[11px] text-gray-500 mt-1">/ {st.total.toLocaleString()}석</p>
              )}
            </div>
          ))}
        </div>
      )}

      {/* Cumulative chart */}
      {chartData.length > 1 && (
        <div className="bg-surface-800 rounded-xl border border-surface-700 p-4">
          <h3 className="text-sm font-semibold text-gray-300 mb-4">누적 판매 추이</h3>
          <ResponsiveContainer width="100%" height={280}>
            <LineChart data={chartData}>
              <CartesianGrid strokeDasharray="3 3" stroke="#21262d" />
              <XAxis dataKey="date" tick={{ fill: '#6b7280', fontSize: 11 }} />
              <YAxis tick={{ fill: '#6b7280', fontSize: 11 }} />
              <Tooltip
                contentStyle={{ backgroundColor: '#161b22', border: '1px solid #21262d', borderRadius: '8px', fontSize: '12px' }}
                labelStyle={{ color: '#e6edf3' }}
                itemStyle={{ color: '#9ca3af' }}
              />
              <Legend wrapperStyle={{ fontSize: '12px' }} />
              {selectedRound?.goal > 0 && (
                <ReferenceLine y={selectedRound.goal} stroke="#ef4444" strokeDasharray="5 5" label={{ value: '목표', fill: '#ef4444', fontSize: 11 }} />
              )}
              {seatTypes.map((st, idx) => (
                <Line key={st.name} type="monotone" dataKey={st.name} stroke={CHART_COLORS[idx % CHART_COLORS.length]} strokeWidth={2} dot={false} />
              ))}
              <Line type="monotone" dataKey="합계" stroke="#e6edf3" strokeWidth={2} strokeDasharray="4 2" dot={false} />
            </LineChart>
          </ResponsiveContainer>
        </div>
      )}

      {/* Daily sales table */}
      <div className="bg-surface-800 rounded-xl border border-surface-700 overflow-hidden">
        <div className="flex items-center justify-between px-4 py-3 border-b border-surface-700">
          <h3 className="text-sm font-semibold text-gray-300">일별 판매 기록</h3>
          <button onClick={openSaleForm} className="flex items-center gap-1 px-3 py-1.5 bg-brand-500/10 text-brand-400 text-xs font-medium rounded-lg hover:bg-brand-500/20 transition-colors cursor-pointer">
            <Plus size={13} /> 판매 입력
          </button>
        </div>

        {salesLoading ? (
          <div className="flex items-center justify-center py-10 text-gray-500 text-sm">
            <Loader className="w-5 h-5 animate-spin mr-2" /> 로딩 중...
          </div>
        ) : sales.length === 0 ? (
          <div className="py-10 text-center text-gray-500 text-sm">
            판매 기록이 없습니다. 위의 &quot;판매 입력&quot; 버튼으로 추가하세요.
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="bg-surface-700/30">
                  <th className="text-left px-4 py-2.5 text-xs font-medium text-gray-400">날짜</th>
                  {seatTypes.map((st) => (
                    <th key={st.name} className="text-right px-3 py-2.5 text-xs font-medium text-gray-400">{st.name}</th>
                  ))}
                  <th className="text-right px-3 py-2.5 text-xs font-medium text-gray-400">합계</th>
                  <th className="text-left px-3 py-2.5 text-xs font-medium text-gray-400">메모</th>
                  <th className="w-10"></th>
                </tr>
              </thead>
              <tbody>
                {[...sales].reverse().map((sale) => {
                  const saleData = sale.sales || {};
                  const total = Object.values(saleData).reduce((s, v) => s + (Number(v) || 0), 0);
                  return (
                    <tr key={sale.id} className="border-t border-surface-700/50 hover:bg-white/[0.02] group">
                      <td className="px-4 py-2.5 text-gray-300">{sale.sale_date}</td>
                      {seatTypes.map((st) => (
                        <td key={st.name} className="text-right px-3 py-2.5 text-gray-400 tabular-nums">
                          {(Number(saleData[st.name]) || 0).toLocaleString()}
                        </td>
                      ))}
                      <td className="text-right px-3 py-2.5 font-medium text-white tabular-nums">{total.toLocaleString()}</td>
                      <td className="px-3 py-2.5 text-gray-500 text-xs truncate max-w-[120px]">{sale.memo || '-'}</td>
                      <td className="px-2">
                        <button onClick={() => handleDeleteSale(sale)} className="p-1 rounded-md opacity-0 group-hover:opacity-100 hover:bg-red-500/10 text-gray-500 hover:text-red-400 transition-all cursor-pointer">
                          <Trash2 size={13} />
                        </button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Sale input modal */}
      {showSaleForm && (
        <div className="fixed inset-0 bg-black/40 backdrop-blur-sm flex items-center justify-center z-50 p-4" onClick={() => setShowSaleForm(false)}>
          <div className="bg-surface-800 rounded-2xl shadow-2xl w-full max-w-md" onClick={(e) => e.stopPropagation()}>
            <div className="p-6">
              <div className="flex items-center justify-between mb-5">
                <h2 className="text-lg font-bold text-white">판매 입력</h2>
                <button onClick={() => setShowSaleForm(false)} className="p-1 rounded-full hover:bg-white/5 text-gray-400"><X size={20} /></button>
              </div>
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-300 mb-1">날짜</label>
                  <input type="date" value={saleDate} onChange={(e) => setSaleDate(e.target.value)} className="w-full px-3 py-2.5 border border-surface-700 bg-surface-900 text-white rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-red-500" />
                </div>
                {seatTypes.map((st) => (
                  <div key={st.name}>
                    <label className="block text-sm font-medium text-gray-300 mb-1">{st.name} 판매량</label>
                    <input
                      type="number"
                      value={saleInputs[st.name] || ''}
                      onChange={(e) => setSaleInputs({ ...saleInputs, [st.name]: e.target.value })}
                      placeholder="0"
                      className="w-full px-3 py-2.5 border border-surface-700 bg-surface-900 text-white rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-red-500"
                    />
                  </div>
                ))}
                <div>
                  <label className="block text-sm font-medium text-gray-300 mb-1">메모 (선택)</label>
                  <input type="text" value={saleMemo} onChange={(e) => setSaleMemo(e.target.value)} placeholder="참고 사항" className="w-full px-3 py-2.5 border border-surface-700 bg-surface-900 text-white rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-red-500" />
                </div>
                <button onClick={handleSaveSale} disabled={saving} className="w-full flex items-center justify-center gap-2 py-2.5 bg-red-500 text-white text-sm font-medium rounded-lg hover:bg-red-600 transition-colors disabled:opacity-50">
                  {saving ? <><Loader size={15} className="animate-spin" /> 저장 중...</> : '저장'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {renderRoundModal()}
    </div>
  );
}
