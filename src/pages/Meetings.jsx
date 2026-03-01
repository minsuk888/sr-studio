import { useState, useEffect, useMemo } from 'react';
import {
  FileText,
  Plus,
  X,
  Loader,
  Calendar,
  Clock,
  MapPin,
  Users,
  ListOrdered,
  Sparkles,
  CheckCircle2,
  Circle,
  Trash2,
  ChevronRight,
  Save,
  ArrowRight,
  Presentation,
} from 'lucide-react';
import { meetingsService } from '../services/meetingsService';
import { useApp } from '../context/AppContext';
import MeetingLiveView from '../components/MeetingLiveView';

const STATUS_CONFIG = {
  scheduled: { label: '예정', color: 'text-blue-600', bg: 'bg-blue-50', dot: 'bg-blue-400' },
  in_progress: { label: '진행 중', color: 'text-yellow-600', bg: 'bg-yellow-50', dot: 'bg-yellow-400' },
  completed: { label: '완료', color: 'text-green-600', bg: 'bg-green-50', dot: 'bg-green-400' },
};

function renderInsightText(text) {
  return text
    .split('\n')
    .map((line) => {
      if (line.startsWith('### ')) return `<h3 class="text-sm font-bold text-slate-800 mt-4 mb-2">${line.slice(4)}</h3>`;
      if (line.startsWith('## ')) return `<h3 class="text-sm font-bold text-slate-800 mt-4 mb-2">${line.slice(3)}</h3>`;
      if (line.startsWith('- ')) {
        const content = line.slice(2).replace(/\*\*(.*?)\*\*/g, '<strong class="text-slate-700">$1</strong>');
        return `<li class="text-sm text-slate-600 leading-relaxed ml-4 mb-1 list-disc">${content}</li>`;
      }
      if (line.trim() === '') return '<div class="h-1"></div>';
      const content = line.replace(/\*\*(.*?)\*\*/g, '<strong class="text-slate-700">$1</strong>');
      return `<p class="text-sm text-slate-600 leading-relaxed mb-1">${content}</p>`;
    })
    .join('');
}

