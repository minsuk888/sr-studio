import { useState, useEffect } from 'react';
import { X } from 'lucide-react';

const LOG_TYPES = [
  { value: 'inbound', label: '입고', activeClass: 'bg-blue-500/15 text-blue-400 border-blue-500/40' },
  { value: 'sale', label: '판매', activeClass: 'bg-green-500/15 text-green-400 border-green-500/40' },
  { value: 'jaso', label: '자소', activeClass: 'bg-yellow-500/15 text-yellow-400 border-yellow-500/40' },
];

const JASO_PURPOSES = [
  { value: 'event', label: '이벤트' },
  { value: 'sponsor', label: '스폰서/협찬' },
  { value: 'team', label: '팀 내부' },
  { value: 'other', label: '기타' },
];

const INITIAL_FORM = {
  logType: 'inbound',
  itemId: '',
  quantity: '',
  date: new Date().toISOString().slice(0, 10),
  memo: '',
  unitPrice: '',
  jasoDestination: '',
  jasoPurpose: '',
  saleChannel: 'offline',
};

export default function MdLogModal({ isOpen, onClose, onSave, items }) {
  const [form, setForm] = useState(INITIAL_FORM);
  const [saving, setSaving] = useState(false);
  const [errors, setErrors] = useState({});

  useEffect(() => {
    if (isOpen) {
      setForm(INITIAL_FORM);
      setErrors({});
    }
  }, [isOpen]);

  if (!isOpen) return null;

  function handleLogTypeChange(newType) {
    setForm((prev) => ({
      ...INITIAL_FORM,
      date: prev.date,
      itemId: prev.itemId,
      quantity: prev.quantity,
      memo: prev.memo,
      logType: newType,
    }));
    setErrors({});
  }

  function handleItemChange(itemId) {
    if (form.logType !== 'sale') {
      setForm((prev) => ({ ...prev, itemId }));
      return;
    }
    const selectedItem = (items || []).find((it) => String(it.id) === String(itemId));
    setForm((prev) => ({
      ...prev,
      itemId,
      unitPrice: selectedItem?.selling_price != null ? String(selectedItem.selling_price) : '',
    }));
  }

  function handleChange(field, value) {
    setForm((prev) => ({ ...prev, [field]: value }));
    if (errors[field]) {
      setErrors((prev) => ({ ...prev, [field]: undefined }));
    }
  }

  function validate() {
    const next = {};
    if (!form.itemId) next.itemId = '품목을 선택하세요.';
    if (!form.quantity || Number(form.quantity) < 1) next.quantity = '수량은 1 이상이어야 합니다.';
    if (form.logType === 'jaso') {
      if (!form.jasoDestination.trim()) next.jasoDestination = '행선지를 입력하세요.';
      if (!form.jasoPurpose) next.jasoPurpose = '목적을 선택하세요.';
    }
    return next;
  }

  async function handleSave() {
    const fieldErrors = validate();
    if (Object.keys(fieldErrors).length > 0) {
      setErrors(fieldErrors);
      return;
    }

    const payload = {
      item_id: form.itemId,
      log_type: form.logType,
      quantity: Number(form.quantity),
      unit_price: form.unitPrice !== '' ? Number(form.unitPrice) : null,
      log_date: form.date,
      memo: form.memo.trim() || null,
      sale_channel: form.logType === 'sale' ? form.saleChannel : null,
      jaso_destination: form.logType === 'jaso' ? form.jasoDestination.trim() : null,
      jaso_purpose: form.logType === 'jaso' ? form.jasoPurpose : null,
    };

    setSaving(true);
    try {
      await onSave(payload);
      onClose();
    } finally {
      setSaving(false);
    }
  }

  const selectedItem = (items || []).find((it) => String(it.id) === String(form.itemId));
  const totalAmount =
    form.logType === 'sale' && form.quantity && form.unitPrice
      ? Number(form.quantity) * Number(form.unitPrice)
      : null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm px-4">
      <div className="bg-surface-800 rounded-2xl shadow-2xl w-full max-w-lg flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between px-6 pt-6 pb-4 border-b border-surface-700">
          <h2 className="text-lg font-semibold text-white">재고 기록 추가</h2>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-white transition-colors p-1 rounded-lg hover:bg-white/10"
            aria-label="닫기"
          >
            <X size={20} />
          </button>
        </div>

        {/* Body */}
        <div className="px-6 py-5 space-y-5 overflow-y-auto max-h-[70vh]">
          {/* Log type tabs */}
          <div>
            <label className="block text-xs font-medium text-gray-400 mb-2">기록 유형</label>
            <div className="flex gap-2">
              {LOG_TYPES.map((type) => {
                const isActive = form.logType === type.value;
                return (
                  <button
                    key={type.value}
                    onClick={() => handleLogTypeChange(type.value)}
                    className={`flex-1 py-2 rounded-lg text-sm font-medium border transition-colors ${
                      isActive
                        ? type.activeClass
                        : 'bg-surface-750 border-surface-700 text-gray-400 hover:text-white'
                    }`}
                  >
                    {type.label}
                  </button>
                );
              })}
            </div>
          </div>

          {/* Item select */}
          <div>
            <label className="block text-xs font-medium text-gray-400 mb-1.5">
              품목 선택 <span className="text-red-400">*</span>
            </label>
            <select
              value={form.itemId}
              onChange={(e) => handleItemChange(e.target.value)}
              className="w-full bg-surface-900 border border-surface-700 text-white rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-red-500"
            >
              <option value="">품목을 선택하세요</option>
              {(items || []).map((item) => (
                <option key={item.id} value={item.id}>
                  {item.name}
                </option>
              ))}
            </select>
            {errors.itemId && <p className="text-red-400 text-xs mt-1">{errors.itemId}</p>}
          </div>

          {/* Quantity + Date row */}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-medium text-gray-400 mb-1.5">
                수량 <span className="text-red-400">*</span>
              </label>
              <input
                type="number"
                min="1"
                value={form.quantity}
                onChange={(e) => handleChange('quantity', e.target.value)}
                placeholder="0"
                className="w-full bg-surface-900 border border-surface-700 text-white rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-red-500 tabular-nums"
              />
              {errors.quantity && <p className="text-red-400 text-xs mt-1">{errors.quantity}</p>}
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-400 mb-1.5">날짜</label>
              <input
                type="date"
                value={form.date}
                onChange={(e) => handleChange('date', e.target.value)}
                className="w-full bg-surface-900 border border-surface-700 text-white rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-red-500"
              />
            </div>
          </div>

          {/* Sale-only: unit price + total */}
          {form.logType === 'sale' && (
            <div>
              <label className="block text-xs font-medium text-gray-400 mb-1.5">단가 (원)</label>
              <input
                type="number"
                min="0"
                value={form.unitPrice}
                onChange={(e) => handleChange('unitPrice', e.target.value)}
                placeholder={selectedItem?.selling_price ?? '0'}
                className="w-full bg-surface-900 border border-surface-700 text-white rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-red-500 tabular-nums"
              />
              {totalAmount !== null && (
                <p className="text-xs text-gray-400 mt-1.5">
                  합계:{' '}
                  <span className="text-green-400 font-semibold tabular-nums">
                    {totalAmount.toLocaleString('ko-KR')}원
                  </span>
                </p>
              )}
            </div>
          )}

          {/* Sale-only: channel */}
          {form.logType === 'sale' && (
            <div>
              <label className="block text-xs font-medium text-gray-400 mb-1.5">판매 채널</label>
              <div className="flex gap-2">
                {[
                  { value: 'offline', label: '현장 판매' },
                  { value: 'online', label: '온라인(스마트스토어)' },
                ].map((ch) => (
                  <button
                    key={ch.value}
                    type="button"
                    onClick={() => handleChange('saleChannel', ch.value)}
                    className={`flex-1 py-2 rounded-lg text-sm font-medium border transition-colors ${
                      form.saleChannel === ch.value
                        ? 'bg-green-500/15 text-green-400 border-green-500/40'
                        : 'bg-surface-750 border-surface-700 text-gray-400 hover:text-white'
                    }`}
                  >
                    {ch.label}
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* Jaso-only: destination + purpose */}
          {form.logType === 'jaso' && (
            <>
              <div>
                <label className="block text-xs font-medium text-gray-400 mb-1.5">
                  행선지 <span className="text-red-400">*</span>
                </label>
                <input
                  type="text"
                  value={form.jasoDestination}
                  onChange={(e) => handleChange('jasoDestination', e.target.value)}
                  placeholder="예: 2026 Rd.3 관중 이벤트"
                  className="w-full bg-surface-900 border border-surface-700 text-white rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-red-500 placeholder:text-gray-600"
                />
                {errors.jasoDestination && (
                  <p className="text-red-400 text-xs mt-1">{errors.jasoDestination}</p>
                )}
              </div>
              <div>
                <label className="block text-xs font-medium text-gray-400 mb-1.5">
                  목적 <span className="text-red-400">*</span>
                </label>
                <select
                  value={form.jasoPurpose}
                  onChange={(e) => handleChange('jasoPurpose', e.target.value)}
                  className="w-full bg-surface-900 border border-surface-700 text-white rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-red-500"
                >
                  <option value="">목적을 선택하세요</option>
                  {JASO_PURPOSES.map((p) => (
                    <option key={p.value} value={p.value}>
                      {p.label}
                    </option>
                  ))}
                </select>
                {errors.jasoPurpose && (
                  <p className="text-red-400 text-xs mt-1">{errors.jasoPurpose}</p>
                )}
              </div>
            </>
          )}

          {/* Memo */}
          <div>
            <label className="block text-xs font-medium text-gray-400 mb-1.5">메모 (선택)</label>
            <input
              type="text"
              value={form.memo}
              onChange={(e) => handleChange('memo', e.target.value)}
              placeholder="메모를 입력하세요"
              className="w-full bg-surface-900 border border-surface-700 text-white rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-red-500 placeholder:text-gray-600"
            />
          </div>
        </div>

        {/* Footer */}
        <div className="px-6 py-4 border-t border-surface-700 flex justify-end gap-3">
          <button
            onClick={onClose}
            disabled={saving}
            className="px-4 py-2 text-sm text-gray-400 hover:text-white transition-colors disabled:opacity-50"
          >
            취소
          </button>
          <button
            onClick={handleSave}
            disabled={saving}
            className="px-5 py-2 bg-red-500 hover:bg-red-600 text-white text-sm font-medium rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {saving ? '저장 중...' : '저장'}
          </button>
        </div>
      </div>
    </div>
  );
}
