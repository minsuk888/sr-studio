import { useState, useMemo } from 'react';
import { Pencil, Eye, EyeOff, Loader, ShoppingBag, ChevronUp, ChevronDown } from 'lucide-react';

const formatWon = (value) => {
  if (value == null || value === '') return '—';
  return Number(value).toLocaleString('ko-KR') + '원';
};

const getMargin = (item) =>
  item.selling_price != null && item.production_cost != null
    ? item.selling_price - item.production_cost
    : null;

const SORT_COLUMNS = {
  name: { getValue: (item) => item.name?.toLowerCase() ?? '', type: 'string' },
  production_cost: { getValue: (item) => item.production_cost ?? 0, type: 'number' },
  selling_price: { getValue: (item) => item.selling_price ?? 0, type: 'number' },
  margin: { getValue: (item) => getMargin(item) ?? -Infinity, type: 'number' },
  current_stock: { getValue: (item) => item.current_stock ?? 0, type: 'number' },
  current_jaso: { getValue: (item) => item.current_jaso ?? 0, type: 'number' },
};

function SortIcon({ sortKey, sortConfig }) {
  if (sortConfig.key !== sortKey) {
    return <ChevronUp className="w-3 h-3 text-gray-600" />;
  }
  return sortConfig.direction === 'asc'
    ? <ChevronUp className="w-3 h-3 text-red-400" />
    : <ChevronDown className="w-3 h-3 text-red-400" />;
}

function SortableHeader({ children, sortKey, sortConfig, onSort, className = '' }) {
  return (
    <th
      className={`px-3 py-2.5 text-xs font-medium text-gray-400 whitespace-nowrap select-none cursor-pointer hover:text-gray-200 transition-colors ${className}`}
      onClick={() => onSort(sortKey)}
    >
      <div className={`flex items-center gap-0.5 ${className.includes('text-right') ? 'justify-end' : ''}`}>
        {children}
        <SortIcon sortKey={sortKey} sortConfig={sortConfig} />
      </div>
    </th>
  );
}

