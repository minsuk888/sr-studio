import { useState, useEffect, useMemo } from 'react';
import { Ticket, Loader } from 'lucide-react';
import { Link } from 'react-router-dom';
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

function RaceCarDot({ cx, cy, index, dataLength, payload }) {
  if (index !== dataLength - 1) return null;
  const carW = 36;
  const carH = 18;
  const total = payload?.['합계'] ?? '';
  return (
    <g>
      <image
        x={cx - carW / 2}
        y={cy - carH - 4}
        width={carW}
        height={carH}
        href="/racecar.png"
        style={{ filter: 'drop-shadow(0 2px 4px rgba(0,0,0,0.5))' }}
      >
        <animateTransform
          attributeName="transform"
          type="translate"
          values="0,0; 0,-3; 0,0"
          dur="0.8s"
          repeatCount="indefinite"
        />
      </image>
      <circle cx={cx} cy={cy} r={3} fill="#e6edf3" stroke="#0d1117" strokeWidth={1.5} />
      <text x={cx} y={cy + 16} textAnchor="middle" fill="#e6edf3" fontSize={11} fontWeight="bold">
        {total}
      </text>
    </g>
  );
}

export default function TicketSalesMini() {
  const [rounds, setRounds] = useState([]);
  const [selectedRoundId, setSelectedRoundId] = useState(null);
  const [sales, setSales] = useState([]);
  const [loaded, setLoaded] = useState(false);
  const [salesLoading, setSalesLoading] = useState(false);

  const selectedRound = useMemo(
    () => rounds.find((r) => r.id === selectedRoundId),
    [rounds, selectedRoundId],
  );

  const seatTypes = useMemo(
    () => selectedRound?.seat_types || [],
    [selectedRound],
  );

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

  useEffect(() => {
    if (!selectedRoundId) {
      setSales([]);
      return;
    }
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

  const summary = useMemo(() => {
    if (!selectedRound || sales.length === 0) return null;
    const latest = sales[sales.length - 1];
    const saleData = latest.sales || {};
    const totals = {};
    let grandTotal = 0;
    seatTypes.forEach((st) => {
      const num = Number(saleData[st.name]) || 0;
      totals[st.name] = num;
      grandTotal += num;
    });
    const goalPct = selectedRound.goal > 0
      ? Math.round((grandTotal / selectedRound.goal) * 100)
      : 0;
    return { totals, grandTotal, goalPct };
  }, [sales, selectedRound, seatTypes]);

  const chartData = useMemo(() => {
    if (sales.length === 0 || seatTypes.length === 0) return [];
    return sales.map((s) => {
      const saleData = s.sales || {};
      let dayTotal = 0;
      seatTypes.forEach((st) => {
        dayTotal += Number(saleData[st.name]) || 0;
      });
      return {
        date: s.sale_date.slice(5),
        ...Object.fromEntries(seatTypes.map((st) => [st.name, Number(saleData[st.name]) || 0])),
        '합계': dayTotal,
      };
    });
  }, [sales, seatTypes]);

  if (!loaded) {
    return (
      <div className="bg-surface-800 rounded-xl shadow-sm p-5">
        <div className="flex items-center justify-center h-32 text-gray-500">
          <Loader className="w-5 h-5 animate-spin mr-2" />
          로딩 중...
        </div>
      </div>
    );
  }

  if (rounds.length === 0) {
    return (
      <div className="bg-surface-800 rounded-xl shadow-sm p-5">
        <h2 className="text-base font-semibold text-gray-300 flex items-center gap-2 mb-4">
          <Ticket className="w-4.5 h-4.5 text-brand-500" />
          라운드별 티켓 판매
        </h2>
        <p className="text-sm text-gray-500 text-center py-6">등록된 라운드가 없습니다</p>
        <div className="text-right border-t border-surface-700 pt-3">
          <Link to="/kpi" className="text-xs text-brand-400 hover:text-brand-300 transition-colors">
            티켓 관리 바로가기 &rarr;
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="bg-surface-800 rounded-xl shadow-sm p-5">
      {/* Header + Round Tabs */}
      <div className="flex items-center justify-between mb-4">
        <h2 className="text-base font-semibold text-gray-300 flex items-center gap-2">
          <Ticket className="w-4.5 h-4.5 text-brand-500" />
          라운드별 티켓 판매
        </h2>
        <div className="flex items-center gap-1.5">
          {rounds.map((r) => (
            <button
              key={r.id}
              onClick={() => setSelectedRoundId(r.id)}
              className={`px-3 py-1 rounded-lg text-xs font-medium transition-colors cursor-pointer ${
                r.id === selectedRoundId
                  ? 'bg-brand-500 text-white'
                  : 'bg-surface-700 text-gray-400 hover:text-gray-200 hover:bg-surface-600'
              }`}
            >
              {r.name}
            </button>
          ))}
        </div>
      </div>

      {/* Summary Stats */}
      {salesLoading ? (
        <div className="flex items-center justify-center py-8 text-gray-500 text-sm">
          <Loader className="w-4 h-4 animate-spin mr-2" /> 데이터 로딩 중...
        </div>
      ) : summary ? (
        <>
          <div className="flex items-center gap-4 mb-4 p-3 rounded-lg bg-surface-750">
            <div className="flex-1">
              <span className="text-xs text-gray-500">총 판매</span>
              <p className="text-lg font-bold text-white">{summary.grandTotal.toLocaleString('ko-KR')}매</p>
            </div>
            <div className="flex-1">
              <span className="text-xs text-gray-500">달성률</span>
              <p className={`text-lg font-bold ${
                summary.goalPct >= 100 ? 'text-emerald-400' : summary.goalPct >= 70 ? 'text-blue-400' : 'text-white'
              }`}>
                {summary.goalPct}%
              </p>
            </div>
            <div className="flex-1">
              <span className="text-xs text-gray-500">좌석별</span>
              <p className="text-xs text-gray-300 mt-0.5">
                {seatTypes.map((st) => `${st.name} ${(summary.totals[st.name] || 0).toLocaleString()}`).join(' · ')}
              </p>
            </div>
          </div>

          {/* Chart */}
          {chartData.length > 1 && (
            <div className="mb-3">
              <ResponsiveContainer width="100%" height={200}>
                <LineChart data={chartData} margin={{ top: 24, right: 40, bottom: 0, left: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#21262d" />
                  <XAxis dataKey="date" tick={{ fill: '#6b7280', fontSize: 10 }} />
                  <YAxis tick={{ fill: '#6b7280', fontSize: 10 }} />
                  <Tooltip
                    contentStyle={{
                      backgroundColor: '#161b22',
                      border: '1px solid #21262d',
                      borderRadius: '8px',
                      fontSize: '11px',
                    }}
                    labelStyle={{ color: '#e6edf3' }}
                    itemStyle={{ color: '#9ca3af' }}
                  />
                  <Legend wrapperStyle={{ fontSize: '11px' }} />
                  {selectedRound?.goal > 0 && (
                    <ReferenceLine
                      y={selectedRound.goal}
                      stroke="#ef4444"
                      strokeDasharray="5 5"
                      label={{ value: '목표', fill: '#ef4444', fontSize: 10 }}
                    />
                  )}
                  {seatTypes.map((st, idx) => (
                    <Line
                      key={st.name}
                      type="monotone"
                      dataKey={st.name}
                      stroke={CHART_COLORS[idx % CHART_COLORS.length]}
                      strokeWidth={2}
                      dot={{ r: 2, fill: CHART_COLORS[idx % CHART_COLORS.length] }}
                    />
                  ))}
                  <Line
                    type="monotone"
                    dataKey="합계"
                    stroke="#e6edf3"
                    strokeWidth={2}
                    strokeDasharray="4 2"
                    dot={(props) => (
                      <RaceCarDot key={props.index} {...props} dataLength={chartData.length} />
                    )}
                  />
                </LineChart>
              </ResponsiveContainer>
            </div>
          )}

          {chartData.length <= 1 && (
            <p className="text-xs text-gray-500 text-center py-4">
              차트를 표시하려면 2일 이상의 판매 데이터가 필요합니다
            </p>
          )}
        </>
      ) : (
        <p className="text-sm text-gray-500 text-center py-6">판매 데이터가 없습니다</p>
      )}

      {/* Footer link */}
      <div className="text-right border-t border-surface-700 pt-3">
        <Link to="/kpi" className="text-xs text-brand-400 hover:text-brand-300 transition-colors">
          자세히 보기 &rarr;
        </Link>
      </div>
    </div>
  );
}
