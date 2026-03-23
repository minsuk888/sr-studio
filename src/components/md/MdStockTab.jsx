import { useState, useEffect, useMemo } from 'react';
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
import { Package, Boxes, AlertTriangle, XCircle, Loader, Gift, ChevronUp, ChevronDown } from 'lucide-react';
import { mdService } from '../../services/mdService';

// ─── constants ───────────────────────────────────────────────────────────────

const CHART_TOOLTIP_STYLE = {
  backgroundColor: '#161b22',
  border: '1px solid #21262d',
  borderRadius: '8px',
  fontSize: '12px',
};

// ─── helpers ─────────────────────────────────────────────────────────────────

function getStockLevel(stock) {
  if (stock <= 0) return 'out';
  if (stock <= 10) return 'low';
  return 'ok';
}

function getStockColor(level) {
  if (level === 'out') return '#ef4444';
  if (level === 'low') return '#f59e0b';
  return '#10b981';
}

const SORT_COLUMNS = {
  name: { getValue: (item) => item.name?.toLowerCase() ?? '', type: 'string' },
  initial_stock: { getValue: (item) => item.initial_stock ?? 0, type: 'number' },
  total_inbound: { getValue: (item) => item.total_inbound ?? 0, type: 'number' },
  total_sold: { getValue: (item) => item.total_sold ?? 0, type: 'number' },
  current_stock: { getValue: (item) => item.current_stock ?? 0, type: 'number' },
  current_jaso: { getValue: (item) => item.current_jaso ?? 0, type: 'number' },
};

// ─── sub-components ──────────────────────────────────────────────────────────

function SummaryCard({ icon: Icon, label, value, iconBg, iconColor }) {
  return (
    <div className="bg-surface-800 rounded-xl border border-surface-700 p-4 flex items-center gap-4">
      <div className={`w-10 h-10 rounded-lg flex items-center justify-center flex-shrink-0 ${iconBg}`}>
        <Icon className={`w-5 h-5 ${iconColor}`} />
      </div>
      <div>
        <p className="text-xs text-gray-400">{label}</p>
        <p className="text-xl font-bold text-white tabular-nums">{value}</p>
      </div>
    </div>
  );
}

function StockStatusDot({ level }) {
  if (level === 'ok') {
    return (
      <span className="inline-flex items-center gap-1.5 text-green-400 text-xs font-medium">
        <span className="w-1.5 h-1.5 rounded-full bg-green-400 flex-shrink-0" />
        충분
      </span>
    );
  }
  if (level === 'low') {
    return (
      <span className="inline-flex items-center gap-1.5 text-yellow-400 text-xs font-medium">
        <span className="w-1.5 h-1.5 rounded-full bg-yellow-400 animate-pulse flex-shrink-0" />
        부족
      </span>
    );
  }
  return (
    <span className="inline-flex items-center gap-1.5 text-red-400 text-xs font-medium">
      <span className="w-1.5 h-1.5 rounded-full bg-red-400 flex-shrink-0" />
      소진
    </span>
  );
}

function SortIcon({ sortKey, sortConfig }) {
  if (sortConfig.key !== sortKey) {
    return <ChevronUp className="w-3 h-3 text-gray-600" />;
  }
  return sortConfig.direction === 'asc'
    ? <ChevronUp className="w-3 h-3 text-red-400" />
    : <ChevronDown className="w-3 h-3 text-red-400" />;
}

function SortableTh({ children, sortKey, sortConfig, onSort, className = '' }) {
  return (
    <th
      className={`px-4 py-3 text-xs font-medium text-gray-400 whitespace-nowrap select-none cursor-pointer hover:text-gray-200 transition-colors ${className}`}
      onClick={() => onSort(sortKey)}
    >
      <div className={`flex items-center gap-0.5 ${className.includes('text-right') ? 'justify-end' : ''}`}>
        {children}
        <SortIcon sortKey={sortKey} sortConfig={sortConfig} />
      </div>
    </th>
  );
}

