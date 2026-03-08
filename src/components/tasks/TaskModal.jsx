import { useState, useEffect, useCallback } from 'react';
import { X, CheckSquare, SlidersHorizontal } from 'lucide-react';
import TaskChecklist from './TaskChecklist';

const emptyForm = {
  title: '',
  assignee: '',
  priority: 'medium',
  status: 'todo',
  progress: 0,
  deadline: '',
  memo: '',
  checklist: [],
};

const quickProgress = [0, 25, 50, 75, 100];

export default function TaskModal({ isOpen, editingTask, members, onSave, onClose }) {
  const [formData, setFormData] = useState(emptyForm);
  const [useChecklist, setUseChecklist] = useState(false);

  useEffect(() => {
    if (!isOpen) return;
    if (editingTask) {
      const checklist = editingTask.checklist || [];
      setFormData({
        title: editingTask.title || '',
        assignee: editingTask.assignee || '',
        priority: editingTask.priority || 'medium',
        status: editingTask.status || 'todo',
        progress: editingTask.progress || 0,
        deadline: editingTask.deadline || '',
        memo: editingTask.memo || '',
        checklist,
      });
      setUseChecklist(checklist.length > 0);
    } else {
      setFormData(emptyForm);
      setUseChecklist(false);
    }
  }, [isOpen, editingTask]);

  // Phase 6: bidirectional progress-status sync
  const updateField = useCallback((field, value) => {
    setFormData((prev) => {
      const next = { ...prev, [field]: value };

      if (field === 'status') {
        if (value === 'done') next.progress = 100;
        else if (value === 'todo') next.progress = 0;
        else if (value === 'in-progress' && prev.progress === 0) next.progress = 10;
      }

      if (field === 'progress') {
        const p = Number(value);
        if (p >= 100) next.status = 'done';
        else if (p === 0) next.status = 'todo';
        else next.status = 'in-progress';
      }

      return next;
    });
  }, []);

  const handleChecklistChange = useCallback((items) => {
    const doneCount = items.filter((i) => i.done).length;
    const progress = items.length > 0 ? Math.round((doneCount / items.length) * 100) : 0;
    setFormData((prev) => {
      const next = { ...prev, checklist: items, progress };
      if (progress >= 100) next.status = 'done';
      else if (progress === 0 && items.length > 0) next.status = 'todo';
      else if (progress > 0) next.status = 'in-progress';
      return next;
    });
  }, []);

  const handleSave = () => {
    if (!formData.title.trim()) return;
    onSave({
      ...formData,
      assignee: formData.assignee ? Number(formData.assignee) : members[0]?.id,
      progress: Number(formData.progress),
      checklist: useChecklist ? formData.checklist : [],
    });
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      <div className="absolute inset-0 bg-black/40" onClick={onClose} />
      <div className="relative bg-surface-800 rounded-2xl shadow-xl w-full max-w-lg mx-4 p-6 z-10 max-h-[90vh] overflow-y-auto">
        <div className="flex items-center justify-between mb-6">
          <h3 className="text-lg font-bold text-white">{editingTask ? '업무 수정' : '새 업무 추가'}</h3>
          <button onClick={onClose} className="p-1 rounded-lg hover:bg-white/5 text-gray-500 hover:text-gray-200 transition-colors cursor-pointer">
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="space-y-4">
          {/* title */}
          <div>
            <label className="block text-sm font-medium text-gray-300 mb-1">제목</label>
            <input
              type="text"
              value={formData.title}
              onChange={(e) => setFormData({ ...formData, title: e.target.value })}
              placeholder="업무 제목을 입력하세요"
              className="w-full px-3 py-2 rounded-lg border border-surface-700 text-sm text-white bg-surface-700 focus:outline-none focus:ring-2 focus:ring-brand-500/30 focus:border-brand-500 transition"
            />
          </div>

          {/* assignee + priority */}
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-300 mb-1">담당자</label>
              <select
                value={formData.assignee}
                onChange={(e) => setFormData({ ...formData, assignee: e.target.value })}
                className="w-full px-3 py-2 rounded-lg border border-surface-700 text-sm text-white bg-surface-700 focus:outline-none focus:ring-2 focus:ring-brand-500/30 focus:border-brand-500 transition"
              >
                <option value="">선택하세요</option>
                {members.map((m) => (
                  <option key={m.id} value={m.id}>
                    {m.avatar} {m.name}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-300 mb-1">우선순위</label>
              <select
                value={formData.priority}
                onChange={(e) => setFormData({ ...formData, priority: e.target.value })}
                className="w-full px-3 py-2 rounded-lg border border-surface-700 text-sm text-white bg-surface-700 focus:outline-none focus:ring-2 focus:ring-brand-500/30 focus:border-brand-500 transition"
              >
                <option value="high">높음</option>
                <option value="medium">보통</option>
                <option value="low">낮음</option>
              </select>
            </div>
          </div>

          {/* status + deadline */}
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-300 mb-1">상태</label>
              <select
                value={formData.status}
                onChange={(e) => updateField('status', e.target.value)}
                className="w-full px-3 py-2 rounded-lg border border-surface-700 text-sm text-white bg-surface-700 focus:outline-none focus:ring-2 focus:ring-brand-500/30 focus:border-brand-500 transition"
              >
                <option value="todo">할 일</option>
                <option value="in-progress">진행 중</option>
                <option value="done">완료</option>
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-300 mb-1">마감일</label>
              <input
                type="date"
                value={formData.deadline}
                onChange={(e) => setFormData({ ...formData, deadline: e.target.value })}
                className="w-full px-3 py-2 rounded-lg border border-surface-700 text-sm text-white bg-surface-700 focus:outline-none focus:ring-2 focus:ring-brand-500/30 focus:border-brand-500 transition"
              />
            </div>
          </div>

          {/* progress section */}
          <div>
            <div className="flex items-center justify-between mb-1">
              <label className="text-sm font-medium text-gray-300">
                진행률 <span className="text-brand-500 font-bold">{formData.progress}%</span>
              </label>
              <button
                onClick={() => setUseChecklist(!useChecklist)}
                className="flex items-center gap-1 px-2 py-1 rounded-md text-xs text-gray-400 hover:text-gray-200 hover:bg-white/5 transition-colors cursor-pointer"
              >
                {useChecklist ? (
                  <>
                    <SlidersHorizontal className="w-3 h-3" /> 수동 입력
                  </>
                ) : (
                  <>
                    <CheckSquare className="w-3 h-3" /> 체크리스트
                  </>
                )}
              </button>
            </div>

            {useChecklist ? (
              <TaskChecklist items={formData.checklist} onChange={handleChecklistChange} />
            ) : (
              <div className="space-y-2">
                <input
                  type="range"
                  min="0"
                  max="100"
                  value={formData.progress}
                  onChange={(e) => updateField('progress', Number(e.target.value))}
                  className="w-full accent-brand-500"
                />
                <div className="flex items-center gap-1.5">
                  {quickProgress.map((v) => (
                    <button
                      key={v}
                      onClick={() => updateField('progress', v)}
                      className={`flex-1 py-1 rounded text-xs font-medium transition-colors cursor-pointer ${
                        formData.progress === v
                          ? 'bg-brand-500 text-white'
                          : 'bg-surface-700 text-gray-400 hover:bg-white/10'
                      }`}
                    >
                      {v}%
                    </button>
                  ))}
                </div>
              </div>
            )}
          </div>

          {/* memo */}
          <div>
            <label className="block text-sm font-medium text-gray-300 mb-1">메모</label>
            <textarea
              rows={3}
              value={formData.memo}
              onChange={(e) => setFormData({ ...formData, memo: e.target.value })}
              placeholder="업무 관련 메모를 작성하세요"
              className="w-full px-3 py-2 rounded-lg border border-surface-700 text-sm text-white bg-surface-700 focus:outline-none focus:ring-2 focus:ring-brand-500/30 focus:border-brand-500 transition resize-none"
            />
          </div>
        </div>

        {/* footer */}
        <div className="flex items-center justify-end gap-3 mt-6 pt-4 border-t border-surface-700">
          <button onClick={onClose} className="px-4 py-2 rounded-lg text-sm font-medium text-gray-400 hover:bg-white/5 transition-colors cursor-pointer">
            취소
          </button>
          <button onClick={handleSave} className="px-5 py-2 rounded-lg text-sm font-medium text-white bg-brand-500 hover:bg-brand-600 transition-colors cursor-pointer">
            {editingTask ? '수정' : '저장'}
          </button>
        </div>
      </div>
    </div>
  );
}
