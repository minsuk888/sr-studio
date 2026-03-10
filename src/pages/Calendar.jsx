import { useState, useRef, useEffect } from 'react';
import { useApp } from '../context/AppContext';
import { aiService } from '../services/aiService';
import AiInsightCard from '../components/AiInsightCard';
import {
  format,
  startOfMonth,
  endOfMonth,
  startOfWeek,
  endOfWeek,
  subMonths,
  addMonths,
  subWeeks,
  addWeeks,
  isSameMonth,
  isToday,
  isBefore,
  startOfDay,
  eachDayOfInterval,
} from 'date-fns';
import {
  ChevronLeft,
  ChevronRight,
  Plus,
  X,
  Clock,
  CalendarDays,
  Pencil,
  Trash2,
  Users,
  CalendarCheck,
  Palmtree,
  Briefcase,
  AlertCircle,
  GraduationCap,
  Search,
  Cake,
  Sun,
  MoreHorizontal,
  Car,
} from 'lucide-react';

const DAY_NAMES = ['일', '월', '화', '수', '목', '금', '토'];

const EVENT_TYPES = [
  { value: 'meeting',  label: '미팅',    icon: Users,          color: '#6366f1' },
  { value: 'event',    label: '이벤트',  icon: CalendarCheck,  color: '#8b5cf6' },
  { value: 'leave',    label: '연차',    icon: Palmtree,       color: '#10b981' },
  { value: 'business', label: '출장',    icon: Car,            color: '#f59e0b' },
  { value: 'deadline', label: '마감일',  icon: AlertCircle,    color: '#ef4444' },
  { value: 'workshop', label: '워크숍',  icon: GraduationCap,  color: '#06b6d4' },
  { value: 'review',   label: '리뷰',    icon: Search,         color: '#ec4899' },
  { value: 'birthday', label: '생일',    icon: Cake,           color: '#f97316' },
  { value: 'holiday',  label: '공휴일',  icon: Sun,            color: '#22c55e' },
  { value: 'other',    label: '기타',    icon: MoreHorizontal, color: '#64748b' },
];

const getEventType = (typeValue) => EVENT_TYPES.find((t) => t.value === typeValue) || EVENT_TYPES[9];

const PRESET_COLORS = EVENT_TYPES.map((t) => ({ name: t.value, value: t.color }));

const PRIORITY_TEXT_COLORS = {
  high: 'text-red-400 bg-red-500/10',
  medium: 'text-amber-400 bg-amber-500/10',
  low: 'text-blue-400 bg-blue-500/10',
};

function getItemsForDay(day, tasks, calendarEvents) {
  const dateStr = format(day, 'yyyy-MM-dd');

  const dayTasks = tasks
    .filter((t) => t.deadline === dateStr)
    .map((t) => ({
      id: `task-${t.id}`,
      title: t.title,
      type: 'task',
      priority: t.priority,
      color: null,
    }));

  const dayEvents = calendarEvents
    .filter((e) => {
      const start = e.date;
      const end = e.end_date || e.date;
      return dateStr >= start && dateStr <= end;
    })
    .map((e) => {
      const evType = getEventType(e.type);
      return {
        id: e.id,
        title: e.title,
        type: e.type,
        priority: null,
        color: e.color || evType.color,
        rawEvent: e,
        rawDescription: e.description,
      };
    });

  return [...dayEvents, ...dayTasks];
}

