import { useState, useEffect, useMemo, useCallback } from 'react';
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Cell,
} from 'recharts';
import {
  Calendar,
  MapPin,
  Target,
  Users,
  Loader,
  X,
  Check,
  Ban,
  Edit3,
} from 'lucide-react';
import { mdService } from '../../services/mdService';

// ─── constants ────────────────────────────────────────────────────────────────

const OFFLINE_RATIO = 0.65;
const EVENT_OPS_COST = 1500000;

const CHART_TOOLTIP_STYLE = {
  backgroundColor: '#161b22',
  border: '1px solid #21262d',
  borderRadius: '8px',
  fontSize: '12px',
};

// ─── helpers ──────────────────────────────────────────────────────────────────

const formatWon = (v) => {
  if (v == null || isNaN(v)) return '0원';
  if (v >= 100000000) return `${(v / 100000000).toFixed(1)}억원`;
  if (v >= 10000) return `${Math.round(v / 10000)}만원`;
  return `${v.toLocaleString('ko-KR')}원`;
};

function getWeightColor(weight) {
  if (weight >= 1.5) return '#ef4444';
  if (weight >= 1.2) return '#f59e0b';
  if (weight >= 1.0) return '#3b82f6';
  return '#6b7280';
}

function getWeightBarWidth(weight, maxWeight) {
  if (maxWeight <= 0) return 0;
  return Math.round((weight / maxWeight) * 100);
}

// ─── sub-components ───────────────────────────────────────────────────────────

function SummaryCard({ icon: Icon, label, value, iconBg, iconColor }) {
  return (
    <div className="bg-surface-800 rounded-xl border border-surface-700 p-4 flex items-center gap-4">
      <div className={`w-10 h-10 rounded-lg flex items-center justify-center flex-shrink-0 ${iconBg}`}>
        <Icon className={`w-5 h-5 ${iconColor}`} />
      </div>
      <div>
        <p className="text-xs text-gray-400">{label}</p>
        <p className="text-lg font-bold text-white tabular-nums">{value}</p>
      </div>
    </div>
  );
}

function EventTypeBadge({ eventType }) {
  const is2Day = eventType === '2일';
  return (
    <span
      className={`px-2 py-0.5 rounded-full text-[10px] font-semibold ${
        is2Day ? 'bg-blue-500/20 text-blue-400' : 'bg-gray-500/20 text-gray-400'
      }`}
    >
      {eventType}
    </span>
  );
}

