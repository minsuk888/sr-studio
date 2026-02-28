import { useState, useEffect, useMemo } from 'react';
import {
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
  Eye,
  Heart,
  Users,
  Play,
  Sparkles,
  Youtube,
  MessageCircle,
  Loader,
  Plus,
  X,
  RefreshCw,
  Settings,
  Search,
  ExternalLink,
  Tag,
  ThumbsUp,
  BarChart3,
  Video,
  Trophy,
  ArrowUpDown,
  Activity,
  Clock,
} from 'lucide-react';
import { analyticsService } from '../services/analyticsService';
import {
  calcEngagementRate,
  calcLikeRatio,
  calcCommentRatio,
  calcChannelEngagement,
  formatDuration,
} from '../services/analyticsService';

// ---------- helpers ----------

function formatNumber(num) {
  if (num == null) return '0';
  const n = Number(num);
  if (n >= 100000000) return (n / 100000000).toFixed(1) + '억';
  if (n >= 10000) return (n / 10000).toFixed(1) + '만';
  if (n >= 1000) return (n / 1000).toFixed(1) + 'K';
  return n.toLocaleString();
}

function formatFullDate(dateStr) {
  if (!dateStr) return '';
  return dateStr.split('T')[0];
}

// 마크다운 → HTML
function renderInsightText(text) {
  return text
    .split('\n')
    .map((line) => {
      if (line.startsWith('### ')) return `<h3 class="text-sm font-bold text-slate-800 mt-4 mb-2 flex items-center gap-1">${line.slice(4)}</h3>`;
      if (line.startsWith('## ')) return `<h3 class="text-sm font-bold text-slate-800 mt-4 mb-2 flex items-center gap-1">${line.slice(3)}</h3>`;
      if (line.startsWith('# ')) return `<h3 class="text-base font-bold text-slate-800 mt-4 mb-2">${line.slice(2)}</h3>`;
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

// 색상 팔레트
const CHANNEL_COLORS = ['#FF0000', '#3b82f6', '#10b981', '#f59e0b', '#8b5cf6', '#ec4899'];

// 탭 정의
const TABS = [
  { key: 'overview', label: '채널 개요', icon: BarChart3 },
  { key: 'content', label: '콘텐츠 분석', icon: Play },
  { key: 'monitoring', label: '업계 모니터링', icon: Search },
  { key: 'insights', label: 'AI 인사이트', icon: Sparkles },
];

// 정렬 옵션
const SORT_OPTIONS = [
  { key: 'date', label: '최신순' },
  { key: 'views', label: '조회수순' },
  { key: 'engagement', label: '인게이지먼트순' },
  { key: 'likes', label: '좋아요순' },
];

// 인게이지먼트 배지
function EngagementBadge({ rate }) {
  const color =
    rate >= 5
      ? 'bg-green-100 text-green-700'
      : rate >= 2
        ? 'bg-yellow-100 text-yellow-700'
        : 'bg-gray-100 text-gray-500';
  return (
    <span className={`text-[10px] px-1.5 py-0.5 rounded-full font-medium ${color}`}>
      {rate.toFixed(1)}%
    </span>
  );
}

// ============================================================
// Main Component
// ============================================================
export default function Analytics() {
  // ---- 탭 ----
  const [activeTab, setActiveTab] = useState('overview');

  // ---- 채널 데이터 ----
  const [channels, setChannels] = useState([]);
  const [channelStats, setChannelStats] = useState({});
  const [recentVideos, setRecentVideos] = useState([]);
  const [growthData, setGrowthData] = useState([]);

  // ---- 모니터링 ----
  const [monitoringKeywords, setMonitoringKeywords] = useState([]);
  const [monitoringResults, setMonitoringResults] = useState([]);
  const [newKeywordInput, setNewKeywordInput] = useState('');
  const [isSearching, setIsSearching] = useState(false);

  // ---- AI 인사이트 ----
  const [aiInsight, setAiInsight] = useState('');
  const [isGeneratingInsight, setIsGeneratingInsight] = useState(false);
  const [insightGeneratedAt, setInsightGeneratedAt] = useState('');

  // ---- 채널 관리 모달 ----
  const [showChannelModal, setShowChannelModal] = useState(false);
  const [newChannelInput, setNewChannelInput] = useState('');
  const [newChannelIsOwn, setNewChannelIsOwn] = useState(true);
  const [addingChannel, setAddingChannel] = useState(false);

  // ---- 콘텐츠 분석 정렬 ----
  const [videoSortBy, setVideoSortBy] = useState('date');

  // ---- UI ----
  const [loaded, setLoaded] = useState(false);
  const [isRefreshing, setIsRefreshing] = useState(false);

  // ---- 파생 데이터 ----
  const ownChannels = useMemo(() => channels.filter((c) => c.is_own), [channels]);
  const competitorChannels = useMemo(() => channels.filter((c) => !c.is_own), [channels]);

  // 영상 + 인게이지먼트율
  const enrichedVideos = useMemo(
    () =>
      recentVideos.map((v) => ({
        ...v,
        engagementRate: calcEngagementRate(v),
        likeRatio: calcLikeRatio(v),
        commentRatio: calcCommentRatio(v),
      })),
    [recentVideos],
  );

  // 정렬된 영상
  const sortedVideos = useMemo(() => {
    const sorted = [...enrichedVideos];
    switch (videoSortBy) {
      case 'views':
        sorted.sort((a, b) => (b.views || 0) - (a.views || 0));
        break;
      case 'engagement':
        sorted.sort((a, b) => b.engagementRate - a.engagementRate);
        break;
      case 'likes':
        sorted.sort((a, b) => (b.likes || 0) - (a.likes || 0));
        break;
      default:
        sorted.sort(
          (a, b) =>
            new Date(b.published_at || b.publishedAt) - new Date(a.published_at || a.publishedAt),
        );
    }
    return sorted;
  }, [enrichedVideos, videoSortBy]);

  // Top 3 퍼포머
  const topPerformers = useMemo(
    () => [...enrichedVideos].sort((a, b) => b.engagementRate - a.engagementRate).slice(0, 3),
    [enrichedVideos],
  );

  // KPI 집계
  const kpiData = useMemo(() => {
    const ownStats = ownChannels.map((ch) => channelStats[ch.channel_id] || {});
    const ownVideoIds = new Set(ownChannels.map((ch) => ch.channel_id));
    const ownVideos = enrichedVideos.filter(
      (v) => ownVideoIds.has(v.channel_id) || ownVideoIds.has(v.channelId),
    );
    return {
      totalSubs: ownStats.reduce((s, st) => s + (st.subscribers || 0), 0),
      totalViews: ownStats.reduce((s, st) => s + (st.totalViews || 0), 0),
      totalVideos: ownStats.reduce((s, st) => s + (st.videoCount || 0), 0),
      avgEngagement: calcChannelEngagement(ownVideos),
    };
  }, [ownChannels, channelStats, enrichedVideos]);

  // ---- 초기 데이터 로드 ----
  useEffect(() => {
    (async () => {
      try {
        const [channelsData, keywordsData, cachedInsight] = await Promise.all([
          analyticsService.getChannels(),
          analyticsService.getMonitoringKeywords(),
          analyticsService.getLatestAiInsight(),
        ]);
        setChannels(channelsData || []);
        setMonitoringKeywords(keywordsData || []);

        if (cachedInsight) {
          setAiInsight(cachedInsight.insight_text);
          setInsightGeneratedAt(
            new Date(cachedInsight.generated_at).toLocaleTimeString('ko-KR', {
              hour: '2-digit',
              minute: '2-digit',
            }),
          );
        }

        // 캐시된 영상 불러오기 (모든 채널)
        const allIds = (channelsData || []).map((c) => c.channel_id);
        const ownIds = (channelsData || []).filter((c) => c.is_own).map((c) => c.channel_id);
        if (allIds.length > 0) {
          const videos = await analyticsService.getCachedVideos(allIds);
          setRecentVideos(videos || []);
        }

        // 성장 차트 데이터 로드
        if (ownIds.length > 0) {
          try {
            const histories = await Promise.all(
              ownIds.map((id) => analyticsService.getChannelStatsHistory(id, 30)),
            );
            const dateMap = {};
            const channelNames = {};
            (channelsData || []).forEach((ch) => {
              if (ch.is_own) channelNames[ch.channel_id] = ch.name;
            });

            histories.forEach((history, idx) => {
              const chId = ownIds[idx];
              const chName = channelNames[chId] || chId;
              (history || []).forEach((row) => {
                const date = row.fetched_date;
                if (!dateMap[date]) dateMap[date] = { date };
                dateMap[date][chName] = row.subscribers || 0;
              });
            });

            const chartData = Object.values(dateMap).sort(
              (a, b) => new Date(a.date) - new Date(b.date),
            );
            setGrowthData(chartData);
          } catch (e) {
            console.error('성장 데이터 로드 실패:', e);
          }
        }
      } catch (err) {
        console.error('초기 로드 실패:', err);
      } finally {
        setLoaded(true);
      }
    })();
  }, []);

  // ---- 데이터 새로고침 ----
  const handleRefresh = async () => {
    if (channels.length === 0) {
      alert('먼저 채널을 등록해주세요.');
      return;
    }
    setIsRefreshing(true);
    try {
      const results = await analyticsService.refreshAllChannelData(channels);
      const statsMap = {};
      const allVideos = [];
      results.forEach((result) => {
        if (result.status === 'fulfilled') {
          const { channelId, stats, videos } = result.value;
          statsMap[channelId] = stats;
          allVideos.push(...videos);
        }
      });
      setChannelStats(statsMap);
      setRecentVideos(allVideos.sort((a, b) => new Date(b.publishedAt) - new Date(a.publishedAt)));

      // 채널 목록 새로고침
      const freshChannels = await analyticsService.getChannels();
      setChannels(freshChannels || []);

      // 성장 차트 갱신
      const ownIds = (freshChannels || []).filter((c) => c.is_own).map((c) => c.channel_id);
      if (ownIds.length > 0) {
        const channelNames = {};
        (freshChannels || []).forEach((ch) => {
          if (ch.is_own) channelNames[ch.channel_id] = ch.name;
        });
        const histories = await Promise.all(
          ownIds.map((id) => analyticsService.getChannelStatsHistory(id, 30)),
        );
        const dateMap = {};
        histories.forEach((history, idx) => {
          const chId = ownIds[idx];
          const chName = channelNames[chId] || chId;
          (history || []).forEach((row) => {
            const date = row.fetched_date;
            if (!dateMap[date]) dateMap[date] = { date };
            dateMap[date][chName] = row.subscribers || 0;
          });
        });
        setGrowthData(
          Object.values(dateMap).sort((a, b) => new Date(a.date) - new Date(b.date)),
        );
      }
    } catch (err) {
      console.error('데이터 새로고침 실패:', err);
      alert('데이터 새로고침에 실패했습니다.');
    } finally {
      setTimeout(() => setIsRefreshing(false), 500);
    }
  };

  // ---- 채널 추가 ----
  const handleAddChannel = async () => {
    const cid = newChannelInput.trim();
    if (!cid) return;
    setAddingChannel(true);
    try {
      const created = await analyticsService.addChannel(cid, 'youtube', newChannelIsOwn);
      setChannels((prev) => [...prev, created]);
      setNewChannelInput('');
      if (created.channel_id || created.id) {
        setChannelStats((prev) => ({
          ...prev,
          [created.channel_id]: {
            subscribers: created.subscribers,
            totalViews: created.totalViews,
            videoCount: created.videoCount,
          },
        }));
        // 초기 영상 데이터 반영
        if (created.initialVideos && created.initialVideos.length > 0) {
          setRecentVideos((prev) => {
            const merged = [...prev, ...created.initialVideos];
            merged.sort((a, b) => new Date(b.publishedAt || b.published_at) - new Date(a.publishedAt || a.published_at));
            return merged;
          });
        }
      }
    } catch (err) {
      alert(`채널 추가 실패: ${err.message}`);
    } finally {
      setAddingChannel(false);
    }
  };

  // ---- 채널 삭제 ----
  const handleRemoveChannel = async (id) => {
    if (!confirm('이 채널을 삭제하시겠습니까?')) return;
    try {
      const ch = channels.find((c) => c.id === id);
      await analyticsService.removeChannel(id);
      setChannels((prev) => prev.filter((c) => c.id !== id));
      // 관련 영상/통계 state도 정리
      if (ch) {
        setRecentVideos((prev) => prev.filter((v) => (v.channel_id || v.channelId) !== ch.channel_id));
        setChannelStats((prev) => {
          const next = { ...prev };
          delete next[ch.channel_id];
          return next;
        });
      }
    } catch (err) {
      alert(`채널 삭제 실패: ${err.message}`);
    }
  };

  // ---- AI 인사이트 생성 ----
  const handleGenerateInsight = async () => {
    const ownCh = channels.filter((c) => c.is_own);
    if (ownCh.length === 0 && recentVideos.length === 0) {
      alert('분석할 데이터가 없습니다. 먼저 채널을 등록하고 데이터를 새로고침해주세요.');
      return;
    }
    setIsGeneratingInsight(true);
    setAiInsight('');
    setActiveTab('insights');
    try {
      const channelData = ownCh.map((ch) => ({
        platform: ch.platform,
        name: ch.name,
        subscribers: channelStats[ch.channel_id]?.subscribers || 0,
        totalViews: channelStats[ch.channel_id]?.totalViews || 0,
        videoCount: channelStats[ch.channel_id]?.videoCount || 0,
      }));
      const competitorData = channels
        .filter((c) => !c.is_own)
        .map((ch) => ({
          name: ch.name,
          subscribers: channelStats[ch.channel_id]?.subscribers || 0,
          totalViews: channelStats[ch.channel_id]?.totalViews || 0,
        }));
      // 인게이지먼트 데이터 포함
      const videoData = enrichedVideos.slice(0, 12).map((v) => ({
        title: v.title,
        views: v.views,
        likes: v.likes,
        comments: v.comments,
        engagementRate: v.engagementRate?.toFixed(2),
        likeRatio: v.likeRatio?.toFixed(2),
        publishedAt: v.publishedAt || v.published_at,
      }));
      const data = await analyticsService.generateSnsInsights(channelData, videoData, competitorData);
      setAiInsight(data.insight || '인사이트를 생성하지 못했습니다.');
      setInsightGeneratedAt(
        new Date().toLocaleTimeString('ko-KR', { hour: '2-digit', minute: '2-digit' }),
      );
      await analyticsService.saveAiInsight(data.insight, data.analyzedCount);
    } catch (err) {
      setAiInsight('AI 인사이트 생성에 실패했습니다. API 키를 확인해주세요.\n\n오류: ' + err.message);
    } finally {
      setIsGeneratingInsight(false);
    }
  };

  // ---- 모니터링 키워드 추가/삭제 ----
  const handleAddKeyword = async () => {
    const kw = newKeywordInput.trim();
    if (!kw) return;
    if (monitoringKeywords.some((k) => k.keyword === kw)) {
      alert('이미 등록된 키워드입니다.');
      return;
    }
    try {
      const created = await analyticsService.addMonitoringKeyword(kw);
      setMonitoringKeywords((prev) => [...prev, created]);
      setNewKeywordInput('');
    } catch (err) {
      alert(`키워드 추가 실패: ${err.message}`);
    }
  };

  const handleRemoveKeyword = async (id) => {
    try {
      await analyticsService.removeMonitoringKeyword(id);
      setMonitoringKeywords((prev) => prev.filter((k) => k.id !== id));
    } catch (err) {
      alert(`키워드 삭제 실패: ${err.message}`);
    }
  };

  // ---- 모니터링 검색 ----
  const handleMonitoringSearch = async () => {
    if (monitoringKeywords.length === 0) {
      alert('모니터링 키워드를 먼저 등록해주세요.');
      return;
    }
    setIsSearching(true);
    try {
      const searches = monitoringKeywords.map((kw) =>
        analyticsService.searchYouTube(kw.keyword, 5),
      );
      const results = await Promise.all(searches);
      const allResults = results.flatMap((r) => r.results || []);
      const seen = new Set();
      const unique = allResults.filter((r) => {
        const key = r.videoId || r.channelId;
        if (!key || seen.has(key)) return false;
        seen.add(key);
        return true;
      });
      setMonitoringResults(unique);
    } catch (err) {
      console.error('모니터링 검색 실패:', err);
      alert('모니터링 검색에 실패했습니다.');
    } finally {
      setIsSearching(false);
    }
  };

  // ---- 채널별 인게이지먼트 계산 ----
  const channelEngagementMap = useMemo(() => {
    const map = {};
    channels.forEach((ch) => {
      const chVideos = enrichedVideos.filter(
        (v) => (v.channel_id || v.channelId) === ch.channel_id,
      );
      map[ch.channel_id] = calcChannelEngagement(chVideos);
    });
    return map;
  }, [channels, enrichedVideos]);

  // 성장 차트 채널 이름 목록
  const growthChannelNames = useMemo(() => {
    if (growthData.length === 0) return [];
    const first = growthData[0];
    return Object.keys(first).filter((k) => k !== 'date');
  }, [growthData]);

  // ---- 로딩 ----
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
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">SNS 분석 대시보드</h1>
          <p className="text-sm text-gray-500 mt-1">
            {channels.length > 0
              ? `YouTube 채널 ${channels.length}개 등록됨 (우리 ${ownChannels.length} / 경쟁 ${competitorChannels.length})`
              : 'YouTube 채널을 등록하면 실시간 분석이 시작됩니다'}
          </p>
        </div>
        <div className="flex items-center gap-2 flex-wrap">
          <button
            onClick={() => setShowChannelModal(true)}
            className="flex items-center gap-1.5 px-3 py-2 bg-white text-gray-700 text-sm font-medium rounded-lg hover:bg-gray-50 transition-colors border border-gray-200 shadow-sm"
          >
            <Settings size={15} />
            채널 관리
          </button>
          <button
            onClick={handleRefresh}
            disabled={isRefreshing || channels.length === 0}
            className="flex items-center gap-1.5 px-3 py-2 bg-white text-gray-700 text-sm font-medium rounded-lg hover:bg-gray-50 transition-colors border border-gray-200 shadow-sm disabled:opacity-50"
          >
            <RefreshCw size={15} className={isRefreshing ? 'animate-spin' : ''} />
            {isRefreshing ? '갱신 중...' : '새로고침'}
          </button>
        </div>
      </div>

      {/* ===== 탭 네비게이션 ===== */}
      <div className="flex items-center gap-1 border-b border-slate-200">
        {TABS.map((tab) => {
          const Icon = tab.icon;
          return (
            <button
              key={tab.key}
              onClick={() => setActiveTab(tab.key)}
              className={`relative px-4 py-2.5 text-sm font-medium transition-colors cursor-pointer ${
                activeTab === tab.key ? 'text-red-500' : 'text-slate-500 hover:text-slate-700'
              }`}
            >
              <span className="flex items-center gap-1.5">
                <Icon size={15} />
                {tab.label}
              </span>
              {activeTab === tab.key && (
                <span className="absolute bottom-0 left-0 right-0 h-0.5 bg-red-500 rounded-full" />
              )}
            </button>
          );
        })}
      </div>

      {/* ===== 채널 없을 때 안내 ===== */}
      {channels.length === 0 && (
        <div className="bg-white rounded-xl shadow-sm p-12 text-center">
          <Youtube size={48} className="text-red-400 mx-auto mb-4" />
          <h3 className="text-lg font-semibold text-gray-700 mb-2">YouTube 채널을 등록해보세요</h3>
          <p className="text-sm text-gray-500 mb-4">
            채널을 등록하면 구독자 수, 조회수, 인게이지먼트 등을 실시간으로 분석할 수 있습니다.
          </p>
          <button
            onClick={() => setShowChannelModal(true)}
            className="px-4 py-2 bg-red-500 text-white text-sm font-medium rounded-lg hover:bg-red-600 transition-colors"
          >
            <Plus size={15} className="inline mr-1" />
            채널 등록하기
          </button>
        </div>
      )}

      {/* ================================================================ */}
      {/* TAB 1: 채널 개요 */}
      {/* ================================================================ */}
      {activeTab === 'overview' && channels.length > 0 && (
        <div className="space-y-6">
          {/* 채널 프로필 + KPI */}
          {ownChannels.map((ch, idx) => {
            const stats = channelStats[ch.channel_id] || {};
            const engagement = channelEngagementMap[ch.channel_id] || 0;
            const chVideos = enrichedVideos.filter(
              (v) => (v.channel_id || v.channelId) === ch.channel_id,
            );
            const avgViews = chVideos.length > 0
              ? Math.round(chVideos.reduce((s, v) => s + (v.views || 0), 0) / chVideos.length) : 0;
            const avgLikes = chVideos.length > 0
              ? Math.round(chVideos.reduce((s, v) => s + (v.likes || 0), 0) / chVideos.length) : 0;
            const avgComments = chVideos.length > 0
              ? Math.round(chVideos.reduce((s, v) => s + (v.comments || 0), 0) / chVideos.length) : 0;
            const avgLikeRatio = chVideos.length > 0
              ? chVideos.reduce((s, v) => s + v.likeRatio, 0) / chVideos.length : 0;
            const avgCommentRatio = chVideos.length > 0
              ? chVideos.reduce((s, v) => s + v.commentRatio, 0) / chVideos.length : 0;
            const totalVideoViews = chVideos.reduce((s, v) => s + (v.views || 0), 0);
            const viewsPerSub = (stats.subscribers || 0) > 0
              ? (avgViews / stats.subscribers * 100).toFixed(1) : '0';

            return (
              <div key={ch.id} className="space-y-4">
                {/* 채널 프로필 헤더 */}
                <div className="bg-white rounded-xl shadow-sm p-5 border border-gray-100">
                  <div className="flex items-center gap-4 mb-5">
                    {ch.thumbnail ? (
                      <img src={ch.thumbnail} alt={ch.name} className="w-16 h-16 rounded-full object-cover ring-2 ring-red-100" />
                    ) : (
                      <div className="w-16 h-16 rounded-full bg-red-100 flex items-center justify-center">
                        <Youtube size={28} className="text-red-500" />
                      </div>
                    )}
                    <div>
                      <h2 className="text-lg font-bold text-gray-900">{ch.name}</h2>
                      {ch.handle && <p className="text-sm text-gray-400">{ch.handle}</p>}
                      <span className="text-[10px] px-2 py-0.5 rounded-full bg-red-50 text-red-600 font-medium mt-1 inline-block">우리 채널</span>
                    </div>
                  </div>
                  {/* 핵심 KPI 6칸 */}
                  <div className="grid grid-cols-3 md:grid-cols-6 gap-3">
                    {[
                      { label: '구독자', value: formatNumber(stats.subscribers || 0), icon: Users, color: 'text-red-500', bg: 'bg-red-50' },
                      { label: '총 조회수', value: formatNumber(stats.totalViews || 0), icon: Eye, color: 'text-blue-500', bg: 'bg-blue-50' },
                      { label: '총 영상 수', value: formatNumber(stats.videoCount || 0), icon: Video, color: 'text-purple-500', bg: 'bg-purple-50' },
                      { label: '인게이지먼트', value: `${engagement.toFixed(2)}%`, icon: Activity, color: 'text-green-500', bg: 'bg-green-50' },
                      { label: '평균 좋아요율', value: `${avgLikeRatio.toFixed(2)}%`, icon: Heart, color: 'text-pink-500', bg: 'bg-pink-50' },
                      { label: '조회/구독 비율', value: `${viewsPerSub}%`, icon: TrendingUp, color: 'text-orange-500', bg: 'bg-orange-50' },
                    ].map((kpi) => (
                      <div key={kpi.label} className="text-center p-3 rounded-lg border border-gray-50">
                        <div className={`inline-flex p-1.5 rounded-lg ${kpi.bg} mb-1.5`}>
                          <kpi.icon size={14} className={kpi.color} />
                        </div>
                        <p className="text-lg font-bold text-gray-900">{kpi.value}</p>
                        <p className="text-[10px] text-gray-400">{kpi.label}</p>
                      </div>
                    ))}
                  </div>
                </div>

                {/* 영상 성과 상세 분석 */}
                {chVideos.length > 0 && (
                  <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-5">
                    <h3 className="text-sm font-semibold text-gray-700 mb-4 flex items-center gap-1.5">
                      <Activity size={15} className="text-green-500" />
                      최근 영상 성과 분석 ({chVideos.length}개)
                    </h3>
                    <div className="grid grid-cols-2 md:grid-cols-5 gap-3 mb-5">
                      <div className="text-center p-3 bg-blue-50 rounded-lg">
                        <p className="text-[10px] text-blue-500 mb-1">평균 조회수</p>
                        <p className="text-base font-bold text-blue-700">{formatNumber(avgViews)}</p>
                      </div>
                      <div className="text-center p-3 bg-pink-50 rounded-lg">
                        <p className="text-[10px] text-pink-500 mb-1">평균 좋아요</p>
                        <p className="text-base font-bold text-pink-700">{formatNumber(avgLikes)}</p>
                      </div>
                      <div className="text-center p-3 bg-indigo-50 rounded-lg">
                        <p className="text-[10px] text-indigo-500 mb-1">평균 댓글</p>
                        <p className="text-base font-bold text-indigo-700">{formatNumber(avgComments)}</p>
                      </div>
                      <div className="text-center p-3 bg-green-50 rounded-lg">
                        <p className="text-[10px] text-green-500 mb-1">평균 좋아요율</p>
                        <p className="text-base font-bold text-green-700">{avgLikeRatio.toFixed(2)}%</p>
                      </div>
                      <div className="text-center p-3 bg-amber-50 rounded-lg">
                        <p className="text-[10px] text-amber-500 mb-1">평균 댓글율</p>
                        <p className="text-base font-bold text-amber-700">{avgCommentRatio.toFixed(3)}%</p>
                      </div>
                    </div>

                    {/* 영상별 상세 테이블 */}
                    <div className="overflow-x-auto">
                      <table className="w-full text-sm">
                        <thead>
                          <tr className="bg-gray-50 text-gray-500 text-[11px]">
                            <th className="text-left px-3 py-2.5 font-medium w-8">#</th>
                            <th className="text-left px-3 py-2.5 font-medium">영상</th>
                            <th className="text-right px-3 py-2.5 font-medium">조회수</th>
                            <th className="text-right px-3 py-2.5 font-medium">좋아요</th>
                            <th className="text-right px-3 py-2.5 font-medium">댓글</th>
                            <th className="text-right px-3 py-2.5 font-medium">좋아요율</th>
                            <th className="text-right px-3 py-2.5 font-medium">인게이지먼트</th>
                            <th className="text-right px-3 py-2.5 font-medium">게시일</th>
                          </tr>
                        </thead>
                        <tbody>
                          {[...chVideos]
                            .sort((a, b) => b.engagementRate - a.engagementRate)
                            .map((v, i) => (
                              <tr key={v.video_id || v.videoId || i} className="border-t border-gray-50 hover:bg-gray-50/50">
                                <td className="px-3 py-2.5 text-gray-400 text-xs">{i + 1}</td>
                                <td className="px-3 py-2.5">
                                  <a
                                    href={`https://youtube.com/watch?v=${v.video_id || v.videoId}`}
                                    target="_blank"
                                    rel="noopener noreferrer"
                                    className="flex items-center gap-2 hover:text-indigo-600 transition-colors"
                                  >
                                    {v.thumbnail && (
                                      <img src={v.thumbnail} alt="" className="w-14 h-8 rounded object-cover flex-shrink-0" />
                                    )}
                                    <span className="text-xs font-medium text-gray-700 line-clamp-2 hover:text-indigo-600">{v.title}</span>
                                  </a>
                                </td>
                                <td className="text-right px-3 py-2.5 text-xs font-semibold text-gray-700">{formatNumber(v.views)}</td>
                                <td className="text-right px-3 py-2.5 text-xs text-pink-600">{formatNumber(v.likes)}</td>
                                <td className="text-right px-3 py-2.5 text-xs text-indigo-600">{formatNumber(v.comments)}</td>
                                <td className="text-right px-3 py-2.5 text-xs text-gray-600">{v.likeRatio.toFixed(2)}%</td>
                                <td className="text-right px-3 py-2.5"><EngagementBadge rate={v.engagementRate} /></td>
                                <td className="text-right px-3 py-2.5 text-[11px] text-gray-400">{formatFullDate(v.published_at || v.publishedAt)}</td>
                              </tr>
                            ))}
                        </tbody>
                      </table>
                    </div>
                  </div>
                )}
              </div>
            );
          })}

          {/* 구독자 성장 추이 차트 */}
          {growthData.length > 1 && growthChannelNames.length > 0 && (
            <div className="bg-white rounded-xl shadow-sm p-5 border border-gray-100">
              <h2 className="text-sm font-semibold text-gray-700 mb-4 flex items-center gap-1.5">
                <TrendingUp size={15} className="text-indigo-500" />
                구독자 성장 추이 (최근 30일)
              </h2>
              <ResponsiveContainer width="100%" height={280}>
                <AreaChart data={growthData}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
                  <XAxis
                    dataKey="date"
                    tick={{ fontSize: 11, fill: '#94a3b8' }}
                    tickFormatter={(d) => d.slice(5)}
                  />
                  <YAxis tick={{ fontSize: 11, fill: '#94a3b8' }} tickFormatter={formatNumber} />
                  <Tooltip
                    contentStyle={{ fontSize: 12, borderRadius: 8 }}
                    formatter={(value) => [formatNumber(value), '구독자']}
                    labelFormatter={(l) => `날짜: ${l}`}
                  />
                  <Legend wrapperStyle={{ fontSize: 12 }} />
                  {growthChannelNames.map((name, idx) => (
                    <Area
                      key={name}
                      type="monotone"
                      dataKey={name}
                      stroke={CHANNEL_COLORS[idx % CHANNEL_COLORS.length]}
                      fill={CHANNEL_COLORS[idx % CHANNEL_COLORS.length]}
                      fillOpacity={0.15}
                      strokeWidth={2}
                    />
                  ))}
                </AreaChart>
              </ResponsiveContainer>
            </div>
          )}

          {growthData.length <= 1 && ownChannels.length > 0 && (
            <div className="bg-white rounded-xl shadow-sm p-6 border border-gray-100 text-center">
              <TrendingUp size={32} className="text-gray-300 mx-auto mb-2" />
              <p className="text-sm text-gray-400">
                성장 추이 차트는 2일 이상 데이터가 쌓이면 표시됩니다.
                <br />
                매일 새로고침하여 데이터를 수집해주세요.
              </p>
            </div>
          )}

          {/* 최근 콘텐츠 미리보기 */}
          {enrichedVideos.length > 0 && (
            <div>
              <div className="flex items-center justify-between mb-3">
                <h2 className="text-sm font-semibold text-gray-700 flex items-center gap-1.5">
                  <Play size={15} className="text-indigo-500" />
                  최근 콘텐츠
                </h2>
                <button
                  onClick={() => setActiveTab('content')}
                  className="text-xs text-indigo-500 hover:text-indigo-700 font-medium transition-colors"
                >
                  전체보기 &rarr;
                </button>
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
                {enrichedVideos.slice(0, 4).map((video, idx) => (
                  <a
                    key={video.video_id || video.videoId || idx}
                    href={`https://youtube.com/watch?v=${video.video_id || video.videoId}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="bg-white rounded-xl shadow-sm hover:shadow-md transition-shadow overflow-hidden group"
                  >
                    <div className="aspect-video bg-gray-100 relative overflow-hidden">
                      {video.thumbnail && (
                        <img
                          src={video.thumbnail}
                          alt={video.title}
                          className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                        />
                      )}
                    </div>
                    <div className="p-2.5">
                      <h3 className="text-xs font-medium text-gray-800 line-clamp-2 mb-1.5 group-hover:text-indigo-600 transition-colors leading-snug">
                        {video.title}
                      </h3>
                      <div className="flex items-center justify-between text-[11px] text-gray-400">
                        <div className="flex items-center gap-1.5">
                          <span><Eye size={10} className="inline" /> {formatNumber(video.views)}</span>
                          <EngagementBadge rate={video.engagementRate} />
                        </div>
                        <span>{formatFullDate(video.published_at || video.publishedAt)}</span>
                      </div>
                    </div>
                  </a>
                ))}
              </div>
            </div>
          )}

          {/* 경쟁 채널 비교 테이블 */}
          {competitorChannels.length > 0 && (
            <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
              <div className="p-4 border-b border-gray-100">
                <h2 className="text-sm font-semibold text-gray-700 flex items-center gap-1.5">
                  <BarChart3 size={15} className="text-blue-500" />
                  경쟁/관련 채널 비교
                </h2>
              </div>
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="bg-gray-50 text-gray-500 text-xs">
                      <th className="text-left px-4 py-3 font-medium">채널</th>
                      <th className="text-right px-4 py-3 font-medium">구독자</th>
                      <th className="text-right px-4 py-3 font-medium">총 조회수</th>
                      <th className="text-right px-4 py-3 font-medium">영상 수</th>
                      <th className="text-right px-4 py-3 font-medium">인게이지먼트</th>
                    </tr>
                  </thead>
                  <tbody>
                    {competitorChannels.map((ch) => {
                      const stats = channelStats[ch.channel_id] || {};
                      const engagement = channelEngagementMap[ch.channel_id] || 0;
                      return (
                        <tr key={ch.id} className="border-t border-gray-50 hover:bg-gray-50/50">
                          <td className="px-4 py-3">
                            <div className="flex items-center gap-2">
                              {ch.thumbnail ? (
                                <img src={ch.thumbnail} alt="" className="w-7 h-7 rounded-full object-cover" />
                              ) : (
                                <div className="w-7 h-7 rounded-full bg-gray-100 flex items-center justify-center">
                                  <Youtube size={12} className="text-gray-400" />
                                </div>
                              )}
                              <span className="font-medium text-gray-700 truncate max-w-[160px]">{ch.name}</span>
                            </div>
                          </td>
                          <td className="text-right px-4 py-3 font-semibold text-gray-800">{formatNumber(stats.subscribers || 0)}</td>
                          <td className="text-right px-4 py-3 text-gray-600">{formatNumber(stats.totalViews || 0)}</td>
                          <td className="text-right px-4 py-3 text-gray-600">{stats.videoCount || 0}</td>
                          <td className="text-right px-4 py-3"><EngagementBadge rate={engagement} /></td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </div>
      )}

      {/* ================================================================ */}
      {/* TAB 2: 콘텐츠 분석 */}
      {/* ================================================================ */}
      {activeTab === 'content' && (
        <div className="space-y-6">
          {enrichedVideos.length === 0 ? (
            <div className="bg-white rounded-xl shadow-sm p-12 text-center">
              <Play size={48} className="text-gray-300 mx-auto mb-4" />
              <h3 className="text-lg font-semibold text-gray-600 mb-2">영상 데이터가 없습니다</h3>
              <p className="text-sm text-gray-400">
                채널을 등록하고 새로고침 버튼을 눌러 영상 데이터를 가져오세요.
              </p>
            </div>
          ) : (
            <>
              {/* 성과 요약 바 */}
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                {topPerformers[0] && (
                  <div className="bg-gradient-to-br from-yellow-50 to-orange-50 rounded-xl shadow-sm p-4 border border-yellow-100">
                    <div className="flex items-center gap-2 mb-2">
                      <Trophy size={16} className="text-yellow-500" />
                      <span className="text-xs font-medium text-yellow-700">최고 인게이지먼트</span>
                    </div>
                    <p className="text-sm font-semibold text-gray-800 line-clamp-1">{topPerformers[0].title}</p>
                    <p className="text-lg font-bold text-yellow-600 mt-1">{topPerformers[0].engagementRate.toFixed(2)}%</p>
                  </div>
                )}
                <div className="bg-white rounded-xl shadow-sm p-4 border border-gray-100">
                  <div className="flex items-center gap-2 mb-2">
                    <Eye size={16} className="text-blue-500" />
                    <span className="text-xs font-medium text-gray-500">평균 조회수</span>
                  </div>
                  <p className="text-lg font-bold text-gray-900">
                    {formatNumber(
                      enrichedVideos.length > 0
                        ? Math.round(enrichedVideos.reduce((s, v) => s + (v.views || 0), 0) / enrichedVideos.length)
                        : 0,
                    )}
                  </p>
                </div>
                <div className="bg-white rounded-xl shadow-sm p-4 border border-gray-100">
                  <div className="flex items-center gap-2 mb-2">
                    <Video size={16} className="text-purple-500" />
                    <span className="text-xs font-medium text-gray-500">분석 영상</span>
                  </div>
                  <p className="text-lg font-bold text-gray-900">{enrichedVideos.length}개</p>
                </div>
              </div>

              {/* Top 3 퍼포머 */}
              {topPerformers.length > 0 && (
                <div>
                  <h2 className="text-sm font-semibold text-gray-700 mb-3 flex items-center gap-1.5">
                    <Trophy size={15} className="text-yellow-500" />
                    Top 퍼포머 (인게이지먼트 기준)
                  </h2>
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    {topPerformers.map((video, idx) => (
                      <a
                        key={video.video_id || video.videoId || idx}
                        href={`https://youtube.com/watch?v=${video.video_id || video.videoId}`}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="bg-white rounded-xl shadow-sm hover:shadow-md transition-shadow overflow-hidden group relative"
                      >
                        <div className="absolute top-2 left-2 z-10 w-6 h-6 rounded-full bg-yellow-400 text-white text-xs font-bold flex items-center justify-center shadow">
                          {idx + 1}
                        </div>
                        <div className="aspect-video bg-gray-100 relative overflow-hidden">
                          {video.thumbnail && (
                            <img
                              src={video.thumbnail}
                              alt={video.title}
                              className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                            />
                          )}
                        </div>
                        <div className="p-3">
                          <h3 className="text-sm font-medium text-gray-800 line-clamp-2 mb-2 group-hover:text-indigo-600 transition-colors leading-snug">
                            {video.title}
                          </h3>
                          <div className="flex items-center justify-between text-xs text-gray-500">
                            <div className="flex items-center gap-2">
                              <span className="flex items-center gap-0.5"><Eye size={12} />{formatNumber(video.views)}</span>
                              <EngagementBadge rate={video.engagementRate} />
                            </div>
                            <span className="flex items-center gap-0.5">
                              <ThumbsUp size={11} />{formatNumber(video.likes)}
                              <MessageCircle size={11} className="ml-1" />{formatNumber(video.comments)}
                            </span>
                          </div>
                        </div>
                      </a>
                    ))}
                  </div>
                </div>
              )}

              {/* 정렬 + 전체 영상 그리드 */}
              <div>
                <div className="flex items-center justify-between mb-3">
                  <h2 className="text-sm font-semibold text-gray-700 flex items-center gap-1.5">
                    <Play size={15} className="text-indigo-500" />
                    전체 영상 성과
                  </h2>
                  <div className="flex items-center gap-1.5">
                    <ArrowUpDown size={13} className="text-gray-400" />
                    {SORT_OPTIONS.map((opt) => (
                      <button
                        key={opt.key}
                        onClick={() => setVideoSortBy(opt.key)}
                        className={`px-2.5 py-1 text-xs rounded-full transition-colors ${
                          videoSortBy === opt.key
                            ? 'bg-indigo-100 text-indigo-700 font-medium'
                            : 'text-gray-500 hover:bg-gray-100'
                        }`}
                      >
                        {opt.label}
                      </button>
                    ))}
                  </div>
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                  {sortedVideos.map((video, idx) => (
                    <a
                      key={video.video_id || video.videoId || idx}
                      href={`https://youtube.com/watch?v=${video.video_id || video.videoId}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="bg-white rounded-xl shadow-sm hover:shadow-md transition-shadow overflow-hidden group"
                    >
                      <div className="aspect-video bg-gray-100 relative overflow-hidden">
                        {video.thumbnail ? (
                          <img
                            src={video.thumbnail}
                            alt={video.title}
                            className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                          />
                        ) : (
                          <div className="w-full h-full flex items-center justify-center text-gray-300">
                            <Play size={40} />
                          </div>
                        )}
                        <div className="absolute top-2 right-2 bg-black/70 text-white text-[10px] px-1.5 py-0.5 rounded flex items-center gap-0.5">
                          <Youtube size={10} /> YouTube
                        </div>
                        {video.duration && (
                          <div className="absolute bottom-2 right-2 bg-black/80 text-white text-[10px] px-1.5 py-0.5 rounded flex items-center gap-0.5">
                            <Clock size={9} /> {formatDuration(video.duration)}
                          </div>
                        )}
                      </div>
                      <div className="p-3">
                        <h3 className="text-sm font-medium text-gray-800 line-clamp-2 mb-2 group-hover:text-indigo-600 transition-colors leading-snug">
                          {video.title}
                        </h3>
                        <div className="flex items-center justify-between text-xs text-gray-500 mb-1.5">
                          <div className="flex items-center gap-2.5">
                            <span className="flex items-center gap-0.5"><Eye size={12} />{formatNumber(video.views)}</span>
                            <span className="flex items-center gap-0.5"><ThumbsUp size={12} />{formatNumber(video.likes)}</span>
                            <span className="flex items-center gap-0.5"><MessageCircle size={12} />{formatNumber(video.comments)}</span>
                          </div>
                        </div>
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-1.5">
                            <span className="text-[10px] text-gray-400">인게이지먼트</span>
                            <EngagementBadge rate={video.engagementRate} />
                          </div>
                          <span className="text-[11px] text-gray-400">{formatFullDate(video.published_at || video.publishedAt)}</span>
                        </div>
                      </div>
                    </a>
                  ))}
                </div>
              </div>
            </>
          )}
        </div>
      )}

      {/* ================================================================ */}
      {/* TAB 3: 업계 모니터링 */}
      {/* ================================================================ */}
      {activeTab === 'monitoring' && (
        <div>
          <div className="bg-white rounded-xl shadow-sm p-5 border border-gray-100">
            <div className="flex items-center gap-2 mb-3">
              <input
                type="text"
                value={newKeywordInput}
                onChange={(e) => setNewKeywordInput(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && handleAddKeyword()}
                placeholder="모니터링 키워드 입력..."
                className="flex-1 px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:border-transparent"
              />
              <button
                onClick={handleAddKeyword}
                className="px-3 py-2 bg-emerald-500 text-white text-sm rounded-lg hover:bg-emerald-600 transition-colors"
              >
                <Plus size={15} />
              </button>
            </div>

            {monitoringKeywords.length > 0 && (
              <div className="flex flex-wrap gap-2 mb-3">
                {monitoringKeywords.map((kw) => (
                  <span
                    key={kw.id}
                    className="inline-flex items-center gap-1 px-2.5 py-1 bg-emerald-50 text-emerald-700 text-xs font-medium rounded-full"
                  >
                    <Tag size={11} />
                    {kw.keyword}
                    <button
                      onClick={() => handleRemoveKeyword(kw.id)}
                      className="ml-0.5 hover:text-red-500 transition-colors"
                    >
                      <X size={12} />
                    </button>
                  </span>
                ))}
                <button
                  onClick={handleMonitoringSearch}
                  disabled={isSearching}
                  className="inline-flex items-center gap-1 px-3 py-1 bg-emerald-500 text-white text-xs font-medium rounded-full hover:bg-emerald-600 transition-colors disabled:opacity-50"
                >
                  {isSearching ? <Loader size={12} className="animate-spin" /> : <Search size={12} />}
                  {isSearching ? '검색 중...' : '모니터링 실행'}
                </button>
              </div>
            )}

            {monitoringResults.length > 0 && (
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3 mt-4">
                {monitoringResults.slice(0, 12).map((result, idx) => (
                  <a
                    key={result.videoId || idx}
                    href={result.videoId ? `https://youtube.com/watch?v=${result.videoId}` : '#'}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex gap-3 p-3 rounded-lg border border-gray-100 hover:bg-gray-50 transition-colors"
                  >
                    {result.thumbnail && (
                      <img src={result.thumbnail} alt="" className="w-24 h-16 rounded object-cover flex-shrink-0" />
                    )}
                    <div className="min-w-0 flex-1">
                      <h4 className="text-xs font-medium text-gray-800 line-clamp-2 mb-1">{result.title}</h4>
                      <p className="text-[11px] text-gray-400">{result.channelTitle}</p>
                      <p className="text-[11px] text-gray-400">{formatFullDate(result.publishedAt)}</p>
                    </div>
                    <ExternalLink size={12} className="text-gray-300 flex-shrink-0 mt-1" />
                  </a>
                ))}
              </div>
            )}

            {monitoringKeywords.length === 0 && (
              <p className="text-sm text-gray-400 text-center py-4">
                키워드를 등록하면 YouTube에서 관련 영상을 검색합니다
              </p>
            )}
          </div>
        </div>
      )}

      {/* ================================================================ */}
      {/* TAB 4: AI 인사이트 */}
      {/* ================================================================ */}
      {activeTab === 'insights' && (
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Sparkles size={18} className="text-purple-500" />
              <h2 className="text-base font-semibold text-gray-800">AI SNS 인사이트</h2>
              {insightGeneratedAt && (
                <span className="text-xs text-gray-400 ml-2">마지막 생성: {insightGeneratedAt}</span>
              )}
            </div>
            <button
              onClick={handleGenerateInsight}
              disabled={isGeneratingInsight}
              className="flex items-center gap-1.5 px-4 py-2 bg-gradient-to-r from-purple-500 to-indigo-500 text-white text-sm font-medium rounded-lg hover:from-purple-600 hover:to-indigo-600 transition-all disabled:opacity-50 shadow-sm"
            >
              <Sparkles size={15} className={isGeneratingInsight ? 'animate-spin' : ''} />
              {isGeneratingInsight ? '분석 중...' : '인사이트 생성'}
            </button>
          </div>

          <div className="bg-gradient-to-br from-indigo-50 via-white to-purple-50 rounded-xl shadow-sm border border-indigo-100 p-6">
            {isGeneratingInsight ? (
              <div className="flex items-center gap-2 py-12 justify-center text-sm text-indigo-600">
                <Loader className="w-5 h-5 animate-spin" />
                Claude AI가 채널 데이터, 영상 성과, 인게이지먼트를 분석하고 있습니다...
              </div>
            ) : aiInsight ? (
              <div
                className="prose-sm max-w-none"
                dangerouslySetInnerHTML={{ __html: renderInsightText(aiInsight) }}
              />
            ) : (
              <div className="text-center py-12">
                <Sparkles size={40} className="text-purple-200 mx-auto mb-3" />
                <p className="text-sm text-gray-400 mb-1">아직 생성된 인사이트가 없습니다.</p>
                <p className="text-xs text-gray-400">
                  채널을 등록하고 데이터를 새로고침한 뒤, 인사이트를 생성해보세요.
                </p>
              </div>
            )}
          </div>

          {/* 분석 데이터 요약 */}
          {(ownChannels.length > 0 || enrichedVideos.length > 0) && (
            <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-4">
              <h3 className="text-xs font-semibold text-gray-500 mb-3">AI에게 전달되는 분석 데이터</h3>
              <div className="flex flex-wrap gap-3 text-xs text-gray-600">
                <span className="flex items-center gap-1 px-2.5 py-1 bg-gray-50 rounded-full">
                  <Youtube size={12} className="text-red-500" />
                  우리 채널 {ownChannels.length}개
                </span>
                <span className="flex items-center gap-1 px-2.5 py-1 bg-gray-50 rounded-full">
                  <BarChart3 size={12} className="text-blue-500" />
                  경쟁 채널 {competitorChannels.length}개
                </span>
                <span className="flex items-center gap-1 px-2.5 py-1 bg-gray-50 rounded-full">
                  <Video size={12} className="text-purple-500" />
                  최근 영상 {Math.min(enrichedVideos.length, 12)}개
                </span>
                <span className="flex items-center gap-1 px-2.5 py-1 bg-gray-50 rounded-full">
                  <Activity size={12} className="text-green-500" />
                  인게이지먼트 데이터 포함
                </span>
              </div>
            </div>
          )}
        </div>
      )}

      {/* ===== 채널 관리 모달 ===== */}
      {showChannelModal && (
        <div
          className="fixed inset-0 bg-black/40 backdrop-blur-sm flex items-center justify-center z-50 p-4"
          onClick={() => setShowChannelModal(false)}
        >
          <div
            className="bg-white rounded-2xl shadow-2xl w-full max-w-lg max-h-[80vh] overflow-y-auto"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="p-6">
              <div className="flex items-center justify-between mb-5">
                <h2 className="text-lg font-bold text-gray-900">채널 관리</h2>
                <button onClick={() => setShowChannelModal(false)} className="p-1 rounded-full hover:bg-gray-100 text-gray-400">
                  <X size={20} />
                </button>
              </div>

              <div className="mb-5">
                <label className="block text-sm font-medium text-gray-700 mb-2">YouTube 채널 추가</label>
                <input
                  type="text"
                  value={newChannelInput}
                  onChange={(e) => setNewChannelInput(e.target.value)}
                  onKeyDown={(e) => e.key === 'Enter' && handleAddChannel()}
                  placeholder="채널 ID (UCxxxxxxx) 또는 @handle"
                  className="w-full px-3 py-2.5 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-red-500 focus:border-transparent mb-3"
                />
                <div className="flex items-center gap-4 mb-3">
                  <label className="flex items-center gap-2 cursor-pointer">
                    <input
                      type="radio"
                      checked={newChannelIsOwn}
                      onChange={() => setNewChannelIsOwn(true)}
                      className="text-red-500 focus:ring-red-500"
                    />
                    <span className="text-sm text-gray-700">우리 채널</span>
                  </label>
                  <label className="flex items-center gap-2 cursor-pointer">
                    <input
                      type="radio"
                      checked={!newChannelIsOwn}
                      onChange={() => setNewChannelIsOwn(false)}
                      className="text-blue-500 focus:ring-blue-500"
                    />
                    <span className="text-sm text-gray-700">경쟁사 / 관련 채널</span>
                  </label>
                </div>
                <button
                  onClick={handleAddChannel}
                  disabled={addingChannel || !newChannelInput.trim()}
                  className="w-full flex items-center justify-center gap-2 px-4 py-2.5 bg-red-500 text-white text-sm font-medium rounded-lg hover:bg-red-600 transition-colors disabled:opacity-50"
                >
                  {addingChannel ? (
                    <>
                      <Loader size={15} className="animate-spin" />
                      채널 확인 중...
                    </>
                  ) : (
                    <>
                      <Plus size={15} />
                      채널 추가
                    </>
                  )}
                </button>
              </div>

              {channels.length > 0 && (
                <div>
                  <h3 className="text-sm font-semibold text-gray-600 mb-3">등록된 채널 ({channels.length})</h3>
                  <div className="space-y-2">
                    {channels.map((ch) => (
                      <div key={ch.id} className="flex items-center gap-3 p-3 rounded-lg border border-gray-100 bg-gray-50">
                        {ch.thumbnail ? (
                          <img src={ch.thumbnail} alt={ch.name} className="w-8 h-8 rounded-full object-cover" />
                        ) : (
                          <div className="w-8 h-8 rounded-full bg-red-100 flex items-center justify-center">
                            <Youtube size={14} className="text-red-500" />
                          </div>
                        )}
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-medium text-gray-700 truncate">{ch.name}</p>
                          <p className="text-[11px] text-gray-400">{ch.channel_id}</p>
                        </div>
                        <span
                          className={`text-[10px] px-2 py-0.5 rounded-full font-medium ${
                            ch.is_own ? 'bg-red-50 text-red-600' : 'bg-blue-50 text-blue-600'
                          }`}
                        >
                          {ch.is_own ? '우리' : '경쟁'}
                        </span>
                        <button
                          onClick={() => handleRemoveChannel(ch.id)}
                          className="p-1 rounded hover:bg-red-50 text-gray-300 hover:text-red-500 transition-colors"
                        >
                          <X size={14} />
                        </button>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              <div className="mt-5 p-3 bg-amber-50 rounded-lg">
                <p className="text-xs text-amber-700 leading-relaxed">
                  <strong>채널 ID 찾는 방법:</strong>
                  <br />
                  YouTube 채널 페이지 URL에서 <code className="bg-amber-100 px-1 rounded">/channel/UCxxxxxxx</code> 부분을 복사하세요.
                  <br />
                  또는 <code className="bg-amber-100 px-1 rounded">@handle</code> 형식도 지원합니다.
                </p>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
