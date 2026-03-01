import { useMemo, useState, useEffect } from 'react';
import {
  LayoutDashboard,
  ListChecks,
  Loader,
  CheckCircle2,
  TrendingUp,
  CalendarClock,
  Newspaper,
  ArrowUpRight,
  Clock,
} from 'lucide-react';
import {
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Legend,
} from 'recharts';
import { useApp } from '../context/AppContext';
import { analyticsService } from '../services/analyticsService';
import { newsService } from '../services/newsService';
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
  high: { label: '높음', bg: 'bg-red-100', text: 'text-red-700', dot: 'bg-red-500' },
  medium: { label: '보통', bg: 'bg-yellow-100', text: 'text-yellow-700', dot: 'bg-yellow-500' },
  low: { label: '낮음', bg: 'bg-blue-100', text: 'text-blue-700', dot: 'bg-blue-500' },
};

const statusConfig = {
  todo: { label: '예정', bg: 'bg-slate-100', text: 'text-slate-600' },
  'in-progress': { label: '진행 중', bg: 'bg-blue-100', text: 'text-blue-700' },
  done: { label: '완료', bg: 'bg-green-100', text: 'text-green-700' },
};

function deadlineBadge(deadline) {
  if (!deadline) return { label: '-', cls: 'text-slate-400 bg-slate-50' };
  const diff = Math.ceil((new Date(deadline) - today) / (1000 * 60 * 60 * 24));
  if (diff < 0) return { label: '기한 초과', cls: 'text-red-600 bg-red-50' };
  if (diff <= 3) return { label: `D-${diff}`, cls: 'text-orange-600 bg-orange-50' };
  if (diff <= 7) return { label: `D-${diff}`, cls: 'text-yellow-600 bg-yellow-50' };
  return { label: `D-${diff}`, cls: 'text-slate-500 bg-slate-50' };
}

// ---------------------------------------------------------------------------
// Sub-components
// ---------------------------------------------------------------------------

function KpiCard({ icon: Icon, iconBg, label, value, sub, extra }) {
  return (
    <div className="bg-white rounded-xl shadow-sm p-5 flex flex-col gap-3">
      <div className="flex items-center justify-between">
        <div className={`w-10 h-10 rounded-lg flex items-center justify-center ${iconBg}`}>
          <Icon className="w-5 h-5 text-white" />
        </div>
        {extra && <div>{extra}</div>}
      </div>
      <div>
        <p className="text-2xl font-bold text-slate-800">{value}</p>
        <p className="text-sm text-slate-500 mt-0.5">{label}</p>
      </div>
      {sub && <div className="text-xs text-slate-400 border-t border-slate-100 pt-2">{sub}</div>}
    </div>
  );
}

function CircularProgress({ percentage, size = 36, stroke = 4 }) {
  const radius = (size - stroke) / 2;
  const circumference = 2 * Math.PI * radius;
  const offset = circumference - (percentage / 100) * circumference;
  return (
    <svg width={size} height={size} className="-rotate-90">
      <circle cx={size / 2} cy={size / 2} r={radius} fill="none" stroke="#e2e8f0" strokeWidth={stroke} />
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
    <div className="w-full h-1.5 bg-slate-100 rounded-full overflow-hidden">
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
    <div className="bg-white rounded-lg shadow-lg border border-slate-100 p-3 text-xs">
      <p className="font-semibold text-slate-700 mb-1.5">{label}</p>
      {payload.map((entry) => (
        <div key={entry.name} className="flex items-center gap-2 py-0.5">
          <span className="w-2.5 h-2.5 rounded-full" style={{ background: entry.color }} />
          <span className="text-slate-500">{entry.name}:</span>
          <span className="font-medium text-slate-700">
            {(entry.value / 10000).toFixed(1)}만
          </span>
        </div>
      ))}
    </div>
  );
}

// ---------------------------------------------------------------------------
// Main Component
// ---------------------------------------------------------------------------