function EventCard({ event, maxWeight, onEdit }) {
  const weight = parseFloat(event.weight || 0);
  const barWidth = getWeightBarWidth(weight, maxWeight);
  const isExcluded = event.is_excluded;

  return (
    <div
      className={`bg-surface-800 rounded-xl border p-5 transition-colors ${
        isExcluded
          ? 'border-surface-700/50 opacity-50'
          : 'border-surface-700 hover:border-surface-600'
      }`}
    >
      {/* Header */}
      <div className="flex items-start justify-between mb-3">
        <div className="flex items-center gap-2 min-w-0">
          <h4 className={`text-sm font-semibold truncate ${isExcluded ? 'text-gray-500' : 'text-white'}`}>
            {event.name}
          </h4>
          <EventTypeBadge eventType={event.event_type} />
          {isExcluded && (
            <span className="px-2 py-0.5 rounded-full text-[10px] font-semibold bg-red-500/20 text-red-400">
              제외
            </span>
          )}
        </div>
        {!isExcluded && (
          <button
            onClick={() => onEdit(event)}
            className="text-gray-500 hover:text-gray-300 transition-colors flex-shrink-0 ml-2"
          >
            <Edit3 className="w-3.5 h-3.5" />
          </button>
        )}
      </div>

      {/* Date */}
      <div className="flex items-center gap-1.5 text-xs text-gray-400 mb-3">
        <Calendar className="w-3.5 h-3.5" />
        <span>{event.event_date || '-'}</span>
      </div>

      {/* Weight bar */}
      <div className="mb-3">
        <div className="flex items-center justify-between text-xs mb-1">
          <span className="text-gray-500">가중치</span>
          <span className="text-gray-300 font-medium tabular-nums">{weight.toFixed(1)}</span>
        </div>
        <div className="w-full h-1.5 bg-surface-700 rounded-full overflow-hidden">
          <div
            className="h-full rounded-full transition-all"
            style={{
              width: `${barWidth}%`,
              backgroundColor: getWeightColor(weight),
            }}
          />
        </div>
      </div>

      {/* Stats */}
      {isExcluded ? (
        <div className="flex items-center gap-1.5 text-xs text-gray-600">
          <Ban className="w-3.5 h-3.5" />
          <span>현장판매 제외</span>
        </div>
      ) : (
        <div className="grid grid-cols-3 gap-2">
          <div>
            <p className="text-[10px] text-gray-500 mb-0.5">배분 수량</p>
            <p className="text-sm font-semibold text-white tabular-nums">
              {(event.allocatedQty ?? 0).toLocaleString('ko-KR')}
            </p>
          </div>
          <div>
            <p className="text-[10px] text-gray-500 mb-0.5">목표 매출</p>
            <p className="text-sm font-semibold text-green-400 tabular-nums">
              {formatWon(event.targetRevenue)}
            </p>
          </div>
          <div>
            <p className="text-[10px] text-gray-500 mb-0.5">배분 비율</p>
            <p className="text-sm font-semibold text-blue-400 tabular-nums">
              {((event.ratio ?? 0) * 100).toFixed(1)}%
            </p>
          </div>
        </div>
      )}

      {/* Memo */}
      {event.memo && (
        <p className="text-[11px] text-gray-500 mt-3 truncate">
          {event.memo}
        </p>
      )}
    </div>
  );
}

function EditModal({ event, onClose, onSave }) {
  const [eventDate, setEventDate] = useState(event.event_date || '');
  const [memo, setMemo] = useState(event.memo || '');
  const [saving, setSaving] = useState(false);

  const handleSave = useCallback(async () => {
    setSaving(true);
    try {
      await onSave(event.id, { event_date: eventDate, memo });
      onClose();
    } catch {
      setSaving(false);
    }
  }, [event.id, eventDate, memo, onSave, onClose]);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60">
      <div className="bg-surface-800 border border-surface-700 rounded-xl w-full max-w-md mx-4 p-6">
        <div className="flex items-center justify-between mb-5">
          <h3 className="text-sm font-semibold text-white">{event.name} 수정</h3>
          <button onClick={onClose} className="text-gray-500 hover:text-white transition-colors">
            <X className="w-4 h-4" />
          </button>
        </div>

        <div className="space-y-4">
          <div>
            <label className="text-xs text-gray-400 block mb-1.5">일정</label>
            <input
              type="text"
              value={eventDate}
              onChange={(e) => setEventDate(e.target.value)}
              placeholder="예: 5/10-11"
              className="w-full px-3 py-2 rounded-lg bg-surface-700 border border-surface-600 text-sm text-white placeholder:text-gray-600 focus:outline-none focus:border-red-500 transition-colors"
            />
          </div>
          <div>
            <label className="text-xs text-gray-400 block mb-1.5">메모</label>
            <textarea
              value={memo}
              onChange={(e) => setMemo(e.target.value)}
              rows={3}
              placeholder="메모를 입력하세요"
              className="w-full px-3 py-2 rounded-lg bg-surface-700 border border-surface-600 text-sm text-white placeholder:text-gray-600 focus:outline-none focus:border-red-500 transition-colors resize-none"
            />
          </div>
        </div>

        <div className="flex justify-end gap-2 mt-5">
          <button
            onClick={onClose}
            className="px-4 py-2 rounded-lg text-xs font-medium text-gray-400 hover:text-white bg-surface-700 hover:bg-surface-600 transition-colors"
          >
            취소
          </button>
          <button
            onClick={handleSave}
            disabled={saving}
            className="px-4 py-2 rounded-lg text-xs font-medium text-white bg-red-500 hover:bg-red-600 transition-colors disabled:opacity-50 flex items-center gap-1.5"
          >
            {saving ? (
              <Loader className="w-3.5 h-3.5 animate-spin" />
            ) : (
              <Check className="w-3.5 h-3.5" />
            )}
            저장
          </button>
        </div>
      </div>
    </div>
  );
}

