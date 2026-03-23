import { useState, useEffect, useCallback } from 'react';
import { Package, Plus, Pencil, Search, Loader, Eye, EyeOff, ShoppingBag, LayoutGrid, List } from 'lucide-react';
import { mdService } from '../../services/mdService';
import MdStockBadge from './MdStockBadge';
import MdItemModal from './MdItemModal';
import MdItemsListView from './MdItemsListView';

const formatWon = (value) => {
  if (value == null || value === '') return '—';
  return Number(value).toLocaleString('ko-KR') + '원';
};

const mergeStock = (items, stockSummary) => {
  const stockMap = Object.fromEntries(
    (stockSummary || []).map((s) => [s.item_id, { current_stock: s.current_stock, current_jaso: s.current_jaso }]),
  );
  return items.map((item) => ({
    ...item,
    current_stock: stockMap[item.id]?.current_stock ?? 0,
    current_jaso: stockMap[item.id]?.current_jaso ?? 0,
  }));
};

const getInitialViewMode = () => {
  try {
    return localStorage.getItem('md-items-view') || 'grid';
  } catch {
    return 'grid';
  }
};

export default function MdItemsTab() {
  const [items, setItems] = useState([]);
  const [categories, setCategories] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const [searchQuery, setSearchQuery] = useState('');
  const [selectedBrand, setSelectedBrand] = useState('all');
  const [viewMode, setViewMode] = useState(getInitialViewMode);

  const [modalOpen, setModalOpen] = useState(false);
  const [editItem, setEditItem] = useState(null);
  const [toggling, setToggling] = useState(null);

  const loadData = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const [rawItems, cats, stockSummary] = await Promise.all([
        mdService.getAllItems(),
        mdService.getCategories(),
        mdService.getStockSummary(),
      ]);
      setCategories(cats || []);
      setItems(mergeStock(rawItems || [], stockSummary || []));
    } catch (err) {
      setError('데이터를 불러오지 못했습니다.');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadData();
  }, [loadData]);

  const handleViewMode = (mode) => {
    setViewMode(mode);
    try {
      localStorage.setItem('md-items-view', mode);
    } catch {
      // ignore
    }
  };

  const filteredItems = items.filter((item) => {
    const matchSearch = item.name.toLowerCase().includes(searchQuery.toLowerCase());
    const matchBrand = selectedBrand === 'all' || item.brand === selectedBrand;
    return matchSearch && matchBrand;
  });

  const handleOpenCreate = () => {
    setEditItem(null);
    setModalOpen(true);
  };

  const handleOpenEdit = (item) => {
    setEditItem(item);
    setModalOpen(true);
  };

  const handleCloseModal = () => {
    setModalOpen(false);
    setEditItem(null);
  };

  const handleSave = async (formData) => {
    try {
      if (editItem) {
        const { initial_stock: _s, initial_jaso: _j, ...updates } = formData;
        await mdService.updateItem(editItem.id, updates);
      } else {
        await mdService.createItem({ ...formData, is_active: true });
      }
      handleCloseModal();
      await loadData();
    } catch (err) {
      setError('저장에 실패했습니다.');
    }
  };

  const handleToggleActive = async (item) => {
    setToggling(item.id);
    try {
      await mdService.toggleItemActive(item.id, !item.is_active);
      await loadData();
    } catch (err) {
      setError('상태 변경에 실패했습니다.');
    } finally {
      setToggling(null);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-24">
        <Loader className="w-8 h-8 text-red-500 animate-spin" />
      </div>
    );
  }

  return (
    <div className="space-y-5">
      {/* Toolbar */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
        {/* Search */}
        <div className="relative w-full sm:w-64">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-500 pointer-events-none" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="품목명 검색..."
            className="w-full pl-9 pr-3 py-2 rounded-lg border border-surface-700 bg-surface-900 text-sm text-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-red-500 focus:border-red-500 transition"
          />
        </div>

        <div className="flex items-center gap-2">
          {/* View mode toggle */}
          <div className="flex items-center rounded-lg border border-surface-700 overflow-hidden">
            <button
              onClick={() => handleViewMode('grid')}
              className={`p-2 transition-colors cursor-pointer ${
                viewMode === 'grid'
                  ? 'bg-surface-700 text-white'
                  : 'text-gray-500 hover:text-gray-300'
              }`}
              title="그리드 보기"
            >
              <LayoutGrid className="w-4 h-4" />
            </button>
            <button
              onClick={() => handleViewMode('list')}
              className={`p-2 transition-colors cursor-pointer ${
                viewMode === 'list'
                  ? 'bg-surface-700 text-white'
                  : 'text-gray-500 hover:text-gray-300'
              }`}
              title="리스트 보기"
            >
              <List className="w-4 h-4" />
            </button>
          </div>

          <button
            onClick={handleOpenCreate}
            className="flex items-center gap-2 px-4 py-2 rounded-lg bg-red-500 hover:bg-red-600 text-white text-sm font-medium transition-colors cursor-pointer shrink-0"
          >
            <Plus className="w-4 h-4" />
            새 품목
          </button>
        </div>
      </div>

      {/* Brand filter */}
      <div className="flex items-center gap-2">
        {[
          { value: 'all', label: '전체' },
          { value: 'SR', label: '슈퍼레이스' },
          { value: 'ONE', label: '오네 레이싱' },
        ].map((b) => (
          <button
            key={b.value}
            onClick={() => setSelectedBrand(b.value)}
            className={`shrink-0 px-3 py-1.5 rounded-lg text-xs font-medium transition-colors cursor-pointer ${
              selectedBrand === b.value
                ? b.value === 'SR' ? 'bg-red-500 text-white'
                  : b.value === 'ONE' ? 'bg-blue-500 text-white'
                  : 'bg-red-500 text-white'
                : 'bg-surface-800 border border-surface-700 text-gray-400 hover:text-gray-200 hover:border-surface-600'
            }`}
          >
            {b.label}
          </button>
        ))}
      </div>

      {/* Error banner */}
      {error && (
        <div className="px-4 py-3 rounded-lg bg-red-500/10 border border-red-500/20 text-red-400 text-sm">
          {error}
        </div>
      )}

      {/* Empty state */}
      {filteredItems.length === 0 && (
        <div className="flex flex-col items-center justify-center py-20 gap-4 text-center">
          <div className="w-16 h-16 rounded-2xl bg-surface-800 border border-surface-700 flex items-center justify-center">
            <Package className="w-8 h-8 text-gray-600" />
          </div>
          <div>
            <p className="text-gray-400 font-medium">
              {searchQuery || selectedBrand !== 'all'
                ? '검색 결과가 없습니다'
                : '등록된 MD 품목이 없습니다'}
            </p>
            {!searchQuery && selectedBrand === 'all' && (
              <p className="text-gray-600 text-sm mt-1">새 품목을 추가해 보세요</p>
            )}
          </div>
          {!searchQuery && selectedBrand === 'all' && (
            <button
              onClick={handleOpenCreate}
              className="flex items-center gap-2 px-4 py-2 rounded-lg bg-red-500 hover:bg-red-600 text-white text-sm font-medium transition-colors cursor-pointer"
            >
              <Plus className="w-4 h-4" />
              새 품목
            </button>
          )}
        </div>
      )}

      {/* Items: grid or list */}
      {filteredItems.length > 0 && viewMode === 'list' && (
        <MdItemsListView
          items={filteredItems}
          onEdit={handleOpenEdit}
          onToggleActive={handleToggleActive}
          toggling={toggling}
        />
      )}

      {filteredItems.length > 0 && viewMode === 'grid' && (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {filteredItems.map((item) => {
            const margin =
              item.selling_price != null && item.production_cost != null
                ? item.selling_price - item.production_cost
                : null;
            const isInactive = !item.is_active;

            return (
              <div
                key={item.id}
                className={`bg-surface-800 rounded-xl border border-surface-700 hover:border-surface-600 transition-all overflow-hidden group ${
                  isInactive ? 'opacity-50' : ''
                }`}
              >
                {/* Image */}
                <div className="relative h-40 bg-surface-750 flex items-center justify-center overflow-hidden">
                  {item.image_url ? (
                    <img
                      src={item.image_url}
                      alt={item.name}
                      className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                    />
                  ) : (
                    <ShoppingBag className="w-12 h-12 text-gray-600" />
                  )}
                  {isInactive && (
                    <div className="absolute inset-0 bg-black/40 flex items-center justify-center">
                      <span className="text-xs text-gray-300 font-medium bg-black/60 px-2 py-0.5 rounded-full">
                        비활성
                      </span>
                    </div>
                  )}
                </div>

                {/* Body */}
                <div className="p-4 space-y-3">
                  {/* Brand + Stock badges */}
                  <div className="flex items-center gap-2 flex-wrap">
                    {item.brand && (
                      <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${
                        item.brand === 'SR' ? 'bg-red-500/20 text-red-400' : 'bg-blue-500/20 text-blue-400'
                      }`}>
                        {item.brand === 'SR' ? 'SR' : 'ONE'}
                      </span>
                    )}
                    <MdStockBadge stock={item.current_stock} />
                  </div>

                  {/* Name */}
                  <h3 className="text-white font-semibold text-sm leading-snug line-clamp-2">
                    {item.name}
                  </h3>

                  {/* Pricing info */}
                  <div className="grid grid-cols-2 gap-x-3 gap-y-1 text-xs">
                    <div>
                      <span className="text-gray-500">제작 단가</span>
                      <p className="text-gray-300 font-medium">{formatWon(item.production_cost)}</p>
                    </div>
                    <div>
                      <span className="text-gray-500">판매가</span>
                      <p className="text-gray-300 font-medium">{formatWon(item.selling_price)}</p>
                    </div>
                    <div>
                      <span className="text-gray-500">재고</span>
                      <p className="text-gray-300 font-medium">
                        {item.current_stock != null ? `${item.current_stock}개` : '—'}
                      </p>
                    </div>
                    <div>
                      <span className="text-gray-500">자소</span>
                      <p className="text-yellow-400 font-medium">
                        {item.current_jaso != null ? `${item.current_jaso}개` : '—'}
                      </p>
                    </div>
                    <div className="col-span-2 pt-1 border-t border-surface-700/50">
                      <div className="flex items-center justify-between">
                        <span className="text-gray-500">마진</span>
                        {margin != null && item.selling_price > 0 && (
                          <span className={`text-[10px] font-bold ${
                            margin >= 0 ? 'text-green-400' : 'text-red-400'
                          }`}>
                            {Math.round((margin / item.selling_price) * 100)}%
                          </span>
                        )}
                      </div>
                      <p
                        className={`font-medium ${
                          margin == null
                            ? 'text-gray-300'
                            : margin >= 0
                            ? 'text-green-400'
                            : 'text-red-400'
                        }`}
                      >
                        {margin != null ? formatWon(margin) : '—'}
                      </p>
                      {margin != null && item.selling_price > 0 && (
                        <div className="w-full h-1 rounded-full bg-surface-700 mt-1 overflow-hidden">
                          <div
                            className={`h-full rounded-full ${margin >= 0 ? 'bg-green-400' : 'bg-red-400'}`}
                            style={{ width: `${Math.min(Math.max(Math.round((margin / item.selling_price) * 100), 0), 100)}%` }}
                          />
                        </div>
                      )}
                    </div>
                  </div>

                  {/* Actions */}
                  <div className="flex items-center gap-2 pt-1 border-t border-surface-700">
                    <button
                      onClick={() => handleOpenEdit(item)}
                      className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium text-gray-400 hover:text-white hover:bg-white/5 transition-colors cursor-pointer"
                    >
                      <Pencil className="w-3.5 h-3.5" />
                      수정
                    </button>
                    <button
                      onClick={() => handleToggleActive(item)}
                      disabled={toggling === item.id}
                      className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium text-gray-400 hover:text-white hover:bg-white/5 transition-colors cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed ml-auto"
                    >
                      {toggling === item.id ? (
                        <Loader className="w-3.5 h-3.5 animate-spin" />
                      ) : item.is_active ? (
                        <EyeOff className="w-3.5 h-3.5" />
                      ) : (
                        <Eye className="w-3.5 h-3.5" />
                      )}
                      {item.is_active ? '비활성화' : '활성화'}
                    </button>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Modal */}
      <MdItemModal
        isOpen={modalOpen}
        onClose={handleCloseModal}
        onSave={handleSave}
        editItem={editItem}
        categories={categories}
      />
    </div>
  );
}