export default function Calendar() {
  const { tasks, members, calendarEvents, addCalendarEvent, updateCalendarEvent, deleteCalendarEvent } = useApp();

  const [currentDate, setCurrentDate] = useState(new Date());
  const [viewMode, setViewMode] = useState('month');

  // modal state — shared for add / edit
  const [showModal, setShowModal] = useState(false);
  const [editingEvent, setEditingEvent] = useState(null); // null = add mode
  const [eventForm, setEventForm] = useState({ title: '', date: '', end_date: '', type: 'meeting', color: '#6366f1', description: '' });

  // delete confirmation
  const [confirmDelete, setConfirmDelete] = useState(null); // { id, name }

  // AI insight
  const [calendarAi, setCalendarAi] = useState(null);
  const [calendarAiLoading, setCalendarAiLoading] = useState(false);

  const handleCalendarAi = async () => {
    setCalendarAiLoading(true);
    try {
      const today = format(new Date(), 'yyyy-MM-dd');
      const upcoming = calendarEvents.filter((e) => e.date >= today).sort((a, b) => a.date.localeCompare(b.date)).slice(0, 15);
      const deadlines = tasks.filter((t) => t.deadline && t.deadline >= today && t.status !== 'done').sort((a, b) => a.deadline.localeCompare(b.deadline)).slice(0, 10);
      const context = `오늘: ${today}\n\n예정된 일정 (${upcoming.length}건):\n${upcoming.map((e) => `- ${e.date} ${e.title} (${e.type})`).join('\n') || '없음'}\n\n다가오는 업무 마감 (${deadlines.length}건):\n${deadlines.map((t) => `- ${t.deadline} ${t.title} (${t.priority}, ${t.status})`).join('\n') || '없음'}`;
      const res = await aiService.analyze('calendar', context, '일정 충돌, 여유 기간, 바쁜 주간을 분석하고 일정 최적화를 제안해주세요.');
      setCalendarAi(res.insight);
    } catch { /* ignore */ }
    setCalendarAiLoading(false);
  };

  // Navigation
  const goToPrev = () => setCurrentDate((d) => (viewMode === 'month' ? subMonths(d, 1) : subWeeks(d, 1)));
  const goToNext = () => setCurrentDate((d) => (viewMode === 'month' ? addMonths(d, 1) : addWeeks(d, 1)));
  const goToToday = () => setCurrentDate(new Date());

  // Month view
  const monthStart = startOfMonth(currentDate);
  const monthEnd = endOfMonth(currentDate);
  const calendarStart = startOfWeek(monthStart, { weekStartsOn: 0 });
  const calendarEnd = endOfWeek(monthEnd, { weekStartsOn: 0 });
  const monthDays = eachDayOfInterval({ start: calendarStart, end: calendarEnd });

  // Week view
  const weekStart = startOfWeek(currentDate, { weekStartsOn: 0 });
  const weekEnd = endOfWeek(currentDate, { weekStartsOn: 0 });
  const weekDays = eachDayOfInterval({ start: weekStart, end: weekEnd });

  const headerText =
    viewMode === 'month'
      ? format(currentDate, 'yyyy년 M월')
      : `${format(weekStart, 'yyyy년 M월 d일')} — ${format(weekEnd, 'M월 d일')}`;

  // --- modal helpers ---
  const openAddModal = (date) => {
    const dateStr = date ? format(date, 'yyyy-MM-dd') : format(new Date(), 'yyyy-MM-dd');
    setEditingEvent(null);
    setEventForm({ title: '', date: dateStr, end_date: dateStr, type: 'meeting', color: '#6366f1', description: '' });
    setShowModal(true);
  };

  const openEditModal = (event) => {
    setEditingEvent(event);
    const evType = getEventType(event.type);
    setEventForm({ title: event.title, date: event.date, end_date: event.end_date || event.date, type: event.type, color: event.color || evType.color, description: event.description || '' });
    setShowModal(true);
  };

  const closeModal = () => {
    setShowModal(false);
    setEditingEvent(null);
  };

  const handleSaveEvent = () => {
    if (!eventForm.title.trim() || !eventForm.date) return;
    const endDate = eventForm.end_date && eventForm.end_date >= eventForm.date ? eventForm.end_date : eventForm.date;
    const payload = { title: eventForm.title.trim(), date: eventForm.date, end_date: endDate, type: eventForm.type, color: eventForm.color, description: eventForm.description.trim() || null };
    if (editingEvent) {
      updateCalendarEvent(editingEvent.id, payload);
    } else {
      addCalendarEvent(payload);
    }
    closeModal();
  };

  const handleTypeChange = (typeValue) => {
    const evType = getEventType(typeValue);
    setEventForm({ ...eventForm, type: typeValue, color: evType.color });
  };

  // --- delete helpers ---
  const requestDelete = (id, name) => {
    setConfirmDelete({ id, name });
  };

  const confirmDeleteAction = () => {
    if (!confirmDelete) return;
    deleteCalendarEvent(confirmDelete.id);
    setConfirmDelete(null);
  };

  const getMemberName = (assigneeId) => {
    const member = members.find((m) => m.id === assigneeId);
    return member ? member.name : '';
  };

  // --- month view item click ---
  const handleMonthItemClick = (e, item) => {
    e.stopPropagation();
    if (item.type === 'task') return; // tasks are edited on the Tasks page
    const raw = calendarEvents.find((ev) => ev.id === item.id);
    if (raw) openEditModal(raw);
  };

  const renderMonthItem = (item, isPast) => {
    if (item.type === 'task') {
      return (
        <div
          key={item.id}
          className={`text-[10px] leading-tight px-1.5 py-0.5 rounded truncate border-l-2 border-dashed flex items-center gap-0.5 ${PRIORITY_TEXT_COLORS[item.priority] || 'text-gray-400 bg-surface-700'} ${isPast ? 'opacity-50' : ''}`}
          title={item.title}
        >
          <CalendarDays className="w-2.5 h-2.5 shrink-0" />
          {item.title}
        </div>
      );
    }
    const EvIcon = getEventType(item.type).icon;
    return (
      <div
        key={item.id}
        onClick={(e) => handleMonthItemClick(e, item)}
        className={`text-[10px] leading-tight px-1.5 py-0.5 rounded truncate text-white hover:opacity-80 transition-opacity flex items-center gap-0.5 ${isPast ? 'opacity-50' : ''}`}
        style={{ backgroundColor: item.color || '#6366f1' }}
        title={`${item.title} (클릭하여 수정)`}
      >
        <EvIcon className="w-2.5 h-2.5 shrink-0" />
        {item.title}
      </div>
    );
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-white">캘린더</h1>
          <p className="text-sm text-gray-400 mt-1">일정과 업무 마감일을 한눈에 관리하세요</p>
        </div>
        <button
          onClick={() => openAddModal(null)}
          className="flex items-center gap-2 px-4 py-2.5 bg-brand-500 text-white rounded-lg hover:bg-brand-600 transition-colors text-sm font-medium cursor-pointer"
        >
          <Plus className="w-4 h-4" /> 이벤트 추가
        </button>
      </div>

      {/* Controls bar */}
      <div className="flex items-center justify-between bg-surface-800 rounded-xl shadow-sm px-5 py-3">
        <div className="flex items-center gap-3">
          <div className="flex bg-surface-700 rounded-lg p-0.5">
            <button onClick={() => setViewMode('month')} className={`px-3 py-1.5 text-xs font-medium rounded-md transition-colors cursor-pointer ${viewMode === 'month' ? 'bg-surface-800 text-white shadow-sm' : 'text-gray-400 hover:text-gray-200'}`}>월간</button>
            <button onClick={() => setViewMode('week')} className={`px-3 py-1.5 text-xs font-medium rounded-md transition-colors cursor-pointer ${viewMode === 'week' ? 'bg-surface-800 text-white shadow-sm' : 'text-gray-400 hover:text-gray-200'}`}>주간</button>
          </div>
          <button onClick={goToToday} className="px-3 py-1.5 text-xs font-medium text-brand-500 border border-brand-500/30 rounded-lg hover:bg-brand-500/10 transition-colors cursor-pointer">오늘</button>
        </div>
        <div className="flex items-center gap-4">
          <button onClick={goToPrev} className="p-1.5 rounded-lg hover:bg-white/5 transition-colors cursor-pointer"><ChevronLeft className="w-5 h-5 text-gray-400" /></button>
          <h2 className="text-lg font-bold text-white min-w-[200px] text-center">{headerText}</h2>
          <button onClick={goToNext} className="p-1.5 rounded-lg hover:bg-white/5 transition-colors cursor-pointer"><ChevronRight className="w-5 h-5 text-gray-400" /></button>
        </div>
        <div className="w-[140px]" />
      </div>

      {/* AI 인사이트 */}
      <AiInsightCard
        title="AI 일정 분석"
        insight={calendarAi}
        loading={calendarAiLoading}
        onGenerate={handleCalendarAi}
      />

      {/* Calendar Grid */}
      {viewMode === 'month' ? (
        <MonthView monthDays={monthDays} currentDate={currentDate} tasks={tasks} calendarEvents={calendarEvents} openAddModal={openAddModal} renderMonthItem={renderMonthItem} handleMonthItemClick={handleMonthItemClick} />
      ) : (
        <WeekView weekDays={weekDays} tasks={tasks} calendarEvents={calendarEvents} members={members} getMemberName={getMemberName} openAddModal={openAddModal} openEditModal={openEditModal} requestDelete={requestDelete} />
      )}

      {/* ===== Event Modal (Add / Edit) - inline ===== */}
      {showModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center">
          <div className="absolute inset-0 bg-black/40 backdrop-blur-sm" onClick={closeModal} />
          <div className="relative bg-surface-800 rounded-2xl shadow-2xl w-full max-w-md mx-4 p-6">
            <div className="flex items-center justify-between mb-6">
              <h3 className="text-lg font-bold text-white">{editingEvent ? '이벤트 수정' : '새 이벤트 추가'}</h3>
              <button onClick={closeModal} className="p-1.5 rounded-lg hover:bg-white/5 transition-colors cursor-pointer"><X className="w-5 h-5 text-gray-500" /></button>
            </div>
            <style>{`
              input[type="date"]::-webkit-calendar-picker-indicator {
                filter: invert(1);
                cursor: pointer;
              }
            `}</style>
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-300 mb-1.5">제목</label>
                <input type="text" value={eventForm.title} onChange={(e) => setEventForm({ ...eventForm, title: e.target.value })} placeholder="이벤트 제목을 입력하세요" className="w-full px-3 py-2.5 border border-surface-700 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-brand-500/30 focus:border-brand-500 transition-colors bg-surface-900 text-white" />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-sm font-medium text-gray-300 mb-1.5">시작일</label>
                  <input type="date" value={eventForm.date} onChange={(e) => setEventForm({ ...eventForm, date: e.target.value, end_date: eventForm.end_date < e.target.value ? e.target.value : eventForm.end_date })} className="w-full px-3 py-2.5 border border-surface-700 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-brand-500/30 focus:border-brand-500 transition-colors bg-surface-900 text-white" />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-300 mb-1.5">마감일</label>
                  <input type="date" value={eventForm.end_date} min={eventForm.date} onChange={(e) => setEventForm({ ...eventForm, end_date: e.target.value })} className="w-full px-3 py-2.5 border border-surface-700 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-brand-500/30 focus:border-brand-500 transition-colors bg-surface-900 text-white" />
                </div>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-300 mb-1.5">유형</label>
                <div className="grid grid-cols-5 gap-1.5">
                  {EVENT_TYPES.map((t) => {
                    const Icon = t.icon;
                    const isSelected = eventForm.type === t.value;
                    return (
                      <button
                        key={t.value}
                        type="button"
                        onClick={() => handleTypeChange(t.value)}
                        className={`flex flex-col items-center gap-1 py-2 px-1 rounded-lg text-[11px] font-medium transition-all cursor-pointer border ${
                          isSelected
                            ? 'border-white/30 text-white scale-105 shadow-lg'
                            : 'border-transparent text-gray-400 hover:bg-white/5 hover:text-gray-200'
                        }`}
                        style={isSelected ? { backgroundColor: `${t.color}25`, borderColor: `${t.color}60` } : {}}
                      >
                        <Icon className="w-4 h-4" style={isSelected ? { color: t.color } : {}} />
                        {t.label}
                      </button>
                    );
                  })}
                </div>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-300 mb-1.5">메모</label>
                <textarea
                  value={eventForm.description}
                  onChange={(e) => setEventForm({ ...eventForm, description: e.target.value })}
                  placeholder="일정 메모를 입력하세요 (선택사항)"
                  rows={3}
                  className="w-full px-3 py-2.5 border border-surface-700 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-brand-500/30 focus:border-brand-500 transition-colors resize-y bg-surface-900 text-white"
                />
              </div>
            </div>
            <div className="flex items-center justify-between mt-6 pt-4 border-t border-surface-700">
              <div>
                {editingEvent && (
                  <button
                    onClick={() => { closeModal(); requestDelete(editingEvent.id, editingEvent.title); }}
                    className="flex items-center gap-1.5 px-3 py-2 text-sm font-medium text-red-500 hover:bg-red-500/10 rounded-lg transition-colors cursor-pointer"
                  >
                    <Trash2 className="w-4 h-4" /> 삭제
                  </button>
                )}
              </div>
              <div className="flex items-center gap-2">
                <button onClick={closeModal} className="px-4 py-2 text-sm font-medium text-gray-400 hover:bg-white/5 rounded-lg transition-colors cursor-pointer">취소</button>
                <button onClick={handleSaveEvent} disabled={!eventForm.title.trim() || !eventForm.date} className="px-4 py-2 text-sm font-medium text-white bg-brand-500 rounded-lg hover:bg-brand-600 transition-colors disabled:opacity-40 disabled:cursor-not-allowed cursor-pointer">{editingEvent ? '수정' : '저장'}</button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ===== Delete Confirmation Dialog ===== */}
      {confirmDelete && (
        <div className="fixed inset-0 z-[60] flex items-center justify-center">
          <div className="absolute inset-0 bg-black/40" onClick={() => setConfirmDelete(null)} />
          <div className="relative bg-surface-800 rounded-2xl shadow-xl w-full max-w-sm mx-4 p-6 z-10 text-center">
            <div className="w-14 h-14 rounded-full bg-red-500/10 flex items-center justify-center mx-auto mb-4">
              <Trash2 className="w-7 h-7 text-red-500" />
            </div>
            <h3 className="text-lg font-bold text-white mb-2">일정 삭제</h3>
            <p className="text-sm text-gray-400 mb-1">
              <span className="font-semibold text-gray-300">"{confirmDelete.name}"</span>
            </p>
            <p className="text-sm text-gray-400 mb-6">이 일정을 삭제하시겠습니까? 이 작업은 되돌릴 수 없습니다.</p>
            <div className="flex items-center justify-center gap-3">
              <button onClick={() => setConfirmDelete(null)} className="px-5 py-2.5 rounded-lg text-sm font-medium text-gray-400 bg-surface-700 hover:bg-white/10 transition-colors cursor-pointer">취소</button>
              <button onClick={confirmDeleteAction} className="px-5 py-2.5 rounded-lg text-sm font-medium text-white bg-red-500 hover:bg-red-600 transition-colors cursor-pointer">삭제</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

// ========== MONTH VIEW ==========
function MonthView({ monthDays, currentDate, tasks, calendarEvents, openAddModal, renderMonthItem, handleMonthItemClick }) {
  const [popoverDay, setPopoverDay] = useState(null);
  const [popoverPosition, setPopoverPosition] = useState({ x: 0, y: 0 });
  const popoverRef = useRef(null);
  const todayStart = startOfDay(new Date());

  // Outside click detection for popover
  useEffect(() => {
    if (!popoverDay) return;
    const handleClickOutside = (e) => {
      if (popoverRef.current && !popoverRef.current.contains(e.target)) {
        setPopoverDay(null);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [popoverDay]);

  const openPopover = (e, day) => {
    e.stopPropagation();
    const rect = e.currentTarget.getBoundingClientRect();
    setPopoverPosition({ x: rect.left, y: rect.bottom + 4 });
    setPopoverDay(day);
  };

  return (
    <div className="bg-surface-800 rounded-xl shadow-sm overflow-hidden relative">
      <div className="grid grid-cols-7 border-b border-surface-700">
        {DAY_NAMES.map((name, i) => (
          <div key={name} className={`py-3 text-center text-xs font-semibold ${i === 0 ? 'text-red-400' : i === 6 ? 'text-blue-400' : 'text-gray-400'}`}>{name}</div>
        ))}
      </div>
      <div className="grid grid-cols-7">
        {monthDays.map((day, idx) => {
          const inMonth = isSameMonth(day, currentDate);
          const today = isToday(day);
          const isPast = isBefore(day, todayStart) && !today;
          const items = getItemsForDay(day, tasks, calendarEvents);
          const visibleItems = items.slice(0, 3);
          const moreCount = items.length - 3;
          const dayOfWeek = day.getDay();

          return (
            <div
              key={idx}
              className={`group relative min-h-[100px] border border-surface-700 p-1.5 cursor-pointer transition-colors hover:bg-white/5 ${!inMonth ? 'bg-surface-700/50' : ''} ${today ? 'bg-brand-500/[0.05]' : ''}`}
            >
              {/* Hover "+" button */}
              <button
                onClick={(e) => { e.stopPropagation(); openAddModal(day); }}
                className="absolute top-1 right-1 w-5 h-5 rounded-full bg-surface-600 hover:bg-brand-500 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity cursor-pointer z-10"
              >
                <Plus className="w-3 h-3 text-white" />
              </button>

              <div className="flex justify-center mb-1">
                <span className={`inline-flex items-center justify-center w-7 h-7 text-xs font-medium rounded-full ${
                  today ? 'bg-brand-500 text-white font-bold' : !inMonth ? 'text-gray-400' : dayOfWeek === 0 ? 'text-red-400' : dayOfWeek === 6 ? 'text-blue-400' : 'text-gray-300'
                }`}>{format(day, 'd')}</span>
              </div>
              <div className="space-y-0.5">
                {visibleItems.map((item) => renderMonthItem(item, isPast))}
                {moreCount > 0 && (
                  <button
                    onClick={(e) => openPopover(e, day)}
                    className="text-[10px] text-gray-500 px-1.5 hover:text-brand-400 transition-colors cursor-pointer"
                  >
                    +{moreCount} more
                  </button>
                )}
              </div>
            </div>
          );
        })}
      </div>

      {/* "+N more" Popover */}
      {popoverDay && (
        <div
          ref={popoverRef}
          className="fixed z-50 bg-surface-800 border border-surface-600 rounded-xl shadow-2xl p-3 min-w-[200px] max-w-[280px]"
          style={{ left: popoverPosition.x, top: popoverPosition.y }}
        >
          <div className="text-xs font-semibold text-white mb-2">
            {format(popoverDay, 'M월 d일')} ({DAY_NAMES[popoverDay.getDay()]})
          </div>
          <div className="space-y-1 max-h-[240px] overflow-y-auto">
            {getItemsForDay(popoverDay, tasks, calendarEvents).map((item) => {
              const evType = getEventType(item.type);
              const EvIcon = item.type === 'task' ? CalendarDays : evType.icon;
              return (
                <div
                  key={item.id}
                  onClick={(e) => { handleMonthItemClick(e, item); setPopoverDay(null); }}
                  className="flex items-center gap-2 px-2 py-1.5 rounded-lg hover:bg-white/5 transition-colors cursor-pointer text-xs"
                >
                  <span className="w-2 h-2 rounded-full shrink-0" style={{ backgroundColor: item.color || evType.color || '#64748b' }} />
                  <EvIcon className="w-3 h-3 shrink-0 text-gray-400" />
                  <span className="text-gray-200 truncate">{item.title}</span>
                </div>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}

// ========== WEEK VIEW ==========
function WeekView({ weekDays, tasks, calendarEvents, members, getMemberName, openAddModal, openEditModal, requestDelete }) {
  const [currentMinute, setCurrentMinute] = useState(() => new Date());
  const todayStart = startOfDay(new Date());
  const COLUMN_HEIGHT = 420;

  // Update current time every minute
  useEffect(() => {
    const interval = setInterval(() => setCurrentMinute(new Date()), 60000);
    return () => clearInterval(interval);
  }, []);

  const timeLineTop = ((currentMinute.getHours() * 60 + currentMinute.getMinutes()) / (24 * 60)) * COLUMN_HEIGHT;

  return (
    <div className="bg-surface-800 rounded-xl shadow-sm overflow-hidden">
      <div className="grid grid-cols-7 divide-x divide-surface-700">
        {weekDays.map((day, idx) => {
          const today = isToday(day);
          const isPast = isBefore(day, todayStart) && !today;
          const items = getItemsForDay(day, tasks, calendarEvents);
          const dayOfWeek = day.getDay();

          return (
            <div key={idx} className="min-h-[420px] flex flex-col">
              <div className={`sticky top-0 px-3 py-3 border-b border-surface-700 text-center ${today ? 'bg-brand-500/10' : 'bg-surface-700/80'}`}>
                <div className={`text-[10px] font-semibold uppercase tracking-wider mb-1 ${dayOfWeek === 0 ? 'text-red-400' : dayOfWeek === 6 ? 'text-blue-400' : 'text-gray-500'}`}>{DAY_NAMES[dayOfWeek]}</div>
                <div className={`inline-flex items-center justify-center w-8 h-8 text-sm font-bold rounded-full ${today ? 'bg-brand-500 text-white' : 'text-gray-300'}`}>{format(day, 'd')}</div>
              </div>
              <div className="flex-1 p-2 space-y-2 relative">
                {/* Current time line - only on today */}
                {today && (
                  <div className="absolute left-0 right-0 z-10 flex items-center pointer-events-none" style={{ top: `${timeLineTop}px` }}>
                    <div className="w-2 h-2 rounded-full bg-red-500 shrink-0 -ml-1" />
                    <div className="flex-1 border-t-2 border-red-500" />
                  </div>
                )}

                {items.length === 0 && (
                  <div onClick={() => openAddModal(day)} className="h-full flex items-center justify-center cursor-pointer group">
                    <Plus className="w-5 h-5 text-gray-400 group-hover:text-gray-500 transition-colors" />
                  </div>
                )}
                {items.map((item) => (
                  <WeekViewItem key={item.id} item={item} isPast={isPast} tasks={tasks} calendarEvents={calendarEvents} getMemberName={getMemberName} openEditModal={openEditModal} requestDelete={requestDelete} />
                ))}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

// ========== WEEK VIEW ITEM ==========
function WeekViewItem({ item, isPast, tasks, calendarEvents, getMemberName, openEditModal, requestDelete }) {
  if (item.type === 'task') {
    const taskData = tasks.find((t) => `task-${t.id}` === item.id);
    return (
      <div
        className={`p-2 rounded-lg border-l-[3px] border-dashed text-xs ${isPast ? 'opacity-50' : ''} ${PRIORITY_TEXT_COLORS[item.priority] || 'text-gray-400 bg-surface-700'}`}
        style={{ borderLeftColor: item.priority === 'high' ? '#ef4444' : item.priority === 'medium' ? '#f59e0b' : '#3b82f6' }}
      >
        <div className="flex items-start gap-1 mb-1">
          <CalendarDays className="w-3 h-3 mt-0.5 shrink-0 opacity-60" />
          <span className="font-medium leading-tight">{item.title}</span>
        </div>
        {taskData && (
          <div className="text-[10px] opacity-70 mt-1">
            {getMemberName(taskData.assignee)} &middot; {taskData.status === 'done' ? '완료' : `${taskData.progress}%`}
          </div>
        )}
      </div>
    );
  }

  const raw = calendarEvents.find((ev) => ev.id === item.id);
  const timeStr = null; // calendar events store date only, no time data

  return (
    <div className={`p-2 rounded-lg text-xs text-white relative group ${isPast ? 'opacity-50' : ''}`} style={{ backgroundColor: item.color || '#6366f1' }}>
      <div className="flex items-start gap-1">
        <Clock className="w-3 h-3 mt-0.5 shrink-0 opacity-80" />
        <span className="font-medium leading-tight">{item.title}</span>
      </div>
      <div className="text-[10px] opacity-80 mt-1 flex items-center gap-1">
        {timeStr && <span>{timeStr}</span>}
        <span>{getEventType(item.type).label}</span>
      </div>
      {item.rawDescription && (
        <div className="text-[9px] opacity-70 mt-0.5 line-clamp-2">{item.rawDescription}</div>
      )}
      <div className="absolute top-1 right-1 flex items-center gap-0.5 opacity-0 group-hover:opacity-100 transition-opacity">
        <button
          onClick={(e) => { e.stopPropagation(); if (raw) openEditModal(raw); }}
          className="p-0.5 rounded-full bg-black/20 hover:bg-black/30 cursor-pointer"
        >
          <Pencil className="w-3 h-3 text-white" />
        </button>
        <button
          onClick={(e) => { e.stopPropagation(); requestDelete(item.id, item.title); }}
          className="p-0.5 rounded-full bg-black/20 hover:bg-black/30 cursor-pointer"
        >
          <X className="w-3 h-3 text-white" />
        </button>
      </div>
    </div>
  );
}
