import { useState, useEffect, useMemo } from 'react';
import {
  BarChart, Bar, PieChart, Pie, Cell,
  XAxis, YAxis, CartesianGrid, Tooltip,
  ResponsiveContainer, Legend, ReferenceLine,
} from 'recharts';
import { Loader, Target, TrendingUp, AlertTriangle, DollarSign, Gauge } from 'lucide-react';
import { mdService } from '../../services/mdService';

// ─── constants ────────────────────────────────────────────────────────────────

const SCENARIOS = [
  { key: 'conservative', label: '보수적', rate: 70 },
  { key: 'target', label: '목표', rate: 85 },
  { key: 'sellout', label: '완판', rate: 100 },
];

const TT = {
  backgroundColor: '#161b22',
  border: '1px solid #21262d',
  borderRadius: '8px',
  fontSize: '12px',
};

const AXIS_TICK = { fill: '#6b7280', fontSize: 11 };
const CURSOR_STYLE = { fill: 'rgba(255,255,255,0.04)' };

// ─── helpers ──────────────────────────────────────────────────────────────────

const formatWon = (v) => {
  if (v == null || isNaN(v)) return '0원';
  if (v >= 100000000) return `${(v / 100000000).toFixed(1)}억원`;
  if (v >= 10000) return `${Math.round(v / 10000)}만원`;
  return `${v.toLocaleString('ko-KR')}원`;
};

const sliderColor = (r) => r < 70 ? 'text-red-500' : r < 85 ? 'text-yellow-500' : 'text-green-500';
const sliderTrack = (r) => r < 70 ? '#ef4444' : r < 85 ? '#eab308' : '#22c55e';
const profitCls = (v) => v > 0 ? 'text-green-400' : v < 0 ? 'text-red-400' : 'text-gray-400';

function EmptyChart({ h = 200 }) {
  return <div className={`flex items-center justify-center text-gray-500 text-sm`} style={{ height: h }}>데이터가 없습니다.</div>;
}

// ─── sub-components ───────────────────────────────────────────────────────────

function ScenarioCard({ scenario, pnl, isActive }) {
  const border = isActive ? 'border-red-500 ring-1 ring-red-500/30' : 'border-surface-700';
  const rows = [
    { l: '매출', v: formatWon(pnl.revenue), c: 'text-white font-semibold' },
    { l: '비용합계', v: formatWon(pnl.totalCost), c: 'text-gray-300' },
  ];
  return (
    <div className={`bg-surface-800 rounded-xl border p-5 transition-all ${border}`}>
      <div className="flex items-center gap-2 mb-3">
        <h4 className="text-sm font-semibold text-white">{scenario.label}</h4>
        <span className="ml-auto text-xs font-mono text-gray-400">{scenario.rate}%</span>
      </div>
      <div className="space-y-2">
        {rows.map((r) => (
          <div key={r.l} className="flex justify-between">
            <span className="text-xs text-gray-500">{r.l}</span>
            <span className={`text-sm tabular-nums ${r.c}`}>{r.v}</span>
          </div>
        ))}
        <div className="border-t border-surface-700 pt-2 flex justify-between">
          <span className="text-xs text-gray-500">영업이익</span>
          <span className={`text-sm font-bold tabular-nums ${profitCls(pnl.operatingProfit)}`}>{formatWon(pnl.operatingProfit)}</span>
        </div>
        <div className="flex justify-between">
          <span className="text-xs text-gray-500">영업이익률</span>
          <span className={`text-sm font-semibold tabular-nums ${profitCls(pnl.profitRate)}`}>{(pnl.profitRate * 100).toFixed(1)}%</span>
        </div>
      </div>
    </div>
  );
}