export default function MdItemsListView({ items, onEdit, onToggleActive, toggling }) {
  const [sortConfig, setSortConfig] = useState({ key: null, direction: 'asc' });

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

  const sortedItems = useMemo(() => {
    if (!sortConfig.key) return items;
    const col = SORT_COLUMNS[sortConfig.key];
    if (!col) return items;
    const dir = sortConfig.direction === 'asc' ? 1 : -1;
    return [...items].sort((a, b) => {
      const va = col.getValue(a);
      const vb = col.getValue(b);
      if (col.type === 'string') return va < vb ? -dir : va > vb ? dir : 0;
      return (va - vb) * dir;
    });
  }, [items, sortConfig]);

  return (
    <div className="bg-surface-800 rounded-xl border border-surface-700 overflow-hidden">
      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="bg-surface-700/30 border-b border-surface-700">
              <th className="text-left px-3 py-2.5 text-xs font-medium text-gray-400 whitespace-nowrap w-10" />
              <SortableHeader sortKey="name" sortConfig={sortConfig} onSort={handleSort} className="text-left">
                품목명
              </SortableHeader>
              <th className="text-center px-3 py-2.5 text-xs font-medium text-gray-400 whitespace-nowrap">
                브랜드
              </th>
              <SortableHeader sortKey="production_cost" sortConfig={sortConfig} onSort={handleSort} className="text-right tabular-nums">
                제작단가
              </SortableHeader>
              <SortableHeader sortKey="selling_price" sortConfig={sortConfig} onSort={handleSort} className="text-right tabular-nums">
                판매가
              </SortableHeader>
              <SortableHeader sortKey="margin" sortConfig={sortConfig} onSort={handleSort} className="text-right tabular-nums">
                마진
              </SortableHeader>
              <SortableHeader sortKey="current_stock" sortConfig={sortConfig} onSort={handleSort} className="text-right tabular-nums">
                재고
              </SortableHeader>
              <SortableHeader sortKey="current_jaso" sortConfig={sortConfig} onSort={handleSort} className="text-right tabular-nums">
                자소
              </SortableHeader>
              <th className="text-center px-3 py-2.5 text-xs font-medium text-gray-400 whitespace-nowrap">
                상태
              </th>
              <th className="text-center px-3 py-2.5 text-xs font-medium text-gray-400 whitespace-nowrap">
                액션
              </th>
            </tr>
          </thead>
          <tbody className="divide-y divide-surface-700/50">
            {sortedItems.length === 0 ? (
              <tr>
                <td colSpan={10} className="px-4 py-12 text-center text-gray-500 text-sm">
                  해당하는 품목이 없습니다.
                </td>
              </tr>
            ) : (
              sortedItems.map((item) => {
                const margin = getMargin(item);
                const marginPct =
                  margin != null && item.selling_price > 0
                    ? Math.round((margin / item.selling_price) * 100)
                    : null;
                const isInactive = !item.is_active;

                return (
                  <tr
                    key={item.id}
                    className={`hover:bg-white/[0.02] transition-colors ${isInactive ? 'opacity-50' : ''}`}
                  >
                    {/* Image */}
                    <td className="px-3 py-2">
                      <div className="w-8 h-8 rounded-md bg-surface-750 flex items-center justify-center overflow-hidden flex-shrink-0">
                        {item.image_url ? (
                          <img src={item.image_url} alt={item.name} className="w-full h-full object-cover" />
                        ) : (
                          <ShoppingBag className="w-4 h-4 text-gray-600" />
                        )}
                      </div>
                    </td>

                    {/* Name */}
                    <td className="px-3 py-2 text-white font-medium whitespace-nowrap">
                      {item.name}
                    </td>

                    {/* Brand */}
                    <td className="px-3 py-2 text-center">
                      {item.brand && (
                        <span
                          className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${
                            item.brand === 'SR'
                              ? 'bg-red-500/20 text-red-400'
                              : 'bg-blue-500/20 text-blue-400'
                          }`}
                        >
                          {item.brand === 'SR' ? 'SR' : 'ONE'}
                        </span>
                      )}
                    </td>

                    {/* Production cost */}
                    <td className="px-3 py-2 text-right text-gray-300 tabular-nums whitespace-nowrap">
                      {formatWon(item.production_cost)}
                    </td>

                    {/* Selling price */}
                    <td className="px-3 py-2 text-right text-gray-300 tabular-nums whitespace-nowrap">
                      {formatWon(item.selling_price)}
                    </td>

                    {/* Margin */}
                    <td className="px-3 py-2 text-right tabular-nums whitespace-nowrap">
                      <span
                        className={`font-medium ${
                          margin == null
                            ? 'text-gray-500'
                            : margin >= 0
                            ? 'text-green-400'
                            : 'text-red-400'
                        }`}
                      >
                        {margin != null ? formatWon(margin) : '—'}
                      </span>
                      {marginPct != null && (
                        <span className="text-[10px] text-gray-500 ml-1">({marginPct}%)</span>
                      )}
                    </td>

                    {/* Stock */}
                    <td
                      className={`px-3 py-2 text-right font-bold tabular-nums ${
                        item.current_stock <= 0
                          ? 'text-red-400'
                          : item.current_stock <= 10
                          ? 'text-yellow-400'
                          : 'text-green-400'
                      }`}
                    >
                      {item.current_stock ?? 0}
                    </td>

                    {/* Jaso */}
                    <td className="px-3 py-2 text-right text-yellow-400 tabular-nums font-medium">
                      {item.current_jaso ?? 0}
                    </td>

                    {/* Status */}
                    <td className="px-3 py-2 text-center">
                      <span
                        className={`inline-flex items-center gap-1 text-[10px] font-medium ${
                          isInactive ? 'text-gray-500' : 'text-green-400'
                        }`}
                      >
                        <span
                          className={`w-1.5 h-1.5 rounded-full flex-shrink-0 ${
                            isInactive ? 'bg-gray-500' : 'bg-green-400'
                          }`}
                        />
                        {isInactive ? '비활성' : '활성'}
                      </span>
                    </td>

                    {/* Actions */}
                    <td className="px-3 py-2 text-center">
                      <div className="flex items-center justify-center gap-1">
                        <button
                          onClick={() => onEdit(item)}
                          className="p-1.5 rounded-lg text-gray-400 hover:text-white hover:bg-white/5 transition-colors cursor-pointer"
                          title="수정"
                        >
                          <Pencil className="w-3.5 h-3.5" />
                        </button>
                        <button
                          onClick={() => onToggleActive(item)}
                          disabled={toggling === item.id}
                          className="p-1.5 rounded-lg text-gray-400 hover:text-white hover:bg-white/5 transition-colors cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed"
                          title={item.is_active ? '비활성화' : '활성화'}
                        >
                          {toggling === item.id ? (
                            <Loader className="w-3.5 h-3.5 animate-spin" />
                          ) : item.is_active ? (
                            <EyeOff className="w-3.5 h-3.5" />
                          ) : (
                            <Eye className="w-3.5 h-3.5" />
                          )}
                        </button>
                      </div>
                    </td>
                  </tr>
                );
              })
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