// ─── main component ───────────────────────────────────────────────────────────

export default function MdStockTab() {
  const [stockSummary, setStockSummary] = useState([]);
  const [selectedBrand, setSelectedBrand] = useState('all');
  const [sortConfig, setSortConfig] = useState({ key: 'current_stock', direction: 'asc' });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  // ── fetch ──
  useEffect(() => {
    let cancelled = false;

    async function load() {
      setLoading(true);
      setError(null);
      try {
        const summary = await mdService.getStockSummary();
        if (!cancelled) {
          setStockSummary(summary || []);
        }
      } catch (err) {
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

  // ── derived data ──
  const activeItems = useMemo(
    () => (stockSummary || []).filter((s) => s.is_active),
    [stockSummary],
  );

  const summaryStats = useMemo(() => {
    const totalItems = activeItems.length;
    const lowStock = activeItems.filter((s) => s.current_stock > 0 && s.current_stock <= 5).length;
    const outOfStock = activeItems.filter((s) => s.current_stock <= 0).length;
    const totalQuantity = activeItems.reduce((acc, s) => acc + (s.current_stock || 0), 0);
    const totalJaso = activeItems.reduce((acc, s) => acc + (s.current_jaso || 0), 0);
    return { totalItems, lowStock, outOfStock, totalQuantity, totalJaso };
  }, [activeItems]);

  const handleSort = (key) => {
    setSortConfig((prev) => {
      if (prev.key === key) {
        return prev.direction === 'asc'
          ? { key, direction: 'desc' }
          : { key: null, direction: 'asc' };
      }
      return { key, direction: 'asc' };
    });
  };

  // filtered + sorted rows
  const filteredItems = useMemo(() => {
    const base = selectedBrand !== 'all'
      ? activeItems.filter((s) => s.brand === selectedBrand)
      : activeItems;

    if (!sortConfig.key) {
      return [...base].sort((a, b) => (a.current_stock ?? 0) - (b.current_stock ?? 0));
    }

    const col = SORT_COLUMNS[sortConfig.key];
    if (!col) return base;
    const dir = sortConfig.direction === 'asc' ? 1 : -1;
    return [...base].sort((a, b) => {
      const va = col.getValue(a);
      const vb = col.getValue(b);
      if (col.type === 'string') return va < vb ? -dir : va > vb ? dir : 0;
      return (va - vb) * dir;
    });
  }, [activeItems, selectedBrand, sortConfig]);

  // chart: top 10 by current_stock (always sorted ascending for chart)
  const chartData = useMemo(() => {
    const base = selectedBrand !== 'all'
      ? activeItems.filter((s) => s.brand === selectedBrand)
      : activeItems;
    return [...base]
      .sort((a, b) => (a.current_stock ?? 0) - (b.current_stock ?? 0))
      .slice(0, 10)
      .map((item) => ({
        name: item.name.length > 8 ? `${item.name.slice(0, 8)}…` : item.name,
        fullName: item.name,
        stock: item.current_stock ?? 0,
        level: getStockLevel(item.current_stock ?? 0),
      }));
  }, [activeItems, selectedBrand]);

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
      <div className="grid grid-cols-2 lg:grid-cols-5 gap-4">
        <SummaryCard
          icon={Package}
          label="총 품목 수"
          value={summaryStats.totalItems}
          iconBg="bg-red-500/15"
          iconColor="text-red-400"
        />
        <SummaryCard
          icon={Boxes}
          label="총 재고 수량"
          value={summaryStats.totalQuantity.toLocaleString('ko-KR')}
          iconBg="bg-blue-500/15"
          iconColor="text-blue-400"
        />
        <SummaryCard
          icon={Gift}
          label="총 자소 잔여"
          value={summaryStats.totalJaso.toLocaleString('ko-KR')}
          iconBg="bg-yellow-500/15"
          iconColor="text-yellow-400"
        />
        <SummaryCard
          icon={AlertTriangle}
          label="재고 부족"
          value={summaryStats.lowStock}
          iconBg="bg-amber-500/15"
          iconColor="text-amber-400"
        />
        <SummaryCard
          icon={XCircle}
          label="재고 소진"
          value={summaryStats.outOfStock}
          iconBg="bg-red-500/15"
          iconColor="text-red-400"
        />
      </div>

      {/* ── 2. Brand filter ─────────────────────────────────────────────── */}
      <div className="flex items-center gap-2">
        {[
          { value: 'all', label: '전체' },
          { value: 'SR', label: '슈퍼레이스' },
          { value: 'ONE', label: '오네 레이싱' },
        ].map((b) => (
          <button
            key={b.value}
            onClick={() => setSelectedBrand(b.value)}
            className={`shrink-0 px-3 py-1.5 rounded-full text-xs font-medium transition-colors cursor-pointer ${
              selectedBrand === b.value
                ? b.value === 'SR' ? 'bg-red-500 text-white'
                  : b.value === 'ONE' ? 'bg-blue-500 text-white'
                  : 'bg-red-500 text-white'
                : 'bg-surface-700 text-gray-400 hover:text-white'
            }`}
          >
            {b.label}
          </button>
        ))}
      </div>

      {/* ── 3. Stock table ───────────────────────────────────────────────── */}
      <div className="bg-surface-800 rounded-xl border border-surface-700 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="bg-surface-700/30 border-b border-surface-700">
                <SortableTh sortKey="name" sortConfig={sortConfig} onSort={handleSort} className="text-left">
                  품목
                </SortableTh>
                <th className="text-center px-4 py-3 text-xs font-medium text-gray-400 whitespace-nowrap">
                  브랜드
                </th>
                <SortableTh sortKey="initial_stock" sortConfig={sortConfig} onSort={handleSort} className="text-right tabular-nums">
                  초기재고
                </SortableTh>
                <SortableTh sortKey="total_inbound" sortConfig={sortConfig} onSort={handleSort} className="text-right tabular-nums">
                  입고
                </SortableTh>
                <SortableTh sortKey="total_sold" sortConfig={sortConfig} onSort={handleSort} className="text-right tabular-nums">
                  판매
                </SortableTh>
                <SortableTh sortKey="current_stock" sortConfig={sortConfig} onSort={handleSort} className="text-right tabular-nums">
                  현재재고
                </SortableTh>
                <th className="text-right px-4 py-3 text-xs font-medium text-gray-400 whitespace-nowrap tabular-nums">
                  소진율
                </th>
                <th className="text-center px-4 py-3 text-xs font-medium text-gray-400 whitespace-nowrap">
                  상태
                </th>
                <th className="text-right px-4 py-3 text-xs font-medium text-yellow-500/70 whitespace-nowrap tabular-nums border-l border-surface-700">
                  초기자소
                </th>
                <th className="text-right px-4 py-3 text-xs font-medium text-yellow-500/70 whitespace-nowrap tabular-nums">
                  사용
                </th>
                <SortableTh sortKey="current_jaso" sortConfig={sortConfig} onSort={handleSort} className="text-right tabular-nums">
                  <span className="text-yellow-500/70">자소잔여</span>
                </SortableTh>
              </tr>
            </thead>
            <tbody className="divide-y divide-surface-700/50">
              {filteredItems.length === 0 ? (
                <tr>
                  <td colSpan={11} className="px-4 py-12 text-center text-gray-500 text-sm">
                    해당하는 품목이 없습니다.
                  </td>
                </tr>
              ) : (
                filteredItems.map((item) => {
                  const level = getStockLevel(item.current_stock ?? 0);
                  const stockColor =
                    level === 'ok'
                      ? 'text-green-400'
                      : level === 'low'
                      ? 'text-yellow-400'
                      : 'text-red-400';

                  return (
                    <tr
                      key={item.item_id}
                      className="hover:bg-white/[0.02] transition-colors"
                    >
                      <td className="px-4 py-3 text-white font-medium whitespace-nowrap">
                        {item.name}
                      </td>
                      <td className="px-4 py-3 text-center">
                        {item.brand && (
                          <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${
                            item.brand === 'SR' ? 'bg-red-500/20 text-red-400' : 'bg-blue-500/20 text-blue-400'
                          }`}>
                            {item.brand === 'SR' ? 'SR' : 'ONE'}
                          </span>
                        )}
                      </td>
                      <td className="px-4 py-3 text-right text-gray-300 tabular-nums">
                        {(item.initial_stock ?? 0).toLocaleString('ko-KR')}
                      </td>
                      <td className="px-4 py-3 text-right text-blue-400 tabular-nums">
                        {(item.total_inbound ?? 0).toLocaleString('ko-KR')}
                      </td>
                      <td className="px-4 py-3 text-right text-green-400 tabular-nums">
                        {(item.total_sold ?? 0).toLocaleString('ko-KR')}
                      </td>
                      <td className={`px-4 py-3 text-right font-bold tabular-nums ${stockColor}`}>
                        {(item.current_stock ?? 0).toLocaleString('ko-KR')}
                      </td>
                      <td className="px-4 py-3 text-right tabular-nums">
                        {(() => {
                          const initial = (item.initial_stock ?? 0) + (item.total_inbound ?? 0);
                          const sold = item.total_sold ?? 0;
                          if (initial <= 0) return <span className="text-gray-500">-</span>;
                          const rate = Math.round((sold / initial) * 100);
                          return (
                            <div className="flex items-center justify-end gap-2">
                              <div className="w-12 h-1.5 rounded-full bg-surface-700 overflow-hidden">
                                <div
                                  className={`h-full rounded-full ${
                                    rate >= 80 ? 'bg-red-400' : rate >= 50 ? 'bg-yellow-400' : 'bg-green-400'
                                  }`}
                                  style={{ width: `${Math.min(rate, 100)}%` }}
                                />
                              </div>
                              <span className={`text-xs font-medium ${
                                rate >= 80 ? 'text-red-400' : rate >= 50 ? 'text-yellow-400' : 'text-green-400'
                              }`}>
                                {rate}%
                              </span>
                            </div>
                          );
                        })()}
                      </td>
                      <td className="px-4 py-3 text-center">
                        <StockStatusDot level={level} />
                      </td>
                      <td className="px-4 py-3 text-right text-gray-400 tabular-nums border-l border-surface-700/50">
                        {(item.initial_jaso ?? 0).toLocaleString('ko-KR')}
                      </td>
                      <td className="px-4 py-3 text-right text-yellow-400 tabular-nums">
                        {(item.total_jaso ?? 0).toLocaleString('ko-KR')}
                      </td>
                      <td className={`px-4 py-3 text-right font-bold tabular-nums ${
                        (item.current_jaso ?? 0) <= 0 ? 'text-red-400' : 'text-yellow-400'
                      }`}>
                        {(item.current_jaso ?? 0).toLocaleString('ko-KR')}
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* ── 4. Stock distribution chart ──────────────────────────────────── */}
      {chartData.length > 0 && (
        <div className="bg-surface-800 rounded-xl border border-surface-700 p-5">
          <h3 className="text-sm font-semibold text-white mb-4">재고 현황 (하위 10개 품목)</h3>
          <ResponsiveContainer width="100%" height={280}>
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
                width={72}
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
              <Bar dataKey="stock" radius={[0, 4, 4, 0]} maxBarSize={20}>
                {chartData.map((entry, idx) => (
                  <Cell key={idx} fill={getStockColor(entry.level)} />
                ))}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </div>
      )}
    </div>
  );
}
