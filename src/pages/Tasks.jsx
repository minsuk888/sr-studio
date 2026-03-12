import { useState } from 'react';
import { useApp } from '../context/AppContext';
import { aiService } from '../services/aiService';
import AiInsightCard from '../components/AiInsightCard';
import TaskListView from '../components/tasks/TaskListView';
import TaskModal from '../components/tasks/TaskModal';
import {
  Plus,
  Kanban,
  List,
  Pencil,
  Trash2,
  X,
  CircleCheckBig,
  Clock,
  ListTodo,
  Users,
  UserPlus,
  ChevronDown,
  ChevronUp,
} from 'lucide-react';

const statusConfig = {
  todo: { label: '할 일', color: 'bg-surface-700', headerColor: 'bg-surface-700', textColor: 'text-gray-400', icon: ListTodo },
  'in-progress': { label: '진행 중', color: 'bg-blue-500/10', headerColor: 'bg-blue-500/10', textColor: 'text-blue-400', icon: Clock },
  done: { label: '완료', color: 'bg-emerald-500/10', headerColor: 'bg-emerald-500/10', textColor: 'text-emerald-400', icon: CircleCheckBig },
};

const priorityConfig = {
  high: { label: '높음', className: 'bg-red-500/10 text-red-400' },
  medium: { label: '보통', className: 'bg-amber-500/10 text-amber-400' },
  low: { label: '낮음', className: 'bg-blue-500/10 text-blue-400' },
};

const MEMBER_COLORS = [
  '#3b82f6', '#10b981', '#f59e0b', '#8b5cf6', '#ec4899',
  '#06b6d4', '#f97316', '#6366f1', '#e11d48', '#14b8a6',
  '#84cc16', '#a855f7',
];

