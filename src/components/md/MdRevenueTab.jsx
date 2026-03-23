import { useState, useEffect, useMemo } from 'react';
import {
  BarChart,
  Bar,
  PieChart,
  Pie,
  Cell,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Legend,
} from 'recharts';
import { Banknote, Receipt, TrendingUp, Percent, Loader } from 'lucide-react';
import { mdService } from '../../services/mdService';

// ─── constants ────────────────────────────────────────────────────────────────

const CHART_COLORS = ['#3b82f6', '#10b981', '#f59e0b', '#8b5cf6', '#ec4899', '#06b6d4', '#f97316'];

const CHART_TOOLTIP_STYLE = {
  backgroundColor: '#161b22',
  border: '1px solid #21262d',
  borderRadius: '8px',
  fontSize: '12px',
};

const CHANNEL_LABELS = {
  offline: '현장 판매',
  online: '온라인(스마트스토어)',
};

const CHANNEL_COLORS = {
  offline: '#f59e0b',
  online: '#3b82f6',
};

const JASO_PURPOSE_LABELS = {
  event: '이벤트',
  sponsor: '스폰서',
  team: '팀 내부',
  other: '기타',
};

const PERIOD_OPTIONS = [
  { key: 'month', label: '이번 달' },
  { key: '3months', label: '3개월' },
  { key: 'year', label: '올해' },
  { key: 'all', label: '전체' },
];

// ─── helpers ──────────────────────────────────────────────────────────────────

const formatWon = (v) => {
  if (v == null || isNaN(v)) return '0원';
  if (v >= 100000000) return `${(v / 100000000).toFixed(1)}억원`;
  if (v >= 10000) return `${Math.round(v / 10000)}만원`;
  return `${v.toLocaleString('ko-KR')}원`;
};