function BreakEvenGauge({ breakEvenRate, currentRate }) {
  const bep = Math.min(breakEvenRate, 100);
  const cur = Math.min(currentRate, 100);
  const safe = currentRate >= breakEvenRate;
  const diff = Math.abs(currentRate - breakEvenRate).toFixed(1);

  return (
    <div className="bg-surface-800 rounded-xl border border-surface-700 p-5">
      <div className="flex items-center gap-2 mb-4">
        <Gauge className="w-4 h-4 text-yellow-400" />
        <h3 className="text-sm font-semibold text-white">손익분기점 게이지</h3>
      </div>
      <div className="relative h-8 bg-surface-700 rounded-full overflow-hidden mb-3">
        <div className="absolute top-0 left-0 h-full bg-red-500/20 rounded-l-full" style={{ width: `${bep}%` }} />
        <div className="absolute top-0 h-full bg-green-500/20 rounded-r-full" style={{ left: `${bep}%`, width: `${100 - bep}%` }} />
        <div className="absolute top-0 h-full w-0.5 bg-yellow-400" style={{ left: `${bep}%` }} />
        <div className="absolute top-0 left-0 h-full rounded-full transition-all duration-300"
          style={{ width: `${cur}%`, backgroundColor: safe ? 'rgba(34,197,94,0.35)' : 'rgba(239,68,68,0.35)' }} />
      </div>
      <div className="flex justify-between text-xs">
        <span className="text-gray-500">0%</span>
        <div className="flex items-center gap-4">
          <span className="flex items-center gap-1">
            <span className="w-2 h-2 rounded-full bg-yellow-400" />
            <span className="text-yellow-400">BEP {breakEvenRate.toFixed(1)}%</span>
          </span>
          <span className="flex items-center gap-1">
            <span className={`w-2 h-2 rounded-full ${safe ? 'bg-green-400' : 'bg-red-400'}`} />
            <span className={safe ? 'text-green-400' : 'text-red-400'}>현재 {currentRate}%</span>
          </span>
        </div>
        <span className="text-gray-500">100%</span>
      </div>
      <p className={`text-xs mt-3 ${safe ? 'text-green-400' : 'text-red-400'}`}>
        {safe ? `손익분기점 대비 +${diff}%p 안전 구간` : `손익분기점까지 ${diff}%p 부족`}
      </p>
    </div>
  );
}

// ─── main component ───────────────────────────────────────────────────────────