export default function Tasks() {
  const { tasks, members, addTask, updateTask, deleteTask, addMember, updateMember, deleteMember } = useApp();

  const [viewMode, setViewMode] = useState('kanban');
  const [modalOpen, setModalOpen] = useState(false);
  const [editingTask, setEditingTask] = useState(null);
  const [filterMember, setFilterMember] = useState(null);
  const [dragOverColumn, setDragOverColumn] = useState(null);

  // ---- member management state ----
  const [teamPanelOpen, setTeamPanelOpen] = useState(false);
  const [memberModalOpen, setMemberModalOpen] = useState(false);
  const [editingMember, setEditingMember] = useState(null);
  const [memberForm, setMemberForm] = useState({ name: '', role: '', avatar: '👤', email: '' });

  // ---- delete confirmation state ----
  const [confirmDelete, setConfirmDelete] = useState(null);

  // ---- AI insight state ----
  const [tasksAi, setTasksAi] = useState(null);
  const [tasksAiLoading, setTasksAiLoading] = useState(false);

  const handleTasksAi = async () => {
    setTasksAiLoading(true);
    try {
      const byStatus = { todo: 0, 'in-progress': 0, done: 0 };
      const byPriority = { high: 0, medium: 0, low: 0 };
      tasks.forEach((t) => { byStatus[t.status] = (byStatus[t.status] || 0) + 1; byPriority[t.priority] = (byPriority[t.priority] || 0) + 1; });
      const overdue = tasks.filter((t) => t.deadline && t.status !== 'done' && t.deadline < new Date().toISOString().split('T')[0]).length;
      const memberLoad = members.map((m) => {
        const mt = tasks.filter((t) => t.assignee === m.id);
        return `${m.name}(${m.role}): 전체 ${mt.length}건, 진행중 ${mt.filter((t) => t.status === 'in-progress').length}건, 완료 ${mt.filter((t) => t.status === 'done').length}건`;
      }).join('\n');
      const context = `전체 업무 ${tasks.length}건\n상태별: 할 일 ${byStatus.todo}, 진행중 ${byStatus['in-progress']}, 완료 ${byStatus.done}\n우선순위별: 높음 ${byPriority.high}, 보통 ${byPriority.medium}, 낮음 ${byPriority.low}\n마감 초과: ${overdue}건\n\n팀원별 업무:\n${memberLoad}`;
      const res = await aiService.analyze('tasks', context, '현재 업무 현황을 분석하고 워크로드 균형, 우선순위 조정, 병목 구간을 파악해주세요.');
      setTasksAi(res.insight);
    } catch (err) {
      setTasksAi(`AI 분석 실패: ${err.message}\n\n잠시 후 다시 시도해주세요.`);
    }
    setTasksAiLoading(false);
  };

  // ---------- helpers ----------
  const getMember = (id) => members.find((m) => m.id === id);
  const getMemberColor = (memberId) => {
    const idx = members.findIndex((m) => m.id === memberId);
    return MEMBER_COLORS[idx >= 0 ? idx % MEMBER_COLORS.length : 0];
  };

  const filteredTasks = filterMember
    ? tasks.filter((t) => t.assignee === filterMember)
    : tasks;

  const tasksByStatus = (status) => filteredTasks.filter((t) => t.status === status);

  // ---------- modal ----------
  const openAddModal = () => {
    setEditingTask(null);
    setModalOpen(true);
  };

  const openEditModal = (task) => {
    setEditingTask(task);
    setModalOpen(true);
  };

  const closeModal = () => {
    setModalOpen(false);
    setEditingTask(null);
  };

  const handleSave = (payload) => {
    if (editingTask) {
      updateTask(editingTask.id, payload);
    } else {
      addTask(payload);
    }
    closeModal();
  };

  // ---------- drag & drop (kanban) ----------
  const handleDragStart = (e, taskId) => {
    e.dataTransfer.setData('text/plain', String(taskId));
    e.dataTransfer.effectAllowed = 'move';
  };

  const handleDragOver = (e, status) => {
    e.preventDefault();
    e.dataTransfer.dropEffect = 'move';
    setDragOverColumn(status);
  };

  const handleDragLeave = () => setDragOverColumn(null);

  const handleDrop = (e, newStatus) => {
    e.preventDefault();
    setDragOverColumn(null);
    const taskId = Number(e.dataTransfer.getData('text/plain'));
    if (!taskId) return;
    const updates = { status: newStatus };
    if (newStatus === 'done') updates.progress = 100;
    updateTask(taskId, updates);
  };

  const handleDragEnd = () => setDragOverColumn(null);

  // ---------- kanban done column collapse ----------
  const [kanbanDoneExpanded, setKanbanDoneExpanded] = useState(false);

  // ---------- kanban sub-components ----------
  const PriorityBadge = ({ priority }) => {
    const cfg = priorityConfig[priority] || priorityConfig.medium;
    return (
      <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium ${cfg.className}`}>
        {cfg.label}
      </span>
    );
  };

  const TaskCard = ({ task }) => {
    const member = getMember(task.assignee);
    const memberColor = getMemberColor(task.assignee);
    const progressColor =
      task.progress >= 100 ? '#10b981' : task.progress >= 50 ? '#3b82f6' : task.progress > 0 ? '#f59e0b' : '#374151';
    return (
      <div
        draggable
        onDragStart={(e) => handleDragStart(e, task.id)}
        onDragEnd={handleDragEnd}
        className="group bg-surface-800 rounded-lg overflow-hidden cursor-grab active:cursor-grabbing hover:bg-surface-750 transition-colors border border-surface-700"
        style={{ borderLeftWidth: '3px', borderLeftColor: memberColor }}
      >
        <div className="px-3 py-2">
          <div className="flex items-center gap-1.5">
            <h4 className="text-[13px] font-medium text-white truncate flex-1">{task.title}</h4>
            <PriorityBadge priority={task.priority} />
            <div className="flex items-center gap-0.5 opacity-0 group-hover:opacity-100 transition-opacity shrink-0 ml-1">
              <button onClick={() => openEditModal(task)} className="p-1 rounded hover:bg-white/10 text-gray-500 hover:text-gray-200 transition-colors cursor-pointer">
                <Pencil className="w-3 h-3" />
              </button>
              <button onClick={() => handleDeleteTask(task)} className="p-1 rounded hover:bg-red-500/10 text-gray-500 hover:text-red-500 transition-colors cursor-pointer">
                <Trash2 className="w-3 h-3" />
              </button>
            </div>
          </div>
          <div className="flex items-center gap-2 mt-1 text-[11px] text-gray-500">
            {member && (
              <span className="flex items-center gap-1 font-medium" style={{ color: memberColor }}>
                <span className="text-xs leading-none">{member.avatar}</span>
                {member.name}
              </span>
            )}
            {task.deadline && (
              <>
                <span className="text-gray-600">·</span>
                <span>{task.deadline}</span>
              </>
            )}
            <span className="flex-1" />
            <div className="w-14 h-1 bg-surface-700 rounded-full overflow-hidden shrink-0">
              <div className="h-full rounded-full transition-all" style={{ width: `${task.progress}%`, backgroundColor: progressColor }} />
            </div>
            <span className="text-[10px] w-6 text-right shrink-0">{task.progress}%</span>
          </div>
        </div>
      </div>
    );
  };

  const KanbanColumn = ({ status }) => {
    const cfg = statusConfig[status];
    const Icon = cfg.icon;
    const columnTasks = tasksByStatus(status);
    const isDragOver = dragOverColumn === status;
    const isDone = status === 'done';
    const showCards = !isDone || kanbanDoneExpanded;

    return (
      <div
        onDragOver={(e) => handleDragOver(e, status)}
        onDragLeave={handleDragLeave}
        onDrop={(e) => handleDrop(e, status)}
        className={`flex-1 min-w-[260px] transition-colors ${isDragOver ? 'ring-2 ring-brand-400 rounded-xl' : ''}`}
      >
        <div className={`flex items-center gap-2 px-3 py-1.5 rounded-lg mb-2 ${cfg.headerColor}`}>
          <Icon className={`w-3.5 h-3.5 ${cfg.textColor}`} />
          <span className={`text-xs font-semibold ${cfg.textColor}`}>{cfg.label}</span>
          <span className={`ml-auto inline-flex items-center justify-center w-5 h-5 rounded-full text-[11px] font-bold ${cfg.color} ${cfg.textColor}`}>
            {columnTasks.length}
          </span>
        </div>
        {isDone && columnTasks.length > 0 ? (
          <div className="flex flex-col gap-1.5">
            {/* Collapsible toggle */}
            <button
              onClick={() => setKanbanDoneExpanded((prev) => !prev)}
              className="flex items-center gap-2 px-3 py-2 rounded-lg bg-surface-800 border border-surface-700 hover:bg-white/5 transition-all cursor-pointer"
            >
              <ChevronDown className={`w-4 h-4 text-gray-500 transition-transform duration-200 ${kanbanDoneExpanded ? 'rotate-0' : '-rotate-90'}`} />
              <span className="text-xs text-gray-400">완료된 업무</span>
              <span className="text-xs px-2 py-0.5 rounded-full bg-emerald-500/20 text-emerald-400">
                {columnTasks.length}건
              </span>
            </button>
            {showCards && columnTasks.map((task) => (
              <TaskCard key={task.id} task={task} />
            ))}
          </div>
        ) : (
          <div className="flex flex-col gap-1.5">
            {columnTasks.map((task) => (
              <TaskCard key={task.id} task={task} />
            ))}
            {columnTasks.length === 0 && (
              <div className="text-center text-xs text-gray-600 py-6">업무 없음</div>
            )}
          </div>
        )}
      </div>
    );
  };

  // ---------- member modal handlers ----------
  const avatarOptions = ['👤', '🧑‍💼', '👩‍💻', '🧑‍🎨', '🎬', '📊', '📰', '🧑‍🔬', '👨‍💻', '👩‍🎤', '🧑‍🚀', '🎯'];

  const openAddMemberModal = () => {
    setEditingMember(null);
    setMemberForm({ name: '', role: '', avatar: '👤', email: '' });
    setMemberModalOpen(true);
  };

  const openEditMemberModal = (member) => {
    setEditingMember(member);
    setMemberForm({ name: member.name, role: member.role, avatar: member.avatar, email: member.email || '' });
    setMemberModalOpen(true);
  };

  const closeMemberModal = () => {
    setMemberModalOpen(false);
    setEditingMember(null);
  };

  const handleSaveMember = () => {
    if (!memberForm.name.trim() || !memberForm.role.trim()) return;
    if (editingMember) {
      updateMember(editingMember.id, memberForm);
    } else {
      addMember(memberForm);
    }
    closeMemberModal();
  };

  const handleDeleteMember = (member) => {
    setConfirmDelete({ type: 'member', id: member.id, name: member.name });
  };

  const handleDeleteTask = (task) => {
    setConfirmDelete({ type: 'task', id: task.id, name: task.title });
  };

  const confirmDeleteAction = () => {
    if (!confirmDelete) return;
    if (confirmDelete.type === 'task') {
      deleteTask(confirmDelete.id);
    } else {
      if (filterMember === confirmDelete.id) setFilterMember(null);
      deleteMember(confirmDelete.id);
    }
    setConfirmDelete(null);
  };

  // ==================== RENDER ====================
  return (
    <div className="max-w-[1400px] mx-auto">
      {/* header */}
      <div className="flex items-center justify-between mb-6">
        <h2 className="text-2xl font-bold text-white">업무 관리</h2>
        <div className="flex items-center gap-3">
          <div className="flex items-center bg-surface-800 rounded-lg shadow-sm border border-surface-700 p-1">
            <button onClick={() => setViewMode('kanban')} className={`flex items-center gap-1.5 px-3 py-1.5 rounded-md text-xs font-medium transition-colors cursor-pointer ${viewMode === 'kanban' ? 'bg-brand-500 text-white' : 'text-gray-400 hover:text-gray-200'}`}>
              <Kanban className="w-3.5 h-3.5" /> 칸반
            </button>
            <button onClick={() => setViewMode('list')} className={`flex items-center gap-1.5 px-3 py-1.5 rounded-md text-xs font-medium transition-colors cursor-pointer ${viewMode === 'list' ? 'bg-brand-500 text-white' : 'text-gray-400 hover:text-gray-200'}`}>
              <List className="w-3.5 h-3.5" /> 리스트
            </button>
          </div>
          <button onClick={openAddModal} className="flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium text-white bg-brand-500 hover:bg-brand-600 transition-colors cursor-pointer shadow-sm">
            <Plus className="w-4 h-4" /> 새 업무
          </button>
        </div>
      </div>

      {/* team member filter row */}
      <div className="flex items-center gap-2 mb-4 overflow-x-auto pb-1">
        <button onClick={() => setFilterMember(null)} className={`flex items-center gap-2 px-3 py-2 rounded-lg text-xs font-medium whitespace-nowrap transition-colors cursor-pointer ${filterMember === null ? 'bg-brand-500 text-white shadow-sm' : 'bg-surface-800 text-gray-400 hover:bg-white/5 border border-surface-700'}`}>전체</button>
        {members.map((m) => (
          <button key={m.id} onClick={() => setFilterMember(filterMember === m.id ? null : m.id)} className={`flex items-center gap-2 px-3 py-2 rounded-lg text-xs font-medium whitespace-nowrap transition-colors cursor-pointer ${filterMember === m.id ? 'bg-brand-500 text-white shadow-sm' : 'bg-surface-800 text-gray-400 hover:bg-white/5 border border-surface-700'}`}>
            <span className="text-base leading-none">{m.avatar}</span> {m.name}
          </button>
        ))}
        <div className="ml-auto flex items-center gap-2">
          <button onClick={openAddMemberModal} className="flex items-center gap-1.5 px-3 py-2 rounded-lg text-xs font-medium text-gray-400 bg-surface-800 hover:bg-white/5 border border-surface-700 transition-colors cursor-pointer whitespace-nowrap">
            <UserPlus className="w-3.5 h-3.5" /> 팀원 추가
          </button>
          <button onClick={() => setTeamPanelOpen(!teamPanelOpen)} className="flex items-center gap-1.5 px-3 py-2 rounded-lg text-xs font-medium text-gray-400 bg-surface-800 hover:bg-white/5 border border-surface-700 transition-colors cursor-pointer whitespace-nowrap">
            <Users className="w-3.5 h-3.5" /> 팀원 관리
            {teamPanelOpen ? <ChevronUp className="w-3 h-3" /> : <ChevronDown className="w-3 h-3" />}
          </button>
        </div>
      </div>

      {/* team management panel */}
      {teamPanelOpen && (
        <div className="bg-surface-800 rounded-xl shadow-sm border border-surface-700 p-5 mb-6">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-2">
              <Users className="w-5 h-5 text-brand-500" />
              <h3 className="text-sm font-bold text-white">팀원 목록</h3>
              <span className="text-xs text-gray-500">{members.length}명</span>
            </div>
            <button onClick={openAddMemberModal} className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium text-white bg-brand-500 hover:bg-brand-600 transition-colors cursor-pointer">
              <UserPlus className="w-3.5 h-3.5" /> 새 팀원
            </button>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
            {members.map((m) => {
              const assignedTasks = tasks.filter((t) => t.assignee === m.id);
              const doneTasks = assignedTasks.filter((t) => t.status === 'done').length;
              return (
                <div key={m.id} className="group flex items-center gap-3 p-3 rounded-xl border border-surface-700 hover:border-surface-700 hover:shadow-sm transition-all">
                  <div className="w-10 h-10 rounded-xl bg-surface-700 flex items-center justify-center text-xl shrink-0">{m.avatar}</div>
                  <div className="flex-1 min-w-0">
                    <div className="text-sm font-semibold text-white truncate">{m.name}</div>
                    <div className="text-xs text-gray-500 truncate">{m.role}</div>
                    <div className="text-[10px] text-gray-500 mt-0.5">업무 {assignedTasks.length}건 · 완료 {doneTasks}건</div>
                  </div>
                  <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity shrink-0">
                    <button onClick={() => openEditMemberModal(m)} className="p-1.5 rounded-lg hover:bg-white/5 text-gray-500 hover:text-gray-200 transition-colors cursor-pointer">
                      <Pencil className="w-3.5 h-3.5" />
                    </button>
                    <button onClick={() => handleDeleteMember(m)} className="p-1.5 rounded-lg hover:bg-red-500/10 text-gray-500 hover:text-red-500 transition-colors cursor-pointer">
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* AI 인사이트 */}
      <div className="mb-4">
        <AiInsightCard
          title="AI 업무 분석"
          insight={tasksAi}
          loading={tasksAiLoading}
          onGenerate={handleTasksAi}
        />
      </div>

      {/* board / list */}
      {viewMode === 'kanban' ? (
        <div className="flex gap-3 overflow-x-auto pb-4">
          <KanbanColumn status="todo" />
          <KanbanColumn status="in-progress" />
          <KanbanColumn status="done" />
        </div>
      ) : (
        <TaskListView
          filteredTasks={filteredTasks}
          members={members}
          getMemberColor={getMemberColor}
          openEditModal={openEditModal}
          handleDeleteTask={handleDeleteTask}
          updateTask={updateTask}
          addTask={addTask}
          filterMember={filterMember}
        />
      )}

      {/* Task Modal */}
      <TaskModal
        isOpen={modalOpen}
        editingTask={editingTask}
        members={members}
        onSave={handleSave}
        onClose={closeModal}
      />

      {/* ===== Member Modal (inline) ===== */}
      {memberModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center">
          <div className="absolute inset-0 bg-black/40" onClick={closeMemberModal} />
          <div className="relative bg-surface-800 rounded-2xl shadow-xl w-full max-w-md mx-4 p-6 z-10">
            <div className="flex items-center justify-between mb-6">
              <h3 className="text-lg font-bold text-white">{editingMember ? '팀원 수정' : '새 팀원 등록'}</h3>
              <button onClick={closeMemberModal} className="p-1 rounded-lg hover:bg-white/5 text-gray-500 hover:text-gray-200 transition-colors cursor-pointer">
                <X className="w-5 h-5" />
              </button>
            </div>
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-300 mb-2">프로필 아이콘</label>
                <div className="flex flex-wrap gap-2">
                  {avatarOptions.map((av) => (
                    <button key={av} type="button" onClick={() => setMemberForm({ ...memberForm, avatar: av })} className={`w-10 h-10 rounded-xl text-xl flex items-center justify-center transition-all cursor-pointer ${memberForm.avatar === av ? 'bg-brand-500/10 ring-2 ring-brand-500 scale-110' : 'bg-surface-700 hover:bg-white/10'}`}>{av}</button>
                  ))}
                </div>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-300 mb-1">이름</label>
                <input type="text" value={memberForm.name} onChange={(e) => setMemberForm({ ...memberForm, name: e.target.value })} placeholder="팀원 이름" className="w-full px-3 py-2 rounded-lg border border-surface-700 text-sm text-white bg-surface-700 focus:outline-none focus:ring-2 focus:ring-brand-500/30 focus:border-brand-500 transition" />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-300 mb-1">직책 / 역할</label>
                <input type="text" value={memberForm.role} onChange={(e) => setMemberForm({ ...memberForm, role: e.target.value })} placeholder="예: SNS 매니저" className="w-full px-3 py-2 rounded-lg border border-surface-700 text-sm text-white bg-surface-700 focus:outline-none focus:ring-2 focus:ring-brand-500/30 focus:border-brand-500 transition" />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-300 mb-1">이메일</label>
                <input type="email" value={memberForm.email} onChange={(e) => setMemberForm({ ...memberForm, email: e.target.value })} placeholder="email@sr-studio.co.kr" className="w-full px-3 py-2 rounded-lg border border-surface-700 text-sm text-white bg-surface-700 focus:outline-none focus:ring-2 focus:ring-brand-500/30 focus:border-brand-500 transition" />
              </div>
            </div>
            <div className="flex items-center justify-end gap-3 mt-6 pt-4 border-t border-surface-700">
              <button onClick={closeMemberModal} className="px-4 py-2 rounded-lg text-sm font-medium text-gray-400 hover:bg-white/5 transition-colors cursor-pointer">취소</button>
              <button onClick={handleSaveMember} disabled={!memberForm.name.trim() || !memberForm.role.trim()} className="px-5 py-2 rounded-lg text-sm font-medium text-white bg-brand-500 hover:bg-brand-600 disabled:opacity-40 disabled:cursor-not-allowed transition-colors cursor-pointer">{editingMember ? '수정' : '등록'}</button>
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
            <h3 className="text-lg font-bold text-white mb-2">
              {confirmDelete.type === 'task' ? '업무 삭제' : '팀원 삭제'}
            </h3>
            <p className="text-sm text-gray-400 mb-1">
              <span className="font-semibold text-gray-300">"{confirmDelete.name}"</span>
            </p>
            <p className="text-sm text-gray-400 mb-6">
              {confirmDelete.type === 'task'
                ? '이 업무를 삭제하시겠습니까? 이 작업은 되돌릴 수 없습니다.'
                : '이 팀원을 삭제하시겠습니까? 배정된 업무의 담당자가 해제됩니다.'}
            </p>
            <div className="flex items-center justify-center gap-3">
              <button onClick={() => setConfirmDelete(null)} className="px-5 py-2.5 rounded-lg text-sm font-medium text-gray-400 bg-surface-700 hover:bg-white/10 transition-colors cursor-pointer">
                취소
              </button>
              <button onClick={confirmDeleteAction} className="px-5 py-2.5 rounded-lg text-sm font-medium text-white bg-red-500 hover:bg-red-600 transition-colors cursor-pointer">
                삭제
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
