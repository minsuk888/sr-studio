import { Pencil, Eye, EyeOff, Loader, ShoppingBag } from 'lucide-react';

const formatWon = (value) => {
  if (value == null || value === '') return '—';
  return Number(value).toLocaleString('ko-KR') + '원';
};

export default function MdItemsListView({ items, onEdit, onToggleActive, toggling }) {
  return (
    <div className="bg-surface-800 rounded-xl border border-surface-700 overflow-hidden">
      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="bg-surface-700/30 border-b border-surface-700">
              <th className="text-left px-3 py-2.5 text-xs font-medium text-gray-400 whitespace-nowrap w-10" />
              <th className="text-left px-3 py-2.5 text-xs font-medium text-gray-400 whitespace-nowrap">
                품목명
              </th>
              <th className="text-center px-3 py-2.5 text-xs font-medium text-gray-400 whitespace-nowrap">
                브랜드
              </th>
              <th className="text-right px-3 py-2.5 text-xs font-medium text-gray-400 whitespace-nowrap tabular-nums">
                제작단가
              </th>
              <th className="text-right px-3 py-2.5 text-xs font-medium text-gray-400 whitespace-nowrap tabular-nums">
                판매가
              </th>
              <th className="text-right px-3 py-2.5 text-xs font-medium text-gray-400 whitespace-nowrap tabular-nums">
                마진
              </th>
              <th className="text-right px-3 py-2.5 text-xs font-medium text-gray-400 whitespace-nowrap tabular-nums">
                재고
              </th>
              <th className="text-right px-3 py-2.5 text-xs font-medium text-yellow-500/70 whitespace-nowrap tabular-nums">
                자소
              </th>
              <th className="text-center px-3 py-2.5 text-xs font-medium text-gray-400 whitespace-nowrap">
                상태
              </th>
              <th className="text-center px-3 py-2.5 text-xs font-medium text-gray-400 whitespace-nowrap">
                액션
              </th>
            </tr>
          </thead>
          <tbody className="divide-y divide-surface-700/50">
            {items.length === 0 ? (
              <tr>
                <td colSpan={10} className="px-4 py-12 text-center text-gray-500 text-sm">
                  해당하는 품목이 없습니다.
                </td>
              </tr>
            ) : (
              items.map((item) => {
                const margin =
                  item.selling_price != null && item.production_cost != null
                    ? item.selling_price - item.production_cost
                    : null;
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
