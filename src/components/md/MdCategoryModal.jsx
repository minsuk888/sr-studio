import { useState } from 'react';
import { X, Plus, Pencil, Trash2, Check, Loader } from 'lucide-react';
import { mdService } from '../../services/mdService';

const PRESET_COLORS = [
  '#3b82f6', '#10b981', '#f59e0b', '#8b5cf6',
  '#ec4899', '#06b6d4', '#ef4444', '#f97316',
  '#14b8a6', '#6366f1', '#84cc16', '#6b7280',
];

const emptyForm = { name: '', color: '#3b82f6', icon: '' };

export default function MdCategoryModal({ isOpen, onClose, categories, onUpdate }) {
  const [editingId, setEditingId] = useState(null);
  const [editForm, setEditForm] = useState(emptyForm);
  const [addMode, setAddMode] = useState(false);
  const [addForm, setAddForm] = useState(emptyForm);
  const [saving, setSaving] = useState(false);
  const [deleting, setDeleting] = useState(null);
  const [error, setError] = useState(null);

  if (!isOpen) return null;

  const handleStartEdit = (cat) => {
    setEditingId(cat.id);
    setEditForm({ name: cat.name, color: cat.color || '#6b7280', icon: cat.icon || '' });
    setAddMode(false);
  };

  const handleCancelEdit = () => {
    setEditingId(null);
    setEditForm(emptyForm);
  };

  const handleSaveEdit = async () => {
    if (!editForm.name.trim()) return;
    setSaving(true);
    setError(null);
    try {
      await mdService.updateCategory(editingId, {
        name: editForm.name.trim(),
        color: editForm.color,
        icon: editForm.icon.trim() || null,
      });
      setEditingId(null);
      await onUpdate();
    } catch (err) {
      setError('수정에 실패했습니다.');
    } finally {
      setSaving(false);
    }
  };

  const handleAdd = async () => {
    if (!addForm.name.trim()) return;
    setSaving(true);
    setError(null);
    try {
      await mdService.createCategory({
        name: addForm.name.trim(),
        color: addForm.color,
        icon: addForm.icon.trim() || null,
        sort_order: (categories || []).length,
      });
      setAddForm(emptyForm);
      setAddMode(false);
      await onUpdate();
    } catch (err) {
      setError('추가에 실패했습니다.');
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (id) => {
    if (!window.confirm('이 카테고리를 삭제하시겠습니까?\n해당 카테고리의 품목은 미분류로 변경됩니다.')) return;
    setDeleting(id);
    setError(null);
    try {
      await mdService.deleteCategory(id);
      await onUpdate();
    } catch (err) {
      setError('삭제에 실패했습니다.');
    } finally {
      setDeleting(null);
    }
  };

  const inputClass =
    'w-full px-3 py-2 rounded-lg border border-surface-700 text-sm text-white bg-surface-900 focus:outline-none focus:ring-2 focus:ring-red-500 transition';

  const ColorPicker = ({ value, onChange }) => (
    <div className="flex flex-wrap gap-1.5">
      {PRESET_COLORS.map((c) => (
        <button
          key={c}
          onClick={() => onChange(c)}
          className={`w-6 h-6 rounded-full border-2 transition-all cursor-pointer ${
            value === c ? 'border-white scale-110' : 'border-transparent hover:border-white/40'
          }`}
          style={{ backgroundColor: c }}
        />
      ))}
    </div>
  );

  return (
    <div
      className="fixed inset-0 bg-black/40 backdrop-blur-sm flex items-center justify-center z-50 p-4"
      onClick={onClose}
    >
      <div
        className="bg-surface-800 rounded-2xl shadow-2xl w-full max-w-md max-h-[80vh] flex flex-col"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between px-6 pt-6 pb-4 border-b border-surface-700 shrink-0">
          <h3 className="text-lg font-bold text-white">카테고리 관리</h3>
          <button
            onClick={onClose}
            className="p-1 rounded-lg hover:bg-white/5 text-gray-500 hover:text-gray-200 transition-colors cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Body */}
        <div className="flex-1 overflow-y-auto px-6 py-4 space-y-3">
          {error && (
            <div className="px-3 py-2 rounded-lg bg-red-500/10 border border-red-500/20 text-red-400 text-xs">
              {error}
            </div>
          )}

          {/* Category list */}
          {(categories || []).map((cat) => {
            const isEditing = editingId === cat.id;

            if (isEditing) {
              return (
                <div key={cat.id} className="p-3 rounded-xl bg-surface-750 border border-surface-600 space-y-3">
                  <input
                    type="text"
                    value={editForm.name}
                    onChange={(e) => setEditForm({ ...editForm, name: e.target.value })}
                    placeholder="카테고리명"
                    className={inputClass}
                    autoFocus
                  />
                  <input
                    type="text"
                    value={editForm.icon}
                    onChange={(e) => setEditForm({ ...editForm, icon: e.target.value })}
                    placeholder="아이콘 (이모지 또는 텍스트)"
                    className={inputClass}
                  />
                  <ColorPicker
                    value={editForm.color}
                    onChange={(c) => setEditForm({ ...editForm, color: c })}
                  />
                  <div className="flex items-center gap-2 pt-1">
                    <button
                      onClick={handleSaveEdit}
                      disabled={saving || !editForm.name.trim()}
                      className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-red-500 hover:bg-red-600 text-white text-xs font-medium transition-colors cursor-pointer disabled:opacity-50"
                    >
                      {saving ? <Loader className="w-3.5 h-3.5 animate-spin" /> : <Check className="w-3.5 h-3.5" />}
                      저장
                    </button>
                    <button
                      onClick={handleCancelEdit}
                      className="px-3 py-1.5 rounded-lg text-xs font-medium text-gray-400 hover:bg-white/5 transition-colors cursor-pointer"
                    >
                      취소
                    </button>
                  </div>
                </div>
              );
            }

            return (
              <div
                key={cat.id}
                className="flex items-center gap-3 px-3 py-2.5 rounded-xl bg-surface-750 hover:bg-white/5 transition-colors group"
              >
                <span
                  className="w-3.5 h-3.5 rounded-full shrink-0"
                  style={{ backgroundColor: cat.color || '#6b7280' }}
                />
                {cat.icon && <span className="text-sm shrink-0">{cat.icon}</span>}
                <span className="flex-1 text-sm text-white font-medium truncate">{cat.name}</span>
                <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                  <button
                    onClick={() => handleStartEdit(cat)}
                    className="p-1.5 rounded-lg hover:bg-white/10 text-gray-400 hover:text-white transition-colors cursor-pointer"
                  >
                    <Pencil className="w-3.5 h-3.5" />
                  </button>
                  <button
                    onClick={() => handleDelete(cat.id)}
                    disabled={deleting === cat.id}
                    className="p-1.5 rounded-lg hover:bg-red-500/20 text-gray-400 hover:text-red-400 transition-colors cursor-pointer disabled:opacity-50"
                  >
                    {deleting === cat.id ? (
                      <Loader className="w-3.5 h-3.5 animate-spin" />
                    ) : (
                      <Trash2 className="w-3.5 h-3.5" />
                    )}
                  </button>
                </div>
              </div>
            );
          })}

          {/* Empty state */}
          {(categories || []).length === 0 && !addMode && (
            <p className="text-sm text-gray-500 text-center py-6">등록된 카테고리가 없습니다</p>
          )}

          {/* Add form */}
          {addMode && (
            <div className="p-3 rounded-xl bg-surface-750 border border-red-500/30 space-y-3">
              <input
                type="text"
                value={addForm.name}
                onChange={(e) => setAddForm({ ...addForm, name: e.target.value })}
                placeholder="새 카테고리명"
                className={inputClass}
                autoFocus
              />
              <input
                type="text"
                value={addForm.icon}
                onChange={(e) => setAddForm({ ...addForm, icon: e.target.value })}
                placeholder="아이콘 (이모지 또는 텍스트, 선택)"
                className={inputClass}
              />
              <ColorPicker
                value={addForm.color}
                onChange={(c) => setAddForm({ ...addForm, color: c })}
              />
              <div className="flex items-center gap-2 pt-1">
                <button
                  onClick={handleAdd}
                  disabled={saving || !addForm.name.trim()}
                  className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-red-500 hover:bg-red-600 text-white text-xs font-medium transition-colors cursor-pointer disabled:opacity-50"
                >
                  {saving ? <Loader className="w-3.5 h-3.5 animate-spin" /> : <Plus className="w-3.5 h-3.5" />}
                  추가
                </button>
                <button
                  onClick={() => { setAddMode(false); setAddForm(emptyForm); }}
                  className="px-3 py-1.5 rounded-lg text-xs font-medium text-gray-400 hover:bg-white/5 transition-colors cursor-pointer"
                >
                  취소
                </button>
              </div>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="flex items-center justify-between px-6 py-4 border-t border-surface-700 shrink-0">
          {!addMode && (
            <button
              onClick={() => { setAddMode(true); setEditingId(null); }}
              className="flex items-center gap-1.5 px-4 py-2 rounded-lg bg-red-500 hover:bg-red-600 text-white text-sm font-medium transition-colors cursor-pointer"
            >
              <Plus className="w-4 h-4" />
              카테고리 추가
            </button>
          )}
          <button
            onClick={onClose}
            className="px-4 py-2 rounded-lg text-sm font-medium text-gray-400 hover:bg-white/5 transition-colors cursor-pointer ml-auto"
          >
            닫기
          </button>
        </div>
      </div>
    </div>
  );
}
