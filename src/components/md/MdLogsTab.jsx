import { useState, useEffect, useCallback } from 'react';
import { Plus, Trash2, Loader, ArrowDownToLine, ShoppingCart, Gift, ClipboardList } from 'lucide-react';
import { mdService } from '../../services/mdService';
import MdLogModal from './MdLogModal';

const LOG_TYPE_FILTERS = [
  { value: '', label: '전체' },
  { value: 'inbound', label: '입고' },
  { value: 'sale', label: '판매' },
  { value: 'jaso', label: '자소' },
];

const LOG_TYPE_META = {
  inbound: { label: '입고', badgeClass: 'bg-blue-500/20 text-blue-400' },
  sale: { label: '판매', badgeClass: 'bg-green-500/20 text-green-400' },
  jaso: { label: '자소', badgeClass: 'bg-yellow-500/20 text-yellow-400' },
};

const JASO_PURPOSE_LABELS = {
  event: '이벤트',
  sponsor: '스폰서',
  team: '팀 내부',
  other: '기타',
};

function formatKRW(amount) {
  return amount.toLocaleString('ko-KR') + '원';
}

function SummaryCard({ icon: Icon, label, value, colorClass, bgClass }) {
  return (
    <div className={`rounded-xl p-4 border border-surface-700 ${bgClass} flex items-center gap-3`}>
      <div className={`p-2 rounded-lg ${colorClass}`}>
        <Icon size={18} />
      </div>
      <div>
        <p className="text-xs text-gray-400 mb-0.5">{label}</p>
        <p className={`text-base font-semibold tabular-nums ${colorClass.split(' ')[1] ?? 'text-white'}`}>
          {value}
        </p>
      </div>
    </div>
  );
}

