import { useState } from 'react';
import {
  Pencil,
  Trash2,
  ChevronDown,
  ChevronUp,
  CircleCheckBig,
  Settings,
  ListTodo,
  Plus,
} from 'lucide-react';

const statusOrder = ['in-progress', 'todo', 'done'];

const statusLabels = {
  'in-progress': { label: '진행 중', icon: Settings, textColor: 'text-blue-400', bgColor: 'bg-blue-500/10', borderColor: 'border-blue-500/20', badgeBg: 'bg-blue-500/15', iconAnimate: 'animate-spin-slow' },
  todo: { label: '할 일', icon: ListTodo, textColor: 'text-amber-400', bgColor: 'bg-amber-500/10', borderColor: 'border-amber-500/20', badgeBg: 'bg-amber-500/15', iconAnimate: '' },
  done: { label: '완료', icon: CircleCheckBig, textColor: 'text-emerald-400', bgColor: 'bg-emerald-500/10', borderColor: 'border-emerald-500/20', badgeBg: 'bg-emerald-500/15', iconAnimate: '' },
};

const nextStatus = { todo: 'in-progress', 'in-progress': 'done', done: 'todo' };

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

export default function TaskListView({
  filteredTasks,
  members,
  getMemberColor,
  openEditModal,
  handleDeleteTask,
  updateTask,
  addTask,
  filterMember,
}) {
  const [expandedGroups, setExpandedGroups] = useState(new Set());
  const [quickAddTitle, setQuickAddTitle] = useState('');
  const [quickAddAssignee, setQuickAddAssignee] = useState('');
  const [quickAddDeadline, setQuickAddDeadline] = useState('');

  // ---- grouping ----
  const getGroupedTasks = () => {
    const groups = new Map();
    filteredTasks.forEach((task) => {
      const key = task.assignee || 'unassigned';
      if (!groups.has(key)) groups.set(key, []);
      groups.get(key).push(task);
    });

    const sorted = [];
    members.forEach((m) => {
      if (groups.has(m.id)) sorted.push({ id: m.id, member: m, tasks: groups.get(m.id) });
    });
    if (groups.has('unassigned')) {
      sorted.push({ id: 'unassigned', member: null, tasks: groups.get('unassigned') });
    }
    return sorted;
  };

  const toggleGroup = (groupId) => {
    setExpandedGroups((prev) => {
      const next = new Set(prev);
      if (next.has(groupId)) next.delete(groupId);
      else next.add(groupId);
      return next;
    });
  };

  // ---- Phase 4a: status cycling ----
  const cycleStatus = (task) => {
    const newStatus = nextStatus[task.status] || 'todo';
    const updates = { status: newStatus };
    if (newStatus === 'done') updates.progress = 100;
    else if (newStatus === 'todo') updates.progress = 0;
    else if (newStatus === 'in-progress' && task.progress === 0) updates.progress = 10;
    updateTask(task.id, updates);
  };

  // ---- Phase 4b: progress bar click → snap to 25% ----
  const handleProgressClick = (e, task) => {
    const rect = e.currentTarget.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const pct = Math.round((x / rect.width) * 4) * 25;
    const clamped = Math.max(0, Math.min(100, pct));
    const updates = { progress: clamped };
    if (clamped >= 100) updates.status = 'done';
    else if (clamped === 0) updates.status = 'todo';
    else updates.status = 'in-progress';
    updateTask(task.id, updates);
  };

  // ---- Phase 5: Quick Add ----
  const getDeadlinePreset = (preset) => {
    const d = new Date();
    if (preset === 'today') return d.toISOString().split('T')[0];
    if (preset === 'tomorrow') {
      d.setDate(d.getDate() + 1);
      return d.toISOString().split('T')[0];
    }
    if (preset === 'this-week') {
      const day = d.getDay();
      const diff = day === 0 ? -2 : 5 - day;
      d.setDate(d.getDate() + diff);
      return d.toISOString().split('T')[0];
    }
    if (preset === 'next-week') {
      const day = d.getDay();
      const diff = day === 0 ? 5 : 12 - day;
      d.setDate(d.getDate() + diff);
      return d.toISOString().split('T')[0];
    }
    return '';
  };

  const handleQuickAdd = () => {
    if (!quickAddTitle.trim()) return;
    addTask({
      title: quickAddTitle.trim(),
      assignee: quickAddAssignee ? Number(quickAddAssignee) : (filterMember || members[0]?.id),
      priority: 'medium',
      status: 'todo',
      progress: 0,
      deadline: quickAddDeadline,
      memo: '',
    });
    setQuickAddTitle('');
    setQuickAddDeadline('');
  };

  const groups = getGroupedTasks();

  // ---- sub-components ----
  const StatusBadge = ({ status, onClick }) => {
    const cfg = statusLabels[status] || statusLabels.todo;
    return (
      <button
        onClick={onClick}
        title="클릭하여 상태 변경"
        className={`inline-flex items-center px-2 py-0.5 rounded-full text-[11px] font-medium transition-colors cursor-pointer hover:ring-1 hover:ring-white/20 ${cfg.textColor} ${cfg.badgeBg}`}
      >
        {cfg.label}
      </button>
    );
  };

  const PriorityBadge = ({ priority }) => {
    const cfg = priorityConfig[priority] || priorityConfig.medium;
    return (
      <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-[11px] font-medium ${cfg.className}`}>
        {cfg.label}
      </span>
    );
  };

  const ProgressBarClickable = ({ task }) => {
    const value = task.progress || 0;
    const color =
      value >= 100 ? 'bg-emerald-500' : value >= 50 ? 'bg-blue-500' : value > 0 ? 'bg-amber-500' : 'bg-gray-600';
    return (
      <div className="flex items-center gap-2 w-24 shrink-0">
        <div
          className="flex-1 h-2 bg-surface-700 rounded-full overflow-hidden cursor-pointer hover:h-3 transition-all group/bar"
          title="클릭하여 진행률 설정"
          onClick={(e) => handleProgressClick(e, task)}
        >
          <div className={`h-full rounded-full transition-all ${color}`} style={{ width: `${value}%` }} />
        </div>
        <span className="text-[11px] text-gray-400 w-7 text-right">{value}%</span>
      </div>
    );
  };

  const TaskRow = ({ task, memberColor }) => (
    <div
      className={`group flex items-center gap-3 px-4 py-2.5 border-b border-surface-700/50 last:border-b-0 hover:bg-white/[0.03] transition-colors ${
        task.status === 'done' ? 'opacity-50' : ''
      }`}
      style={{ borderLeftWidth: '3px', borderLeftColor: memberColor }}
    >
      <div className="flex-1 min-w-0">
        <span className={`text-sm font-medium truncate block ${task.status === 'done' ? 'line-through text-gray-500' : 'text-white'}`}>
          {task.title}
        </span>
        {task.memo && <span className="text-[11px] text-gray-600 truncate block">{task.memo}</span>}
      </div>
      <StatusBadge status={task.status} onClick={() => cycleStatus(task)} />
      <PriorityBadge priority={task.priority} />
      <ProgressBarClickable task={task} />
      <span className="text-xs text-gray-500 w-20 shrink-0 text-right">{task.deadline || '-'}</span>
      <div className="flex items-center gap-0.5 opacity-0 group-hover:opacity-100 transition-opacity shrink-0">
        <button
          onClick={() => openEditModal(task)}
          className="p-1 rounded-md hover:bg-white/5 text-gray-500 hover:text-gray-200 transition-colors cursor-pointer"
        >
          <Pencil className="w-3.5 h-3.5" />
        </button>
        <button
          onClick={() => handleDeleteTask(task)}
          className="p-1 rounded-md hover:bg-red-500/10 text-gray-500 hover:text-red-500 transition-colors cursor-pointer"
        >
          <Trash2 className="w-3.5 h-3.5" />
        </button>
      </div>
    </div>
  );

  // ---- render ----
  return (
    <div className="space-y-3">
      {/* Quick Add bar */}
      <div className="flex items-center gap-2 bg-surface-800 rounded-xl border border-surface-700 px-4 py-2.5">
        <Plus className="w-4 h-4 text-gray-500 shrink-0" />
        <input
          type="text"
          value={quickAddTitle}
          onChange={(e) => setQuickAddTitle(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === 'Enter') handleQuickAdd();
          }}
          placeholder="새 업무 제목 입력..."
          className="flex-1 bg-transparent text-sm text-white placeholder-gray-600 focus:outline-none"
        />
        <select
          value={quickAddAssignee}
          onChange={(e) => setQuickAddAssignee(e.target.value)}
          className="px-2 py-1 rounded-md bg-surface-700 border border-surface-600 text-xs text-gray-300 focus:outline-none cursor-pointer"
        >
          <option value="">담당자</option>
          {members.map((m) => (
            <option key={m.id} value={m.id}>
              {m.avatar} {m.name}
            </option>
          ))}
        </select>
        <div className="flex items-center gap-1">
          {['today', 'tomorrow', 'this-week'].map((preset) => {
            const labels = { today: '오늘', tomorrow: '내일', 'this-week': '이번주' };
            const presetDate = getDeadlinePreset(preset);
            const isActive = quickAddDeadline === presetDate;
            return (
              <button
                key={preset}
                onClick={() => setQuickAddDeadline(isActive ? '' : presetDate)}
                className={`px-2 py-1 rounded-md text-[11px] font-medium transition-colors cursor-pointer ${
                  isActive ? 'bg-brand-500 text-white' : 'bg-surface-700 text-gray-500 hover:text-gray-300'
                }`}
              >
                {labels[preset]}
              </button>
            );
          })}
        </div>
        <button
          onClick={handleQuickAdd}
          disabled={!quickAddTitle.trim()}
          className="px-3 py-1 rounded-md text-xs font-medium text-white bg-brand-500 hover:bg-brand-600 disabled:opacity-30 disabled:cursor-not-allowed transition-colors cursor-pointer"
        >
          추가
        </button>
      </div>

      {/* empty state */}
      {filteredTasks.length === 0 && (
        <div className="bg-surface-800 rounded-xl border border-surface-700 px-5 py-10 text-center text-gray-500 text-sm">
          등록된 업무가 없습니다.
        </div>
      )}

      {/* groups */}
      {groups.map((group) => {
        const isOpen = expandedGroups.has(group.id);
        const memberColor = group.member ? getMemberColor(group.member.id) : '#6b7280';
        const todoCount = group.tasks.filter((t) => t.status === 'todo').length;
        const progressCount = group.tasks.filter((t) => t.status === 'in-progress').length;
        const doneCount = group.tasks.filter((t) => t.status === 'done').length;
        const totalProgress =
          group.tasks.length > 0
            ? Math.round(group.tasks.reduce((sum, t) => sum + (t.progress || 0), 0) / group.tasks.length)
            : 0;
        const hasOverdue = group.tasks.some(
          (t) => t.deadline && t.status !== 'done' && t.deadline < new Date().toISOString().split('T')[0],
        );

        // Phase 2: status sub-groups
        const byStatus = {};
        statusOrder.forEach((s) => {
          const items = group.tasks.filter((t) => t.status === s);
          if (items.length > 0) byStatus[s] = items;
        });

        return (
          <div key={group.id} className="bg-surface-800 rounded-xl border border-surface-700 overflow-hidden">
            {/* group header */}
            <button
              onClick={() => toggleGroup(group.id)}
              className="w-full flex items-center gap-3 px-4 py-3 hover:bg-white/[0.02] transition-colors cursor-pointer"
            >
              <div
                className="w-9 h-9 rounded-lg flex items-center justify-center text-lg shrink-0"
                style={{ backgroundColor: `${memberColor}15` }}
              >
                {group.member ? group.member.avatar : '📋'}
              </div>

              <div className="text-left min-w-0">
                <div className="text-sm font-semibold text-white truncate">
                  {group.member ? group.member.name : '미배정'}
                </div>
                {group.member && <div className="text-[11px] text-gray-500 truncate">{group.member.role}</div>}
              </div>

              <div className="flex items-center gap-1.5 ml-auto shrink-0">
                {todoCount > 0 && (
                  <span className="flex items-center gap-1 px-2 py-0.5 rounded-full text-[11px] font-medium bg-surface-700 text-gray-400">
                    <ListTodo className="w-3 h-3" /> {todoCount}
                  </span>
                )}
                {progressCount > 0 && (
                  <span className="flex items-center gap-1 px-2 py-0.5 rounded-full text-[11px] font-medium bg-blue-500/10 text-blue-400">
                    <Settings className="w-3 h-3" /> {progressCount}
                  </span>
                )}
                {doneCount > 0 && (
                  <span className="flex items-center gap-1 px-2 py-0.5 rounded-full text-[11px] font-medium bg-emerald-500/10 text-emerald-400">
                    <CircleCheckBig className="w-3 h-3" /> {doneCount}
                  </span>
                )}
                {hasOverdue && <span className="w-1.5 h-1.5 rounded-full bg-red-500 shrink-0" title="마감 초과 업무 있음" />}
              </div>

              <div className="flex items-center gap-2 shrink-0 w-20">
                <div className="flex-1 h-1.5 bg-surface-700 rounded-full overflow-hidden">
                  <div
                    className={`h-full rounded-full transition-all ${
                      totalProgress >= 100
                        ? 'bg-emerald-500'
                        : totalProgress >= 50
                          ? 'bg-blue-500'
                          : totalProgress > 0
                            ? 'bg-amber-500'
                            : 'bg-gray-600'
                    }`}
                    style={{ width: `${totalProgress}%` }}
                  />
                </div>
                <span className="text-[11px] text-gray-500 w-7 text-right">{totalProgress}%</span>
              </div>

              {isOpen ? (
                <ChevronUp className="w-4 h-4 text-gray-500 shrink-0" />
              ) : (
                <ChevronDown className="w-4 h-4 text-gray-500 shrink-0" />
              )}
            </button>

            {/* expanded: status sub-groups */}
            {isOpen && (
              <div className="border-t border-surface-700">
                {statusOrder.map((status) => {
                  const items = byStatus[status];
                  if (!items) return null;
                  const cfg = statusLabels[status];
                  const Icon = cfg.icon;
                  return (
                    <div key={status}>
                      {/* sub-group header */}
                      <div className={`flex items-center gap-2 px-5 py-2 border-b ${cfg.borderColor} ${cfg.bgColor}`}>
                        <Icon className={`w-3.5 h-3.5 ${cfg.textColor} ${cfg.iconAnimate}`} />
                        <span className={`text-xs font-semibold ${cfg.textColor}`}>{cfg.label}</span>
                        <span className={`text-xs ${cfg.textColor} opacity-60`}>({items.length})</span>
                      </div>
                      {items.map((task) => (
                        <TaskRow key={task.id} task={task} memberColor={memberColor} />
                      ))}
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
}
