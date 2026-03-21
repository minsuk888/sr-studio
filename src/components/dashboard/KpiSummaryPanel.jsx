import { useState, useMemo } from 'react';
import { Target, ChevronDown, ChevronRight, AlertTriangle } from 'lucide-react';
import { Link } from 'react-router-dom';

const kpiCategoryConfig = {
  sns_growth: { label: 'SNS', color: 'text-blue-400', bg: 'bg-blue-500/20' },
  engagement: { label: '참여', color: 'text-green-400', bg: 'bg-green-500/20' },
  content: { label: '콘텐츠', color: 'text-purple-400', bg: 'bg-purple-500/20' },
  sponsorship: { label: '스폰서', color: 'text-yellow-400', bg: 'bg-yellow-500/20' },
  event: { label: '이벤트', color: 'text-pink-400', bg: 'bg-pink-500/20' },
};

function ProgressBar({ value }) {
  return (
    <div className="w-full h-1.5 bg-surface-700 rounded-full overflow-hidden">
      <div
        className="h-full rounded-full transition-all"
        style={{
          width: `${Math.min(value, 100)}%`,
          background:
            value === 100 ? '#22c55e' : value >= 60 ? '#3b82f6' : value >= 30 ? '#f59e0b' : '#94a3b8',
        }}
      />
    </div>
  );
}

function getDaysRemaining(periodEnd) {
  if (!periodEnd) return null;
  const now = new Date();
  now.setHours(0, 0, 0, 0);
  const end = new Date(periodEnd + 'T00:00:00');
  const diff = Math.ceil((end - now) / (1000 * 60 * 60 * 24));
  return diff;
}

function DdayBadge({ days }) {
  if (days === null) return null;
  const label = days === 0 ? 'D-Day' : days > 0 ? `D-${days}` : `+${Math.abs(days)}`;
  const cls = days <= 0
    ? 'bg-red-500/20 text-red-400'
    : days <= 7
      ? 'bg-yellow-500/20 text-yellow-400'
      : 'bg-surface-700 text-gray-500';
  return (
    <span className={`text-[10px] font-medium px-1.5 py-0.5 rounded ${cls}`}>
      {label}
    </span>
  );
}

function KpiRow({ kpi }) {
  const pct = kpi.target_value > 0
    ? Math.round((kpi.current_value / kpi.target_value) * 100)
    : 0;
  const cat = kpiCategoryConfig[kpi.category] || kpiCategoryConfig.content;
  const days = getDaysRemaining(kpi.period_end);

  return (
    <div className="flex items-center gap-3 p-2.5 rounded-lg bg-surface-750 hover:bg-white/5 transition-colors">
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2 mb-1">
          <span className={`text-[10px] font-medium px-1.5 py-0.5 rounded shrink-0 ${cat.bg} ${cat.color}`}>
            {cat.label}
          </span>
          <p className="text-sm text-gray-300 truncate">{kpi.title}</p>
        </div>
        <div className="flex items-center gap-2">
          <div className="flex-1">
            <ProgressBar value={Math.min(pct, 100)} />
          </div>
          <span className="text-xs font-semibold text-gray-400 w-9 text-right shrink-0">{pct}%</span>
        </div>
      </div>
      <DdayBadge days={days} />
    </div>
  );
}