function getDateFrom(periodKey) {
  const now = new Date();
  if (periodKey === 'month') {
    return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-01`;
  }
  if (periodKey === '3months') {
    const d = new Date(now);
    d.setMonth(d.getMonth() - 3);
    return d.toISOString().slice(0, 10);
  }
  if (periodKey === 'year') {
    return `${now.getFullYear()}-01-01`;
  }
  return null; // all
}

function groupByDate(logs) {
  return logs.reduce((acc, log) => {
    const date = log.log_date;
    if (!acc[date]) {
      return { ...acc, [date]: 0 };
    }
    return { ...acc, [date]: acc[date] + (log.quantity ?? 0) * (log.unit_price ?? 0) };
  }, {});
}

// Recharts custom label for pie slices
function renderPieLabel({ cx, cy, midAngle, innerRadius, outerRadius, percent }) {
  if (percent < 0.05) return null;
  const RADIAN = Math.PI / 180;
  const radius = innerRadius + (outerRadius - innerRadius) * 0.55;
  const x = cx + radius * Math.cos(-midAngle * RADIAN);
  const y = cy + radius * Math.sin(-midAngle * RADIAN);
  return (
    <text
      x={x}
      y={y}
      fill="#fff"
      textAnchor="middle"
      dominantBaseline="central"
      fontSize={11}
      fontWeight={600}
    >
      {`${(percent * 100).toFixed(0)}%`}
    </text>
  );
}

// ─── sub-components ───────────────────────────────────────────────────────────

function SummaryCard({ icon: Icon, label, value, sub, iconBg, iconColor }) {
  return (
    <div className="bg-surface-800 rounded-xl border border-surface-700 p-4 flex items-center gap-4">
      <div className={`w-10 h-10 rounded-lg flex items-center justify-center flex-shrink-0 ${iconBg}`}>
        <Icon className={`w-5 h-5 ${iconColor}`} />
      </div>
      <div>
        <p className="text-xs text-gray-400">{label}</p>
        <p className="text-lg font-bold text-white tabular-nums">{value}</p>
        {sub && <p className="text-xs text-gray-500 mt-0.5">{sub}</p>}
      </div>
    </div>
  );
}

// ─── main component ───────────────────────────────────────────────────────────

export default function MdRevenueTab() {
  const [period, setPeriod] = useState('month');
  const [saleLogs, setSaleLogs] = useState([]);
  const [jasoLogs, setJasoLogs] = useState([]);
  const [stockSummary, setStockSummary] = useState([]);
  const [categories, setCategories] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  // ── fetch ──
  useEffect(() => {
    let cancelled = false;

    async function load() {
      setLoading(true);
      setError(null);
      try {
        const dateFrom = getDateFrom(period);
        const [allSaleLogs, allJasoLogs, summary, cats] = await Promise.all([
          mdService.getLogs({ logType: 'sale', ...(dateFrom ? { dateFrom } : {}) }),
          mdService.getLogs({ logType: 'jaso', ...(dateFrom ? { dateFrom } : {}) }),
          mdService.getStockSummary(),
          mdService.getCategories(),
        ]);
        if (!cancelled) {
          setSaleLogs(allSaleLogs || []);
          setJasoLogs(allJasoLogs || []);
          setStockSummary(summary || []);
          setCategories(cats || []);
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
  }, [period]);

  // ── derived maps ──
  const categoryMap = useMemo(() => {
    return (categories || []).reduce(
      (acc, cat) => ({ ...acc, [cat.id]: cat }),
      {},
    );
  }, [categories]);

  const itemCategoryMap = useMemo(() => {
    return (stockSummary || []).reduce(
      (acc, item) => ({ ...acc, [item.item_id]: item.category_id }),
      {},
    );
  }, [stockSummary]);

  const itemCostMap = useMemo(() => {
    return (stockSummary || []).reduce(
      (acc, item) => ({ ...acc, [item.item_id]: item.production_cost ?? 0 }),
      {},
    );
  }, [stockSummary]);

  // ── revenue summary ──
  const revenueSummary = useMemo(() => {
    const totalRevenue = saleLogs.reduce(
      (acc, log) => acc + (log.quantity ?? 0) * (log.unit_price ?? 0),
      0,
    );
    const totalCost = saleLogs.reduce(
      (acc, log) =>
        acc + (log.quantity ?? 0) * (itemCostMap[log.item_id] ?? 0),
      0,
    );
    const netProfit = totalRevenue - totalCost;
    const marginRate = totalRevenue > 0 ? (netProfit / totalRevenue) * 100 : 0;
    return { totalRevenue, totalCost, netProfit, marginRate };
  }, [saleLogs, itemCostMap]);

  // ── daily revenue chart data ──
  const dailyChartData = useMemo(() => {
    const byDate = saleLogs.reduce((acc, log) => {
      const date = log.log_date;
      const amount = (log.quantity ?? 0) * (log.unit_price ?? 0);
      return { ...acc, [date]: (acc[date] ?? 0) + amount };
    }, {});

    return Object.entries(byDate)
      .sort(([a], [b]) => a.localeCompare(b))
      .map(([date, revenue]) => ({
        date: date.slice(5), // MM-DD
        fullDate: date,
        revenue,
      }));
  }, [saleLogs]);

  // ── category revenue pie data ──
  const categoryRevenueData = useMemo(() => {
    const byCat = saleLogs.reduce((acc, log) => {
      const catId = itemCategoryMap[log.item_id];
      const amount = (log.quantity ?? 0) * (log.unit_price ?? 0);
      return { ...acc, [catId]: (acc[catId] ?? 0) + amount };
    }, {});

    return Object.entries(byCat)
      .filter(([, v]) => v > 0)
      .map(([catId, revenue]) => {
        const cat = categoryMap[catId];
        return {
          name: cat ? cat.name : '미분류',
          value: revenue,
          color: cat ? cat.color : '#6b7280',
        };
      })
      .sort((a, b) => b.value - a.value);
  }, [saleLogs, itemCategoryMap, categoryMap]);

  // ── top 5 items by revenue ──
  const top5ItemsData = useMemo(() => {
    const byItem = saleLogs.reduce((acc, log) => {
      const amount = (log.quantity ?? 0) * (log.unit_price ?? 0);
      const name = log.md_items?.name ?? `품목#${log.item_id}`;
      return { ...acc, [name]: (acc[name] ?? 0) + amount };
    }, {});

    return Object.entries(byItem)
      .sort(([, a], [, b]) => b - a)
      .slice(0, 5)
      .map(([name, revenue], idx) => ({
        name: name.length > 10 ? `${name.slice(0, 10)}…` : name,
        fullName: name,
        revenue,
        color: CHART_COLORS[idx % CHART_COLORS.length],
      }));
  }, [saleLogs]);

  // ── channel revenue data ──
  const channelRevenueData = useMemo(() => {
    const byChannel = saleLogs.reduce((acc, log) => {
      const channel = log.sale_channel || 'offline';
      const amount = (log.quantity ?? 0) * (log.unit_price ?? 0);
      return { ...acc, [channel]: (acc[channel] ?? 0) + amount };
    }, {});

    return Object.entries(byChannel)
      .filter(([, v]) => v > 0)
      .map(([channel, revenue]) => ({
        name: CHANNEL_LABELS[channel] ?? channel,
        value: revenue,
        color: CHANNEL_COLORS[channel] ?? '#6b7280',
      }))
      .sort((a, b) => b.value - a.value);
  }, [saleLogs]);

  // ── PnL summary ──
  const pnlSummary = useMemo(() => {
    const totalRevenue = revenueSummary.totalRevenue;
    const totalCost = revenueSummary.totalCost;
    const grossProfit = totalRevenue - totalCost;
    const grossMargin = totalRevenue > 0 ? (grossProfit / totalRevenue) * 100 : 0;

    const onlineRevenue = saleLogs
      .filter((l) => l.sale_channel === 'online')
      .reduce((acc, l) => acc + (l.quantity ?? 0) * (l.unit_price ?? 0), 0);
    const offlineRevenue = totalRevenue - onlineRevenue;
    const onlineRatio = totalRevenue > 0 ? (onlineRevenue / totalRevenue) * 100 : 0;

    return { grossProfit, grossMargin, onlineRevenue, offlineRevenue, onlineRatio };
  }, [revenueSummary, saleLogs]);

  // ── jaso by purpose ──
  const jasoPurposeData = useMemo(() => {
    const byPurpose = jasoLogs.reduce((acc, log) => {
      const purpose = log.jaso_purpose ?? 'other';
      return { ...acc, [purpose]: (acc[purpose] ?? 0) + (log.quantity ?? 0) };
    }, {});

    return Object.entries(byPurpose)
      .filter(([, v]) => v > 0)
      .map(([purpose, qty], idx) => ({
        name: JASO_PURPOSE_LABELS[purpose] ?? purpose,
        value: qty,
        color: CHART_COLORS[idx % CHART_COLORS.length],
      }));
  }, [jasoLogs]);

  // ── recent jaso list (last 5) ──
  const recentJasoList = useMemo(() => {
    return [...jasoLogs]
      .sort((a, b) => b.log_date.localeCompare(a.log_date))
      .slice(0, 5);
  }, [jasoLogs]);

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
      {/* ── 1. Period filter ─────────────────────────────────────────────── */}
      <div className="flex gap-2 flex-wrap">
        {PERIOD_OPTIONS.map((opt) => (
          <button
            key={opt.key}
            onClick={() => setPeriod(opt.key)}
            className={`px-4 py-1.5 rounded-full text-xs font-medium transition-colors ${
              period === opt.key
                ? 'bg-red-500 text-white'
                : 'bg-surface-700 text-gray-400 hover:text-white'
            }`}
          >
            {opt.label}
          </button>
        ))}
      </div>

      {/* ── 2. Revenue summary cards ─────────────────────────────────────── */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <SummaryCard
          icon={Banknote}
          label="총 매출"
          value={formatWon(revenueSummary.totalRevenue)}
          iconBg="bg-green-500/15"
          iconColor="text-green-400"
        />
        <SummaryCard
          icon={Receipt}
          label="총 원가"
          value={formatWon(revenueSummary.totalCost)}
          iconBg="bg-blue-500/15"
          iconColor="text-blue-400"
        />
        <SummaryCard
          icon={TrendingUp}
          label="순이익"
          value={formatWon(revenueSummary.netProfit)}
          iconBg="bg-red-500/15"
          iconColor="text-red-400"
        />
        <SummaryCard
          icon={Percent}
          label="마진율"
          value={`${revenueSummary.marginRate.toFixed(1)}%`}
          iconBg="bg-purple-500/15"
          iconColor="text-purple-400"
        />
      </div>

      {/* ── 3. Daily revenue bar chart ───────────────────────────────────── */}
      <div className="bg-surface-800 rounded-xl border border-surface-700 p-5">
        <h3 className="text-sm font-semibold text-white mb-4">매출 추이</h3>
        {dailyChartData.length === 0 ? (
          <div className="flex items-center justify-center h-[250px] text-gray-500 text-sm">
            해당 기간의 판매 내역이 없습니다.
          </div>
        ) : (
          <ResponsiveContainer width="100%" height={250}>
            <BarChart
              data={dailyChartData}
              margin={{ top: 4, right: 16, left: 0, bottom: 0 }}
            >
              <CartesianGrid strokeDasharray="3 3" stroke="#21262d" />
              <XAxis
                dataKey="date"
                tick={{ fill: '#6b7280', fontSize: 11 }}
                axisLine={false}
                tickLine={false}
              />
              <YAxis
                tick={{ fill: '#6b7280', fontSize: 11 }}
                axisLine={false}
                tickLine={false}
                tickFormatter={(v) => formatWon(v)}
                width={56}
              />
              <Tooltip
                contentStyle={CHART_TOOLTIP_STYLE}
                formatter={(value) => [formatWon(value), '매출']}
                labelFormatter={(label, payload) =>
                  payload?.[0]?.payload?.fullDate ?? label
                }
                cursor={{ fill: 'rgba(255,255,255,0.04)' }}
              />
              <Bar dataKey="revenue" fill="#10b981" radius={[4, 4, 0, 0]} maxBarSize={32} />
            </BarChart>
          </ResponsiveContainer>
        )}
      </div>

      {/* ── 4. Category pie + Top5 bar ───────────────────────────────────── */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        {/* Category pie */}
        <div className="bg-surface-800 rounded-xl border border-surface-700 p-5">
          <h3 className="text-sm font-semibold text-white mb-4">카테고리별 매출</h3>
          {categoryRevenueData.length === 0 ? (
            <div className="flex items-center justify-center h-[220px] text-gray-500 text-sm">
              데이터가 없습니다.
            </div>
          ) : (
            <ResponsiveContainer width="100%" height={220}>
              <PieChart>
                <Pie
                  data={categoryRevenueData}
                  cx="50%"
                  cy="50%"
                  outerRadius={80}
                  dataKey="value"
                  labelLine={false}
                  label={renderPieLabel}
                >
                  {categoryRevenueData.map((entry, idx) => (
                    <Cell key={idx} fill={entry.color} />
                  ))}
                </Pie>
                <Tooltip
                  contentStyle={CHART_TOOLTIP_STYLE}
                  formatter={(value, name) => [formatWon(value), name]}
                />
                <Legend
                  iconType="circle"
                  iconSize={8}
                  wrapperStyle={{ fontSize: '11px', color: '#9ca3af' }}
                />
              </PieChart>
            </ResponsiveContainer>
          )}
        </div>

        {/* Top 5 items horizontal bar */}
        <div className="bg-surface-800 rounded-xl border border-surface-700 p-5">
          <h3 className="text-sm font-semibold text-white mb-4">TOP 5 매출 품목</h3>
          {top5ItemsData.length === 0 ? (
            <div className="flex items-center justify-center h-[220px] text-gray-500 text-sm">
              데이터가 없습니다.
            </div>
          ) : (
            <ResponsiveContainer width="100%" height={220}>
              <BarChart
                data={top5ItemsData}
                layout="vertical"
                margin={{ top: 0, right: 16, left: 8, bottom: 0 }}
              >
                <CartesianGrid strokeDasharray="3 3" stroke="#21262d" horizontal={false} />
                <XAxis
                  type="number"
                  tick={{ fill: '#6b7280', fontSize: 11 }}
                  axisLine={false}
                  tickLine={false}
                  tickFormatter={(v) => formatWon(v)}
                />
                <YAxis
                  type="category"
                  dataKey="name"
                  width={80}
                  tick={{ fill: '#6b7280', fontSize: 11 }}
                  axisLine={false}
                  tickLine={false}
                />
                <Tooltip
                  contentStyle={CHART_TOOLTIP_STYLE}
                  formatter={(value, _name, props) => [
                    formatWon(value),
                    props.payload.fullName,
                  ]}
                  cursor={{ fill: 'rgba(255,255,255,0.04)' }}
                />
                <Bar dataKey="revenue" radius={[0, 4, 4, 0]} maxBarSize={20}>
                  {top5ItemsData.map((entry, idx) => (
                    <Cell key={idx} fill={entry.color} />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          )}
        </div>
      </div>

      {/* ── 5. Channel analysis + PnL ─────────────────────────────────── */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        {/* Channel pie */}
        <div className="bg-surface-800 rounded-xl border border-surface-700 p-5">
          <h3 className="text-sm font-semibold text-white mb-4">채널별 매출</h3>
          {channelRevenueData.length === 0 ? (
            <div className="flex items-center justify-center h-[220px] text-gray-500 text-sm">
              데이터가 없습니다.
            </div>
          ) : (
            <ResponsiveContainer width="100%" height={220}>
              <PieChart>
                <Pie
                  data={channelRevenueData}
                  cx="50%"
                  cy="50%"
                  outerRadius={80}
                  dataKey="value"
                  labelLine={false}
                  label={renderPieLabel}
                >
                  {channelRevenueData.map((entry, idx) => (
                    <Cell key={idx} fill={entry.color} />
                  ))}
                </Pie>
                <Tooltip
                  contentStyle={CHART_TOOLTIP_STYLE}
                  formatter={(value, name) => [formatWon(value), name]}
                />
                <Legend
                  iconType="circle"
                  iconSize={8}
                  wrapperStyle={{ fontSize: '11px', color: '#9ca3af' }}
                />
              </PieChart>
            </ResponsiveContainer>
          )}
        </div>

        {/* PnL summary */}
        <div className="bg-surface-800 rounded-xl border border-surface-700 p-5">
          <h3 className="text-sm font-semibold text-white mb-4">손익 요약 (PnL)</h3>
          <div className="space-y-3">
            {[
              { label: '총 매출', value: formatWon(revenueSummary.totalRevenue), color: 'text-green-400' },
              { label: '총 원가', value: formatWon(revenueSummary.totalCost), color: 'text-blue-400' },
              { label: '매출이익', value: formatWon(pnlSummary.grossProfit), color: pnlSummary.grossProfit >= 0 ? 'text-green-400' : 'text-red-400' },
              { label: '매출이익률', value: `${pnlSummary.grossMargin.toFixed(1)}%`, color: 'text-purple-400' },
            ].map((row) => (
              <div key={row.label} className="flex items-center justify-between py-2 px-3 rounded-lg bg-surface-700/30">
                <span className="text-sm text-gray-400">{row.label}</span>
                <span className={`text-sm font-bold tabular-nums ${row.color}`}>{row.value}</span>
              </div>
            ))}
            <div className="border-t border-surface-700 pt-3 mt-3">
              <p className="text-xs text-gray-500 mb-2">채널 비중</p>
              <div className="flex items-center gap-3">
                <div className="flex-1">
                  <div className="flex items-center justify-between text-xs mb-1">
                    <span className="text-yellow-400">현장</span>
                    <span className="text-gray-400 tabular-nums">{formatWon(pnlSummary.offlineRevenue)}</span>
                  </div>
                  <div className="w-full h-1.5 rounded-full bg-surface-700 overflow-hidden">
                    <div
                      className="h-full rounded-full bg-yellow-400"
                      style={{ width: `${100 - pnlSummary.onlineRatio}%` }}
                    />
                  </div>
                </div>
                <div className="flex-1">
                  <div className="flex items-center justify-between text-xs mb-1">
                    <span className="text-blue-400">온라인</span>
                    <span className="text-gray-400 tabular-nums">{formatWon(pnlSummary.onlineRevenue)}</span>
                  </div>
                  <div className="w-full h-1.5 rounded-full bg-surface-700 overflow-hidden">
                    <div
                      className="h-full rounded-full bg-blue-400"
                      style={{ width: `${pnlSummary.onlineRatio}%` }}
                    />
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* ── 6. Jaso analysis ─────────────────────────────────────────────── */}
      <div className="bg-surface-800 rounded-xl border border-surface-700 p-5">
        <h3 className="text-sm font-semibold text-white mb-4">자소(증정) 분석</h3>
        {jasoLogs.length === 0 ? (
          <div className="flex items-center justify-center py-8 text-gray-500 text-sm">
            해당 기간의 자소 내역이 없습니다.
          </div>
        ) : (
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Purpose pie */}
            <div>
              <p className="text-xs text-gray-400 mb-3">목적별 수량</p>
              {jasoPurposeData.length === 0 ? (
                <div className="flex items-center justify-center h-[180px] text-gray-500 text-sm">
                  데이터가 없습니다.
                </div>
              ) : (
                <ResponsiveContainer width="100%" height={180}>
                  <PieChart>
                    <Pie
                      data={jasoPurposeData}
                      cx="50%"
                      cy="50%"
                      outerRadius={65}
                      dataKey="value"
                      labelLine={false}
                      label={renderPieLabel}
                    >
                      {jasoPurposeData.map((entry, idx) => (
                        <Cell key={idx} fill={entry.color} />
                      ))}
                    </Pie>
                    <Tooltip
                      contentStyle={CHART_TOOLTIP_STYLE}
                      formatter={(value, name) => [`${value.toLocaleString('ko-KR')}개`, name]}
                    />
                    <Legend
                      iconType="circle"
                      iconSize={8}
                      wrapperStyle={{ fontSize: '11px', color: '#9ca3af' }}
                    />
                  </PieChart>
                </ResponsiveContainer>
              )}
            </div>

            {/* Recent jaso list */}
            <div>
              <p className="text-xs text-gray-400 mb-3">최근 자소 내역</p>
              <div className="space-y-2">
                {recentJasoList.length === 0 ? (
                  <p className="text-gray-500 text-sm">내역이 없습니다.</p>
                ) : (
                  recentJasoList.map((log) => {
                    const purposeLabel =
                      JASO_PURPOSE_LABELS[log.jaso_purpose] ?? log.jaso_purpose ?? '-';
                    const itemName = log.md_items?.name ?? `품목#${log.item_id}`;
                    return (
                      <div
                        key={log.id}
                        className="flex items-center justify-between py-2 px-3 rounded-lg bg-surface-700/30 border border-surface-700/50"
                      >
                        <div className="min-w-0">
                          <p className="text-sm text-white font-medium truncate">{itemName}</p>
                          <p className="text-xs text-gray-500 mt-0.5">
                            {log.log_date} · {purposeLabel}
                            {log.jaso_destination ? ` · ${log.jaso_destination}` : ''}
                          </p>
                        </div>
                        <span className="text-yellow-400 font-semibold tabular-nums text-sm ml-3 flex-shrink-0">
                          {(log.quantity ?? 0).toLocaleString('ko-KR')}개
                        </span>
                      </div>
                    );
                  })
                )}
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
