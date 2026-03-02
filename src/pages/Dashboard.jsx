import { useMemo, useState, useEffect } from 'react';
import {
  LayoutDashboard,
  ListChecks,
  Loader,
  CheckCircle2,
  TrendingUp,
  CalendarClock,
  CalendarDays,
  ChevronLeft,
  ChevronRight,
  Newspaper,
  ArrowUpRight,
  Clock,
  Target,
} from 'lucide-react';
import {
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
} from 'recharts';
import { useApp } from '../context/AppContext';
import { analyticsService } from '../services/analyticsService';
import { newsService } from '../services/newsService';
import { kpiService } from '../services/kpiService';
import { aiService } from '../services/aiService';
import AiInsightCard from '../components/AiInsightCard';

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

const today = new Date();
const formattedDate = today.toLocaleDateString('ko-KR', {
  year: 'numeric',
  month: 'long',
  day: 'numeric',
  weekday: 'long',
});

const priorityConfig = {
  high: { label: '높음', bg: 'bg-red-500/20', text: 'text-red-400', dot: 'bg-red-500' },
  medium: { label: '보통', bg: 'bg-yellow-500/20', text: 'text-yellow-400', dot: 'bg-yellow-500' },
  low: { label: '낮음', bg: 'bg-blue-500/20', text: 'text-blue-400', dot: 'bg-blue-500' },
};

const statusConfig = {
  todo: { label: '예정', bg: 'bg-white/10', text: 'text-gray-400' },
  'in-progress': { label: '진행 중', bg: 'bg-blue-500/20', text: 'text-blue-400' },
  done: { label: '완료', bg: 'bg-green-500/20', text: 'text-green-400' },
};

const kpiCategoryConfig = {
  sns_growth: { label: 'SNS', color: 'text-blue-400', bg: 'bg-blue-500/20' },
  engagement: { label: '참여', color: 'text-green-400', bg: 'bg-green-500/20' },
  content: { label: '콘텐츠', color: 'text-purple-400', bg: 'bg-purple-500/20' },
  sponsorship: { label: '스폰서', color: 'text-yellow-400', bg: 'bg-yellow-500/20' },
  event: { label: '이벤트', color: 'text-pink-400', bg: 'bg-pink-500/20' },
};

const kpiStatusConfig = {
  on_track: { label: '정상', color: 'text-green-400', bg: 'bg-green-500/20' },
  at_risk: { label: '주의', color: 'text-yellow-400', bg: 'bg-yellow-500/20' },
  behind: { label: '지연', color: 'text-red-400', bg: 'bg-red-500/20' },
  completed: { label: '달성', color: 'text-brand-400', bg: 'bg-brand-500/20' },
};

function deadlineBadge(deadline) {
  if (!deadline) return { label: '-', cls: 'text-gray-500 bg-white/5' };
  const diff = Math.ceil((new Date(deadline) - today) / (1000 * 60 * 60 * 24));
  if (diff < 0) return { label: '기한 초과', cls: 'text-red-400 bg-red-500/20' };
  if (diff <= 3) return { label: `D-${diff}`, cls: 'text-orange-400 bg-orange-500/20' };
  if (diff <= 7) return { label: `D-${diff}`, cls: 'text-yellow-400 bg-yellow-500/20' };
  return { label: `D-${diff}`, cls: 'text-gray-400 bg-white/5' };
}

// ---------------------------------------------------------------------------
// Sub-components
// ---------------------------------------------------------------------------

function KpiCard({ icon: Icon, iconBg, label, value, sub, extra }) {
  return (
    <div className="bg-surface-800 rounded-xl shadow-sm p-5 flex flex-col gap-3">
      <div className="flex items-center justify-between">
        <div className={`w-10 h-10 rounded-lg flex items-center justify-center ${iconBg}`}>
          <Icon className="w-5 h-5 text-white" />
        </div>
        {extra && <div>{extra}</div>}
      </div>
      <div>
        <p className="text-2xl font-bold text-white">{value}</p>
        <p className="text-sm text-gray-400 mt-0.5">{label}</p>
      </div>
      {sub && <div className="text-xs text-gray-500 border-t border-surface-700 pt-2">{sub}</div>}
    </div>
  );
}

