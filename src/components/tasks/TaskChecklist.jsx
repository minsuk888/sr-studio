import { useState } from 'react';
import { Plus, Trash2, Check } from 'lucide-react';

export default function TaskChecklist({ items = [], onChange, disabled = false }) {
  const [newText, setNewText] = useState('');

  const addItem = () => {
    if (!newText.trim() || disabled) return;
    const newItem = { id: Date.now(), text: newText.trim(), done: false };
    onChange([...items, newItem]);
    setNewText('');
  };

  const toggleItem = (id) => {
    if (disabled) return;
    onChange(items.map((item) => (item.id === id ? { ...item, done: !item.done } : item)));
  };

  const removeItem = (id) => {
    if (disabled) return;
    onChange(items.filter((item) => item.id !== id));
  };

  const doneCount = items.filter((i) => i.done).length;
  const progress = items.length > 0 ? Math.round((doneCount / items.length) * 100) : 0;

  return (
    <div className="space-y-2">
      {/* progress summary */}
      {items.length > 0 && (
        <div className="flex items-center gap-2 mb-1">
          <div className="flex-1 h-1.5 bg-surface-700 rounded-full overflow-hidden">
            <div
              className={`h-full rounded-full transition-all ${
                progress >= 100 ? 'bg-emerald-500' : progress >= 50 ? 'bg-blue-500' : 'bg-amber-500'
              }`}
              style={{ width: `${progress}%` }}
            />
          </div>
          <span className="text-xs text-gray-400 whitespace-nowrap">
            {doneCount}/{items.length} ({progress}%)
          </span>
        </div>
      )}

      {/* checklist items */}
      {items.map((item) => (
        <div key={item.id} className="flex items-center gap-2 group">
          <button
            onClick={() => toggleItem(item.id)}
            disabled={disabled}
            className={`w-5 h-5 rounded border flex items-center justify-center shrink-0 transition-colors ${
              item.done ? 'bg-brand-500 border-brand-500 text-white' : 'border-gray-600 hover:border-brand-400'
            } ${disabled ? 'cursor-not-allowed opacity-50' : 'cursor-pointer'}`}
          >
            {item.done && <Check className="w-3 h-3" />}
          </button>
          <span className={`flex-1 text-sm ${item.done ? 'line-through text-gray-600' : 'text-gray-300'}`}>
            {item.text}
          </span>
          {!disabled && (
            <button
              onClick={() => removeItem(item.id)}
              className="p-1 rounded opacity-0 group-hover:opacity-100 hover:bg-red-500/10 text-gray-500 hover:text-red-400 transition-all cursor-pointer"
            >
              <Trash2 className="w-3.5 h-3.5" />
            </button>
          )}
        </div>
      ))}

      {/* add input */}
      {!disabled && (
        <div className="flex items-center gap-2 mt-1">
          <input
            type="text"
            value={newText}
            onChange={(e) => setNewText(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Enter') addItem();
            }}
            placeholder="+ 항목 추가..."
            className="flex-1 px-3 py-1.5 rounded-lg border border-surface-700 text-sm text-white bg-surface-700/50 placeholder-gray-600 focus:outline-none focus:ring-1 focus:ring-brand-500/30 transition"
          />
          <button
            onClick={addItem}
            disabled={!newText.trim()}
            className="p-1.5 rounded-lg bg-brand-500/10 text-brand-400 hover:bg-brand-500/20 disabled:opacity-30 disabled:cursor-not-allowed transition-colors cursor-pointer"
          >
            <Plus className="w-4 h-4" />
          </button>
        </div>
      )}
    </div>
  );
}
