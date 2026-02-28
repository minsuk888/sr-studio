import { useState, useEffect } from 'react';
import {
  LineChart,
  Line,
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
} from 'recharts';
import {
  TrendingUp,
  TrendingDown,
  Eye,
  Heart,
  Users,
  Play,
  Sparkles,
  Youtube,
  Instagram,
  MessageCircle,
  Lightbulb,
  ArrowUpRight,
  Loader,
} from 'lucide-react';
import { analyticsService } from '../services/analyticsService';

// ---------- helpers ----------

const platformIcons = {
  YouTube: Youtube,
  Instagram: Instagram,
  TikTok: MessageCircle,
};

const platformColors = {
  YouTube: '#FF0000',
  Instagram: '#E4405F',
  TikTok: '#000000',
};

const chartTikTokColor = '#69C9D0';

const priorityColors = {
  high: '#ef4444',
  medium: '#f59e0b',
  low: '#3b82f6',
};

const typeBadgeStyles = {
  trend: 'bg-rose-100 text-rose-700',
  content: 'bg-emerald-100 text-emerald-700',
  timing: 'bg-amber-100 text-amber-700',
  audience: 'bg-blue-100 text-blue-700',
};

const typeLabels = {
  trend: '트렌드',
  content: '콘텐츠',
  timing: '타이밍',
  audience: '오디언스',
};

function formatNumber(num) {
  if (num >= 10000) return (num / 10000).toFixed(1) + '만';
  return num.toLocaleString();
}

// ---------- sub-components ----------

function GrowthTooltip({ active, payload, label }) {
  if (!active || !payload?.length) return null;
  return (
    <div className="bg-white rounded-lg shadow-lg border border-gray-100 px-4 py-3 text-sm">
      <p className="font-semibold text-gray-700 mb-2">{label}</p>
      {payload.map((entry) => (
        <div key={entry.dataKey} className="flex items-center gap-2 mb-1">
          <span className="w-2.5 h-2.5 rounded-full inline-block" style={{ backgroundColor: entry.color }} />
          <span className="text-gray-600 capitalize">{entry.dataKey}:</span>
          <span className="font-medium text-gray-900">{formatNumber(entry.value)}</span>
        </div>
      ))}
    </div>
  );
}

function EngagementTooltip({ active, payload, label }) {
  if (!active || !payload?.length) return null;
  return (
    <div className="bg-white rounded-lg shadow-lg border border-gray-100 px-4 py-3 text-sm">
      <p className="font-semibold text-gray-700 mb-2">{label}</p>
      {payload.map((entry) => (
        <div key={entry.dataKey} className="flex items-center gap-2 mb-1">
          <span className="w-2.5 h-2.5 rounded-full inline-block" style={{ backgroundColor: entry.color }} />
          <span className="text-gray-600 capitalize">{entry.dataKey}:</span>
          <span className="font-medium text-gray-900">{entry.value}%</span>
        </div>
      ))}
    </div>
  );
}

// ---------- main component ----------