export default function MdSalesPlanTab() {
  const [stockSummary, setStockSummary] = useState([]);
  const [pnlConfig, setPnlConfig] = useState(null);
  const [sellThroughRate, setSellThroughRate] = useState(85);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    let cancelled = false;
    async function load() {
      setLoading(true);
      setError(null);
      try {
        const [summary, config] = await Promise.all([
          mdService.getStockSummary(),
          mdService.getPnlConfig(),
        ]);
        if (!cancelled) { setStockSummary(summary || []); setPnlConfig(config); }
      } catch (err) {
        if (!cancelled) { setError('데이터를 불러오는 중 오류가 발생했습니다.'); console.error('MdSalesPlanTab:', err); }
      } finally {
        if (!cancelled) setLoading(false);
      }
    }
    load();
    return () => { cancelled = true; };
  }, []);

  const currentPnl = useMemo(() => {
    if (!pnlConfig || stockSummary.length === 0) return null;
    return mdService.calculatePnl({ stockSummary, pnlConfig, sellThroughRate });
  }, [stockSummary, pnlConfig, sellThroughRate]);

  const scenarioPnls = useMemo(() => {
    if (!pnlConfig || stockSummary.length === 0) return {};
    return SCENARIOS.reduce((acc, s) => ({
      ...acc, [s.key]: mdService.calculatePnl({ stockSummary, pnlConfig, sellThroughRate: s.rate }),
    }), {});
  }, [stockSummary, pnlConfig]);

  const waterfallData = useMemo(() => {
    if (!currentPnl) return [];
    return [
      { name: '매출', value: currentPnl.revenue, fill: '#22c55e' },
      { name: 'SR 제작비', value: -currentPnl.srCost, fill: '#ef4444' },
      { name: '오네 제작비', value: -currentPnl.oneCost, fill: '#f97316' },
      { name: '현장 운영비', value: -currentPnl.eventOpsTotalCost, fill: '#eab308' },
      { name: '온라인 수수료', value: -currentPnl.onlineFeeCost, fill: '#8b5cf6' },
      { name: '영업이익', value: currentPnl.operatingProfit, fill: currentPnl.operatingProfit >= 0 ? '#22c55e' : '#ef4444' },
    ];
  }, [currentPnl]);

  const brandRevenueData = useMemo(() => {
    if (!currentPnl || stockSummary.length === 0) return [];
    const active = stockSummary.filter((s) => s.is_active);
    const rate = sellThroughRate / 100;
    const calc = (brand) => Math.round(active.filter((s) => s.brand === brand)
      .reduce((a, i) => a + (i.initial_stock || 0) * (i.selling_price || 0) * rate, 0));
    return [
      { name: 'SR', revenue: calc('SR'), fill: '#ef4444' },
      { name: 'ONE', revenue: calc('ONE'), fill: '#3b82f6' },
    ];
  }, [stockSummary, sellThroughRate, currentPnl]);

  const channelData = useMemo(() => {
    if (!pnlConfig) return [];
    const r = parseFloat(pnlConfig.online_ratio) || 0.35;
    return [
      { name: '현장판매', value: Math.round((1 - r) * 100), color: '#22c55e' },
      { name: '온라인판매', value: Math.round(r * 100), color: '#3b82f6' },
    ];
  }, [pnlConfig]);

  const actualSellThrough = useMemo(() => {
    const active = stockSummary.filter((s) => s.is_active);
    const totalQty = active.reduce((a, s) => a + (s.initial_stock || 0), 0);
    const totalSold = active.reduce((a, s) => a + (s.total_sold || 0), 0);
    if (totalQty === 0) return null;
    return { rate: (totalSold / totalQty) * 100, totalSold, totalQty };
  }, [stockSummary]);

  if (loading) return <div className="flex items-center justify-center py-24 text-gray-400 gap-2"><Loader className="w-5 h-5 animate-spin" /><span className="text-sm">불러오는 중…</span></div>;
  if (error) return <div className="flex items-center justify-center py-24 text-red-400 text-sm">{error}</div>;
  if (!currentPnl) return <div className="flex items-center justify-center py-24 text-gray-500 text-sm">PnL 설정 또는 재고 데이터가 없습니다.</div>;

  const tc = sliderTrack(sellThroughRate);
  const COST_ROWS = [
    { label: 'SR 제작비', value: currentPnl.srCost, dot: '#ef4444' },
    { label: '오네 제작비', value: currentPnl.oneCost, dot: '#f97316' },
    { label: '현장 운영비', value: currentPnl.eventOpsTotalCost, dot: '#eab308' },
    { label: '온라인 수수료', value: currentPnl.onlineFeeCost, dot: '#8b5cf6' },
  ];

  return (
    <div className="space-y-6">
      {/* 1. Sell-Through Slider */}
      <div className="bg-surface-800 rounded-xl border border-surface-700 p-5">
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center gap-2">
            <Target className="w-4 h-4 text-red-400" />
            <h3 className="text-sm font-semibold text-white">소진율 시뮬레이션</h3>
          </div>
          <span className={`text-3xl font-bold tabular-nums ${sliderColor(sellThroughRate)}`}>{sellThroughRate}%</span>
        </div>
        <input type="range" min={0} max={100} value={sellThroughRate}
          onChange={(e) => setSellThroughRate(Number(e.target.value))}
          className="w-full h-2 rounded-full appearance-none cursor-pointer"
          style={{ background: `linear-gradient(to right, ${tc} ${sellThroughRate}%, #1e242c ${sellThroughRate}%)` }} />
        <div className="flex justify-between text-xs text-gray-500 mt-1">
          <span>0%</span><span className="text-yellow-500">70%</span><span className="text-green-500">85%</span><span>100%</span>
        </div>
      </div>

      {/* 2. Scenario Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {SCENARIOS.map((s) => {
          const pnl = scenarioPnls[s.key];
          return pnl ? <ScenarioCard key={s.key} scenario={s} pnl={pnl} isActive={sellThroughRate === s.rate} /> : null;
        })}
      </div>

      {/* 3. PnL Breakdown */}
      <div className="bg-surface-800 rounded-xl border border-surface-700 p-5">
        <div className="flex items-center gap-2 mb-4">
          <DollarSign className="w-4 h-4 text-green-400" />
          <h3 className="text-sm font-semibold text-white">손익 구조 ({sellThroughRate}% 기준)</h3>
        </div>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-5">
          {[
            { l: '매출', v: formatWon(currentPnl.revenue), c: 'text-green-400' },
            { l: '비용 합계', v: formatWon(currentPnl.totalCost), c: 'text-red-400' },
            { l: '영업이익', v: formatWon(currentPnl.operatingProfit), c: profitCls(currentPnl.operatingProfit) },
            { l: '영업이익률', v: `${(currentPnl.profitRate * 100).toFixed(1)}%`, c: profitCls(currentPnl.profitRate) },
          ].map((i) => (
            <div key={i.l} className="bg-surface-700/30 rounded-lg p-3">
              <p className="text-xs text-gray-500 mb-1">{i.l}</p>
              <p className={`text-sm font-bold tabular-nums ${i.c}`}>{i.v}</p>
            </div>
          ))}
        </div>
        <ResponsiveContainer width="100%" height={280}>
          <BarChart data={waterfallData} margin={{ top: 8, right: 16, left: 0, bottom: 0 }}>
            <CartesianGrid strokeDasharray="3 3" stroke="#21262d" />
            <XAxis dataKey="name" tick={AXIS_TICK} axisLine={false} tickLine={false} />
            <YAxis tick={AXIS_TICK} axisLine={false} tickLine={false} tickFormatter={(v) => formatWon(Math.abs(v))} width={64} />
            <Tooltip contentStyle={TT} formatter={(v) => [formatWon(Math.abs(v)), v >= 0 ? '수입' : '비용']} cursor={CURSOR_STYLE} />
            <ReferenceLine y={0} stroke="#374151" />
            <Bar dataKey="value" radius={[4, 4, 0, 0]} maxBarSize={48}>
              {waterfallData.map((e, i) => <Cell key={i} fill={e.fill} />)}
            </Bar>
          </BarChart>
        </ResponsiveContainer>
        <div className="mt-4 border-t border-surface-700 pt-4 space-y-2">
          {COST_ROWS.map((r) => (
            <div key={r.label} className="flex items-center justify-between text-sm">
              <span className="flex items-center gap-2">
                <span className="w-2 h-2 rounded-full" style={{ backgroundColor: r.dot }} />
                <span className="text-gray-400">{r.label}</span>
              </span>
              <span className="text-gray-300 tabular-nums">{formatWon(r.value)}</span>
            </div>
          ))}
        </div>
      </div>

      {/* 4. Break-Even Gauge */}
      <BreakEvenGauge breakEvenRate={currentPnl.breakEvenRate} currentRate={sellThroughRate} />

      {/* 5. Brand Revenue + Channel Split */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <div className="bg-surface-800 rounded-xl border border-surface-700 p-5">
          <h3 className="text-sm font-semibold text-white mb-4">브랜드별 예상 매출</h3>
          {brandRevenueData.length === 0 ? <EmptyChart /> : (
            <ResponsiveContainer width="100%" height={200}>
              <BarChart data={brandRevenueData} layout="vertical" margin={{ top: 0, right: 16, left: 8, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#21262d" horizontal={false} />
                <XAxis type="number" tick={AXIS_TICK} axisLine={false} tickLine={false} tickFormatter={formatWon} />
                <YAxis type="category" dataKey="name" width={40} tick={{ ...AXIS_TICK, fontSize: 12, fontWeight: 600 }} axisLine={false} tickLine={false} />
                <Tooltip contentStyle={TT} formatter={(v) => [formatWon(v), '예상 매출']} cursor={CURSOR_STYLE} />
                <Bar dataKey="revenue" radius={[0, 6, 6, 0]} maxBarSize={28}>
                  {brandRevenueData.map((e, i) => <Cell key={i} fill={e.fill} />)}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          )}
        </div>
        <div className="bg-surface-800 rounded-xl border border-surface-700 p-5">
          <h3 className="text-sm font-semibold text-white mb-4">채널별 판매 비율</h3>
          {channelData.length === 0 ? <EmptyChart /> : (
            <ResponsiveContainer width="100%" height={200}>
              <PieChart>
                <Pie data={channelData} cx="50%" cy="50%" innerRadius={50} outerRadius={80}
                  dataKey="value" paddingAngle={2} label={({ name, value }) => `${name} ${value}%`} labelLine={false}>
                  {channelData.map((e, i) => <Cell key={i} fill={e.color} />)}
                </Pie>
                <Tooltip contentStyle={TT} formatter={(v, n) => [`${v}%`, n]} />
                <Legend iconType="circle" iconSize={8} wrapperStyle={{ fontSize: '11px', color: '#9ca3af' }} />
              </PieChart>
            </ResponsiveContainer>
          )}
        </div>
      </div>

      {/* 6. Current Performance */}
      {actualSellThrough && actualSellThrough.totalSold > 0 && (
        <div className="bg-surface-800 rounded-xl border border-surface-700 p-5">
          <div className="flex items-center gap-2 mb-4">
            <TrendingUp className="w-4 h-4 text-green-400" />
            <h3 className="text-sm font-semibold text-white">현재 실적</h3>
          </div>
          <div className="flex items-center gap-8">
            <div className="relative flex-shrink-0">
              <svg width="100" height="100" viewBox="0 0 100 100">
                <circle cx="50" cy="50" r="42" fill="none" stroke="#1e242c" strokeWidth="8" />
                <circle cx="50" cy="50" r="42" fill="none"
                  stroke={actualSellThrough.rate >= 85 ? '#22c55e' : actualSellThrough.rate >= 70 ? '#eab308' : '#ef4444'}
                  strokeWidth="8" strokeLinecap="round"
                  strokeDasharray={`${(actualSellThrough.rate / 100) * 2 * Math.PI * 42} ${2 * Math.PI * 42}`}
                  transform="rotate(-90 50 50)" />
              </svg>
              <div className="absolute inset-0 flex items-center justify-center">
                <span className="text-xl font-bold text-white tabular-nums">{actualSellThrough.rate.toFixed(1)}%</span>
              </div>
            </div>
            <div className="space-y-2">
              <p className="text-sm text-gray-400">현재 소진율</p>
              <p className="text-xs text-gray-500">
                판매 {actualSellThrough.totalSold.toLocaleString('ko-KR')}개 / 총 {actualSellThrough.totalQty.toLocaleString('ko-KR')}개
              </p>
              <div className="text-xs">
                {actualSellThrough.rate >= currentPnl.breakEvenRate ? (
                  <span className="flex items-center gap-1 text-green-400">
                    <span className="w-2 h-2 rounded-full bg-green-400" />손익분기점 달성
                  </span>
                ) : (
                  <span className="flex items-center gap-1 text-red-400">
                    <AlertTriangle className="w-3 h-3" />손익분기점 미달 ({(currentPnl.breakEvenRate - actualSellThrough.rate).toFixed(1)}%p 부족)
                  </span>
                )}
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