export default function MdLogsTab() {
  const [items, setItems] = useState([]);
  const [logs, setLogs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [deletingId, setDeletingId] = useState(null);
  const [modalOpen, setModalOpen] = useState(false);

  const [filterType, setFilterType] = useState('');
  const [filterItemId, setFilterItemId] = useState('');
  const [filterDateFrom, setFilterDateFrom] = useState('');
  const [filterDateTo, setFilterDateTo] = useState('');

  const fetchLogs = useCallback(async () => {
    try {
      const data = await mdService.getLogs({
        logType: filterType || undefined,
        itemId: filterItemId || undefined,
        dateFrom: filterDateFrom || undefined,
        dateTo: filterDateTo || undefined,
      });
      setLogs(data ?? []);
    } catch {
      alert('로그를 불러오는 중 오류가 발생했습니다.');
    }
  }, [filterType, filterItemId, filterDateFrom, filterDateTo]);

  useEffect(() => {
    async function init() {
      setLoading(true);
      try {
        const [itemData, logData] = await Promise.all([
          mdService.getItems(),
          mdService.getLogs({}),
        ]);
        setItems(itemData ?? []);
        setLogs(logData ?? []);
      } catch {
        alert('데이터를 불러오는 중 오류가 발생했습니다.');
      } finally {
        setLoading(false);
      }
    }
    init();
  }, []);

  useEffect(() => {
    if (!loading) {
      fetchLogs();
    }
  }, [filterType, filterItemId, filterDateFrom, filterDateTo]); // eslint-disable-line react-hooks/exhaustive-deps

  async function handleSave(payload) {
    try {
      await mdService.createLog(payload);
      await fetchLogs();
    } catch {
      alert('기록 저장 중 오류가 발생했습니다.');
      throw new Error('저장 실패');
    }
  }

  async function handleDelete(id) {
    if (!window.confirm('이 기록을 삭제하시겠습니까?')) return;
    setDeletingId(id);
    try {
      await mdService.deleteLog(id);
      setLogs((prev) => prev.filter((log) => log.id !== id));
    } catch {
      alert('삭제 중 오류가 발생했습니다.');
    } finally {
      setDeletingId(null);
    }
  }

  // Summary calculations
  const totalInbound = logs
    .filter((l) => l.log_type === 'inbound')
    .reduce((sum, l) => sum + (l.quantity ?? 0), 0);

  const totalSale = logs
    .filter((l) => l.log_type === 'sale')
    .reduce((sum, l) => sum + (l.quantity ?? 0), 0);

  const totalJaso = logs
    .filter((l) => l.log_type === 'jaso')
    .reduce((sum, l) => sum + (l.quantity ?? 0), 0);

  const totalRevenue = logs
    .filter((l) => l.log_type === 'sale')
    .reduce((sum, l) => sum + (l.quantity ?? 0) * (l.unit_price ?? 0), 0);

  if (loading) {
    return (
      <div className="flex items-center justify-center py-24 text-gray-400">
        <Loader size={22} className="animate-spin mr-2" />
        <span>불러오는 중...</span>
      </div>
    );
  }

  return (
    <div className="space-y-5">
      {/* Header row */}
      <div className="flex items-center justify-between">
        <h2 className="text-base font-semibold text-white">재고 기록</h2>
        <button
          onClick={() => setModalOpen(true)}
          className="flex items-center gap-1.5 px-4 py-2 bg-red-500 hover:bg-red-600 text-white text-sm font-medium rounded-lg transition-colors"
        >
          <Plus size={16} />
          기록 추가
        </button>
      </div>

      {/* Summary cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        <SummaryCard
          icon={ArrowDownToLine}
          label="총 입고"
          value={`${totalInbound.toLocaleString('ko-KR')}개`}
          colorClass="bg-blue-500/20 text-blue-400"
          bgClass="bg-surface-800"
        />
        <SummaryCard
          icon={ShoppingCart}
          label="총 판매"
          value={`${totalSale.toLocaleString('ko-KR')}개`}
          colorClass="bg-green-500/20 text-green-400"
          bgClass="bg-surface-800"
        />
        <SummaryCard
          icon={Gift}
          label="총 자소"
          value={`${totalJaso.toLocaleString('ko-KR')}개`}
          colorClass="bg-yellow-500/20 text-yellow-400"
          bgClass="bg-surface-800"
        />
        <SummaryCard
          icon={ClipboardList}
          label="총 매출"
          value={formatKRW(totalRevenue)}
          colorClass="bg-brand-500/20 text-brand-500"
          bgClass="bg-surface-800"
        />
      </div>

      {/* Filter bar */}
      <div className="bg-surface-800 rounded-xl border border-surface-700 p-4 space-y-3">
        {/* Type filter pills */}
        <div className="flex flex-wrap gap-2">
          {LOG_TYPE_FILTERS.map((f) => (
            <button
              key={f.value}
              onClick={() => setFilterType(f.value)}
              className={`px-3 py-1.5 rounded-full text-xs font-medium transition-colors border ${
                filterType === f.value
                  ? 'bg-red-500/20 text-red-400 border-red-500/40'
                  : 'bg-surface-750 border-surface-700 text-gray-400 hover:text-white'
              }`}
            >
              {f.label}
            </button>
          ))}
        </div>

        {/* Item + date range */}
        <div className="flex flex-wrap gap-3">
          <select
            value={filterItemId}
            onChange={(e) => setFilterItemId(e.target.value)}
            className="bg-surface-900 border border-surface-700 text-white rounded-lg px-3 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-red-500 min-w-[140px]"
          >
            <option value="">전체 품목</option>
            {items.map((item) => (
              <option key={item.id} value={item.id}>
                {item.name}
              </option>
            ))}
          </select>

          <div className="flex items-center gap-2">
            <input
              type="date"
              value={filterDateFrom}
              onChange={(e) => setFilterDateFrom(e.target.value)}
              className="bg-surface-900 border border-surface-700 text-white rounded-lg px-3 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-red-500"
            />
            <span className="text-gray-500 text-sm">~</span>
            <input
              type="date"
              value={filterDateTo}
              onChange={(e) => setFilterDateTo(e.target.value)}
              className="bg-surface-900 border border-surface-700 text-white rounded-lg px-3 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-red-500"
            />
          </div>
        </div>
      </div>

      {/* Logs table */}
      <div className="bg-surface-800 rounded-xl border border-surface-700 overflow-x-auto">
        {logs.length === 0 ? (
          <div className="py-16 flex flex-col items-center justify-center text-gray-500 gap-2">
            <ClipboardList size={32} className="opacity-40" />
            <p className="text-sm">기록이 없습니다.</p>
          </div>
        ) : (
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-surface-700">
                <th className="text-left px-4 py-3 text-xs font-medium text-gray-400 whitespace-nowrap">날짜</th>
                <th className="text-left px-4 py-3 text-xs font-medium text-gray-400 whitespace-nowrap">품목</th>
                <th className="text-left px-4 py-3 text-xs font-medium text-gray-400 whitespace-nowrap">유형</th>
                <th className="text-right px-4 py-3 text-xs font-medium text-gray-400 whitespace-nowrap">수량</th>
                <th className="text-right px-4 py-3 text-xs font-medium text-gray-400 whitespace-nowrap">단가</th>
                <th className="text-right px-4 py-3 text-xs font-medium text-gray-400 whitespace-nowrap">금액</th>
                <th className="text-left px-4 py-3 text-xs font-medium text-gray-400 whitespace-nowrap">행선지/목적</th>
                <th className="text-left px-4 py-3 text-xs font-medium text-gray-400 whitespace-nowrap">메모</th>
                <th className="px-4 py-3" />
              </tr>
            </thead>
            <tbody>
              {logs.map((log) => {
                const meta = LOG_TYPE_META[log.log_type] ?? { label: log.log_type, badgeClass: 'bg-gray-500/20 text-gray-400' };
                const rowAmount = log.log_type === 'sale' && log.unit_price != null
                  ? log.quantity * log.unit_price
                  : null;
                const isDeleting = deletingId === log.id;

                return (
                  <tr
                    key={log.id}
                    className="border-b border-surface-700 last:border-0 hover:bg-white/[0.02] group transition-colors"
                  >
                    {/* 날짜 */}
                    <td className="px-4 py-3 text-gray-300 whitespace-nowrap tabular-nums">
                      {log.log_date}
                    </td>

                    {/* 품목 */}
                    <td className="px-4 py-3 text-white whitespace-nowrap">
                      {log.md_items?.name ?? '-'}
                    </td>

                    {/* 유형 */}
                    <td className="px-4 py-3 whitespace-nowrap">
                      <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium ${meta.badgeClass}`}>
                        {meta.label}
                      </span>
                    </td>

                    {/* 수량 */}
                    <td className="px-4 py-3 text-right text-gray-200 tabular-nums whitespace-nowrap">
                      {(log.quantity ?? 0).toLocaleString('ko-KR')}
                    </td>

                    {/* 단가 */}
                    <td className="px-4 py-3 text-right text-gray-400 tabular-nums whitespace-nowrap">
                      {log.unit_price != null ? formatKRW(log.unit_price) : '-'}
                    </td>

                    {/* 금액 */}
                    <td className="px-4 py-3 text-right tabular-nums whitespace-nowrap">
                      {rowAmount != null ? (
                        <span className="text-green-400 font-medium">{formatKRW(rowAmount)}</span>
                      ) : (
                        <span className="text-gray-600">-</span>
                      )}
                    </td>

                    {/* 행선지/목적 */}
                    <td className="px-4 py-3 text-gray-300 max-w-[180px]">
                      {log.log_type === 'jaso' ? (
                        <div className="space-y-0.5">
                          {log.jaso_destination && (
                            <p className="text-xs text-gray-300 truncate">{log.jaso_destination}</p>
                          )}
                          {log.jaso_purpose && (
                            <span className="inline-flex items-center px-1.5 py-0.5 rounded text-xs bg-yellow-500/10 text-yellow-400">
                              {JASO_PURPOSE_LABELS[log.jaso_purpose] ?? log.jaso_purpose}
                            </span>
                          )}
                        </div>
                      ) : (
                        <span className="text-gray-600">-</span>
                      )}
                    </td>

                    {/* 메모 */}
                    <td className="px-4 py-3 text-gray-400 text-xs max-w-[160px] truncate">
                      {log.memo || '-'}
                    </td>

                    {/* 삭제 */}
                    <td className="px-4 py-3 text-right whitespace-nowrap">
                      <button
                        onClick={() => handleDelete(log.id)}
                        disabled={isDeleting}
                        className="opacity-0 group-hover:opacity-100 transition-opacity p-1.5 text-gray-500 hover:text-red-400 hover:bg-red-500/10 rounded-lg disabled:opacity-50 disabled:cursor-not-allowed"
                        aria-label="삭제"
                      >
                        {isDeleting ? (
                          <Loader size={14} className="animate-spin" />
                        ) : (
                          <Trash2 size={14} />
                        )}
                      </button>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        )}
      </div>

      {/* Log count */}
      {logs.length > 0 && (
        <p className="text-xs text-gray-500 text-right tabular-nums">
          총 {logs.length.toLocaleString('ko-KR')}건
        </p>
      )}

      {/* Modal */}
      <MdLogModal
        isOpen={modalOpen}
        onClose={() => setModalOpen(false)}
        onSave={handleSave}
        items={items}
      />
    </div>
  );
}