function CircularProgress({ percentage, size = 36, stroke = 4 }) {
  const radius = (size - stroke) / 2;
  const circumference = 2 * Math.PI * radius;
  const offset = circumference - (percentage / 100) * circumference;
  return (
    <svg width={size} height={size} className="-rotate-90">
      <circle cx={size / 2} cy={size / 2} r={radius} fill="none" stroke="#21262d" strokeWidth={stroke} />
      <circle
        cx={size / 2}
        cy={size / 2}
        r={radius}
        fill="none"
        stroke="#22c55e"
        strokeWidth={stroke}
        strokeDasharray={circumference}
        strokeDashoffset={offset}
        strokeLinecap="round"
      />
    </svg>
  );
}

function ProgressBar({ value }) {
  return (
    <div className="w-full h-1.5 bg-surface-700 rounded-full overflow-hidden">
      <div
        className="h-full rounded-full transition-all"
        style={{
          width: `${value}%`,
          background:
            value === 100 ? '#22c55e' : value >= 60 ? '#3b82f6' : value >= 30 ? '#f59e0b' : '#94a3b8',
        }}
      />
    </div>
  );
}

function CustomTooltip({ active, payload, label }) {
  if (!active || !payload?.length) return null;
  return (
    <div className="bg-surface-800 rounded-lg shadow-lg border border-surface-700 p-3 text-xs">
      <p className="font-semibold text-gray-300 mb-1.5">{label}</p>
      {payload.map((entry) => (
        <div key={entry.name} className="flex items-center gap-2 py-0.5">
          <span className="w-2.5 h-2.5 rounded-full" style={{ background: entry.color }} />
          <span className="text-gray-400">{entry.name}:</span>
          <span className="font-medium text-gray-300">
            {Number(entry.value).toLocaleString('ko-KR')}명
          </span>
        </div>
      ))}
    </div>
  );
}