export default function Dashboard() {
  const { tasks, members, loading } = useApp();

  const [snsOverview, setSnsOverview] = useState([]);
  const [snsGrowthData, setSnsGrowthData] = useState([]);
  const [newsArticles, setNewsArticles] = useState([]);
  const [extraLoading, setExtraLoading] = useState(true);

  // AI 인사이트
  const [dashboardAi, setDashboardAi] = useState('');
  const [dashboardAiLoading, setDashboardAiLoading] = useState(false);

  useEffect(() => {
    Promise.all([
      analyticsService.getOverview(),
      analyticsService.getGrowth(),
      newsService.getAll(),
    ])
      .then(([overview, growth, news]) => {
        setSnsOverview(overview);
        setSnsGrowthData(growth);
        setNewsArticles(news);
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
      <div className="flex items-center justify-center h-64 text-slate-400">
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
          <h1 className="text-2xl font-bold text-slate-800 flex items-center gap-2">
            <LayoutDashboard className="w-7 h-7 text-brand-500" />
            대시보드
          </h1>
          <p className="text-sm text-slate-500 mt-1">{formattedDate}</p>
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
            <span className="inline-flex items-center gap-0.5 text-xs font-medium text-green-600 bg-green-50 rounded-full px-2 py-0.5">
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
        {/* 담당자별 업무 현황 */}
        <div className="lg:col-span-3 bg-white rounded-xl shadow-sm p-5">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-base font-semibold text-slate-700 flex items-center gap-2">
              <CalendarClock className="w-4.5 h-4.5 text-brand-500" />
              담당자별 업무 현황
            </h2>
            <span className="text-xs text-slate-400">진행 중 · 예정</span>
          </div>

          <div className="space-y-4">
            {tasksByAssignee.map(({ member, tasks: memberTasks }) => {
              const avgProgress =
                memberTasks.length > 0
                  ? Math.round(memberTasks.reduce((s, t) => s + t.progress, 0) / memberTasks.length)
                  : 0;
              const inProgressCount = memberTasks.filter((t) => t.status === 'in-progress').length;

              return (
                <div key={member.id} className="border border-slate-100 rounded-lg overflow-hidden">
                  {/* 담당자 헤더 */}
                  <div className="flex items-center gap-3 px-4 py-3 bg-slate-50/80">
                    <span className="text-xl">{member.avatar}</span>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2">
                        <p className="text-sm font-semibold text-slate-700">{member.name}</p>
                        <span className="text-[10px] text-slate-400">{member.role}</span>
                      </div>
                      <div className="flex items-center gap-3 mt-0.5">
                        <span className="text-[11px] text-slate-400">
                          업무 {memberTasks.length}건
                        </span>
                        {inProgressCount > 0 && (
                          <span className="text-[11px] text-blue-500 font-medium">
                            진행 중 {inProgressCount}건
                          </span>
                        )}
                      </div>
                    </div>
                    <div className="text-right shrink-0">
                      <p className="text-xs font-medium text-slate-500">평균 진행률</p>
                      <p className="text-lg font-bold text-slate-700">{avgProgress}%</p>
                    </div>
                  </div>

                  {/* 업무 목록 */}
                  <div className="divide-y divide-slate-50">
                    {memberTasks.map((task) => {
                      const p = priorityConfig[task.priority];
                      const s = statusConfig[task.status];
                      const d = deadlineBadge(task.deadline);
                      return (
                        <div
                          key={task.id}
                          className="flex items-center gap-3 px-4 py-2.5 hover:bg-slate-50/50 transition-colors"
                        >
                          <span className={`w-1.5 h-1.5 rounded-full shrink-0 ${p.dot}`} />
                          <p className="flex-1 text-sm text-slate-600 truncate">{task.title}</p>
                          <div className="w-20 shrink-0">
                            <ProgressBar value={task.progress} />
                          </div>
                          <span className={`shrink-0 text-[10px] font-medium px-1.5 py-0.5 rounded ${d.cls}`}>
                            {d.label}
                          </span>
                          <span className={`shrink-0 text-[10px] font-medium px-1.5 py-0.5 rounded ${s.bg} ${s.text}`}>
                            {s.label}
                          </span>
                        </div>
                      );
                    })}
                  </div>
                </div>
              );
            })}

            {tasksByAssignee.length === 0 && (
              <p className="text-sm text-slate-400 text-center py-6">진행 중인 업무가 없습니다</p>
            )}
          </div>
        </div>

        {/* RIGHT COLUMN: Chart + News */}
        <div className="lg:col-span-2 flex flex-col gap-4">
          {/* Mini SNS Chart */}
          <div className="bg-white rounded-xl shadow-sm p-5">
            <h2 className="text-base font-semibold text-slate-700 flex items-center gap-2 mb-4">
              <TrendingUp className="w-4.5 h-4.5 text-brand-500" />
              SNS 팔로워 추이
            </h2>
            <div className="h-52">
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={snsGrowthData} margin={{ top: 5, right: 10, left: -20, bottom: 0 }}>
                  <defs>
                    <linearGradient id="gradYT" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="0%" stopColor="#FF0000" stopOpacity={0.25} />
                      <stop offset="100%" stopColor="#FF0000" stopOpacity={0} />
                    </linearGradient>
                    <linearGradient id="gradIG" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="0%" stopColor="#E4405F" stopOpacity={0.25} />
                      <stop offset="100%" stopColor="#E4405F" stopOpacity={0} />
                    </linearGradient>
                    <linearGradient id="gradTT" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="0%" stopColor="#6366f1" stopOpacity={0.25} />
                      <stop offset="100%" stopColor="#6366f1" stopOpacity={0} />
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
                  <XAxis dataKey="month" tick={{ fontSize: 11, fill: '#94a3b8' }} axisLine={false} tickLine={false} />
                  <YAxis
                    tick={{ fontSize: 11, fill: '#94a3b8' }}
                    axisLine={false}
                    tickLine={false}
                    tickFormatter={(v) => `${(v / 10000).toFixed(0)}만`}
                  />
                  <Tooltip content={<CustomTooltip />} />
                  <Legend iconType="circle" iconSize={8} wrapperStyle={{ fontSize: 11, paddingTop: 8 }} />
                  <Area type="monotone" dataKey="youtube" name="YouTube" stroke="#FF0000" strokeWidth={2} fill="url(#gradYT)" />
                  <Area type="monotone" dataKey="instagram" name="Instagram" stroke="#E4405F" strokeWidth={2} fill="url(#gradIG)" />
                  <Area type="monotone" dataKey="tiktok" name="TikTok" stroke="#6366f1" strokeWidth={2} fill="url(#gradTT)" />
                </AreaChart>
              </ResponsiveContainer>
            </div>
          </div>

          {/* Recent News */}
          <div className="bg-white rounded-xl shadow-sm p-5">
            <h2 className="text-base font-semibold text-slate-700 flex items-center gap-2 mb-4">
              <Newspaper className="w-4.5 h-4.5 text-brand-500" />
              최신 뉴스
            </h2>
            <div className="space-y-3">
              {latestNews.map((article) => (
                <div
                  key={article.id}
                  className="group flex gap-3 p-2.5 rounded-lg hover:bg-slate-50 transition-colors cursor-pointer"
                >
                  <div
                    className={`w-8 h-8 rounded-lg flex items-center justify-center shrink-0 text-xs font-bold text-white ${
                      article.source === 'naver' ? 'bg-green-500' : 'bg-blue-500'
                    }`}
                  >
                    {article.source === 'naver' ? 'N' : 'G'}
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className="text-sm font-medium text-slate-700 truncate group-hover:text-brand-500 transition-colors">
                      {article.title}
                    </p>
                    <div className="flex items-center gap-2 mt-1 text-xs text-slate-400">
                      <span>{article.publisher}</span>
                      <span className="w-0.5 h-0.5 rounded-full bg-slate-300" />
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