export default function Analytics() {
  const [snsOverview, setSnsOverview] = useState([]);
  const [snsGrowthData, setSnsGrowthData] = useState([]);
  const [snsEngagementData, setSnsEngagementData] = useState([]);
  const [recentContents, setRecentContents] = useState([]);
  const [aiInsights, setAiInsights] = useState([]);
  const [loaded, setLoaded] = useState(false);

  useEffect(() => {
    Promise.all([
      analyticsService.getOverview(),
      analyticsService.getGrowth(),
      analyticsService.getEngagement(),
      analyticsService.getRecentContents(),
      analyticsService.getInsights(),
    ]).then(([overview, growth, engagement, contents, insights]) => {
      setSnsOverview(overview);
      setSnsGrowthData(growth);
      setSnsEngagementData(engagement);
      setRecentContents(contents);
      setAiInsights(insights);
      setLoaded(true);
    }).catch(console.error)
      .finally(() => setLoaded(true));
  }, []);

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
      {/* ===== Header ===== */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">SNS 분석 대시보드</h1>
          <p className="text-sm text-gray-500 mt-1">2025.09 ~ 2026.02 데이터 기준</p>
        </div>
        <div className="flex items-center gap-2 bg-white rounded-lg px-4 py-2 shadow-sm border border-gray-100 text-sm text-gray-600">
          <span className="w-2 h-2 rounded-full bg-green-500 animate-pulse" />
          실시간 업데이트
        </div>
      </div>

      {/* ===== Row 1 : KPI Cards ===== */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
        {snsOverview.map((p) => {
          const Icon = platformIcons[p.platform] || MessageCircle;
          const color = p.color || platformColors[p.platform] || '#6366f1';
          const isPositive = (p.growth || '').startsWith('+');
          return (
            <div
              key={p.platform}
              className="bg-white rounded-xl shadow-sm p-5 border-l-4 relative overflow-hidden"
              style={{ borderLeftColor: color }}
            >
              <div className="absolute -right-4 -bottom-4 opacity-[0.04]">
                <Icon size={120} />
              </div>
              <div className="relative z-10">
                <div className="flex items-center justify-between mb-4">
                  <div className="flex items-center gap-2">
                    <div className="w-9 h-9 rounded-lg flex items-center justify-center" style={{ backgroundColor: color + '14' }}>
                      <Icon size={18} style={{ color }} />
                    </div>
                    <span className="font-semibold text-gray-800">{p.platform}</span>
                  </div>
                  <span className={`text-xs font-semibold px-2.5 py-1 rounded-full ${isPositive ? 'bg-green-50 text-green-600' : 'bg-red-50 text-red-600'}`}>
                    {p.growth}
                  </span>
                </div>
                <div className="mb-3">
                  <div className="flex items-center gap-1.5 text-xs text-gray-500 mb-1">
                    <Users size={13} />
                    <span>구독자 / 팔로워</span>
                  </div>
                  <p className="text-2xl font-bold text-gray-900">{p.subscribers}</p>
                </div>
                <div className="flex items-center gap-4 text-sm">
                  <div className="flex items-center gap-1.5 text-gray-500">
                    <Eye size={14} />
                    <span>조회수</span>
                    <span className="font-medium text-gray-700">{p.total_views}</span>
                  </div>
                  <div className="flex items-center gap-1.5 text-gray-500">
                    {isPositive ? <TrendingUp size={14} className="text-green-500" /> : <TrendingDown size={14} className="text-red-500" />}
                    <span>참여율</span>
                    <span className="font-medium text-gray-700">{p.engagement}</span>
                  </div>
                </div>
              </div>
            </div>
          );
        })}
      </div>

      {/* ===== Row 2 : Charts ===== */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
        {/* Subscriber Growth */}
        <div className="bg-white rounded-xl shadow-sm p-5">
          <h2 className="text-base font-semibold text-gray-800 mb-4 flex items-center gap-2">
            <TrendingUp size={18} className="text-indigo-500" />
            구독자 성장 추이
          </h2>
          <ResponsiveContainer width="100%" height={300}>
            <AreaChart data={snsGrowthData} margin={{ top: 5, right: 20, left: 0, bottom: 5 }}>
              <defs>
                <linearGradient id="gradYoutube" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#FF0000" stopOpacity={0.15} />
                  <stop offset="95%" stopColor="#FF0000" stopOpacity={0} />
                </linearGradient>
                <linearGradient id="gradInstagram" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#E4405F" stopOpacity={0.15} />
                  <stop offset="95%" stopColor="#E4405F" stopOpacity={0} />
                </linearGradient>
                <linearGradient id="gradTiktok" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor={chartTikTokColor} stopOpacity={0.15} />
                  <stop offset="95%" stopColor={chartTikTokColor} stopOpacity={0} />
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
              <XAxis dataKey="month" tick={{ fontSize: 12 }} stroke="#9ca3af" />
              <YAxis tick={{ fontSize: 12 }} stroke="#9ca3af" tickFormatter={(v) => formatNumber(v)} />
              <Tooltip content={<GrowthTooltip />} />
              <Legend iconType="circle" iconSize={8} wrapperStyle={{ fontSize: '12px', paddingTop: '8px' }} />
              <Area type="monotone" dataKey="youtube" name="YouTube" stroke="#FF0000" strokeWidth={2} fill="url(#gradYoutube)" />
              <Area type="monotone" dataKey="instagram" name="Instagram" stroke="#E4405F" strokeWidth={2} fill="url(#gradInstagram)" />
              <Area type="monotone" dataKey="tiktok" name="TikTok" stroke={chartTikTokColor} strokeWidth={2} fill="url(#gradTiktok)" />
            </AreaChart>
          </ResponsiveContainer>
        </div>

        {/* Engagement Rate */}
        <div className="bg-white rounded-xl shadow-sm p-5">
          <h2 className="text-base font-semibold text-gray-800 mb-4 flex items-center gap-2">
            <Heart size={18} className="text-rose-500" />
            인게이지먼트율 추이
          </h2>
          <ResponsiveContainer width="100%" height={300}>
            <LineChart data={snsEngagementData} margin={{ top: 5, right: 20, left: 0, bottom: 5 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
              <XAxis dataKey="month" tick={{ fontSize: 12 }} stroke="#9ca3af" />
              <YAxis tick={{ fontSize: 12 }} stroke="#9ca3af" tickFormatter={(v) => `${v}%`} domain={[0, 'auto']} />
              <Tooltip content={<EngagementTooltip />} />
              <Legend iconType="circle" iconSize={8} wrapperStyle={{ fontSize: '12px', paddingTop: '8px' }} />
              <Line type="monotone" dataKey="youtube" name="YouTube" stroke="#FF0000" strokeWidth={2} dot={{ r: 4, fill: '#FF0000' }} activeDot={{ r: 6 }} />
              <Line type="monotone" dataKey="instagram" name="Instagram" stroke="#E4405F" strokeWidth={2} dot={{ r: 4, fill: '#E4405F' }} activeDot={{ r: 6 }} />
              <Line type="monotone" dataKey="tiktok" name="TikTok" stroke={chartTikTokColor} strokeWidth={2} dot={{ r: 4, fill: chartTikTokColor }} activeDot={{ r: 6 }} />
            </LineChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* ===== Row 3 : Recent Content + AI Insights ===== */}
      <div className="grid grid-cols-1 lg:grid-cols-5 gap-5">
        {/* Recent Content */}
        <div className="lg:col-span-3 space-y-4">
          <h2 className="text-base font-semibold text-gray-800 flex items-center gap-2">
            <Play size={18} className="text-indigo-500" />
            최근 콘텐츠 성과
          </h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            {recentContents.map((content) => {
              const color = platformColors[content.platform] || '#6366f1';
              return (
                <div key={content.id} className="bg-white rounded-xl shadow-sm hover:shadow-md transition-shadow overflow-hidden group cursor-pointer">
                  <div className="h-32 flex items-center justify-center text-5xl" style={{ backgroundColor: color + '0A' }}>
                    {content.thumbnail}
                  </div>
                  <div className="p-4">
                    <span className="inline-block text-xs font-semibold text-white px-2.5 py-0.5 rounded-full mb-2" style={{ backgroundColor: color }}>
                      {content.platform}
                    </span>
                    <h3 className="text-sm font-medium text-gray-800 line-clamp-2 mb-3 group-hover:text-indigo-600 transition-colors">
                      {content.title}
                    </h3>
                    <div className="flex items-center justify-between text-xs text-gray-500">
                      <div className="flex items-center gap-3">
                        <span className="flex items-center gap-1"><Eye size={13} />{content.views}</span>
                        <span className="flex items-center gap-1"><Heart size={13} />{content.likes}</span>
                      </div>
                      <span>{content.date}</span>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* AI Insights */}
        <div className="lg:col-span-2">
          <div className="bg-gradient-to-br from-indigo-50 to-purple-50 rounded-xl shadow-sm p-5 h-full">
            <h2 className="text-base font-semibold text-gray-800 flex items-center gap-2 mb-4">
              <Sparkles size={18} className="text-purple-500" />
              AI 마케팅 인사이트
            </h2>
            <div className="space-y-3">
              {aiInsights.map((insight) => (
                <div key={insight.id} className="bg-white/80 backdrop-blur-sm rounded-lg p-4 border border-white/60 hover:bg-white transition-colors">
                  <div className="flex items-center gap-2 mb-2">
                    <span className="w-2 h-2 rounded-full flex-shrink-0" style={{ backgroundColor: priorityColors[insight.priority] }} />
                    <span className={`text-[11px] font-medium px-2 py-0.5 rounded-full ${typeBadgeStyles[insight.type]}`}>
                      {typeLabels[insight.type]}
                    </span>
                  </div>
                  <p className="text-sm text-gray-700 leading-relaxed">{insight.message}</p>
                  <div className="flex items-center gap-1 mt-3 text-xs font-medium text-indigo-600 hover:text-indigo-700 cursor-pointer">
                    <Lightbulb size={13} />
                    자세히 보기
                    <ArrowUpRight size={12} />
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
