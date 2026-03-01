import { useState, useEffect, useCallback, useRef, useMemo } from 'react';
import {
  LogOut,
  Clock,
  Play,
  Pause,
  Square,
  Plus,
  CheckCircle2,
  Circle,
  AlertCircle,
  ChevronRight,
} from 'lucide-react';

export default function MeetingLiveView({
  meeting,
  members,
  agendas = [],
  actionItems = [],
  onUpdateAgenda,
  onAddActionItem,
  onExitLiveMode,
  onCompleteMeeting,
}) {
  // ---- State ----
  const [meetingElapsed, setMeetingElapsed] = useState(0);
  const [isPaused, setIsPaused] = useState(false);
  const [agendaNotes, setAgendaNotes] = useState({});
  const [saveStatus, setSaveStatus] = useState({});
  const [quickActionTitle, setQuickActionTitle] = useState('');

  // ---- Refs ----
  const timerRef = useRef(null);
  const debounceRefs = useRef({});
  const actionInputRef = useRef(null);

  // Build agenda tree (parent + children)
  const agendaTree = useMemo(() => {
    const sorted = [...agendas].sort((a, b) => (a.sort_order || 0) - (b.sort_order || 0));
    const topLevel = sorted.filter((a) => !a.parent_id);
    return topLevel.map((parent) => ({
      ...parent,
      children: sorted.filter((a) => a.parent_id === parent.id),
    }));
  }, [agendas]);

  const allItems = useMemo(() => {
    const items = [];
    agendaTree.forEach((parent) => {
      items.push(parent);
      parent.children.forEach((child) => items.push(child));
    });
    return items;
  }, [agendaTree]);

  // ---- Initialize notes from agendas ----
  useEffect(() => {
    const initialNotes = {};
    agendas.forEach((a) => {
      if (a.notes) initialNotes[a.id] = a.notes;
    });
    setAgendaNotes((prev) => ({ ...initialNotes, ...prev }));
  }, []);

  // ---- Timer ----
  useEffect(() => {
    timerRef.current = setInterval(() => {
      if (!isPaused) {
        setMeetingElapsed((prev) => prev + 1);
      }
    }, 1000);
    return () => clearInterval(timerRef.current);
  }, [isPaused]);

  // ---- Auto-set first agenda to discussing ----
  useEffect(() => {
    const topLevel = agendaTree;
    if (topLevel.length > 0 && topLevel.every((a) => a.status === 'pending')) {
      onUpdateAgenda(topLevel[0].id, { status: 'discussing' });
    }
  }, []);

  // ---- Format time ----
  const formatTime = useCallback((seconds) => {
    const h = Math.floor(seconds / 3600);
    const m = Math.floor((seconds % 3600) / 60);
    const s = seconds % 60;
    if (h > 0) return `${h}:${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`;
    return `${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`;
  }, []);

  // ---- Notes change with debounced auto-save ----
  const handleNotesChange = useCallback(
    (agendaId, text) => {
      setAgendaNotes((prev) => ({ ...prev, [agendaId]: text }));
      setSaveStatus((prev) => ({ ...prev, [agendaId]: 'typing' }));

      if (debounceRefs.current[agendaId]) {
        clearTimeout(debounceRefs.current[agendaId]);
      }

      debounceRefs.current[agendaId] = setTimeout(async () => {
        setSaveStatus((prev) => ({ ...prev, [agendaId]: 'saving' }));
        try {
          await onUpdateAgenda(agendaId, { notes: text });
          setSaveStatus((prev) => ({ ...prev, [agendaId]: 'saved' }));
          setTimeout(() => {
            setSaveStatus((prev) => (prev[agendaId] === 'saved' ? { ...prev, [agendaId]: null } : prev));
          }, 2000);
        } catch (err) {
          console.error('노트 저장 실패:', err);
          setSaveStatus((prev) => ({ ...prev, [agendaId]: 'error' }));
        }
      }, 1500);
    },
    [onUpdateAgenda],
  );

  // ---- Cleanup debounce on unmount ----
  useEffect(() => {
    return () => {
      Object.values(debounceRefs.current).forEach(clearTimeout);
    };
  }, []);

  // ---- Cycle agenda status ----
  const cycleAgendaStatus = useCallback(
    async (agendaId, currentStatus) => {
      const next = currentStatus === 'pending' ? 'discussing' : currentStatus === 'discussing' ? 'done' : 'pending';
      try {
        await onUpdateAgenda(agendaId, { status: next });
      } catch (err) {
        console.error('안건 상태 변경 실패:', err);
      }
    },
    [onUpdateAgenda],
  );

  // ---- Quick action item ----
  const handleAddQuickAction = useCallback(() => {
    const title = quickActionTitle.trim();
    if (!title) return;
    onAddActionItem({ title, status: 'pending' });
    setQuickActionTitle('');
    actionInputRef.current?.focus();
  }, [quickActionTitle, onAddActionItem]);

  // ---- Keyboard shortcuts ----
  useEffect(() => {
    const handleKeyDown = (e) => {
      const tag = e.target.tagName.toLowerCase();
      if (tag === 'textarea' || tag === 'input') return;
      if (e.key === 'Escape') {
        e.preventDefault();
        onExitLiveMode();
      } else if (e.key === 'p' || e.key === 'P') {
        e.preventDefault();
        setIsPaused((prev) => !prev);
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [onExitLiveMode]);

  // ---- Status helpers ----
  const renderStatusIcon = (status) => {
    if (status === 'done') return <CheckCircle2 size={14} className="text-emerald-500" />;
    if (status === 'discussing') return <AlertCircle size={14} className="text-brand-400" />;
    return <Circle size={14} className="text-gray-300" />;
  };

  const doneCount = allItems.filter((a) => a.status === 'done').length;
  const totalCount = allItems.length;
  const progress = totalCount > 0 ? (doneCount / totalCount) * 100 : 0;

  // ---- Render an agenda card (parent or child) ----
  const renderAgendaCard = (agenda, idx, isChild = false) => {
    const isDiscussing = agenda.status === 'discussing';
    const isDone = agenda.status === 'done';

    return (
      <div
        key={agenda.id}
        className={`rounded-xl border-2 transition-all duration-300 ${isChild ? 'ml-6 lg:ml-8' : ''} ${
          isDiscussing
            ? 'border-brand-300 bg-brand-50/30 shadow-lg shadow-brand-100/50'
            : isDone
              ? 'border-emerald-200 bg-emerald-50/20 opacity-80'
              : 'border-gray-200 bg-white hover:border-gray-300'
        }`}
      >
        {/* Agenda Header */}
        <div className="flex items-center justify-between px-4 lg:px-5 py-3">
          <div className="flex items-center gap-2.5">
            <span className={`text-sm font-bold tabular-nums ${isDone ? 'text-emerald-400' : isDiscussing ? 'text-brand-400' : 'text-gray-300'}`}>
              {idx}
            </span>
            <h3 className={`text-sm font-semibold tracking-tight ${isDone ? 'text-gray-400 line-through' : 'text-gray-800'}`}>
              {agenda.title}
            </h3>
          </div>
          <button
            onClick={() => cycleAgendaStatus(agenda.id, agenda.status)}
            className={`flex items-center gap-1.5 text-xs font-semibold px-3 py-1.5 rounded-full transition-all duration-200 cursor-pointer tracking-wide ${
              isDone
                ? 'bg-emerald-100 text-emerald-600 hover:bg-emerald-200'
                : isDiscussing
                  ? 'bg-brand-100 text-brand-600 hover:bg-brand-200'
                  : 'bg-gray-100 text-gray-500 hover:bg-gray-200'
            }`}
          >
            {renderStatusIcon(agenda.status)}
            {isDone ? '완료' : isDiscussing ? '논의 중' : '대기'}
          </button>
        </div>

        {/* Agenda Notes */}
        <div className="px-4 lg:px-5 pb-4">
          <div className="flex items-center justify-between mb-1.5">
            <label className="text-xs font-medium text-gray-400 tracking-wide">메모</label>
            {saveStatus[agenda.id] === 'saving' && (
              <span className="text-[11px] text-gray-400 animate-pulse">저장 중...</span>
            )}
            {saveStatus[agenda.id] === 'saved' && (
              <span className="text-[11px] text-emerald-500 font-medium">✓ 저장됨</span>
            )}
            {saveStatus[agenda.id] === 'error' && (
              <span className="text-[11px] text-red-500">저장 실패</span>
            )}
          </div>
          <textarea
            value={agendaNotes[agenda.id] || ''}
            onChange={(e) => handleNotesChange(agenda.id, e.target.value)}
            placeholder={isChild ? "세부 안건 메모..." : "이 안건에 대한 메모를 작성하세요..."}
            rows={isDiscussing ? 5 : isChild ? 2 : 3}
            className={`w-full px-3 py-2.5 border rounded-lg text-sm leading-relaxed focus:outline-none focus:ring-2 focus:ring-brand-500 focus:border-transparent resize-y transition-all duration-200 ${
              isDiscussing ? 'bg-white border-brand-200' : isDone ? 'bg-gray-50 border-gray-200 text-gray-400' : 'bg-gray-50 border-gray-200'
            }`}
          />
        </div>
      </div>
    );
  };

  // ============================================
  // RENDER
  // ============================================
  return (
    <div className="fixed inset-0 z-[60] bg-gray-50 flex flex-col">
      {/* ===== Header — Dark Theme ===== */}
      <div className="flex items-center justify-between px-4 lg:px-6 py-3 bg-surface-950 shrink-0">
        {/* Left: Exit */}
        <button
          onClick={onExitLiveMode}
          className="flex items-center gap-1.5 px-3 py-2 text-sm text-gray-400 hover:text-white hover:bg-white/10 rounded-lg transition-all cursor-pointer"
        >
          <LogOut size={16} className="rotate-180" />
          <span className="font-medium hidden sm:inline">나가기</span>
        </button>

        {/* Center: Title + Timer */}
        <div className="flex items-center gap-3">
          <h1 className="text-sm lg:text-base font-bold text-white truncate max-w-[200px] lg:max-w-[300px] tracking-tight">
            {meeting?.title || '회의'}
          </h1>
          <div className="flex items-center gap-2 px-3 py-1.5 bg-white/10 rounded-xl backdrop-blur-sm">
            <Clock size={14} className={isPaused ? 'text-yellow-400' : 'text-brand-400'} />
            <span className="text-lg font-mono font-bold text-white tabular-nums tracking-wider">
              {formatTime(meetingElapsed)}
            </span>
          </div>
          {isPaused && (
            <span className="text-xs px-2.5 py-1 bg-yellow-500/20 text-yellow-400 rounded-full font-semibold animate-pulse tracking-wide">
              일시정지
            </span>
          )}
        </div>

        {/* Right: Pause + Complete */}
        <div className="flex items-center gap-2">
          <button
            onClick={() => setIsPaused(!isPaused)}
            className={`flex items-center gap-1.5 px-3 py-2 text-sm font-semibold rounded-lg transition-all cursor-pointer ${
              isPaused
                ? 'bg-emerald-500/20 text-emerald-400 hover:bg-emerald-500/30'
                : 'bg-white/10 text-gray-300 hover:bg-white/20'
            }`}
          >
            {isPaused ? <Play size={15} /> : <Pause size={15} />}
            <span className="hidden sm:inline">{isPaused ? '재개' : '일시정지'}</span>
          </button>
          <button
            onClick={onCompleteMeeting}
            className="flex items-center gap-1.5 px-4 lg:px-5 py-2 bg-gradient-to-r from-brand-600 to-brand-500 text-white text-sm font-bold rounded-lg hover:from-brand-700 hover:to-brand-600 transition-all shadow-lg shadow-brand-600/30 cursor-pointer"
          >
            <Square size={14} />
            <span className="hidden sm:inline">회의 종료</span>
          </button>
        </div>
      </div>

      {/* ===== Body: 2-Panel (stacks on mobile) ===== */}
      <div className="flex flex-col lg:flex-row flex-1 min-h-0">
        {/* --- Main Content: All Agendas --- */}
        <div className="flex-1 overflow-y-auto px-4 lg:px-8 py-4 lg:py-6 space-y-3 lg:space-y-4">
          {agendaTree.map((agenda, idx) => (
            <div key={agenda.id}>
              {renderAgendaCard(agenda, `${idx + 1}`, false)}
              {agenda.children.map((child, childIdx) =>
                renderAgendaCard(child, `${idx + 1}.${childIdx + 1}`, true)
              )}
            </div>
          ))}

          {/* Progress summary */}
          {totalCount > 0 && (
            <div className="flex items-center justify-center gap-4 py-4">
              <span className="text-sm font-medium text-gray-500">
                진행률 {doneCount}/{totalCount}
              </span>
              <div className="w-40 h-2 bg-gray-200 rounded-full overflow-hidden">
                <div
                  className="h-full bg-gradient-to-r from-brand-600 to-brand-400 rounded-full transition-all duration-700 ease-out"
                  style={{ width: `${progress}%` }}
                />
              </div>
              <span className="text-sm font-bold text-gray-700 tabular-nums">
                {Math.round(progress)}%
              </span>
            </div>
          )}
        </div>

        {/* --- Right Panel: Action Items --- */}
        <div className="w-full lg:w-72 border-t lg:border-t-0 lg:border-l border-gray-200 bg-white flex flex-col shrink-0 max-h-[40vh] lg:max-h-none">
          {/* Header */}
          <div className="px-4 py-3 border-b border-gray-200 bg-gray-50/80">
            <div className="flex items-center justify-between">
              <h3 className="text-sm font-bold text-gray-800 tracking-tight">액션 아이템</h3>
              <span className="text-xs text-gray-400 bg-gray-200 px-2 py-0.5 rounded-full font-medium">
                {actionItems.length}
              </span>
            </div>
          </div>

          {/* Action Items List */}
          <div className="flex-1 overflow-y-auto">
            {actionItems.length === 0 ? (
              <div className="px-4 py-8 text-center">
                <p className="text-xs text-gray-400">아직 액션 아이템이 없습니다</p>
              </div>
            ) : (
              actionItems.map((item) => {
                const isDone = item.status === 'done' || item.status === 'completed';
                const assignee = members?.find((m) => m.id === item.assignee);
                return (
                  <div
                    key={item.id}
                    className="px-4 py-2.5 flex items-start gap-2 hover:bg-gray-50 transition-colors border-b border-gray-100 last:border-0"
                  >
                    {isDone ? (
                      <CheckCircle2 size={16} className="text-emerald-500 shrink-0 mt-0.5" />
                    ) : (
                      <Circle size={16} className="text-gray-300 shrink-0 mt-0.5" />
                    )}
                    <div className="min-w-0 flex-1">
                      <span
                        className={`text-sm leading-snug block ${
                          isDone ? 'line-through text-gray-400' : 'text-gray-700'
                        }`}
                      >
                        {item.title}
                      </span>
                      {assignee && (
                        <span className="text-[11px] text-gray-400 mt-0.5 block">
                          {assignee.avatar} {assignee.name}
                        </span>
                      )}
                    </div>
                  </div>
                );
              })
            )}
          </div>

          {/* Quick Add Action Item */}
          <div className="px-3 py-3 border-t border-gray-200 bg-white shrink-0">
            <div className="flex items-center gap-1.5">
              <input
                ref={actionInputRef}
                type="text"
                value={quickActionTitle}
                onChange={(e) => setQuickActionTitle(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter' && !e.isComposing) {
                    e.preventDefault();
                    handleAddQuickAction();
                  }
                }}
                placeholder="액션 아이템 추가..."
                className="flex-1 min-w-0 px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-brand-500 focus:border-transparent"
              />
              <button
                onClick={handleAddQuickAction}
                disabled={!quickActionTitle.trim()}
                className="shrink-0 p-2 bg-brand-500 text-white rounded-lg hover:bg-brand-600 transition-colors disabled:opacity-40 disabled:cursor-not-allowed cursor-pointer"
              >
                <Plus size={16} />
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