export default function Meetings() {
  const { members, addTask } = useApp();
  const [meetings, setMeetings] = useState([]);
  const [loaded, setLoaded] = useState(false);
  const [selectedId, setSelectedId] = useState(null);

  // 새 회의 모달
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [createForm, setCreateForm] = useState({
    title: '', date: '', start_time: '', end_time: '', location: '', status: 'scheduled',
  });
  const [creating, setCreating] = useState(false);

  // 안건/회의록/액션아이템 편집
  const [newAgendaTitle, setNewAgendaTitle] = useState('');
  const [minutesContent, setMinutesContent] = useState('');
  const [minutesSaving, setMinutesSaving] = useState(false);
  const [newActionTitle, setNewActionTitle] = useState('');
  const [newActionAssignee, setNewActionAssignee] = useState('');

  // 참석자 선택
  const [selectedAttendees, setSelectedAttendees] = useState([]);

  // AI 요약
  const [aiSummary, setAiSummary] = useState('');
  const [aiLoading, setAiLoading] = useState(false);

  // 라이브 모드
  const [isLiveMode, setIsLiveMode] = useState(false);

  // 로드
  useEffect(() => {
    (async () => {
      try {
        const data = await meetingsService.getAll();
        setMeetings(data || []);
      } catch (err) {
        console.error('회의 목록 로드 실패:', err);
      } finally {
        setLoaded(true);
      }
    })();
  }, []);

  // 선택된 회의
  const selected = useMemo(() => {
    if (!selectedId) return null;
    return meetings.find((m) => m.id === selectedId) || null;
  }, [meetings, selectedId]);

  // 회의 선택 시 상태 초기화
  useEffect(() => {
    if (selected) {
      const mins = selected.meeting_minutes?.[0];
      setMinutesContent(mins?.content || '');
      setAiSummary(mins?.ai_summary || '');
      setSelectedAttendees((selected.meeting_attendees || []).map((a) => a.member_id));
    }
  }, [selected]);

  // 회의 생성
  const handleCreate = async () => {
    if (!createForm.title.trim() || !createForm.date) return;
    setCreating(true);
    try {
      const created = await meetingsService.create(createForm);
      const full = await meetingsService.getById(created.id);
      setMeetings((prev) => [full, ...prev]);
      setSelectedId(full.id);
      setShowCreateModal(false);
      setCreateForm({ title: '', date: '', start_time: '', end_time: '', location: '', status: 'scheduled' });
    } catch (err) {
      alert('회의 생성 실패: ' + err.message);
    } finally {
      setCreating(false);
    }
  };

  // 회의 삭제
  const handleDeleteMeeting = async (id) => {
    if (!confirm('이 회의를 삭제하시겠습니까?')) return;
    try {
      await meetingsService.delete(id);
      setMeetings((prev) => prev.filter((m) => m.id !== id));
      if (selectedId === id) setSelectedId(null);
    } catch (err) {
      alert('삭제 실패: ' + err.message);
    }
  };

  // 참석자 토글
  const toggleAttendee = async (memberId) => {
    if (!selected) return;
    const next = selectedAttendees.includes(memberId)
      ? selectedAttendees.filter((id) => id !== memberId)
      : [...selectedAttendees, memberId];
    setSelectedAttendees(next);
    try {
      await meetingsService.setAttendees(selected.id, next);
    } catch (err) {
      console.error('참석자 저장 실패:', err);
    }
  };

  // 안건 추가
  const handleAddAgenda = async () => {
    if (!selected || !newAgendaTitle.trim()) return;
    try {
      const agenda = await meetingsService.addAgenda(selected.id, {
        title: newAgendaTitle.trim(),
        sort_order: (selected.meeting_agendas || []).length,
      });
      setMeetings((prev) =>
        prev.map((m) =>
          m.id === selected.id
            ? { ...m, meeting_agendas: [...(m.meeting_agendas || []), agenda] }
            : m,
        ),
      );
      setNewAgendaTitle('');
    } catch (err) {
      alert('안건 추가 실패: ' + err.message);
    }
  };

  // 안건 삭제
  const handleRemoveAgenda = async (agendaId) => {
    try {
      await meetingsService.removeAgenda(agendaId);
      setMeetings((prev) =>
        prev.map((m) =>
          m.id === selected.id
            ? { ...m, meeting_agendas: (m.meeting_agendas || []).filter((a) => a.id !== agendaId) }
            : m,
        ),
      );
    } catch (err) {
      alert('안건 삭제 실패: ' + err.message);
    }
  };

  // 안건 업데이트 (라이브 모드)
  const handleUpdateAgenda = async (agendaId, updates) => {
    try {
      await meetingsService.updateAgenda(agendaId, updates);
      setMeetings((prev) =>
        prev.map((m) =>
          m.id === selected?.id
            ? {
                ...m,
                meeting_agendas: (m.meeting_agendas || []).map((a) =>
                  a.id === agendaId ? { ...a, ...updates } : a
                ),
              }
            : m
        )
      );
    } catch (err) {
      console.error('안건 업데이트 실패:', err);
    }
  };

  // 라이브 모드 진입
  const handleEnterLiveMode = async () => {
    if (!selected || (selected.meeting_agendas || []).length === 0) {
      alert('회의에 안건을 추가한 후 라이브 모드를 시작하세요.');
      return;
    }
    if (selected.status === 'scheduled') {
      await handleStatusChange('in_progress');
    }
    setIsLiveMode(true);
  };

  // 라이브 모드 종료
  const handleExitLiveMode = () => {
    setIsLiveMode(false);
  };

  // 회의 완료 (라이브 모드에서)
  const handleCompleteMeeting = async () => {
    if (!selected) return;
    // 안건별 노트를 회의록으로 합치기
    const agendas = (selected.meeting_agendas || []).sort((a, b) => a.sort_order - b.sort_order);
    const compiledMinutes = agendas
      .filter((a) => a.notes)
      .map((a, i) => `## ${i + 1}. ${a.title}\n${a.notes}`)
      .join('\n\n');
    if (compiledMinutes) {
      try {
        await meetingsService.saveMinutes(selected.id, compiledMinutes);
        setMinutesContent(compiledMinutes);
        setMeetings((prev) =>
          prev.map((m) =>
            m.id === selected.id
              ? { ...m, meeting_minutes: [{ ...(m.meeting_minutes?.[0] || {}), meeting_id: selected.id, content: compiledMinutes }] }
              : m
          )
        );
      } catch (err) {
        console.error('회의록 저장 실패:', err);
      }
    }
    await handleStatusChange('completed');
    setIsLiveMode(false);
  };

  // 라이브 모드 액션 아이템 추가
  const handleLiveAddAction = async (item) => {
    if (!selected) return;
    try {
      const created = await meetingsService.addActionItem(selected.id, item);
      setMeetings((prev) =>
        prev.map((m) =>
          m.id === selected.id
            ? { ...m, meeting_action_items: [...(m.meeting_action_items || []), created] }
            : m
        )
      );
    } catch (err) {
      console.error('액션 아이템 추가 실패:', err);
    }
  };

  // 회의록 저장
  const handleSaveMinutes = async () => {
    if (!selected) return;
    setMinutesSaving(true);
    try {
      await meetingsService.saveMinutes(selected.id, minutesContent);
      setMeetings((prev) =>
        prev.map((m) =>
          m.id === selected.id
            ? { ...m, meeting_minutes: [{ ...(m.meeting_minutes?.[0] || {}), meeting_id: selected.id, content: minutesContent }] }
            : m,
        ),
      );
    } catch (err) {
      alert('회의록 저장 실패: ' + err.message);
    } finally {
      setMinutesSaving(false);
    }
  };

  // 액션 아이템 추가
  const handleAddAction = async () => {
    if (!selected || !newActionTitle.trim()) return;
    try {
      const item = await meetingsService.addActionItem(selected.id, {
        title: newActionTitle.trim(),
        assignee: newActionAssignee || null,
      });
      setMeetings((prev) =>
        prev.map((m) =>
          m.id === selected.id
            ? { ...m, meeting_action_items: [...(m.meeting_action_items || []), item] }
            : m,
        ),
      );
      setNewActionTitle('');
      setNewActionAssignee('');
    } catch (err) {
      alert('액션 아이템 추가 실패: ' + err.message);
    }
  };

  // 액션 아이템 토글
  const handleToggleAction = async (actionId, currentStatus) => {
    const newStatus = currentStatus === 'done' ? 'pending' : 'done';
    try {
      await meetingsService.updateActionItem(actionId, { status: newStatus });
      setMeetings((prev) =>
        prev.map((m) =>
          m.id === selected.id
            ? {
                ...m,
                meeting_action_items: (m.meeting_action_items || []).map((a) =>
                  a.id === actionId ? { ...a, status: newStatus } : a,
                ),
              }
            : m,
        ),
      );
    } catch (err) {
      console.error('상태 변경 실패:', err);
    }
  };

  // 액션 → 업무 변환
  const handleConvertToTask = async (action) => {
    try {
      const task = await addTask({
        title: action.title,
        assignee: action.assignee || null,
        status: 'todo',
        priority: 'medium',
        progress: 0,
        deadline: action.due_date || null,
        memo: `회의에서 생성: ${selected?.title || ''}`,
      });
      await meetingsService.updateActionItem(action.id, { task_id: task.id, status: 'done' });
      setMeetings((prev) =>
        prev.map((m) =>
          m.id === selected.id
            ? {
                ...m,
                meeting_action_items: (m.meeting_action_items || []).map((a) =>
                  a.id === action.id ? { ...a, task_id: task.id, status: 'done' } : a,
                ),
              }
            : m,
        ),
      );
      alert('업무로 변환되었습니다.');
    } catch (err) {
      alert('업무 변환 실패: ' + err.message);
    }
  };

  // AI 요약 생성
  const handleAiSummary = async () => {
    if (!selected) return;
    setAiLoading(true);
    setAiSummary('');
    try {
      const attendeeNames = selectedAttendees
        .map((id) => members.find((m) => m.id === id))
        .filter(Boolean)
        .map((m) => m.name);
      const data = await meetingsService.generateSummary({
        title: selected.title,
        date: `${selected.date} ${selected.start_time || ''}`,
        agendas: selected.meeting_agendas || [],
        minutes: minutesContent,
        attendees: attendeeNames,
      });
      setAiSummary(data.summary || '요약을 생성하지 못했습니다.');
      await meetingsService.saveAiSummary(selected.id, data.summary);
    } catch (err) {
      setAiSummary('AI 요약 실패: ' + err.message);
    } finally {
      setAiLoading(false);
    }
  };

  // 상태 변경
  const handleStatusChange = async (newStatus) => {
    if (!selected) return;
    try {
      const updated = await meetingsService.update(selected.id, { status: newStatus });
      setMeetings((prev) => prev.map((m) => (m.id === selected.id ? { ...m, ...updated } : m)));
    } catch (err) {
      console.error('상태 변경 실패:', err);
    }
  };

  if (!loaded) {
    return (
      <div className="flex items-center justify-center h-64 text-slate-400">
        <Loader className="w-6 h-6 animate-spin mr-2" />
        데이터를 불러오는 중...
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">회의록</h1>
          <p className="text-sm text-gray-500 mt-1">회의 일정, 아젠다, 회의록을 관리합니다</p>
        </div>
        <button
          onClick={() => setShowCreateModal(true)}
          className="flex items-center gap-1.5 px-4 py-2 bg-red-500 text-white text-sm font-medium rounded-lg hover:bg-red-600 transition-colors shadow-sm"
        >
          <Plus size={15} />
          새 회의
        </button>
      </div>

      {/* 메인 레이아웃: 목록 + 상세 */}
      <div className="flex gap-4" style={{ minHeight: 'calc(100vh - 220px)' }}>
        {/* 좌측: 회의 목록 */}
        <div className="w-80 shrink-0 space-y-2">
          {meetings.length === 0 ? (
            <div className="bg-white rounded-xl shadow-sm p-8 text-center">
              <FileText size={40} className="text-gray-300 mx-auto mb-3" />
              <p className="text-sm text-gray-400">회의를 추가해보세요</p>
            </div>
          ) : (
            meetings.map((m) => {
              const stCfg = STATUS_CONFIG[m.status] || STATUS_CONFIG.scheduled;
              const isSelected = selectedId === m.id;
              const agendaCount = (m.meeting_agendas || []).length;
              const attendeeCount = (m.meeting_attendees || []).length;

              return (
                <button
                  key={m.id}
                  onClick={() => setSelectedId(m.id)}
                  className={`w-full text-left p-3.5 rounded-xl transition-all border ${
                    isSelected
                      ? 'bg-red-50 border-red-200 shadow-sm'
                      : 'bg-white border-gray-100 hover:border-gray-200 hover:shadow-sm'
                  }`}
                >
                  <div className="flex items-center justify-between mb-1.5">
                    <h3 className={`text-sm font-semibold truncate ${isSelected ? 'text-red-700' : 'text-gray-800'}`}>
                      {m.title}
                    </h3>
                    <div className={`w-2 h-2 rounded-full shrink-0 ${stCfg.dot}`} />
                  </div>
                  <div className="flex items-center gap-2 text-[11px] text-gray-400">
                    <span className="flex items-center gap-0.5">
                      <Calendar size={10} />
                      {m.date}
                    </span>
                    {m.start_time && (
                      <span className="flex items-center gap-0.5">
                        <Clock size={10} />
                        {m.start_time?.slice(0, 5)}
                      </span>
                    )}
                    <span>참석 {attendeeCount}명</span>
                    <span>안건 {agendaCount}건</span>
                  </div>
                </button>
              );
            })
          )}
        </div>

        {/* 우측: 상세 */}
        <div className="flex-1 min-w-0">
          {!selected ? (
            <div className="bg-white rounded-xl shadow-sm p-12 text-center h-full flex flex-col items-center justify-center">
              <FileText size={48} className="text-gray-200 mb-4" />
              <p className="text-sm text-gray-400">좌측에서 회의를 선택하거나 새 회의를 추가하세요</p>
            </div>
          ) : isLiveMode ? (
            <MeetingLiveView
              meeting={selected}
              members={members}
              agendas={(selected.meeting_agendas || []).sort((a, b) => a.sort_order - b.sort_order)}
              actionItems={selected.meeting_action_items || []}
              onUpdateAgenda={handleUpdateAgenda}
              onAddActionItem={handleLiveAddAction}
              onExitLiveMode={handleExitLiveMode}
              onCompleteMeeting={handleCompleteMeeting}
            />
          ) : (
            <div className="space-y-4">
              {/* 회의 기본 정보 */}
              <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-5">
                <div className="flex items-start justify-between mb-4">
                  <div>
                    <h2 className="text-lg font-bold text-gray-900">{selected.title}</h2>
                    <div className="flex items-center gap-3 mt-1.5 text-xs text-gray-500">
                      <span className="flex items-center gap-1"><Calendar size={12} />{selected.date}</span>
                      {selected.start_time && (
                        <span className="flex items-center gap-1">
                          <Clock size={12} />{selected.start_time?.slice(0, 5)}{selected.end_time ? ` ~ ${selected.end_time?.slice(0, 5)}` : ''}
                        </span>
                      )}
                      {selected.location && (
                        <span className="flex items-center gap-1"><MapPin size={12} />{selected.location}</span>
                      )}
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <select
                      value={selected.status}
                      onChange={(e) => handleStatusChange(e.target.value)}
                      className={`text-xs font-medium px-2.5 py-1 rounded-full border-0 ${STATUS_CONFIG[selected.status]?.bg} ${STATUS_CONFIG[selected.status]?.color}`}
                    >
                      {Object.entries(STATUS_CONFIG).map(([key, cfg]) => (
                        <option key={key} value={key}>{cfg.label}</option>
                      ))}
                    </select>
                    {(selected.status === 'scheduled' || selected.status === 'in_progress') && (
                      <button
                        onClick={handleEnterLiveMode}
                        className="flex items-center gap-1.5 px-3 py-1.5 bg-brand-500 text-white text-xs font-medium rounded-lg hover:bg-brand-600 transition-colors"
                      >
                        <Presentation size={14} />
                        {selected.status === 'scheduled' ? '회의 시작' : '라이브 모드'}
                      </button>
                    )}
                    <button
                      onClick={() => handleDeleteMeeting(selected.id)}
                      className="p-1.5 rounded-lg hover:bg-red-50 text-gray-400 hover:text-red-500 transition-colors"
                    >
                      <Trash2 size={14} />
                    </button>
                  </div>
                </div>

                {/* 참석자 */}
                <div>
                  <h3 className="text-xs font-semibold text-gray-500 mb-2 flex items-center gap-1">
                    <Users size={12} /> 참석자
                  </h3>
                  <div className="flex flex-wrap gap-1.5">
                    {members.map((m) => {
                      const isAttendee = selectedAttendees.includes(m.id);
                      return (
                        <button
                          key={m.id}
                          onClick={() => toggleAttendee(m.id)}
                          className={`px-2.5 py-1 text-xs rounded-full transition-colors border ${
                            isAttendee
                              ? 'bg-red-50 border-red-200 text-red-600 font-medium'
                              : 'bg-gray-50 border-gray-200 text-gray-400 hover:bg-gray-100'
                          }`}
                        >
                          {m.avatar} {m.name}
                        </button>
                      );
                    })}
                  </div>
                </div>
              </div>

              {/* 안건 */}
              <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-5">
                <h3 className="text-sm font-semibold text-gray-700 mb-3 flex items-center gap-1.5">
                  <ListOrdered size={15} className="text-indigo-500" />
                  안건
                </h3>
                <div className="space-y-1.5 mb-3">
                  {(selected.meeting_agendas || [])
                    .sort((a, b) => a.sort_order - b.sort_order)
                    .map((agenda, idx) => (
                      <div key={agenda.id} className="flex items-center gap-2 group">
                        <span className="text-xs font-medium text-gray-400 w-5">{idx + 1}.</span>
                        <span className="text-sm text-gray-700 flex-1">{agenda.title}</span>
                        <button
                          onClick={() => handleRemoveAgenda(agenda.id)}
                          className="opacity-0 group-hover:opacity-100 p-1 rounded hover:bg-red-50 text-gray-300 hover:text-red-500 transition-all"
                        >
                          <X size={12} />
                        </button>
                      </div>
                    ))}
                </div>
                <div className="flex items-center gap-2">
                  <input
                    type="text"
                    value={newAgendaTitle}
                    onChange={(e) => setNewAgendaTitle(e.target.value)}
                    onKeyDown={(e) => e.key === 'Enter' && handleAddAgenda()}
                    placeholder="안건 추가..."
                    className="flex-1 px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
                  />
                  <button
                    onClick={handleAddAgenda}
                    disabled={!newAgendaTitle.trim()}
                    className="px-3 py-2 bg-indigo-500 text-white text-sm rounded-lg hover:bg-indigo-600 transition-colors disabled:opacity-50"
                  >
                    <Plus size={15} />
                  </button>
                </div>
              </div>

              {/* 회의록 */}
              <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-5">
                <div className="flex items-center justify-between mb-3">
                  <h3 className="text-sm font-semibold text-gray-700 flex items-center gap-1.5">
                    <FileText size={15} className="text-emerald-500" />
                    회의록
                  </h3>
                  <button
                    onClick={handleSaveMinutes}
                    disabled={minutesSaving}
                    className="flex items-center gap-1 px-3 py-1.5 bg-emerald-500 text-white text-xs rounded-lg hover:bg-emerald-600 transition-colors disabled:opacity-50"
                  >
                    <Save size={12} />
                    {minutesSaving ? '저장 중...' : '저장'}
                  </button>
                </div>
                <textarea
                  value={minutesContent}
                  onChange={(e) => setMinutesContent(e.target.value)}
                  placeholder="회의 내용을 기록하세요..."
                  rows={8}
                  className="w-full px-3 py-2.5 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:border-transparent resize-y"
                />
              </div>

              {/* AI 요약 */}
              <div className="bg-gradient-to-br from-indigo-50 via-white to-purple-50 rounded-xl shadow-sm border border-indigo-100">
                <div className="flex items-center justify-between p-4">
                  <div className="flex items-center gap-2">
                    <Sparkles size={16} className="text-purple-500" />
                    <span className="text-sm font-semibold text-gray-700">AI 회의 요약</span>
                  </div>
                  <button
                    onClick={handleAiSummary}
                    disabled={aiLoading || (!minutesContent && (selected.meeting_agendas || []).length === 0)}
                    className="flex items-center gap-1.5 px-3 py-1.5 bg-gradient-to-r from-purple-500 to-indigo-500 text-white text-xs font-medium rounded-lg hover:from-purple-600 hover:to-indigo-600 transition-all disabled:opacity-50 shadow-sm"
                  >
                    <Sparkles size={13} className={aiLoading ? 'animate-spin' : ''} />
                    {aiLoading ? '요약 중...' : aiSummary ? '다시 요약' : 'AI 요약 생성'}
                  </button>
                </div>
                {aiLoading && (
                  <div className="flex items-center gap-2 pb-6 justify-center text-sm text-indigo-600">
                    <Loader className="w-5 h-5 animate-spin" />
                    회의록을 분석하고 있습니다...
                  </div>
                )}
                {!aiLoading && aiSummary && (
                  <div className="px-4 pb-4">
                    <div
                      className="prose-sm max-w-none"
                      dangerouslySetInnerHTML={{ __html: renderInsightText(aiSummary) }}
                    />
                  </div>
                )}
              </div>

              {/* 액션 아이템 */}
              <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-5">
                <h3 className="text-sm font-semibold text-gray-700 mb-3 flex items-center gap-1.5">
                  <CheckCircle2 size={15} className="text-orange-500" />
                  액션 아이템
                </h3>
                <div className="space-y-2 mb-3">
                  {(selected.meeting_action_items || []).map((action) => {
                    const assignee = members.find((m) => m.id === action.assignee);
                    const isDone = action.status === 'done';
                    return (
                      <div key={action.id} className="flex items-center gap-2 group">
                        <button
                          onClick={() => handleToggleAction(action.id, action.status)}
                          className={`shrink-0 ${isDone ? 'text-green-500' : 'text-gray-300 hover:text-gray-500'}`}
                        >
                          {isDone ? <CheckCircle2 size={16} /> : <Circle size={16} />}
                        </button>
                        <span className={`text-sm flex-1 ${isDone ? 'line-through text-gray-400' : 'text-gray-700'}`}>
                          {action.title}
                        </span>
                        {assignee && (
                          <span className="text-[10px] text-gray-400">{assignee.avatar} {assignee.name}</span>
                        )}
                        {!action.task_id && !isDone && (
                          <button
                            onClick={() => handleConvertToTask(action)}
                            className="opacity-0 group-hover:opacity-100 flex items-center gap-0.5 px-2 py-0.5 text-[10px] bg-blue-50 text-blue-600 rounded-full hover:bg-blue-100 transition-all"
                          >
                            <ArrowRight size={10} />
                            업무로 변환
                          </button>
                        )}
                        {action.task_id && (
                          <span className="text-[10px] px-2 py-0.5 bg-green-50 text-green-600 rounded-full">업무 연결됨</span>
                        )}
                      </div>
                    );
                  })}
                </div>
                <div className="flex items-center gap-2">
                  <input
                    type="text"
                    value={newActionTitle}
                    onChange={(e) => setNewActionTitle(e.target.value)}
                    onKeyDown={(e) => e.key === 'Enter' && handleAddAction()}
                    placeholder="액션 아이템 추가..."
                    className="flex-1 px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-orange-500 focus:border-transparent"
                  />
                  <select
                    value={newActionAssignee}
                    onChange={(e) => setNewActionAssignee(e.target.value)}
                    className="px-2 py-2 border border-gray-200 rounded-lg text-xs focus:outline-none focus:ring-2 focus:ring-orange-500 focus:border-transparent"
                  >
                    <option value="">담당자</option>
                    {members.map((m) => (
                      <option key={m.id} value={m.id}>{m.name}</option>
                    ))}
                  </select>
                  <button
                    onClick={handleAddAction}
                    disabled={!newActionTitle.trim()}
                    className="px-3 py-2 bg-orange-500 text-white text-sm rounded-lg hover:bg-orange-600 transition-colors disabled:opacity-50"
                  >
                    <Plus size={15} />
                  </button>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* 새 회의 모달 */}
      {showCreateModal && (
        <div
          className="fixed inset-0 bg-black/40 backdrop-blur-sm flex items-center justify-center z-50 p-4"
          onClick={() => setShowCreateModal(false)}
        >
          <div
            className="bg-white rounded-2xl shadow-2xl w-full max-w-md"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="p-6">
              <div className="flex items-center justify-between mb-5">
                <h2 className="text-lg font-bold text-gray-900">새 회의</h2>
                <button onClick={() => setShowCreateModal(false)} className="p-1 rounded-full hover:bg-gray-100 text-gray-400">
                  <X size={20} />
                </button>
              </div>

              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">회의 제목</label>
                  <input
                    type="text"
                    value={createForm.title}
                    onChange={(e) => setCreateForm({ ...createForm, title: e.target.value })}
                    placeholder="예: 마케팅 주간 회의"
                    className="w-full px-3 py-2.5 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-red-500"
                  />
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">날짜</label>
                    <input
                      type="date"
                      value={createForm.date}
                      onChange={(e) => setCreateForm({ ...createForm, date: e.target.value })}
                      className="w-full px-3 py-2.5 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-red-500"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">장소</label>
                    <input
                      type="text"
                      value={createForm.location}
                      onChange={(e) => setCreateForm({ ...createForm, location: e.target.value })}
                      placeholder="회의실 A"
                      className="w-full px-3 py-2.5 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-red-500"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">시작 시간</label>
                    <input
                      type="time"
                      value={createForm.start_time}
                      onChange={(e) => setCreateForm({ ...createForm, start_time: e.target.value })}
                      className="w-full px-3 py-2.5 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-red-500"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">종료 시간</label>
                    <input
                      type="time"
                      value={createForm.end_time}
                      onChange={(e) => setCreateForm({ ...createForm, end_time: e.target.value })}
                      className="w-full px-3 py-2.5 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-red-500"
                    />
                  </div>
                </div>

                <button
                  onClick={handleCreate}
                  disabled={creating || !createForm.title.trim() || !createForm.date}
                  className="w-full flex items-center justify-center gap-2 py-2.5 bg-red-500 text-white text-sm font-medium rounded-lg hover:bg-red-600 transition-colors disabled:opacity-50"
                >
                  {creating ? (
                    <><Loader size={15} className="animate-spin" /> 생성 중...</>
                  ) : (
                    '회의 생성'
                  )}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