function MiniCalendar({ month, setMonth, events, tasks }) {
  const year = month.getFullYear();
  const m = month.getMonth();
  const firstDay = new Date(year, m, 1).getDay(); // 0=Sun
  const daysInMonth = new Date(year, m + 1, 0).getDate();
  const todayCal = new Date();
  const todayStr = todayCal.toISOString().split('T')[0];

  // Collect dates with events
  const eventDates = new Set();
  events.forEach(e => {
    if (e.date) eventDates.add(e.date);
  });
  tasks.forEach(t => {
    if (t.deadline) eventDates.add(t.deadline);
  });

  const days = [];
  // Empty cells for days before first day
  for (let i = 0; i < firstDay; i++) days.push(null);
  // Actual days
  for (let d = 1; d <= daysInMonth; d++) days.push(d);

  const monthStr = `${year}년 ${m + 1}월`;

  return (
    <div>
      {/* Header with navigation */}
      <div className="flex items-center justify-between mb-3">
        <button onClick={() => setMonth(new Date(year, m - 1))} className="p-1 rounded hover:bg-white/10 text-gray-400 hover:text-gray-200 transition-colors cursor-pointer">
          <ChevronLeft className="w-4 h-4" />
        </button>
        <span className="text-sm font-semibold text-gray-300">{monthStr}</span>
        <button onClick={() => setMonth(new Date(year, m + 1))} className="p-1 rounded hover:bg-white/10 text-gray-400 hover:text-gray-200 transition-colors cursor-pointer">
          <ChevronRight className="w-4 h-4" />
        </button>
      </div>

      {/* Day headers */}
      <div className="grid grid-cols-7 mb-1">
        {['일','월','화','수','목','금','토'].map(d => (
          <div key={d} className="text-center text-[10px] text-gray-500 py-1">{d}</div>
        ))}
      </div>

      {/* Day grid */}
      <div className="grid grid-cols-7 gap-0.5">
        {days.map((day, i) => {
          if (day === null) return <div key={`e${i}`} />;
          const dateStr = `${year}-${String(m + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
          const isToday = dateStr === todayStr;
          const hasEvent = eventDates.has(dateStr);

          return (
            <div key={i} className="relative flex flex-col items-center py-1">
              <span className={`w-6 h-6 flex items-center justify-center rounded-full text-xs
                ${isToday ? 'bg-brand-500 text-white font-bold' : 'text-gray-400'}
              `}>
                {day}
              </span>
              {hasEvent && !isToday && (
                <span className="absolute bottom-0 w-1 h-1 rounded-full bg-brand-400" />
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Main Component
// ---------------------------------------------------------------------------

export default function Dashboard() {
  const { tasks, members, calendarEvents, loading } = useApp();

  const [snsOverview, setSnsOverview] = useState([]);
  const [ytGrowthData, setYtGrowthData] = useState([]);
  const [newsArticles, setNewsArticles] = useState([]);
  const [kpiItems, setKpiItems] = useState([]);
  const [extraLoading, setExtraLoading] = useState(true);
  const [calendarMonth, setCalendarMonth] = useState(new Date());

  // AI 인사이트
  const [dashboardAi, setDashboardAi] = useState('');
  const [dashboardAiLoading, setDashboardAiLoading] = useState(false);

  useEffect(() => {
    Promise.all([
      analyticsService.getOverview(),
      analyticsService.getYoutubeGrowthData(),
      newsService.getAll(),
      kpiService.getAll().catch(() => []),
    ])
      .then(([overview, growth, news, kpis]) => {
        setSnsOverview(overview);
        setYtGrowthData(growth);
        setNewsArticles(news);
        setKpiItems(kpis);
      })
      .catch(console.error)
      .finally(() => setExtraLoading(false));
  }, []);

  // KPI calculations
  const stats = useMemo(() => {
    const total = tasks.length;
    const todo = tasks.filter((t) => t.status === 'todo').length;
    const inProgress = tasks.filter((t) => t.status === 'in-progress').length;
    const done = tasks.filter((t) => t.status === 'done').length;
    const completionRate = total > 0 ? Math.round((done / total) * 100) : 0;
    return { total, todo, inProgress, done, completionRate };
  }, [tasks]);

  const totalReach = useMemo(() => {
    if (!snsOverview.length) return '0만';
    let raw = 0;
    snsOverview.forEach((p) => {
      const num = parseFloat((p.total_views || '0').replace(/[^0-9.]/g, ''));
      raw += num;
    });
    return `${raw.toLocaleString('ko-KR')}만`;
  }, [snsOverview]);

  // 담당자별 업무 그룹화
  const tasksByAssignee = useMemo(() => {
    const grouped = {};
    members.forEach((m) => {
      grouped[m.id] = { member: m, tasks: [] };
    });
    // 미완료 업무만 그룹화
    tasks
      .filter((t) => t.status !== 'done')
      .sort((a, b) => {
        const statusOrder = { 'in-progress': 0, todo: 1 };
        const orderDiff = (statusOrder[a.status] ?? 2) - (statusOrder[b.status] ?? 2);
        if (orderDiff !== 0) return orderDiff;
        return new Date(a.deadline || '2099-12-31') - new Date(b.deadline || '2099-12-31');
      })
      .forEach((t) => {
        if (t.assignee && grouped[t.assignee]) {
          grouped[t.assignee].tasks.push(t);
        }
      });
    return Object.values(grouped)
      .filter((g) => g.tasks.length > 0)
      .sort((a, b) => b.tasks.length - a.tasks.length);
  }, [tasks, members]);

  // Latest 3 news
  const latestNews = useMemo(
    () => [...newsArticles].sort((a, b) => new Date(b.date) - new Date(a.date)).slice(0, 3),
    [newsArticles],
  );

  // Monthly calendar items
  const monthlyItems = useMemo(() => {
    const y = calendarMonth.getFullYear();
    const m = calendarMonth.getMonth();
    const monthPrefix = `${y}-${String(m + 1).padStart(2, '0')}`;

    const items = [];

    // Calendar events this month
    calendarEvents.forEach(e => {
      if (e.date?.startsWith(monthPrefix)) {
        items.push({ date: e.date, title: e.title, type: 'event', color: e.color || '#6366f1' });
      }
    });

    // Task deadlines this month
    tasks.forEach(t => {
      if (t.deadline?.startsWith(monthPrefix)) {
        items.push({ date: t.deadline, title: t.title, type: 'task', color: '#f59e0b' });
      }
    });

    return items.sort((a, b) => a.date.localeCompare(b.date)).slice(0, 5);
  }, [calendarEvents, tasks, calendarMonth]);

  const handleDashboardAi = async () => {
    setDashboardAiLoading(true);
    try {
      const overdue = tasks.filter((t) => t.status !== 'done' && t.deadline && new Date(t.deadline) < new Date()).length;
      const context = `업무 현황: 전체 ${stats.total}건 (예정 ${stats.todo}, 진행 ${stats.inProgress}, 완료 ${stats.done}), 완료율 ${stats.completionRate}%, 마감 초과 ${overdue}건. 팀원 ${members.length}명. SNS 채널: ${snsOverview.map((s) => `${s.platform} 구독자 ${s.subscribers}`).join(', ')}.`;
      const data = await aiService.analyze('dashboard', context, '현재 팀 상황을 분석하고, 이번 주 가장 중요한 3가지 우선순위와 리스크를 알려주세요. 마감 초과 업무가 있다면 강조해주세요.');
      setDashboardAi(data.insight || '');
    } catch (err) {
      setDashboardAi('AI 분석 실패: ' + err.message);
    } finally {
      setDashboardAiLoading(false);
    }
  };

  if (loading || extraLoading) {
    return (
      <div className="flex items-center justify-center h-64 text-gray-400">
        <Loader className="w-6 h-6 animate-spin mr-2" />
        데이터를 불러오는 중...
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* HEADER */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-white flex items-center gap-2">
            <LayoutDashboard className="w-7 h-7 text-brand-500" />
            대시보드
          </h1>
          <p className="text-sm text-gray-400 mt-1">{formattedDate}</p>
        </div>
      </div>

      {/* KPI CARDS */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <KpiCard
          icon={ListChecks}
          iconBg="bg-brand-500"
          label="전체 업무"
          value={stats.total}
          sub={`예정 ${stats.todo} · 진행 ${stats.inProgress} · 완료 ${stats.done}`}
        />
        <KpiCard
          icon={Loader}
          iconBg="bg-blue-500"
          label="진행 중"
          value={stats.inProgress}
          sub="현재 활성 업무"
        />
        <KpiCard
          icon={CheckCircle2}
          iconBg="bg-green-500"
          label="완료율"
          value={`${stats.completionRate}%`}
          extra={<CircularProgress percentage={stats.completionRate} />}
          sub={`${stats.done}/${stats.total} 업무 완료`}
        />
        <KpiCard
          icon={TrendingUp}
          iconBg="bg-purple-500"
          label="SNS 도달"
          value={totalReach}
          extra={
            <span className="inline-flex items-center gap-0.5 text-xs font-medium text-green-400 bg-green-500/20 rounded-full px-2 py-0.5">
              <ArrowUpRight className="w-3 h-3" />
              +15.5%
            </span>
          }
          sub="YouTube + Instagram + TikTok 합산"
        />
      </div>

      {/* AI 인사이트 */}
      <AiInsightCard
        title="AI 업무 현황 분석"
        insight={dashboardAi}
        loading={dashboardAiLoading}
        onGenerate={handleDashboardAi}
      />

      {/* BOTTOM GRID */}
      <div className="grid grid-cols-1 lg:grid-cols-5 gap-4">
        {/* LEFT COLUMN: KPI + 담당자별 업무 */}
        <div className="lg:col-span-3 flex flex-col gap-4">
          {/* KPI 목표 달성 현황 */}
          <div className="bg-surface-800 rounded-xl shadow-sm p-5">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-base font-semibold text-gray-300 flex items-center gap-2">
                <Target className="w-4.5 h-4.5 text-brand-500" />
                KPI 달성 현황
              </h2>
              <span className="text-xs text-gray-500">{kpiItems.length}개 항목</span>
            </div>

            {kpiItems.length === 0 ? (
              <p className="text-sm text-gray-500 text-center py-6">등록된 KPI가 없습니다</p>
            ) : (
              <div className="space-y-2.5">
                {kpiItems.map((kpi) => {
                  const pct = kpi.target_value > 0
                    ? Math.round((kpi.current_value / kpi.target_value) * 100)
                    : 0;
                  const cat = kpiCategoryConfig[kpi.category] || kpiCategoryConfig.content;
                  const st = kpiStatusConfig[kpi.status] || kpiStatusConfig.on_track;
                  return (
                    <div key={kpi.id} className="flex items-center gap-3 p-3 rounded-lg bg-surface-750 hover:bg-white/5 transition-colors">
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 mb-1.5">
                          <span className={`text-[10px] font-medium px-1.5 py-0.5 rounded ${cat.bg} ${cat.color}`}>
                            {cat.label}
                          </span>
                          <p className="text-sm font-medium text-gray-300 truncate">{kpi.title}</p>
                        </div>
                        <div className="flex items-center gap-2">
                          <div className="flex-1">
                            <ProgressBar value={Math.min(pct, 100)} />
                          </div>
                          <span className="text-xs font-semibold text-gray-400 w-9 text-right">{pct}%</span>
                        </div>
                        <div className="flex items-center gap-2 mt-1">
                          <span className="text-[10px] text-gray-500">
                            {kpi.current_value?.toLocaleString()}{kpi.unit} / {kpi.target_value?.toLocaleString()}{kpi.unit}
                          </span>
                          {kpi.period_end && (
                            <span className="text-[10px] text-gray-600">
                              ~{kpi.period_end.slice(5)}
                            </span>
                          )}
                        </div>
                      </div>
                      <span className={`shrink-0 text-[10px] font-medium px-1.5 py-0.5 rounded ${st.bg} ${st.color}`}>
                        {st.label}
                      </span>
                    </div>
                  );
                })}
              </div>
            )}
          </div>

          {/* 담당자별 업무 현황 (간소화) */}
          <div className="bg-surface-800 rounded-xl shadow-sm p-5">
            <div className="flex items-center justify-between mb-3">
              <h2 className="text-sm font-semibold text-gray-300 flex items-center gap-2">
                <CalendarClock className="w-4 h-4 text-brand-500" />
                담당자별 업무
              </h2>
              <span className="text-xs text-gray-500">미완료 {tasks.filter(t => t.status !== 'done').length}건</span>
            </div>

            <div className="space-y-3">
              {tasksByAssignee.map(({ member, tasks: memberTasks }) => (
                <div key={member.id}>
                  <div className="flex items-center gap-2 mb-1.5">
                    <span className="text-sm">{member.avatar}</span>
                    <span className="text-xs font-semibold text-gray-400">{member.name}</span>
                    <span className="text-[10px] text-gray-600">{memberTasks.length}건</span>
                  </div>
                  <div className="space-y-1 ml-6">
                    {memberTasks.slice(0, 3).map((task) => {
                      const p = priorityConfig[task.priority];
                      const d = deadlineBadge(task.deadline);
                      return (
                        <div key={task.id} className="flex items-center gap-2">
                          <span className={`w-1.5 h-1.5 rounded-full shrink-0 ${p.dot}`} />
                          <span className="flex-1 text-xs text-gray-400 truncate">{task.title}</span>
                          <div className="w-12 shrink-0">
                            <ProgressBar value={task.progress} />
                          </div>
                          <span className={`shrink-0 text-[10px] px-1 py-0.5 rounded ${d.cls}`}>{d.label}</span>
                        </div>
                      );
                    })}
                    {memberTasks.length > 3 && (
                      <p className="text-[10px] text-gray-600 ml-3.5">+{memberTasks.length - 3}건 더</p>
                    )}
                  </div>
                </div>
              ))}

              {tasksByAssignee.length === 0 && (
                <p className="text-xs text-gray-500 text-center py-4">진행 중인 업무가 없습니다</p>
              )}
            </div>
          </div>
        </div>

        {/* RIGHT COLUMN: Calendar + YouTube Chart + News */}
        <div className="lg:col-span-2 flex flex-col gap-4">
          {/* Mini Calendar + Monthly Schedule */}
          <div className="bg-surface-800 rounded-xl shadow-sm p-5">
            <h2 className="text-base font-semibold text-gray-300 flex items-center gap-2 mb-4">
              <CalendarDays className="w-4.5 h-4.5 text-brand-500" />
              미니 캘린더
            </h2>
            <MiniCalendar month={calendarMonth} setMonth={setCalendarMonth} events={calendarEvents} tasks={tasks} />

            {/* Monthly Schedule List */}
            <div className="border-t border-surface-700 pt-3 mt-3">
              <h3 className="text-xs font-semibold text-gray-400 mb-2">이달의 일정</h3>
              {monthlyItems.length === 0 ? (
                <p className="text-xs text-gray-600 text-center py-3">이번 달 등록된 일정이 없습니다</p>
              ) : (
                <div className="space-y-2">
                  {monthlyItems.map((item, i) => (
                    <div key={i} className="flex items-center gap-2">
                      <span className="text-[10px] text-gray-500 w-12 shrink-0">{item.date.slice(5)}</span>
                      <span className="w-1.5 h-1.5 rounded-full shrink-0" style={{ background: item.color }} />
                      <span className="text-xs text-gray-300 truncate flex-1">{item.title}</span>
                      <span className={`text-[9px] px-1.5 py-0.5 rounded ${
                        item.type === 'event' ? 'bg-purple-500/20 text-purple-400' : 'bg-yellow-500/20 text-yellow-400'
                      }`}>
                        {item.type === 'event' ? '일정' : '업무'}
                      </span>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>

          {/* YouTube Subscriber Chart */}
          <div className="bg-surface-800 rounded-xl shadow-sm p-5">
            <h2 className="text-base font-semibold text-gray-300 flex items-center gap-2 mb-4">
              <TrendingUp className="w-4.5 h-4.5 text-red-500" />
              YouTube 구독자 추이
            </h2>
            {ytGrowthData.length === 0 ? (
              <p className="text-sm text-gray-500 text-center py-10">채널을 등록하고 데이터를 수집하면 표시됩니다</p>
            ) : (
              <div className="h-52">
                <ResponsiveContainer width="100%" height="100%">
                  <AreaChart data={ytGrowthData} margin={{ top: 5, right: 10, left: -20, bottom: 0 }}>
                    <defs>
                      <linearGradient id="gradYTSub" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="0%" stopColor="#FF0000" stopOpacity={0.25} />
                        <stop offset="100%" stopColor="#FF0000" stopOpacity={0} />
                      </linearGradient>
                    </defs>
                    <CartesianGrid strokeDasharray="3 3" stroke="#21262d" />
                    <XAxis
                      dataKey="date"
                      tick={{ fontSize: 11, fill: '#6b7280' }}
                      axisLine={false}
                      tickLine={false}
                      tickFormatter={(v) => {
                        const parts = v.split('-');
                        return `${parts[1]}.${parts[2]}`;
                      }}
                    />
                    <YAxis
                      tick={{ fontSize: 11, fill: '#6b7280' }}
                      axisLine={false}
                      tickLine={false}
                      tickFormatter={(v) => `${(v / 10000).toFixed(0)}만`}
                    />
                    <Tooltip content={<CustomTooltip />} />
                    <Area type="monotone" dataKey="subscribers" name="구독자" stroke="#FF0000" strokeWidth={2} fill="url(#gradYTSub)" />
                  </AreaChart>
                </ResponsiveContainer>
              </div>
            )}
          </div>

          {/* Recent News */}
          <div className="bg-surface-800 rounded-xl shadow-sm p-5">
            <h2 className="text-base font-semibold text-gray-300 flex items-center gap-2 mb-4">
              <Newspaper className="w-4.5 h-4.5 text-brand-500" />
              최신 뉴스
            </h2>
            <div className="space-y-3">
              {latestNews.map((article) => (
                <div
                  key={article.id}
                  className="group flex gap-3 p-2.5 rounded-lg hover:bg-white/5 transition-colors cursor-pointer"
                >
                  <div
                    className={`w-8 h-8 rounded-lg flex items-center justify-center shrink-0 text-xs font-bold text-white ${
                      article.source === 'naver' ? 'bg-green-500' : 'bg-blue-500'
                    }`}
                  >
                    {article.source === 'naver' ? 'N' : 'G'}
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className="text-sm font-medium text-gray-300 truncate group-hover:text-brand-500 transition-colors">
                      {article.title}
                    </p>
                    <div className="flex items-center gap-2 mt-1 text-xs text-gray-500">
                      <span>{article.publisher}</span>
                      <span className="w-0.5 h-0.5 rounded-full bg-gray-600" />
                      <span className="flex items-center gap-0.5">
                        <Clock className="w-3 h-3" />
                        {article.date}
                      </span>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
