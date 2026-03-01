import { useState, useEffect, useCallback, useRef } from 'react';
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

  // Sort agendas by sort_order
  const sortedAgendas = [...agendas].sort((a, b) => (a.sort_order || 0) - (b.sort_order || 0));

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
    if (sortedAgendas.length > 0 && sortedAgendas.every((a) => a.status === 'pending')) {
      onUpdateAgenda(sortedAgendas[0].id, { status: 'discussing' });
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

  // ---- Status icon ----
  const renderStatusIcon = (status) => {
    if (status === 'done') return <CheckCircle2 size={14} className="text-green-500" />;
    if (status === 'discussing') return <AlertCircle size={14} className="text-amber-500" />;
    return <Circle size={14} className="text-gray-300" />;
  };

  const doneCount = sortedAgendas.filter((a) => a.status === 'done').length;
  const progress = sortedAgendas.length > 0 ? (doneCount / sortedAgendas.length) * 100 : 0;

  // ============================================
  // RENDER
  // ============================================
  return (
    <div className="fixed inset-0 z-[60] bg-white flex flex-col">
      {/* ===== Header ===== */}
      <div className="flex items-center justify-between px-6 py-3 border-b border-gray-200 bg-white shrink-0">
        {/* Left: Exit */}
        <button
          onClick={onExitLiveMode}
          className="flex items-center gap-1.5 px-3 py-2 text-sm text-gray-600 hover:text-gray-900 hover:bg-gray-100 rounded-lg transition-colors cursor-pointer"
        >
          <LogOut size={16} className="rotate-180" />
          <span className="font-medium">나가기</span>
        </button>

        {/* Center: Title + Timer */}
        <div className="flex items-center gap-3">
          <h1 className="text-base font-bold text-gray-900 truncate max-w-[300px]">{meeting?.title || '회의'}</h1>
          <div className="flex items-center gap-1.5 px-2.5 py-1 bg-gray-100 rounded-lg">
            <Clock size={14} className={isPaused ? 'text-yellow-500' : 'text-gray-500'} />
            <span className="text-sm font-mono text-gray-700 tabular-nums">{formatTime(meetingElapsed)}</span>
          </div>
          {isPaused && (
            <span className="text-xs px-2 py-0.5 bg-yellow-50 text-yellow-600 rounded-full font-medium animate-pulse">
              일시정지
            </span>
          )}
        </div>

        {/* Right: Pause + Complete */}
        <div className="flex items-center gap-2">
          <button
            onClick={() => setIsPaused(!isPaused)}
            className={`flex items-center gap-1.5 px-3 py-2 text-sm font-medium rounded-lg transition-colors cursor-pointer ${
              isPaused ? 'bg-green-50 text-green-600 hover:bg-green-100' : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
            }`}
          >
            {isPaused ? <Play size={15} /> : <Pause size={15} />}
            {isPaused ? '재개' : '일시정지'}
          </button>
          <button
            onClick={onCompleteMeeting}
            className="flex items-center gap-1.5 px-4 py-2 bg-red-500 text-white text-sm font-medium rounded-lg hover:bg-red-600 transition-colors shadow-sm cursor-pointer"
          >
            <Square size={14} />
            회의 종료
          </button>
        </div>
      </div>

      {/* ===== Body: 2-Panel ===== */}
      <div className="flex flex-1 min-h-0">
        {/* --- Main Content: All Agendas --- */}
        <div className="flex-1 overflow-y-auto px-8 py-6 space-y-4">
          {sortedAgendas.map((agenda, idx) => {
            const isDiscussing = agenda.status === 'discussing';
            const isDone = agenda.status === 'done';
            return (
              <div
                key={agenda.id}
                className={`rounded-xl border-2 transition-all ${
                  isDiscussing
                    ? 'border-indigo-300 bg-indigo-50/30 shadow-sm'
                    : isDone
                      ? 'border-green-200 bg-green-50/20'
                      : 'border-gray-200 bg-white'
                }`}
              >
                {/* Agenda Header */}
                <div className="flex items-center justify-between px-5 py-3">
                  <div className="flex items-center gap-2.5">
                    <span className={`text-sm font-bold ${isDone ? 'text-green-400' : isDiscussing ? 'text-indigo-400' : 'text-gray-300'}`}>
                      {idx + 1}
                    </span>
                    <h3 className={`text-sm font-semibold ${isDone ? 'text-gray-400 line-through' : 'text-gray-800'}`}>
                      {agenda.title}
                    </h3>
                  </div>
                  <button
                    onClick={() => cycleAgendaStatus(agenda.id, agenda.status)}
                    className={`flex items-center gap-1.5 text-xs font-medium px-2.5 py-1 rounded-full transition-colors cursor-pointer ${
                      isDone
                        ? 'bg-green-100 text-green-600 hover:bg-green-200'
                        : isDiscussing
                          ? 'bg-amber-100 text-amber-600 hover:bg-amber-200'
                          : 'bg-gray-100 text-gray-500 hover:bg-gray-200'
                    }`}
                  >
                    {renderStatusIcon(agenda.status)}
                    {isDone ? '완료' : isDiscussing ? '논의 중' : '대기'}
                  </button>
                </div>

                {/* Agenda Notes */}
                <div className="px-5 pb-4">
                  <div className="flex items-center justify-between mb-1.5">
                    <label className="text-xs font-medium text-gray-400">메모</label>
                    {saveStatus[agenda.id] === 'saving' && (
                      <span className="text-[11px] text-gray-400 animate-pulse">저장 중...</span>
                    )}
                    {saveStatus[agenda.id] === 'saved' && (
                      <span className="text-[11px] text-green-500 font-medium">✓ 저장됨</span>
                    )}
                    {saveStatus[agenda.id] === 'error' && (
                      <span className="text-[11px] text-red-500">저장 실패</span>
                    )}
                  </div>
                  <textarea
                    value={agendaNotes[agenda.id] || ''}
                    onChange={(e) => handleNotesChange(agenda.id, e.target.value)}
                    placeholder="이 안건에 대한 메모를 작성하세요..."
                    rows={isDiscussing ? 5 : 3}
                    className={`w-full px-3 py-2.5 border rounded-lg text-sm leading-relaxed focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent resize-y transition-colors ${
                      isDiscussing ? 'bg-white border-indigo-200' : isDone ? 'bg-gray-50 border-gray-200 text-gray-500' : 'bg-gray-50 border-gray-200'
                    }`}
                  />
                </div>
              </div>
            );
          })}

          {/* Progress summary */}
          {sortedAgendas.length > 0 && (
            <div className="flex items-center justify-center gap-3 py-4 text-sm text-gray-400">
              <span>
                진행률 {doneCount}/{sortedAgendas.length}
              </span>
              <div className="w-32 h-1.5 bg-gray-200 rounded-full overflow-hidden">
                <div
                  className="h-full bg-indigo-500 rounded-full transition-all duration-500"
                  style={{ width: `${progress}%` }}
                />
              </div>
            </div>
          )}
        </div>

        {/* --- Right Panel: Action Items --- */}
        <div className="w-72 border-l border-gray-200 bg-gray-50 flex flex-col shrink-0">
          {/* Header */}
          <div className="px-4 py-3 border-b border-gray-200 bg-white">
            <div className="flex items-center justify-between">
              <h3 className="text-sm font-bold text-gray-800">액션 아이템</h3>
              <span className="text-xs text-gray-400 bg-gray-100 px-2 py-0.5 rounded-full">
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
                    className="px-4 py-2.5 flex items-start gap-2 hover:bg-gray-100 transition-colors border-b border-gray-100 last:border-0"
                  >
                    {isDone ? (
                      <CheckCircle2 size={16} className="text-green-500 shrink-0 mt-0.5" />
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
                className="flex-1 min-w-0 px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
              />
              <button
                onClick={handleAddQuickAction}
                disabled={!quickActionTitle.trim()}
                className="shrink-0 p-2 bg-indigo-500 text-white rounded-lg hover:bg-indigo-600 transition-colors disabled:opacity-40 disabled:cursor-not-allowed cursor-pointer"
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
