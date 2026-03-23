import { useState, useEffect } from 'react';
import { X } from 'lucide-react';

const emptyForm = {
  name: '',
  brand: 'SR',
  description: '',
  image_url: '',
  production_cost: '',
  selling_price: '',
  initial_stock: '',
  initial_jaso: '',
};

const BRAND_CATEGORY_MAP = {
  SR: '슈퍼레이스',
  ONE: '오네레이싱',
};

export default function MdItemModal({ isOpen, onClose, onSave, editItem, categories }) {
  const [formData, setFormData] = useState(emptyForm);

  useEffect(() => {
    if (!isOpen) return;
    if (editItem) {
      setFormData({
        name: editItem.name || '',
        brand: editItem.brand || 'SR',
        description: editItem.description || '',
        image_url: editItem.image_url || '',
        production_cost: editItem.production_cost ?? '',
        selling_price: editItem.selling_price ?? '',
        initial_stock: '',
        initial_jaso: '',
      });
    } else {
      setFormData(emptyForm);
    }
  }, [isOpen, editItem]);

  const updateField = (field, value) => {
    setFormData((prev) => ({ ...prev, [field]: value }));
  };

  const getCategoryIdForBrand = (brand) => {
    const categoryName = BRAND_CATEGORY_MAP[brand];
    const cat = (categories || []).find((c) => c.name === categoryName);
    return cat?.id || null;
  };

  const handleSave = () => {
    if (!formData.name.trim()) return;

    const payload = {
      name: formData.name.trim(),
      brand: formData.brand,
      category_id: getCategoryIdForBrand(formData.brand),
      description: formData.description.trim() || null,
      image_url: formData.image_url.trim() || null,
      production_cost: formData.production_cost !== '' ? Number(formData.production_cost) : 0,
      selling_price: formData.selling_price !== '' ? Number(formData.selling_price) : 0,
    };

    if (!editItem) {
      payload.initial_stock = formData.initial_stock !== '' ? Number(formData.initial_stock) : 0;
      payload.initial_jaso = formData.initial_jaso !== '' ? Number(formData.initial_jaso) : 0;
    }

    onSave(payload);
  };

  if (!isOpen) return null;

  const totalQty =
    (formData.initial_stock !== '' ? Number(formData.initial_stock) : 0) +
    (formData.initial_jaso !== '' ? Number(formData.initial_jaso) : 0);
  const unitCost = formData.production_cost !== '' ? Number(formData.production_cost) : 0;
  const totalCost = totalQty * unitCost;

  const inputClass =
    'w-full px-3 py-2 rounded-lg border border-surface-700 text-sm text-white bg-surface-900 focus:outline-none focus:ring-2 focus:ring-red-500 focus:border-red-500 transition';

  return (
    <div
      className="fixed inset-0 bg-black/40 backdrop-blur-sm flex items-center justify-center z-50 p-4"
      onClick={onClose}
    >
      <div
        className="bg-surface-800 rounded-2xl shadow-2xl w-full max-w-lg max-h-[85vh] overflow-y-auto"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between px-6 pt-6 pb-4 border-b border-surface-700">
          <h3 className="text-lg font-bold text-white">
            {editItem ? 'MD 품목 수정' : '새 MD 품목 추가'}
          </h3>
          <button
            onClick={onClose}
            className="p-1 rounded-lg hover:bg-white/5 text-gray-500 hover:text-gray-200 transition-colors cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Body */}
        <div className="px-6 py-5 space-y-4">
          {/* 품목명 */}
          <div>
            <label className="block text-sm font-medium text-gray-300 mb-1">
              품목명 <span className="text-red-400">*</span>
            </label>
            <input
              type="text"
              value={formData.name}
              onChange={(e) => updateField('name', e.target.value)}
              placeholder="예: SR 응원봉"
              className={inputClass}
            />
          </div>

          {/* 브랜드 */}
          <div>
            <label className="block text-sm font-medium text-gray-300 mb-1">브랜드</label>
            <div className="flex gap-2">
              {[
                { value: 'SR', label: '슈퍼레이스', color: 'red' },
                { value: 'ONE', label: '오네 레이싱', color: 'blue' },
              ].map((b) => (
                <button
                  key={b.value}
                  type="button"
                  onClick={() => updateField('brand', b.value)}
                  className={`flex-1 py-2 rounded-lg text-sm font-medium border transition-colors ${
                    formData.brand === b.value
                      ? b.color === 'red'
                        ? 'bg-red-500/15 text-red-400 border-red-500/40'
                        : 'bg-blue-500/15 text-blue-400 border-blue-500/40'
                      : 'bg-surface-750 border-surface-700 text-gray-400 hover:text-white'
                  }`}
                >
                  {b.label}
                </button>
              ))}
            </div>
          </div>

          {/* 설명 */}
          <div>
            <label className="block text-sm font-medium text-gray-300 mb-1">설명</label>
            <textarea
              rows={3}
              value={formData.description}
              onChange={(e) => updateField('description', e.target.value)}
              placeholder="품목에 대한 간략한 설명을 입력하세요"
              className={`${inputClass} resize-none`}
            />
          </div>

          {/* 이미지 URL */}
          <div>
            <label className="block text-sm font-medium text-gray-300 mb-1">이미지 URL</label>
            <input
              type="text"
              value={formData.image_url}
              onChange={(e) => updateField('image_url', e.target.value)}
              placeholder="https://..."
              className={inputClass}
            />
          </div>

          {/* 생산가 / 판매가 */}
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-300 mb-1">제작 단가 (원)</label>
              <input
                type="number"
                min="0"
                value={formData.production_cost}
                onChange={(e) => updateField('production_cost', e.target.value)}
                placeholder="0"
                className={inputClass}
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-300 mb-1">판매가 (원)</label>
              <input
                type="number"
                min="0"
                value={formData.selling_price}
                onChange={(e) => updateField('selling_price', e.target.value)}
                placeholder="0"
                className={inputClass}
              />
            </div>
          </div>

          {/* 초기수량: 재고 / 자소 — 신규 생성 시에만 */}
          {!editItem && (
            <div className="space-y-3">
              <div className="flex items-center gap-2">
                <label className="text-sm font-medium text-gray-300">초기 수량</label>
                <span className="text-xs text-gray-500">(제작 단가는 동일 적용)</span>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs text-gray-400 mb-1">판매용 재고</label>
                  <input
                    type="number"
                    min="0"
                    value={formData.initial_stock}
                    onChange={(e) => updateField('initial_stock', e.target.value)}
                    placeholder="0"
                    className={inputClass}
                  />
                </div>
                <div>
                  <label className="block text-xs text-gray-400 mb-1">자소(증정)용</label>
                  <input
                    type="number"
                    min="0"
                    value={formData.initial_jaso}
                    onChange={(e) => updateField('initial_jaso', e.target.value)}
                    placeholder="0"
                    className={inputClass}
                  />
                </div>
              </div>
              {/* 합계 표시 */}
              {totalQty > 0 && (
                <div className="flex items-center justify-between px-3 py-2 rounded-lg bg-surface-750 text-xs">
                  <span className="text-gray-400">
                    총 제작수량 <span className="text-white font-semibold">{totalQty.toLocaleString('ko-KR')}개</span>
                  </span>
                  {unitCost > 0 && (
                    <span className="text-gray-400">
                      총 제작비 <span className="text-white font-semibold">{totalCost.toLocaleString('ko-KR')}원</span>
                    </span>
                  )}
                </div>
              )}
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="flex items-center justify-end gap-3 px-6 py-4 border-t border-surface-700">
          <button
            onClick={onClose}
            className="px-4 py-2 rounded-lg text-sm font-medium text-gray-400 hover:bg-white/5 transition-colors cursor-pointer"
          >
            취소
          </button>
          <button
            onClick={handleSave}
            disabled={!formData.name.trim()}
            className="px-5 py-2 rounded-lg text-sm font-medium text-white bg-red-500 hover:bg-red-600 disabled:opacity-50 disabled:cursor-not-allowed transition-colors cursor-pointer"
          >
            {editItem ? '수정' : '저장'}
          </button>
        </div>
      </div>
    </div>
  );
}
