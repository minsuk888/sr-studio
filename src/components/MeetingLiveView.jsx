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
  FileText,
  Save,
} from 'lucide-react';

export default function MeetingLiveView({
  meeting,
  members,
  agendas = [],
  actionItems = [],
  initialMinutes = '',
  onUpdateAgenda,
  onAddActionItem,
  onExitLiveMode,
  onCompleteMeeting,
}) {
  // ---- State ----
  const [meetingElapsed, setMeetingElapsed] = useState(0);
  const [isPaused, setIsPaused] = useState(false);
  const [quickActionTitle, setQuickActionTitle] = useState('');
  const [liveMinutes, setLiveMinutes] = useState(initialMinutes);
  const [minutesSaveStatus, setMinutesSaveStatus] = useState(null);
  const [rightTab, setRightTab] = useState('minutes');

  // ---- Refs ----
  const timerRef = useRef(null);
  const actionInputRef = useRef(null);

  // Build agenda tree
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

  // ---- Handle complete meeting ----
  const handleComplete = () => {
    onCompleteMeeting(liveMinutes);
  };

  // ---- Exit with save ----
  const handleExit = useCallback(() => {
    onExitLiveMode(liveMinutes);
  }, [onExitLiveMode, liveMinutes]);

  // ---- Keyboard shortcuts ----
  useEffect(() => {
    const handleKeyDown = (e) => {
      const tag = e.target.tagName.toLowerCase();
      if (tag === 'textarea' || tag === 'input') return;
      if (e.key === 'Escape') {
        e.preventDefault();
        handleExit();
      } else if (e.key === 'p' || e.key === 'P') {
        e.preventDefault();
        setIsPaused((prev) => !prev);
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [handleExit]);

  // ---- Progress ----
  const doneCount = allItems.filter((a) => a.status === 'done').length;
  const totalCount = allItems.length;
  const progress = totalCount > 0 ? (doneCount / totalCount) * 100 : 0;

  // ---- Status badge ----
  const StatusBadge = ({ status }) => {
    if (status === 'done') return (
      <span className="flex items-center gap-1.5 text-xs font-semibold px-3 py-1.5 rounded-full bg-emerald-500/20 text-emerald-400 tracking-wide">
        <CheckCircle2 size={13} /> 완료
      </span>
    );
    if (status === 'discussing') return (
      <span className="flex items-center gap-1.5 text-xs font-semibold px-3 py-1.5 rounded-full bg-brand-500/20 text-brand-400 tracking-wide animate-pulse">
        <AlertCircle size={13} /> 논의 중
      </span>
    );
    return (
      <span className="flex items-center gap-1.5 text-xs font-semibold px-3 py-1.5 rounded-full bg-white/10 text-gray-500 tracking-wide">
        <Circle size={13} /> 대기
      </span>
    );
  };

  // ============================================
  // RENDER
  // ============================================
  return (
    <div className="fixed inset-0 z-[60] bg-surface-900 flex flex-col">
      {/* ===== Header ===== */}
      <div className="flex items-center justify-between px-4 lg:px-6 py-3 bg-surface-950 border-b border-surface-700 shrink-0">
        {/* Left: Exit */}
        <button
          onClick={handleExit}
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
          <div className="flex items-center gap-2 px-3 py-1.5 bg-white/10 rounded-xl backdrop-blur-sm border border-white/5">
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
            onClick={handleComplete}
            className="flex items-center gap-1.5 px-4 lg:px-5 py-2 bg-gradient-to-r from-brand-600 to-brand-500 text-white text-sm font-bold rounded-lg hover:from-brand-700 hover:to-brand-600 transition-all shadow-lg shadow-brand-600/30 cursor-pointer"
          >
            <Square size={14} />
            <span className="hidden sm:inline">회의 종료</span>
          </button>
        </div>
      </div>

      {/* ===== Progress Bar ===== */}
      {totalCount > 0 && (
        <div className="px-4 lg:px-6 py-2 bg-surface-950/50 border-b border-surface-700 flex items-center gap-4">
          <span className="text-xs font-medium text-gray-400 shrink-0">
            진행률 {doneCount}/{totalCount}
          </span>
          <div className="flex-1 h-1.5 bg-surface-700 rounded-full overflow-hidden">
            <div
              className="h-full bg-gradient-to-r from-brand-600 to-brand-400 rounded-full transition-all duration-700 ease-out"
              style={{ width: `${progress}%` }}
            />
          </div>
          <span className="text-xs font-bold text-white tabular-nums shrink-0">
            {Math.round(progress)}%
          </span>
        </div>
      )}

      {/* ===== Body: 2-Panel ===== */}
      <div className="flex flex-col lg:flex-row flex-1 min-h-0">
        {/* --- Left: Agendas (clean, no textareas) --- */}
        <div className="flex-1 overflow-y-auto px-4 lg:px-6 py-4 lg:py-5 space-y-2">
          {agendaTree.map((agenda, idx) => {
            const isDiscussing = agenda.status === 'discussing';
            const isDone = agenda.status === 'done';

            return (
              <div key={agenda.id} className="space-y-1">
                {/* Parent agenda */}
                <button
                  onClick={() => cycleAgendaStatus(agenda.id, agenda.status)}
                  className={`w-full flex items-center gap-3 px-4 py-3.5 rounded-xl border transition-all duration-300 text-left cursor-pointer ${
                    isDiscussing
                      ? 'border-brand-500/50 bg-brand-500/10 shadow-lg shadow-brand-500/10'
                      : isDone
                        ? 'border-emerald-500/30 bg-emerald-500/5 opacity-70'
                        : 'border-surface-700 bg-surface-800 hover:bg-surface-750 hover:border-surface-700'
                  }`}
                >
                  <span className={`text-lg font-black tabular-nums shrink-0 w-8 ${
                    isDone ? 'text-emerald-500' : isDiscussing ? 'text-brand-400' : 'text-gray-600'
                  }`}>
                    {idx + 1}
                  </span>
                  <h3 className={`flex-1 text-sm font-semibold tracking-tight ${
                    isDone ? 'text-gray-500 line-through' : 'text-white'
                  }`}>
                    {agenda.title}
                  </h3>
                  <StatusBadge status={agenda.status} />
                </button>

                {/* Children */}
                {agenda.children.map((child, childIdx) => {
                  const cDiscussing = child.status === 'discussing';
                  const cDone = child.status === 'done';
                  return (
                    <button
                      key={child.id}
                      onClick={() => cycleAgendaStatus(child.id, child.status)}
                      className={`w-full flex items-center gap-3 px-4 py-2.5 ml-6 lg:ml-8 rounded-lg border transition-all duration-300 text-left cursor-pointer ${
                        cDiscussing
                          ? 'border-brand-500/40 bg-brand-500/5'
                          : cDone
                            ? 'border-emerald-500/20 bg-emerald-500/5 opacity-60'
                            : 'border-surface-700/50 bg-surface-850 hover:bg-surface-800'
                      }`}
                    >
                      <span className={`text-xs font-bold tabular-nums shrink-0 w-8 ${
                        cDone ? 'text-emerald-500/60' : cDiscussing ? 'text-brand-400/80' : 'text-gray-600'
                      }`}>
                        {idx + 1}.{childIdx + 1}
                      </span>
                      <span className={`flex-1 text-xs font-medium ${
                        cDone ? 'text-gray-500 line-through' : 'text-gray-300'
                      }`}>
                        {child.title}
                      </span>
                      <StatusBadge status={child.status} />
                    </button>
                  );
                })}
              </div>
            );
          })}
        </div>

        {/* --- Right Panel: Minutes + Action Items --- */}
        <div className="w-full lg:w-[380px] border-t lg:border-t-0 lg:border-l border-surface-700 bg-surface-800 flex flex-col shrink-0 max-h-[50vh] lg:max-h-none">
          {/* Tab Header */}
          <div className="flex border-b border-surface-700 shrink-0">
            <button
              onClick={() => setRightTab('minutes')}
              className={`flex-1 flex items-center justify-center gap-1.5 px-4 py-3 text-xs font-semibold transition-colors cursor-pointer ${
                rightTab === 'minutes'
                  ? 'text-brand-400 border-b-2 border-brand-500 bg-brand-500/5'
                  : 'text-gray-500 hover:text-gray-300'
              }`}
            >
              <FileText size={14} />
              회의록
            </button>
            <button
              onClick={() => setRightTab('actions')}
              className={`flex-1 flex items-center justify-center gap-1.5 px-4 py-3 text-xs font-semibold transition-colors cursor-pointer ${
                rightTab === 'actions'
                  ? 'text-brand-400 border-b-2 border-brand-500 bg-brand-500/5'
                  : 'text-gray-500 hover:text-gray-300'
              }`}
            >
              <CheckCircle2 size={14} />
              액션 아이템
              {actionItems.length > 0 && (
                <span className="text-[10px] bg-surface-700 text-gray-400 px-1.5 py-0.5 rounded-full">
                  {actionItems.length}
                </span>
              )}
            </button>
          </div>

          {/* Tab Content */}
          {rightTab === 'minutes' ? (
            <div className="flex-1 flex flex-col min-h-0">
              <textarea
                value={liveMinutes}
                onChange={(e) => setLiveMinutes(e.target.value)}
                placeholder="회의 내용을 자유롭게 기록하세요...&#10;&#10;예시:&#10;- 논의 사항 정리&#10;- 결정된 내용&#10;- 후속 조치 필요 사항"
                className="flex-1 w-full px-4 py-4 bg-transparent text-sm text-gray-200 leading-relaxed placeholder:text-gray-600 focus:outline-none resize-none"
              />
            </div>
          ) : (
            <>
              {/* Action Items List */}
              <div className="flex-1 overflow-y-auto">
                {actionItems.length === 0 ? (
                  <div className="px-4 py-8 text-center">
                    <p className="text-xs text-gray-500">아직 액션 아이템이 없습니다</p>
                  </div>
                ) : (
                  actionItems.map((item) => {
                    const isDone = item.status === 'done' || item.status === 'completed';
                    const assignee = members?.find((m) => m.id === item.assignee);
                    return (
                      <div
                        key={item.id}
                        className="px-4 py-2.5 flex items-start gap-2.5 hover:bg-white/5 transition-colors border-b border-surface-700/50 last:border-0"
                      >
                        {isDone ? (
                          <CheckCircle2 size={16} className="text-emerald-500 shrink-0 mt-0.5" />
                        ) : (
                          <Circle size={16} className="text-gray-600 shrink-0 mt-0.5" />
                        )}
                        <div className="min-w-0 flex-1">
                          <span className={`text-sm leading-snug block ${isDone ? 'line-through text-gray-500' : 'text-gray-200'}`}>
                            {item.title}
                          </span>
                          {assignee && (
                            <span className="text-[11px] text-gray-500 mt-0.5 block">
                              {assignee.avatar} {assignee.name}
                            </span>
                          )}
                        </div>
                      </div>
                    );
                  })
                )}
              </div>

              {/* Quick Add */}
              <div className="px-3 py-3 border-t border-surface-700 shrink-0">
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
                    className="flex-1 min-w-0 px-3 py-2 bg-surface-900 border border-surface-700 rounded-lg text-sm text-white placeholder:text-gray-600 focus:outline-none focus:ring-2 focus:ring-brand-500 focus:border-transparent"
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
            </>
          )}
        </div>
      </div>
    </div>
  );
}
