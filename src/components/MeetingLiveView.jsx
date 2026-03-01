import { useState, useEffect, useRef, useCallback } from 'react';
import {
  Play,
  Pause,
  ChevronLeft,
  ChevronRight,
  Clock,
  CheckCircle2,
  Circle,
  Plus,
  X,
  LogOut,
  Timer,
  Square,
} from 'lucide-react';

/**
 * Format elapsed seconds into a time string.
 * If >= 1 hour: HH:MM:SS, otherwise MM:SS
 */
function formatTime(totalSeconds) {
  const h = Math.floor(totalSeconds / 3600);
  const m = Math.floor((totalSeconds % 3600) / 60);
  const s = totalSeconds % 60;
  const mm = String(m).padStart(2, '0');
  const ss = String(s).padStart(2, '0');
  if (h > 0) {
    return `${String(h).padStart(2, '0')}:${mm}:${ss}`;
  }
  return `${mm}:${ss}`;
}

export default function MeetingLiveView({
  meeting,
  members,
  agendas,
  actionItems,
  onUpdateAgenda,
  onAddActionItem,
  onExitLiveMode,
  onCompleteMeeting,
}) {
  // --- State ---
  const [currentAgendaIndex, setCurrentAgendaIndex] = useState(0);
  const [meetingElapsed, setMeetingElapsed] = useState(0);
  const [agendaElapsed, setAgendaElapsed] = useState(0);
  const [isPaused, setIsPaused] = useState(false);
  const [agendaNotes, setAgendaNotes] = useState(() => {
    const initial = {};
    (agendas || []).forEach((a) => {
      initial[a.id] = a.notes || '';
    });
    return initial;
  });
  const [quickActionTitle, setQuickActionTitle] = useState('');
  const [saveStatus, setSaveStatus] = useState({}); // { agendaId: 'saving' | 'saved' | null }

  // --- Refs ---
  const timerRef = useRef(null);
  const debounceRefs = useRef({}); // { agendaId: timeoutId }
  const notesTextareaRef = useRef(null);
  const actionInputRef = useRef(null);

  // --- Derived ---
  const sortedAgendas = agendas || [];
  const currentAgenda = sortedAgendas[currentAgendaIndex] || null;
  const totalAgendas = sortedAgendas.length;

  // --- Timer Logic ---
  useEffect(() => {
    timerRef.current = setInterval(() => {
      if (!isPaused) {
        setMeetingElapsed((prev) => prev + 1);
        setAgendaElapsed((prev) => prev + 1);
      }
    }, 1000);

    return () => {
      if (timerRef.current) {
        clearInterval(timerRef.current);
      }
    };
  }, [isPaused]);

  // Reset agenda timer when index changes
  useEffect(() => {
    setAgendaElapsed(0);
  }, [currentAgendaIndex]);

  // --- Auto-save with debounce ---
  const handleNotesChange = useCallback(
    (agendaId, text) => {
      setAgendaNotes((prev) => ({ ...prev, [agendaId]: text }));
      setSaveStatus((prev) => ({ ...prev, [agendaId]: null }));

      // Clear previous debounce for this agenda
      if (debounceRefs.current[agendaId]) {
        clearTimeout(debounceRefs.current[agendaId]);
      }

      debounceRefs.current[agendaId] = setTimeout(async () => {
        setSaveStatus((prev) => ({ ...prev, [agendaId]: 'saving' }));
        try {
          await onUpdateAgenda(agendaId, { notes: text });
          setSaveStatus((prev) => ({ ...prev, [agendaId]: 'saved' }));
          // Clear "saved" indicator after 2 seconds
          setTimeout(() => {
            setSaveStatus((prev) => ({ ...prev, [agendaId]: null }));
          }, 2000);
        } catch (err) {
          console.error('노트 저장 실패:', err);
          setSaveStatus((prev) => ({ ...prev, [agendaId]: null }));
        }
      }, 1500);
    },
    [onUpdateAgenda],
  );

  // Cleanup all debounce timers on unmount
  useEffect(() => {
    const refs = debounceRefs.current;
    return () => {
      Object.values(refs).forEach((tid) => clearTimeout(tid));
    };
  }, []);

  // --- Agenda Navigation ---
  const goToNextAgenda = useCallback(async () => {
    if (currentAgendaIndex >= totalAgendas - 1) return;

    // Mark current as done
    const currentA = sortedAgendas[currentAgendaIndex];
    if (currentA) {
      try {
        await onUpdateAgenda(currentA.id, { status: 'done' });
      } catch (err) {
        console.error('안건 상태 변경 실패:', err);
      }
    }

    const nextIndex = currentAgendaIndex + 1;
    const nextA = sortedAgendas[nextIndex];

    // Mark next as discussing
    if (nextA) {
      try {
        await onUpdateAgenda(nextA.id, { status: 'discussing' });
      } catch (err) {
        console.error('안건 상태 변경 실패:', err);
      }
    }

    setCurrentAgendaIndex(nextIndex);
  }, [currentAgendaIndex, totalAgendas, sortedAgendas, onUpdateAgenda]);

  const goToPrevAgenda = useCallback(() => {
    if (currentAgendaIndex <= 0) return;
    setCurrentAgendaIndex((prev) => prev - 1);
  }, [currentAgendaIndex]);

  // --- Keyboard shortcuts ---
  useEffect(() => {
    const handleKeyDown = (e) => {
      // Skip keyboard shortcuts if user is typing in a textarea or input
      const tag = e.target.tagName.toLowerCase();
      if (tag === 'textarea' || tag === 'input') return;

      if (e.key === 'ArrowRight' || e.key === ' ') {
        e.preventDefault();
        goToNextAgenda();
      } else if (e.key === 'ArrowLeft') {
        e.preventDefault();
        goToPrevAgenda();
      } else if (e.key === 'Escape') {
        e.preventDefault();
        onExitLiveMode();
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [goToNextAgenda, goToPrevAgenda, onExitLiveMode]);

  // --- Mark first agenda as discussing on mount ---
  useEffect(() => {
    if (sortedAgendas.length > 0 && sortedAgendas[0].status !== 'discussing' && sortedAgendas[0].status !== 'done') {
      onUpdateAgenda(sortedAgendas[0].id, { status: 'discussing' }).catch(() => {});
    }
    // Only run on mount
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // --- Quick Action Item ---
  const handleAddQuickAction = async () => {
    if (!quickActionTitle.trim()) return;
    try {
      await onAddActionItem({ title: quickActionTitle.trim(), assignee: null });
      setQuickActionTitle('');
      actionInputRef.current?.focus();
    } catch (err) {
      console.error('액션 아이템 추가 실패:', err);
    }
  };

  // --- Agenda Status Icon ---
  const renderStatusIcon = (status) => {
    switch (status) {
      case 'done':
        return <CheckCircle2 size={16} className="text-green-500 shrink-0" />;
      case 'discussing':
        return <Circle size={16} className="text-amber-500 animate-pulse shrink-0 fill-amber-500" />;
      default:
        return <Circle size={16} className="text-gray-300 shrink-0" />;
    }
  };

  // --- Render ---
  return (
    <div className="fixed inset-0 z-40 bg-white flex flex-col">
      {/* ===== Header Bar ===== */}
      <div className="flex items-center justify-between px-6 py-3 border-b border-gray-200 bg-white shrink-0">
        {/* Left: Exit button */}
        <button
          onClick={onExitLiveMode}
          className="flex items-center gap-1.5 px-3 py-2 text-sm text-gray-600 hover:text-gray-900 hover:bg-gray-100 rounded-lg transition-colors"
        >
          <LogOut size={16} className="rotate-180" />
          <span className="font-medium">나가기</span>
        </button>

        {/* Center: Title */}
        <div className="flex items-center gap-4">
          <h1 className="text-lg font-bold text-gray-900">{meeting?.title || '회의'}</h1>
          <div className="flex items-center gap-2 px-3 py-1.5 bg-brand-50 rounded-lg">
            <Clock size={16} className="text-brand-500" />
            <span className="text-3xl font-mono text-brand-500 tabular-nums leading-none">
              {formatTime(meetingElapsed)}
            </span>
          </div>
        </div>

        {/* Right: Pause + Complete */}
        <div className="flex items-center gap-2">
          <button
            onClick={() => setIsPaused(!isPaused)}
            className={`flex items-center gap-1.5 px-3 py-2 text-sm font-medium rounded-lg transition-colors ${
              isPaused
                ? 'bg-green-50 text-green-600 hover:bg-green-100'
                : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
            }`}
          >
            {isPaused ? <Play size={15} /> : <Pause size={15} />}
            {isPaused ? '재개' : '일시정지'}
          </button>
          <button
            onClick={onCompleteMeeting}
            className="flex items-center gap-1.5 px-4 py-2 bg-brand-500 text-white text-sm font-medium rounded-lg hover:bg-brand-600 transition-colors shadow-sm"
          >
            <Square size={14} />
            회의 종료
          </button>
        </div>
      </div>

      {/* ===== 3-Panel Body ===== */}
      <div className="flex flex-1 min-h-0">
        {/* --- Left Panel: Agenda List --- */}
        <div className="w-64 shrink-0 border-r border-gray-200 bg-gray-50 flex flex-col">
          <div className="px-4 py-3 border-b border-gray-200">
            <h2 className="text-xs font-semibold text-gray-500 uppercase tracking-wider">안건 목록</h2>
          </div>
          <div className="flex-1 overflow-y-auto py-2">
            {sortedAgendas.map((agenda, idx) => {
              const isCurrent = idx === currentAgendaIndex;
              return (
                <button
                  key={agenda.id}
                  onClick={() => setCurrentAgendaIndex(idx)}
                  className={`w-full text-left px-4 py-3 flex items-start gap-2.5 transition-colors ${
                    isCurrent
                      ? 'bg-brand-50 border-r-2 border-brand-500'
                      : 'hover:bg-gray-100'
                  }`}
                >
                  <span className="mt-0.5">{renderStatusIcon(agenda.status)}</span>
                  <div className="min-w-0 flex-1">
                    <span
                      className={`text-sm leading-snug block ${
                        isCurrent ? 'font-semibold text-brand-700' : agenda.status === 'done' ? 'text-gray-400 line-through' : 'text-gray-700'
                      }`}
                    >
                      {idx + 1}. {agenda.title}
                    </span>
                    {agenda.duration_minutes && (
                      <span className="text-[11px] text-gray-400 mt-0.5 block">
                        {agenda.duration_minutes}분 예정
                      </span>
                    )}
                  </div>
                </button>
              );
            })}
            {sortedAgendas.length === 0 && (
              <div className="px-4 py-8 text-center text-sm text-gray-400">
                안건이 없습니다
              </div>
            )}
          </div>
          {/* Progress indicator */}
          <div className="px-4 py-3 border-t border-gray-200 bg-white">
            <div className="flex items-center justify-between text-xs text-gray-500 mb-1.5">
              <span>진행률</span>
              <span>
                {sortedAgendas.filter((a) => a.status === 'done').length} / {totalAgendas}
              </span>
            </div>
            <div className="w-full h-1.5 bg-gray-200 rounded-full overflow-hidden">
              <div
                className="h-full bg-brand-500 rounded-full transition-all duration-500"
                style={{
                  width: totalAgendas > 0
                    ? `${(sortedAgendas.filter((a) => a.status === 'done').length / totalAgendas) * 100}%`
                    : '0%',
                }}
              />
            </div>
          </div>
        </div>

        {/* --- Center Panel: Current Agenda --- */}
        <div className="flex-1 flex flex-col min-w-0 bg-white">
          {currentAgenda ? (
            <>
              {/* Current Agenda Header */}
              <div className="px-8 pt-8 pb-4">
                <div className="flex items-center gap-2 text-sm text-gray-400 mb-2">
                  <span>안건 {currentAgendaIndex + 1} / {totalAgendas}</span>
                  {currentAgenda.duration_minutes && (
                    <>
                      <span className="text-gray-300">|</span>
                      <span>예정 시간: {currentAgenda.duration_minutes}분</span>
                    </>
                  )}
                </div>
                <h2 className="text-2xl font-bold text-gray-900 mb-4">
                  {currentAgenda.title}
                </h2>

                {/* Agenda Timer */}
                <div className="flex items-center gap-2">
                  <Timer size={18} className="text-gray-400" />
                  <span className="text-xl font-mono text-gray-600 tabular-nums">
                    {formatTime(agendaElapsed)}
                  </span>
                  {currentAgenda.duration_minutes && agendaElapsed > currentAgenda.duration_minutes * 60 && (
                    <span className="text-xs px-2 py-0.5 bg-red-50 text-red-500 rounded-full font-medium">
                      시간 초과
                    </span>
                  )}
                  {isPaused && (
                    <span className="text-xs px-2 py-0.5 bg-yellow-50 text-yellow-600 rounded-full font-medium animate-pulse">
                      일시정지
                    </span>
                  )}
                </div>
              </div>

              {/* Notes Area */}
              <div className="flex-1 px-8 pb-4 flex flex-col min-h-0">
                <div className="flex items-center justify-between mb-2">
                  <label className="text-sm font-semibold text-gray-600">메모</label>
                  {saveStatus[currentAgenda.id] === 'saving' && (
                    <span className="text-xs text-gray-400">저장 중...</span>
                  )}
                  {saveStatus[currentAgenda.id] === 'saved' && (
                    <span className="text-xs text-green-500 font-medium">저장됨</span>
                  )}
                </div>
                <textarea
                  ref={notesTextareaRef}
                  value={agendaNotes[currentAgenda.id] || ''}
                  onChange={(e) => handleNotesChange(currentAgenda.id, e.target.value)}
                  placeholder="이 안건에 대한 메모를 작성하세요..."
                  className="flex-1 w-full px-4 py-3 border border-gray-200 rounded-xl text-sm leading-relaxed focus:outline-none focus:ring-2 focus:ring-brand-500 focus:border-transparent resize-none bg-gray-50"
                />
              </div>

              {/* Navigation Buttons */}
              <div className="px-8 py-4 border-t border-gray-100 flex items-center justify-between shrink-0">
                <button
                  onClick={goToPrevAgenda}
                  disabled={currentAgendaIndex <= 0}
                  className="flex items-center gap-1.5 px-4 py-2.5 text-sm font-medium text-gray-600 bg-gray-100 rounded-lg hover:bg-gray-200 transition-colors disabled:opacity-30 disabled:cursor-not-allowed"
                >
                  <ChevronLeft size={16} />
                  이전
                </button>
                <div className="flex items-center gap-1.5">
                  {sortedAgendas.map((_, idx) => (
                    <div
                      key={idx}
                      className={`w-2 h-2 rounded-full transition-colors ${
                        idx === currentAgendaIndex
                          ? 'bg-brand-500'
                          : idx < currentAgendaIndex
                            ? 'bg-green-400'
                            : 'bg-gray-300'
                      }`}
                    />
                  ))}
                </div>
                <button
                  onClick={goToNextAgenda}
                  disabled={currentAgendaIndex >= totalAgendas - 1}
                  className="flex items-center gap-1.5 px-4 py-2.5 text-sm font-medium text-white bg-brand-500 rounded-lg hover:bg-brand-600 transition-colors disabled:opacity-30 disabled:cursor-not-allowed"
                >
                  다음
                  <ChevronRight size={16} />
                </button>
              </div>
            </>
          ) : (
            <div className="flex-1 flex items-center justify-center text-gray-400">
              <div className="text-center">
                <Clock size={48} className="mx-auto mb-3 text-gray-200" />
                <p className="text-sm">안건이 없습니다</p>
              </div>
            </div>
          )}
        </div>

        {/* --- Right Panel: Action Items --- */}
        <div className="w-72 shrink-0 border-l border-gray-200 bg-gray-50 flex flex-col">
          <div className="px-4 py-3 border-b border-gray-200">
            <h2 className="text-xs font-semibold text-gray-500 uppercase tracking-wider flex items-center gap-1.5">
              <CheckCircle2 size={13} />
              액션 아이템
            </h2>
          </div>

          {/* Action Items List */}
          <div className="flex-1 overflow-y-auto py-2">
            {(actionItems || []).length === 0 ? (
              <div className="px-4 py-8 text-center text-sm text-gray-400">
                액션 아이템이 없습니다
              </div>
            ) : (
              (actionItems || []).map((item) => {
                const isDone = item.status === 'done';
                const assignee = members?.find((m) => m.id === item.assignee);
                return (
                  <div
                    key={item.id}
                    className="px-4 py-2.5 flex items-start gap-2 hover:bg-gray-100 transition-colors"
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
                  if (e.key === 'Enter') {
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
                className="shrink-0 p-2 bg-brand-500 text-white rounded-lg hover:bg-brand-600 transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
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