// ─── main component ───────────────────────────────────────────────────────────

export default function MdEventsTab() {
  const [events, setEvents] = useState([]);
  const [stockSummary, setStockSummary] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [editingEvent, setEditingEvent] = useState(null);

  // ── fetch ──
  useEffect(() => {
    let cancelled = false;

    async function load() {
      setLoading(true);
      setError(null);
      try {
        const [evts, summary] = await Promise.all([
          mdService.getEvents(),
          mdService.getStockSummary(),
        ]);
        if (!cancelled) {
          setEvents(evts || []);
          setStockSummary(summary || []);
        }
      } catch {
        if (!cancelled) {
          setError('데이터를 불러오는 중 오류가 발생했습니다.');
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    }

    load();
    return () => { cancelled = true; };
  }, []);

  // ── allocations ──
  const allocatedEvents = useMemo(() => {
    return mdService.calculateEventAllocations({
      events,
      stockSummary,
      offlineRatio: OFFLINE_RATIO,
    });
  }, [events, stockSummary]);

  const maxWeight = useMemo(() => {
    return Math.max(...(events || []).map((e) => parseFloat(e.weight || 0)), 0);
  }, [events]);

  // ── summary stats ──
  const summaryStats = useMemo(() => {
    const activeEvents = allocatedEvents.filter((e) => !e.is_excluded);
    const totalEvents = activeEvents.length;
    const totalAllocatedQty = activeEvents.reduce((acc, e) => acc + (e.allocatedQty ?? 0), 0);
    const totalTargetRevenue = activeEvents.reduce((acc, e) => acc + (e.targetRevenue ?? 0), 0);
    return { totalEvents, totalAllocatedQty, totalTargetRevenue };
  }, [allocatedEvents]);

  // ── chart data ──
  const chartData = useMemo(() => {
    return allocatedEvents
      .filter((e) => !e.is_excluded)
      .map((e) => ({
        name: e.name.length > 12 ? `${e.name.slice(0, 12)}…` : e.name,
        fullName: e.name,
        qty: e.allocatedQty ?? 0,
        weight: parseFloat(e.weight || 0),
      }));
  }, [allocatedEvents]);

  // ── save handler ──
  const handleSave = useCallback(async (id, updates) => {
    const updated = await mdService.updateEvent(id, updates);
    setEvents((prev) => prev.map((e) => (e.id === id ? { ...e, ...updated } : e)));
  }, []);

  // ── render ──
  if (loading) {
    return (
      <div className="flex items-center justify-center py-24 text-gray-400 gap-2">
        <Loader className="w-5 h-5 animate-spin" />
        <span className="text-sm">불러오는 중…</span>
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex items-center justify-center py-24 text-red-400 text-sm">
        {error}
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* ── 1. Summary cards ─────────────────────────────────────────────── */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <SummaryCard
          icon={Calendar}
          label="총 이벤트"
          value={`${summaryStats.totalEvents}회`}
          iconBg="bg-blue-500/15"
          iconColor="text-blue-400"
        />
        <SummaryCard
          icon={Users}
          label="현장 배분 수량"
          value={summaryStats.totalAllocatedQty.toLocaleString('ko-KR')}
          iconBg="bg-green-500/15"
          iconColor="text-green-400"
        />
        <SummaryCard
          icon={MapPin}
          label="이벤트당 운영비"
          value={formatWon(EVENT_OPS_COST)}
          iconBg="bg-yellow-500/15"
          iconColor="text-yellow-400"
        />
        <SummaryCard
          icon={Target}
          label="현장 목표 매출"
          value={formatWon(summaryStats.totalTargetRevenue)}
          iconBg="bg-red-500/15"
          iconColor="text-red-400"
        />
      </div>

      {/* ── 2. Event cards grid ──────────────────────────────────────────── */}
      <div>
        <h3 className="text-sm font-semibold text-white mb-4">이벤트 배분 현황</h3>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {allocatedEvents.map((event) => (
            <EventCard
              key={event.id}
              event={event}
              maxWeight={maxWeight}
              onEdit={setEditingEvent}
            />
          ))}
        </div>
      </div>

      {/* ── 3. Allocation distribution chart ─────────────────────────────── */}
      {chartData.length > 0 && (
        <div className="bg-surface-800 rounded-xl border border-surface-700 p-5">
          <h3 className="text-sm font-semibold text-white mb-4">이벤트별 배분 수량</h3>
          <ResponsiveContainer width="100%" height={Math.max(chartData.length * 40 + 20, 200)}>
            <BarChart
              data={chartData}
              layout="vertical"
              margin={{ top: 0, right: 16, left: 8, bottom: 0 }}
            >
              <CartesianGrid strokeDasharray="3 3" stroke="#21262d" horizontal={false} />
              <XAxis
                type="number"
                tick={{ fill: '#6b7280', fontSize: 11 }}
                axisLine={false}
                tickLine={false}
              />
              <YAxis
                type="category"
                dataKey="name"
                width={100}
                tick={{ fill: '#6b7280', fontSize: 11 }}
                axisLine={false}
                tickLine={false}
              />
              <Tooltip
                contentStyle={CHART_TOOLTIP_STYLE}
                formatter={(value, _name, props) => [
                  `${value.toLocaleString('ko-KR')}개`,
                  props.payload.fullName,
                ]}
                cursor={{ fill: 'rgba(255,255,255,0.04)' }}
              />
              <Bar dataKey="qty" radius={[0, 4, 4, 0]} maxBarSize={24}>
                {chartData.map((entry, idx) => (
                  <Cell key={idx} fill={getWeightColor(entry.weight)} />
                ))}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </div>
      )}

      {/* ── 4. Notes ─────────────────────────────────────────────────────── */}
      <div className="bg-surface-800 rounded-xl border border-surface-700 p-5">
        <h3 className="text-sm font-semibold text-white mb-3">참고사항</h3>
        <ul className="space-y-2 text-xs text-gray-400">
          <li className="flex items-start gap-2">
            <span className="text-red-400 mt-0.5">*</span>
            <span>R6 전남GT: 현장판매 제외 → 온라인 판매 전환</span>
          </li>
          <li className="flex items-start gap-2">
            <span className="text-blue-400 mt-0.5">*</span>
            <span>온라인(네이버 스마트스토어): 시즌 전체 상시운영 (R6 포함)</span>
          </li>
          <li className="flex items-start gap-2">
            <span className="text-yellow-400 mt-0.5">*</span>
            <span>이벤트당 현장 운영비: {formatWon(EVENT_OPS_COST)}</span>
          </li>
          <li className="flex items-start gap-2">
            <span className="text-green-400 mt-0.5">*</span>
            <span>현장 배분 비율: 전체 재고의 {OFFLINE_RATIO * 100}%</span>
          </li>
        </ul>
      </div>

      {/* ── Edit modal ───────────────────────────────────────────────────── */}
      {editingEvent && (
        <EditModal
          event={editingEvent}
          onClose={() => setEditingEvent(null)}
          onSave={handleSave}
        />
      )}
    </div>
  );
}