export default function KpiSummaryPanel({ kpiItems }) {
  const [expandedCategories, setExpandedCategories] = useState({});

  const avgPct = useMemo(() => {
    if (kpiItems.length === 0) return 0;
    const sum = kpiItems.reduce((acc, kpi) => {
      const pct = kpi.target_value > 0
        ? Math.round((kpi.current_value / kpi.target_value) * 100)
        : 0;
      return acc + pct;
    }, 0);
    return Math.round(sum / kpiItems.length);
  }, [kpiItems]);

  const warningItems = useMemo(() => {
    return kpiItems.filter((kpi) => {
      const pct = kpi.target_value > 0
        ? Math.round((kpi.current_value / kpi.target_value) * 100)
        : 0;
      const days = getDaysRemaining(kpi.period_end);
      return pct < 80 && days !== null && days <= 14;
    });
  }, [kpiItems]);

  const categoryGroups = useMemo(() => {
    const groups = {};
    const warningIds = new Set(warningItems.map((w) => w.id));

    kpiItems.forEach((kpi) => {
      if (warningIds.has(kpi.id)) return;
      const cat = kpi.category || 'content';
      if (!groups[cat]) groups[cat] = [];
      groups[cat].push(kpi);
    });

    return Object.entries(kpiCategoryConfig)
      .map(([key, config]) => ({
        key,
        config,
        items: groups[key] || [],
        avgPct: (groups[key] || []).length > 0
          ? Math.round(
              (groups[key] || []).reduce((sum, kpi) => {
                return sum + (kpi.target_value > 0
                  ? Math.round((kpi.current_value / kpi.target_value) * 100)
                  : 0);
              }, 0) / (groups[key] || []).length,
            )
          : 0,
      }))
      .filter((g) => g.items.length > 0);
  }, [kpiItems, warningItems]);

  const toggleCategory = (key) => {
    setExpandedCategories((prev) => ({
      ...prev,
      [key]: !prev[key],
    }));
  };

  return (
    <div className="bg-surface-800 rounded-xl shadow-sm p-5">
      {/* Header */}
      <div className="flex items-center justify-between mb-4">
        <h2 className="text-base font-semibold text-gray-300 flex items-center gap-2">
          <Target className="w-4.5 h-4.5 text-brand-500" />
          KPI 달성 현황
        </h2>
        <span className="text-xs text-gray-500">
          {kpiItems.length}개 항목 · 평균 {avgPct}%
        </span>
      </div>

      {kpiItems.length === 0 ? (
        <p className="text-sm text-gray-500 text-center py-6">등록된 KPI가 없습니다</p>
      ) : (
        <div className="space-y-3">
          {/* Warning Items - always expanded */}
          {warningItems.length > 0 && (
            <div>
              <div className="flex items-center gap-2 mb-2 px-1">
                <AlertTriangle className="w-3.5 h-3.5 text-yellow-400" />
                <span className="text-xs font-semibold text-yellow-400">
                  주의 항목 ({warningItems.length})
                </span>
              </div>
              <div className="space-y-1.5">
                {warningItems.map((kpi) => (
                  <KpiRow key={kpi.id} kpi={kpi} />
                ))}
              </div>
            </div>
          )}

          {/* Category Groups - accordion */}
          {warningItems.length > 0 && categoryGroups.length > 0 && (
            <div className="border-t border-surface-700 pt-3" />
          )}
          {categoryGroups.map(({ key, config, items, avgPct: catAvg }) => {
            const isExpanded = expandedCategories[key];
            return (
              <div key={key}>
                <button
                  onClick={() => toggleCategory(key)}
                  className="w-full flex items-center justify-between px-2 py-2 rounded-lg hover:bg-white/5 transition-colors cursor-pointer"
                >
                  <div className="flex items-center gap-2">
                    {isExpanded ? (
                      <ChevronDown className="w-3.5 h-3.5 text-gray-500" />
                    ) : (
                      <ChevronRight className="w-3.5 h-3.5 text-gray-500" />
                    )}
                    <span className={`text-xs font-semibold ${config.color}`}>
                      {config.label} ({items.length})
                    </span>
                  </div>
                  <span className="text-xs text-gray-500">평균 {catAvg}%</span>
                </button>
                {isExpanded && (
                  <div className="space-y-1.5 mt-1">
                    {items.map((kpi) => (
                      <KpiRow key={kpi.id} kpi={kpi} />
                    ))}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}

      {/* Footer link */}
      <div className="text-right border-t border-surface-700 pt-3 mt-3">
        <Link to="/kpi" className="text-xs text-brand-400 hover:text-brand-300 transition-colors">
          KPI 관리 바로가기 &rarr;
        </Link>
      </div>
    </div>
  );
}
