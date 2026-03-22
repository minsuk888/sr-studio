import { useState, useEffect } from 'react';
import { ShoppingBag, Loader, AlertTriangle } from 'lucide-react';
import { Link } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import { mdService } from '../../services/mdService';

const formatWon = (v) => {
  if (v >= 100000000) return `${(v / 100000000).toFixed(1)}억원`;
  if (v >= 10000) return `${Math.round(v / 10000)}만원`;
  return `${v.toLocaleString('ko-KR')}원`;
};

const FALLBACK = { totalItems: 0, lowStock: 0, outOfStock: 0, monthRevenue: 0, monthJaso: 0 };

function StatCell({ label, value, highlight }) {
  return (
    <div className="flex flex-col gap-0.5">
      <span className="text-[11px] text-gray-500">{label}</span>
      <span className={`text-sm font-semibold ${highlight ? 'text-amber-400' : 'text-white'}`}>
        {value}
      </span>
    </div>
  );
}

function CategoryBar({ label, pct, color }) {
  return (
    <div className="flex items-center gap-2">
      <span className="text-[11px] text-gray-500 w-12 shrink-0 truncate">{label}</span>
      <div className="flex-1 h-2 bg-surface-700 rounded-full overflow-hidden">
        <div
          className="h-full rounded-full transition-all"
          style={{ width: `${Math.min(pct, 100)}%`, backgroundColor: color }}
        />
      </div>
      <span className="text-[11px] text-gray-500 w-7 text-right shrink-0">{pct}%</span>
    </div>
  );
}

export default function MdSummaryMini() {
  const { isAdmin } = useAuth();
  const [summary, setSummary] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    (async () => {
      try {
        const data = await mdService.getDashboardSummary();
        setSummary(data);
      } catch {
        setSummary(FALLBACK);
      } finally {
        setLoading(false);
      }
    })();
  }, []);

  if (!isAdmin) return null;

  if (loading) {
    return (
      <div className="bg-surface-800 rounded-xl shadow-sm p-5">
        <div className="flex items-center justify-center h-32 text-gray-500">
          <Loader className="w-5 h-5 animate-spin mr-2" />
          로딩 중...
        </div>
      </div>
    );
  }

  const { totalItems, lowStock, outOfStock, monthRevenue, monthJaso } = summary ?? FALLBACK;
  const alertCount = lowStock + outOfStock;

  // Simple category bar data derived from what we have (stock health distribution)
  const totalAlert = totalItems > 0 ? Math.round((alertCount / totalItems) * 100) : 0;
  const normalPct = Math.max(0, 100 - totalAlert);
  const lowPct = totalItems > 0 ? Math.round((lowStock / totalItems) * 100) : 0;
  const outPct = totalItems > 0 ? Math.round((outOfStock / totalItems) * 100) : 0;

  return (
    <div className="bg-surface-800 rounded-xl shadow-sm p-5">
      {/* Header */}
      <div className="flex items-center justify-between mb-4">
        <h2 className="text-base font-semibold text-gray-300 flex items-center gap-2">
          <ShoppingBag className="w-4.5 h-4.5 text-brand-500" />
          MD 재고/판매 요약
        </h2>
        {alertCount > 0 && (
          <span className="flex items-center gap-1 text-xs text-amber-400 font-medium">
            <AlertTriangle className="w-3.5 h-3.5" />
            주의 {alertCount}건
          </span>
        )}
      </div>

      {/* 2x2 stat grid */}
      <div className="grid grid-cols-2 gap-3 mb-4 p-3 rounded-lg bg-surface-750">
        <StatCell label="총 품목" value={`${totalItems}개`} />
        <StatCell label="이번달 매출" value={formatWon(monthRevenue)} />
        <StatCell label="자소" value={`${monthJaso}개`} />
        <StatCell
          label="재고 부족"
          value={alertCount > 0 ? `⚠️ ${alertCount}건` : '없음'}
          highlight={alertCount > 0}
        />
      </div>

      {/* Stock health distribution bars */}
      {totalItems > 0 && (
        <div className="space-y-2 mb-4">
          <span className="text-[11px] text-gray-500 font-medium">재고 현황 분포</span>
          <CategoryBar label="정상" pct={normalPct} color="#22c55e" />
          <CategoryBar label="부족" pct={lowPct} color="#f59e0b" />
          <CategoryBar label="품절" pct={outPct} color="#ef4444" />
        </div>
      )}

      {totalItems === 0 && (
        <p className="text-sm text-gray-500 text-center py-4">등록된 품목이 없습니다</p>
      )}

      {/* Footer link */}
      <div className="text-right border-t border-surface-700 pt-3">
        <Link to="/md" className="text-xs text-brand-400 hover:text-brand-300 transition-colors">
          자세히 보기 &rarr;
        </Link>
      </div>
    </div>
  );
}
