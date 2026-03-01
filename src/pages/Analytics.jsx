import { useState, useEffect, useMemo, useCallback } from 'react';
import {
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
  RadarChart,
  Radar,
  PolarGrid,
  PolarAngleAxis,
  PolarRadiusAxis,
} from 'recharts';
import {
  TrendingUp,
  Eye,
  Heart,
  Users,
  Play,
  Sparkles,
  Youtube,
  Instagram,
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
  CalendarRange,
  Filter,
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

// 플랫폼 설정
const PLATFORM_CONFIG = {
  youtube: {
    icon: Youtube, color: '#FF0000', bgColor: 'bg-red-50', textColor: 'text-red-500',
    borderColor: 'border-red-300', ringColor: 'focus:ring-red-500',
    label: 'YouTube', contentLabel: '영상', idPlaceholder: '채널 ID (UCxxxxxxx) 또는 @handle',
    getLink: (v) => `https://youtube.com/watch?v=${v.video_id || v.videoId}`,
  },
  instagram: {
    icon: Instagram, color: '#E4405F', bgColor: 'bg-pink-50', textColor: 'text-pink-500',
    borderColor: 'border-pink-300', ringColor: 'focus:ring-pink-500',
    label: 'Instagram', contentLabel: '게시물', idPlaceholder: 'Instagram Business Account ID',
    getLink: (v) => v.permalink || `https://instagram.com/p/${v.video_id || v.videoId}`,
  },
};

// 탭 정의
const TABS = [
  { key: 'overview', label: '채널 개요', icon: BarChart3 },
  { key: 'content', label: '콘텐츠 분석', icon: Play },
  { key: 'comments', label: '댓글 분석', icon: MessageCircle },
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

  // ---- 콘텐츠 탭 인라인 AI ----
  const [contentAiInsight, setContentAiInsight] = useState('');
  const [isContentAiLoading, setIsContentAiLoading] = useState(false);

  // ---- 댓글 분석 ----
  const [commentAnalysis, setCommentAnalysis] = useState(null);
  const [isAnalyzingComments, setIsAnalyzingComments] = useState(false);
  const [selectedVideoForComments, setSelectedVideoForComments] = useState(null);

  // ---- 채널 관리 모달 ----
  const [showChannelModal, setShowChannelModal] = useState(false);
  const [newChannelInput, setNewChannelInput] = useState('');
  const [newChannelPlatform, setNewChannelPlatform] = useState('youtube');
  const [newChannelIsOwn, setNewChannelIsOwn] = useState(true);
  const [addingChannel, setAddingChannel] = useState(false);

  // ---- 콘텐츠 분석 정렬 + 기간 필터 ----
  const [videoSortBy, setVideoSortBy] = useState('date');
  const [dateRange, setDateRange] = useState({ start: '', end: '' });
  const [selectedChannelFilter, setSelectedChannelFilter] = useState('all');
  const [isStaleData, setIsStaleData] = useState(false);

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

  // 기간 필터 적용 영상
  const filteredByDateVideos = useMemo(() => {
    if (!dateRange.start && !dateRange.end) return enrichedVideos;
    return enrichedVideos.filter((v) => {
      const pubDate = new Date(v.published_at || v.publishedAt);
      if (isNaN(pubDate.getTime())) return false;
      if (dateRange.start && pubDate < new Date(dateRange.start)) return false;
      if (dateRange.end && pubDate > new Date(dateRange.end + 'T23:59:59')) return false;
      return true;
    });
  }, [enrichedVideos, dateRange]);

  // 채널 필터 적용 영상
  const filteredByChannelVideos = useMemo(() => {
    if (selectedChannelFilter === 'all') return filteredByDateVideos;
    return filteredByDateVideos.filter(
      (v) => (v.channel_id || v.channelId) === selectedChannelFilter,
    );
  }, [filteredByDateVideos, selectedChannelFilter]);

  // 정렬된 영상
  const sortedVideos = useMemo(() => {
    const sorted = [...filteredByChannelVideos];
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
  }, [filteredByChannelVideos, videoSortBy]);

  // Top 3 퍼포머
  const topPerformers = useMemo(
    () => [...filteredByChannelVideos].sort((a, b) => b.engagementRate - a.engagementRate).slice(0, 3),
    [filteredByChannelVideos],
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

        // 캐시된 영상 + 채널 통계 불러오기 (모든 채널)
        const allIds = (channelsData || []).map((c) => c.channel_id);
        const ownIds = (channelsData || []).filter((c) => c.is_own).map((c) => c.channel_id);
        if (allIds.length > 0) {
          const [videos, latestStats] = await Promise.all([
            analyticsService.getCachedVideos(allIds),
            analyticsService.getLatestChannelStats(allIds),
          ]);
          setRecentVideos(videos || []);
          setChannelStats(latestStats || {});

          // Check for stale data
          if (videos && videos.length > 0) {
            const hasValidViews = videos.some((v) => Number(v.views) > 0);
            if (!hasValidViews) {
              setIsStaleData(true);
            }
          }
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
      setIsStaleData(false);
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
      const created = await analyticsService.addChannel(cid, newChannelPlatform, newChannelIsOwn);
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
      const videoData = enrichedVideos.slice(0, 20).map((v) => ({
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

  // ---- 콘텐츠 AI 분석 (인라인) ----
  const handleContentAiAnalysis = async () => {
    if (filteredByChannelVideos.length === 0) {
      alert('분석할 콘텐츠가 없습니다.');
      return;
    }
    setIsContentAiLoading(true);
    setContentAiInsight('');
    try {
      const ownCh = channels.filter((c) => c.is_own);
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
      const videoData = filteredByChannelVideos.slice(0, 20).map((v) => ({
        title: v.title,
        views: v.views,
        likes: v.likes,
        comments: v.comments,
        engagementRate: v.engagementRate?.toFixed(2),
        likeRatio: v.likeRatio?.toFixed(2),
        publishedAt: v.publishedAt || v.published_at,
        duration: v.duration,
      }));
      const data = await analyticsService.generateSnsInsights(channelData, videoData, competitorData);
      setContentAiInsight(data.insight || '인사이트를 생성하지 못했습니다.');
    } catch (err) {
      setContentAiInsight('AI 분석 실패: ' + err.message);
    } finally {
      setIsContentAiLoading(false);
    }
  };

  // ---- 댓글 분석 핸들러 ----
  const handleCommentAnalysis = useCallback(async (video) => {
    setSelectedVideoForComments(video);
    setIsAnalyzingComments(true);
    try {
      // 통합 엔드포인트: 댓글 수집 + AI 분석을 한 번에 처리
      const result = await analyticsService.fetchVideoComments(
        video.videoId || video.video_id,
        100,
        { analyze: true, videoTitle: video.title }
      );
      if (result.disabled) {
        setCommentAnalysis({ disabled: true });
        return;
      }
      if (!result.comments || result.comments.length === 0) {
        setCommentAnalysis({ empty: true });
        return;
      }
      // Save to cache
      const channelId = video.channel_id || video.channelId;
      await analyticsService.saveComments(
        video.videoId || video.video_id, channelId,
        result.comments, result.sentiments || []
      );
      setCommentAnalysis(result);
    } catch (err) {
      console.error('댓글 분석 실패:', err);
      setCommentAnalysis({ error: err.message });
    } finally {
      setIsAnalyzingComments(false);
    }
  }, []);

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

  // ---- 게시 시간대 히트맵 데이터 ----
  const postingHeatmapData = useMemo(() => {
    const grid = Array.from({ length: 7 }, () =>
      Array.from({ length: 24 }, () => ({ count: 0, totalViews: 0, totalEngagement: 0 })),
    );
    filteredByChannelVideos.forEach((v) => {
      const dt = new Date(v.published_at || v.publishedAt);
      if (isNaN(dt.getTime())) return;
      const day = (dt.getDay() + 6) % 7; // Mon=0 ... Sun=6
      const hour = dt.getHours();
      grid[day][hour].count += 1;
      grid[day][hour].totalViews += v.views || 0;
      grid[day][hour].totalEngagement += v.engagementRate || 0;
    });
    let maxAvgViews = 0;
    const processed = grid.map((row) =>
      row.map((cell) => {
        const avgViews = cell.count > 0 ? Math.round(cell.totalViews / cell.count) : 0;
        const avgEngagement = cell.count > 0 ? cell.totalEngagement / cell.count : 0;
        if (avgViews > maxAvgViews) maxAvgViews = avgViews;
        return { count: cell.count, avgViews, avgEngagement };
      }),
    );
    return { grid: processed, maxAvgViews };
  }, [filteredByChannelVideos]);

  // ---- 콘텐츠 탭 KPI 집계 ----
  const contentKpi = useMemo(() => {
    const vids = filteredByChannelVideos;
    if (vids.length === 0) return null;
    const totalViews = vids.reduce((s, v) => s + (v.views || 0), 0);
    const totalLikes = vids.reduce((s, v) => s + (v.likes || 0), 0);
    const totalComments = vids.reduce((s, v) => s + (v.comments || 0), 0);
    const avgEngagement = vids.reduce((s, v) => s + v.engagementRate, 0) / vids.length;
    const avgLikeRatio = vids.reduce((s, v) => s + v.likeRatio, 0) / vids.length;
    // 조회/구독 비율
    const totalSubs = ownChannels.reduce((s, ch) => s + (channelStats[ch.channel_id]?.subscribers || 0), 0);
    const avgViews = Math.round(totalViews / vids.length);
    const viewSubRatio = totalSubs > 0 ? (avgViews / totalSubs * 100).toFixed(1) : '0';
    // 주간 게시 빈도
    const dates = vids.map((v) => new Date(v.published_at || v.publishedAt)).filter((d) => !isNaN(d.getTime()));
    let weeklyFreq = 0;
    if (dates.length >= 2) {
      const sorted = dates.sort((a, b) => a - b);
      const daySpan = Math.max((sorted[sorted.length - 1] - sorted[0]) / (1000 * 60 * 60 * 24), 1);
      weeklyFreq = (vids.length / (daySpan / 7)).toFixed(1);
    }
    return {
      avgEngagement: avgEngagement.toFixed(2),
      avgLikeRatio: avgLikeRatio.toFixed(2),
      viewSubRatio,
      weeklyFreq,
      videoCount: vids.length,
      avgViews,
      totalLikes,
      totalComments,
    };
  }, [filteredByChannelVideos, ownChannels, channelStats]);

  // ---- 태그 분석 ----
  const tagAnalysis = useMemo(() => {
    const tagMap = {};
    filteredByChannelVideos.forEach((v) => {
      (v.tags || []).forEach((tag) => {
        if (!tagMap[tag]) tagMap[tag] = { count: 0, totalEngagement: 0, totalViews: 0 };
        tagMap[tag].count++;
        tagMap[tag].totalEngagement += calcEngagementRate(v);
        tagMap[tag].totalViews += v.views || 0;
      });
    });
    return Object.entries(tagMap)
      .map(([tag, data]) => ({
        tag,
        count: data.count,
        avgEngagement: data.count > 0 ? data.totalEngagement / data.count : 0,
        totalViews: data.totalViews,
      }))
      .sort((a, b) => b.count - a.count)
      .slice(0, 20);
  }, [filteredByChannelVideos]);

  // ---- 경쟁사 벤치마킹 레이더 데이터 ----
  const radarChartData = useMemo(() => {
    if (competitorChannels.length === 0) return null;
    const allChs = [...ownChannels, ...competitorChannels];
    const channelMetrics = allChs.map((ch) => {
      const stats = channelStats[ch.channel_id] || {};
      const engagement = channelEngagementMap[ch.channel_id] || 0;
      const chVideos = enrichedVideos.filter(
        (v) => (v.channel_id || v.channelId) === ch.channel_id,
      );
      const avgLikeRatio =
        chVideos.length > 0
          ? chVideos.reduce((s, v) => s + (v.likeRatio || 0), 0) / chVideos.length
          : 0;
      return {
        name: ch.name,
        isOwn: ch.is_own,
        subscribers: stats.subscribers || 0,
        totalViews: stats.totalViews || 0,
        videoCount: stats.videoCount || 0,
        engagement,
        likeRatio: avgLikeRatio,
      };
    });
    const metrics = ['subscribers', 'totalViews', 'videoCount', 'engagement', 'likeRatio'];
    const metricLabels = {
      subscribers: '구독자',
      totalViews: '총 조회수',
      videoCount: '영상 수',
      engagement: '인게이지먼트율',
      likeRatio: '좋아요율',
    };
    const maxVals = {};
    metrics.forEach((m) => {
      maxVals[m] = Math.max(...channelMetrics.map((c) => c[m]), 1);
    });
    const data = metrics.map((m) => {
      const row = { metric: metricLabels[m] };
      channelMetrics.forEach((c) => {
        row[c.name] = Math.round((c[m] / maxVals[m]) * 100);
      });
      return row;
    });
    return { data, channels: channelMetrics };
  }, [ownChannels, competitorChannels, channelStats, channelEngagementMap, enrichedVideos]);

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
      <div className="flex items-center gap-1 border-b border-slate-200 overflow-x-auto">
        {TABS.map((tab) => {
          const Icon = tab.icon;
          return (
            <button
              key={tab.key}
              onClick={() => setActiveTab(tab.key)}
              className={`relative px-3 sm:px-4 py-2.5 text-sm font-medium transition-colors cursor-pointer whitespace-nowrap shrink-0 ${
                activeTab === tab.key ? 'text-red-500' : 'text-slate-500 hover:text-slate-700'
              }`}
            >
              <span className="flex items-center gap-1.5">
                <Icon size={15} className="shrink-0" />
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
          <div className="flex items-center justify-center gap-3 mb-4">
            <Youtube size={40} className="text-red-400" />
            <Instagram size={40} className="text-pink-400" />
          </div>
          <h3 className="text-lg font-semibold text-gray-700 mb-2">SNS 채널을 등록해보세요</h3>
          <p className="text-sm text-gray-500 mb-4">
            YouTube, Instagram 채널을 등록하면 구독자 수, 조회수, 인게이지먼트 등을 실시간으로 분석할 수 있습니다.
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
              {isStaleData && (
                <div className="bg-amber-50 border border-amber-200 rounded-xl p-4 flex items-center justify-between mb-4">
                  <div className="flex items-center gap-2">
                    <RefreshCw size={16} className="text-amber-500" />
                    <p className="text-sm text-amber-700">캐시된 데이터가 오래되었습니다. 새로고침하여 최신 데이터를 불러오세요.</p>
                  </div>
                  <button
                    onClick={handleRefresh}
                    disabled={isRefreshing}
                    className="px-3 py-1.5 bg-amber-500 text-white text-xs font-medium rounded-lg hover:bg-amber-600 transition-colors disabled:opacity-50 cursor-pointer"
                  >
                    새로고침
                  </button>
                </div>
              )}
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
                <div className="bg-white rounded-xl shadow-sm p-6 border border-gray-100">
                  {/* 채널 프로필 헤더 — 확대 */}
                  <div className="flex flex-col sm:flex-row items-center gap-4 sm:gap-5 mb-6">
                    {(() => { const cfg = PLATFORM_CONFIG[ch.platform || 'youtube']; const PIcon = cfg.icon; return ch.thumbnail ? (
                      <img src={ch.thumbnail} alt={ch.name} className={`w-16 h-16 sm:w-20 sm:h-20 rounded-full object-cover ring-3 shrink-0 ${ch.platform === 'instagram' ? 'ring-pink-100' : 'ring-red-100'}`} />
                    ) : (
                      <div className={`w-16 h-16 sm:w-20 sm:h-20 rounded-full ${cfg.bgColor} flex items-center justify-center shrink-0`}>
                        <PIcon size={32} className={cfg.textColor} />
                      </div>
                    ); })()}
                    <div className="flex-1 min-w-0 text-center sm:text-left">
                      <div className="flex items-center justify-center sm:justify-start gap-2 mb-1 flex-wrap">
                        <h2 className="text-lg sm:text-xl font-bold text-gray-900 truncate">{ch.name}</h2>
                        {(() => { const cfg = PLATFORM_CONFIG[ch.platform || 'youtube']; const PIcon = cfg.icon; return <PIcon size={18} className={cfg.textColor} />; })()}
                        <span className="text-[10px] px-2 py-0.5 rounded-full bg-red-50 text-red-600 font-medium">우리 채널</span>
                      </div>
                      {ch.handle && <p className="text-sm text-gray-400 mb-2">{ch.handle}</p>}
                      <div className="flex items-center justify-center sm:justify-start gap-3 sm:gap-4 text-xs sm:text-sm text-gray-500 flex-wrap">
                        <span className="flex items-center gap-1"><Users size={13} /> 구독자 <strong className="text-gray-900">{formatNumber(stats.subscribers || 0)}</strong></span>
                        <span className="flex items-center gap-1"><Eye size={13} /> 조회수 <strong className="text-gray-900">{formatNumber(stats.totalViews || 0)}</strong></span>
                        <span className="flex items-center gap-1"><Video size={13} /> 영상 <strong className="text-gray-900">{formatNumber(stats.videoCount || 0)}</strong></span>
                      </div>
                    </div>
                  </div>
                  {/* 주요 KPI 3개 — 크게 */}
                  <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 sm:gap-4 mb-3">
                    {[
                      { label: '구독자', value: formatNumber(stats.subscribers || 0), icon: Users, color: 'text-red-500', bg: 'bg-red-50' },
                      { label: '총 조회수', value: formatNumber(stats.totalViews || 0), icon: Eye, color: 'text-blue-500', bg: 'bg-blue-50' },
                      { label: '인게이지먼트', value: `${engagement.toFixed(2)}%`, icon: Activity, color: 'text-green-500', bg: 'bg-green-50' },
                    ].map((kpi) => (
                      <div key={kpi.label} className="text-center p-4 rounded-xl border border-gray-100 bg-gray-50/30">
                        <div className={`inline-flex p-2 rounded-lg ${kpi.bg} mb-2`}>
                          <kpi.icon size={18} className={kpi.color} />
                        </div>
                        <p className="text-2xl font-bold text-gray-900">{kpi.value}</p>
                        <p className="text-xs text-gray-400 mt-0.5">{kpi.label}</p>
                      </div>
                    ))}
                  </div>
                  {/* 보조 KPI 3개 — 작게 */}
                  <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                    {[
                      { label: '총 영상 수', value: formatNumber(stats.videoCount || 0), icon: Video, color: 'text-purple-500', bg: 'bg-purple-50' },
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
                                    href={PLATFORM_CONFIG[v.platform || 'youtube'].getLink(v)}
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
                    href={PLATFORM_CONFIG[video.platform || 'youtube'].getLink(video)}
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
                                <div className={`w-7 h-7 rounded-full ${PLATFORM_CONFIG[ch.platform || 'youtube'].bgColor} flex items-center justify-center`}>
                                  {(() => { const cfg = PLATFORM_CONFIG[ch.platform || 'youtube']; const I = cfg.icon; return <I size={12} className={cfg.textColor} />; })()}
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

          {/* 경쟁사 벤치마킹 레이더 차트 */}
          {radarChartData && (
            <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-5">
              <h2 className="text-sm font-semibold text-gray-700 mb-4 flex items-center gap-1.5">
                <Activity size={15} className="text-purple-500" />
                채널 벤치마킹 비교
              </h2>
              <p className="text-xs text-gray-400 mb-4">
                각 지표는 전체 채널 중 최댓값 대비 백분율(0~100)로 정규화됩니다.
              </p>
              <ResponsiveContainer width="100%" height={340}>
                <RadarChart data={radarChartData.data} cx="50%" cy="50%" outerRadius="72%">
                  <PolarGrid stroke="#e2e8f0" />
                  <PolarAngleAxis dataKey="metric" tick={{ fontSize: 11, fill: '#64748b' }} />
                  <PolarRadiusAxis angle={90} domain={[0, 100]} tick={{ fontSize: 10, fill: '#94a3b8' }} />
                  {radarChartData.channels.map((ch, idx) => (
                    <Radar
                      key={ch.name}
                      name={ch.name}
                      dataKey={ch.name}
                      stroke={ch.isOwn ? '#ef4444' : CHANNEL_COLORS[(idx + 1) % CHANNEL_COLORS.length]}
                      fill={ch.isOwn ? '#ef4444' : CHANNEL_COLORS[(idx + 1) % CHANNEL_COLORS.length]}
                      fillOpacity={ch.isOwn ? 0.25 : 0.1}
                      strokeWidth={ch.isOwn ? 2.5 : 1.5}
                    />
                  ))}
                  <Legend wrapperStyle={{ fontSize: 12 }} />
                  <Tooltip
                    contentStyle={{ fontSize: 12, borderRadius: 8, border: '1px solid #e2e8f0' }}
                    formatter={(value) => [`${value}점`, '']}
                  />
                </RadarChart>
              </ResponsiveContainer>
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
              <h3 className="text-lg font-semibold text-gray-600 mb-2">콘텐츠 데이터가 없습니다</h3>
              <p className="text-sm text-gray-400">
                채널을 등록하고 새로고침 버튼을 눌러 콘텐츠 데이터를 가져오세요.
              </p>
            </div>
          ) : (
            <>
              {/* 기간 필터 */}
              <div className="bg-white rounded-xl shadow-sm p-4 border border-gray-100">
                <div className="flex items-center justify-between flex-wrap gap-3">
                  <div className="flex items-center gap-2 flex-wrap">
                    <CalendarRange size={15} className="text-gray-400" />
                    <span className="text-xs font-medium text-gray-500">기간 설정</span>
                    <input
                      type="date"
                      value={dateRange.start}
                      onChange={(e) => setDateRange((prev) => ({ ...prev, start: e.target.value }))}
                      className="px-2.5 py-1.5 border border-gray-200 rounded-lg text-xs focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
                    />
                    <span className="text-xs text-gray-400">~</span>
                    <input
                      type="date"
                      value={dateRange.end}
                      onChange={(e) => setDateRange((prev) => ({ ...prev, end: e.target.value }))}
                      className="px-2.5 py-1.5 border border-gray-200 rounded-lg text-xs focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
                    />
                    {(dateRange.start || dateRange.end) && (
                      <button
                        onClick={() => setDateRange({ start: '', end: '' })}
                        className="text-xs text-gray-400 hover:text-red-500 transition-colors"
                      >
                        <X size={14} />
                      </button>
                    )}
                  </div>
                  <div className="flex items-center gap-1.5">
                    {[
                      { label: '7일', days: 7 },
                      { label: '30일', days: 30 },
                      { label: '90일', days: 90 },
                      { label: '전체', days: 0 },
                    ].map((preset) => {
                      // 현재 선택된 프리셋 감지
                      const isActive = (() => {
                        if (preset.days === 0) return !dateRange.start && !dateRange.end;
                        if (!dateRange.start || !dateRange.end) return false;
                        const s = new Date(dateRange.start);
                        const e = new Date(dateRange.end);
                        const diff = Math.round((e - s) / (1000 * 60 * 60 * 24));
                        const today = new Date().toISOString().split('T')[0];
                        return diff === preset.days && dateRange.end === today;
                      })();
                      return (
                        <button
                          key={preset.label}
                          onClick={() => {
                            if (preset.days === 0) {
                              setDateRange({ start: '', end: '' });
                            } else {
                              const end = new Date();
                              const start = new Date();
                              start.setDate(start.getDate() - preset.days);
                              setDateRange({
                                start: start.toISOString().split('T')[0],
                                end: end.toISOString().split('T')[0],
                              });
                            }
                          }}
                          className={`px-2.5 py-1 text-xs rounded-full transition-colors ${
                            isActive
                              ? 'bg-indigo-100 text-indigo-700 font-medium'
                              : 'text-gray-500 hover:bg-gray-100'
                          }`}
                        >
                          {preset.label}
                        </button>
                      );
                    })}
                  </div>
                </div>
                {(dateRange.start || dateRange.end) && (
                  <p className="text-[11px] text-gray-400 mt-2 flex items-center gap-1">
                    <Filter size={11} />
                    필터 적용: {filteredByDateVideos.length}개 / 전체 {enrichedVideos.length}개 콘텐츠
                  </p>
                )}
                {/* Channel filter */}
                <div className="flex items-center gap-2 flex-wrap mt-3 pt-3 border-t border-gray-100">
                  <span className="text-xs font-medium text-gray-500 mr-1">채널</span>
                  <button
                    onClick={() => setSelectedChannelFilter('all')}
                    className={`px-2.5 py-1 text-xs rounded-full transition-colors cursor-pointer ${
                      selectedChannelFilter === 'all'
                        ? 'bg-indigo-100 text-indigo-700 font-medium'
                        : 'text-gray-500 hover:bg-gray-100'
                    }`}
                  >
                    전체 ({filteredByDateVideos.length})
                  </button>
                  {channels.map((ch) => {
                    const chCount = filteredByDateVideos.filter(
                      (v) => (v.channel_id || v.channelId) === ch.channel_id,
                    ).length;
                    if (chCount === 0) return null;
                    return (
                      <button
                        key={ch.channel_id}
                        onClick={() => setSelectedChannelFilter(ch.channel_id)}
                        className={`flex items-center gap-1.5 px-2.5 py-1 text-xs rounded-full transition-colors cursor-pointer ${
                          selectedChannelFilter === ch.channel_id
                            ? 'bg-indigo-100 text-indigo-700 font-medium'
                            : 'text-gray-500 hover:bg-gray-100'
                        }`}
                      >
                        {ch.thumbnail && (
                          <img src={ch.thumbnail} alt="" className="w-4 h-4 rounded-full object-cover" />
                        )}
                        {ch.name} ({chCount})
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* 성과 요약 바 */}
              {contentKpi && (
                <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-7 gap-3">
                  {[
                    { label: '분석 콘텐츠', value: `${contentKpi.videoCount}개`, icon: Video, color: 'text-purple-500', bg: 'bg-purple-50' },
                    { label: '평균 조회수', value: formatNumber(contentKpi.avgViews), icon: Eye, color: 'text-blue-500', bg: 'bg-blue-50' },
                    { label: '인게이지먼트', value: `${contentKpi.avgEngagement}%`, icon: Activity, color: 'text-green-500', bg: 'bg-green-50' },
                    { label: '평균 좋아요율', value: `${contentKpi.avgLikeRatio}%`, icon: Heart, color: 'text-pink-500', bg: 'bg-pink-50' },
                    { label: '조회/구독 비율', value: `${contentKpi.viewSubRatio}%`, icon: TrendingUp, color: 'text-orange-500', bg: 'bg-orange-50' },
                    { label: '주간 게시 빈도', value: `${contentKpi.weeklyFreq}개/주`, icon: CalendarRange, color: 'text-indigo-500', bg: 'bg-indigo-50' },
                    { label: '총 좋아요', value: formatNumber(contentKpi.totalLikes), icon: ThumbsUp, color: 'text-red-500', bg: 'bg-red-50' },
                  ].map((kpi) => (
                    <div key={kpi.label} className="bg-white rounded-xl shadow-sm p-3 border border-gray-100 text-center">
                      <div className={`inline-flex p-1.5 rounded-lg ${kpi.bg} mb-1.5`}>
                        <kpi.icon size={13} className={kpi.color} />
                      </div>
                      <p className="text-base font-bold text-gray-900">{kpi.value}</p>
                      <p className="text-[10px] text-gray-400">{kpi.label}</p>
                    </div>
                  ))}
                </div>
              )}

              {/* Top 퍼포머 + 최고 인게이지먼트 */}
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
                        href={PLATFORM_CONFIG[video.platform || 'youtube'].getLink(video)}
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

              {/* AI 콘텐츠 분석 (인라인) */}
              <div className="bg-gradient-to-br from-indigo-50 via-white to-purple-50 rounded-xl shadow-sm border border-indigo-100">
                <div className="flex items-center justify-between p-4">
                  <div className="flex items-center gap-2">
                    <Sparkles size={16} className="text-purple-500" />
                    <span className="text-sm font-semibold text-gray-700">AI 콘텐츠 분석</span>
                    {contentKpi && (
                      <span className="text-[11px] text-gray-400">
                        ({contentKpi.videoCount}개 콘텐츠 기준)
                      </span>
                    )}
                  </div>
                  <button
                    onClick={handleContentAiAnalysis}
                    disabled={isContentAiLoading || filteredByChannelVideos.length === 0}
                    className="flex items-center gap-1.5 px-3 py-1.5 bg-gradient-to-r from-purple-500 to-indigo-500 text-white text-xs font-medium rounded-lg hover:from-purple-600 hover:to-indigo-600 transition-all disabled:opacity-50 shadow-sm"
                  >
                    <Sparkles size={13} className={isContentAiLoading ? 'animate-spin' : ''} />
                    {isContentAiLoading ? '분석 중...' : contentAiInsight ? '다시 분석' : 'AI 분석 시작'}
                  </button>
                </div>
                {isContentAiLoading && (
                  <div className="flex items-center gap-2 pb-6 justify-center text-sm text-indigo-600">
                    <Loader className="w-5 h-5 animate-spin" />
                    콘텐츠 인게이지먼트를 분석하고 방향성을 제시하고 있습니다...
                  </div>
                )}
                {!isContentAiLoading && contentAiInsight && (
                  <div className="px-4 pb-4">
                    <div
                      className="prose-sm max-w-none"
                      dangerouslySetInnerHTML={{ __html: renderInsightText(contentAiInsight) }}
                    />
                  </div>
                )}
              </div>

              {/* 태그 분석 */}
              {tagAnalysis.length > 0 && (
                <div className="bg-white rounded-xl shadow-sm p-5 border border-gray-100">
                  <h3 className="text-sm font-semibold text-gray-700 mb-4 flex items-center gap-1.5">
                    <Tag size={15} className="text-brand-500" />
                    태그 분석
                    <span className="text-xs text-gray-400 font-normal">상위 {tagAnalysis.length}개</span>
                  </h3>
                  <div className="space-y-2">
                    {tagAnalysis.map((t) => (
                      <div key={t.tag} className="flex items-center gap-3">
                        <span className="text-xs text-gray-600 w-32 truncate font-medium">#{t.tag}</span>
                        <div className="flex-1 h-5 bg-gray-100 rounded-full overflow-hidden">
                          <div
                            className="h-full bg-brand-400 rounded-full transition-all"
                            style={{ width: `${(t.count / (tagAnalysis[0]?.count || 1)) * 100}%` }}
                          />
                        </div>
                        <span className="text-xs text-gray-500 w-8 text-right">{t.count}회</span>
                        <span className="text-xs text-gray-400 w-20 text-right">
                          인게이지먼트 {t.avgEngagement.toFixed(1)}%
                        </span>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* 댓글 분석 (자사 채널 전용) */}
              {channels.some(ch => ch.is_own && (selectedChannelFilter === 'all' || selectedChannelFilter === ch.channel_id)) && (
                <div className="bg-white rounded-xl shadow-sm p-5 border border-gray-100">
                  <h3 className="text-sm font-semibold text-gray-700 mb-4 flex items-center gap-1.5">
                    <MessageCircle size={15} className="text-brand-500" />
                    댓글 분석
                    <span className="text-xs text-gray-400 font-normal">(자사 채널 전용)</span>
                  </h3>

                  {/* Video selector for comment analysis */}
                  <div className="mb-4">
                    <p className="text-xs text-gray-500 mb-2">분석할 영상을 선택하세요:</p>
                    <div className="flex flex-wrap gap-2">
                      {filteredByChannelVideos
                        .filter(v => channels.find(ch => ch.is_own && (ch.channel_id === (v.channel_id || v.channelId))))
                        .slice(0, 6)
                        .map((v) => (
                          <button
                            key={v.videoId || v.video_id}
                            onClick={() => handleCommentAnalysis(v)}
                            disabled={isAnalyzingComments}
                            className={`px-3 py-1.5 text-xs rounded-lg border transition-colors cursor-pointer ${
                              selectedVideoForComments?.videoId === v.videoId || selectedVideoForComments?.video_id === v.video_id
                                ? 'bg-brand-50 border-brand-300 text-brand-700'
                                : 'bg-gray-50 border-gray-200 text-gray-600 hover:bg-gray-100'
                            } disabled:opacity-50`}
                          >
                            {v.title?.slice(0, 30)}{v.title?.length > 30 ? '...' : ''}
                          </button>
                        ))}
                    </div>
                  </div>

                  {/* Analysis results */}
                  {isAnalyzingComments && (
                    <div className="flex items-center justify-center py-8 gap-3">
                      <Loader className="w-5 h-5 animate-spin text-brand-500" />
                      <span className="text-sm text-gray-500">댓글을 분석하고 있습니다...</span>
                    </div>
                  )}

                  {commentAnalysis && !isAnalyzingComments && (
                    <div>
                      {commentAnalysis.disabled && (
                        <p className="text-sm text-gray-400 text-center py-4">이 영상은 댓글이 비활성화되어 있습니다.</p>
                      )}
                      {commentAnalysis.empty && (
                        <p className="text-sm text-gray-400 text-center py-4">댓글이 없습니다.</p>
                      )}
                      {commentAnalysis.error && (
                        <p className="text-sm text-red-500 text-center py-4">{commentAnalysis.error}</p>
                      )}
                      {commentAnalysis.analysis && (
                        <div className="prose prose-sm max-w-none">
                          <div
                            className="text-sm text-gray-600 leading-relaxed [&_h3]:text-sm [&_h3]:font-bold [&_h3]:text-gray-800 [&_h3]:mt-4 [&_h3]:mb-2 [&_li]:ml-4 [&_li]:list-disc [&_li]:mb-1 [&_strong]:text-gray-700"
                            dangerouslySetInnerHTML={{ __html: renderInsightText(commentAnalysis.analysis) }}
                          />
                          <p className="text-xs text-gray-400 mt-3">
                            {commentAnalysis.analyzedCount}개 댓글 분석 · {commentAnalysis.generatedAt ? new Date(commentAnalysis.generatedAt).toLocaleString('ko-KR') : ''}
                          </p>
                        </div>
                      )}
                    </div>
                  )}
                </div>
              )}

              {/* 게시 시간대 히트맵 */}
              {filteredByChannelVideos.length >= 3 && (
                <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-5">
                  <h2 className="text-sm font-semibold text-gray-700 mb-1 flex items-center gap-1.5">
                    <Clock size={15} className="text-orange-500" />
                    게시 시간대별 성과 히트맵
                  </h2>
                  <p className="text-xs text-gray-400 mb-4">
                    영상이 게시된 요일/시간대별 평균 조회수를 나타냅니다. 색이 진할수록 성과가 좋습니다.
                  </p>
                  <div className="overflow-x-auto">
                    <div className="min-w-[640px]">
                      {/* 시간 라벨 */}
                      <div className="flex items-center mb-1 ml-10">
                        {[0, 3, 6, 9, 12, 15, 18, 21].map((h) => (
                          <div key={h} className="text-[10px] text-gray-400" style={{ width: `${(100 / 24) * 3}%` }}>
                            {h}시
                          </div>
                        ))}
                      </div>
                      {/* 히트맵 그리드 */}
                      {['월', '화', '수', '목', '금', '토', '일'].map((dayLabel, dayIdx) => (
                        <div key={dayLabel} className="flex items-center gap-0.5 mb-0.5">
                          <span className="w-8 text-xs text-gray-500 text-right font-medium flex-shrink-0">{dayLabel}</span>
                          <div className="flex-1 flex gap-px">
                            {postingHeatmapData.grid[dayIdx].map((cell, hourIdx) => {
                              const intensity =
                                postingHeatmapData.maxAvgViews > 0
                                  ? cell.avgViews / postingHeatmapData.maxAvgViews
                                  : 0;
                              const bg =
                                cell.count === 0
                                  ? 'bg-gray-50'
                                  : intensity > 0.8
                                    ? 'bg-red-500'
                                    : intensity > 0.6
                                      ? 'bg-red-400'
                                      : intensity > 0.4
                                        ? 'bg-red-300'
                                        : intensity > 0.2
                                          ? 'bg-red-200'
                                          : 'bg-red-100';
                              const textColor = intensity > 0.6 ? 'text-white' : 'text-gray-600';
                              return (
                                <div
                                  key={hourIdx}
                                  className={`flex-1 aspect-square rounded-sm ${bg} flex items-center justify-center cursor-default`}
                                  title={`${dayLabel} ${hourIdx}시: ${cell.count}개 영상, 평균 ${formatNumber(cell.avgViews)} 조회, 인게이지먼트 ${cell.avgEngagement.toFixed(1)}%`}
                                >
                                  {cell.count > 0 && (
                                    <span className={`text-[7px] font-medium ${textColor}`}>{cell.count}</span>
                                  )}
                                </div>
                              );
                            })}
                          </div>
                        </div>
                      ))}
                      {/* 범례 */}
                      <div className="flex items-center justify-end gap-1.5 mt-3 mr-1">
                        <span className="text-[10px] text-gray-400">낮음</span>
                        {['bg-gray-50', 'bg-red-100', 'bg-red-200', 'bg-red-300', 'bg-red-400', 'bg-red-500'].map((c) => (
                          <div key={c} className={`w-4 h-4 rounded-sm ${c} border border-gray-100`} />
                        ))}
                        <span className="text-[10px] text-gray-400">높음</span>
                      </div>
                    </div>
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
                      href={PLATFORM_CONFIG[video.platform || 'youtube'].getLink(video)}
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
                          {(() => { const cfg = PLATFORM_CONFIG[video.platform || 'youtube']; const I = cfg.icon; return <><I size={10} /> {cfg.label}</>; })()}
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
            {activeTab === 'comments' && (
        <div className="space-y-5">
          {/* 댓글 분석 메인 */}
          <div className="bg-white rounded-xl shadow-sm p-5 border border-gray-100">
            <div className="flex items-center gap-2 mb-1">
              <MessageCircle size={18} className="text-brand-500" />
              <h2 className="text-base font-bold text-gray-800">YouTube 댓글 AI 분석</h2>
            </div>
            <p className="text-xs text-gray-400 mb-5">자사 채널 영상의 댓글을 수집하고 Claude AI로 감성 분석합니다</p>

            {channels.filter(ch => ch.is_own).length === 0 ? (
              <div className="text-center py-8 text-sm text-gray-400">
                자사 채널을 먼저 등록해주세요. (채널 개요 탭 → 채널 추가)
              </div>
            ) : (
              <>
                {/* Video selector for comment analysis */}
                <div className="mb-5">
                  <p className="text-sm font-medium text-gray-600 mb-3">분석할 영상을 선택하세요:</p>
                  {enrichedVideos.filter(v => channels.find(ch => ch.is_own && (ch.channel_id === (v.channel_id || v.channelId)))).length === 0 && (
                    <div className="text-center py-6 bg-gray-50 rounded-xl text-sm text-gray-400">
                      자사 채널 영상이 아직 로드되지 않았습니다. 채널 개요 탭에서 새로고침을 실행해주세요.
                    </div>
                  )}
                  <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
                    {enrichedVideos
                      .filter(v => channels.find(ch => ch.is_own && (ch.channel_id === (v.channel_id || v.channelId))))
                      .slice(0, 9)
                      .map((v) => (
                        <button
                          key={v.videoId || v.video_id}
                          onClick={() => handleCommentAnalysis(v)}
                          disabled={isAnalyzingComments}
                          className={`flex items-start gap-3 p-3 rounded-xl border text-left transition-all cursor-pointer ${
                            (selectedVideoForComments?.videoId === (v.videoId || v.video_id) || selectedVideoForComments?.video_id === (v.video_id || v.videoId))
                              ? 'bg-brand-50 border-brand-300 shadow-sm'
                              : 'bg-gray-50 border-gray-200 hover:bg-gray-100 hover:border-gray-300'
                          } disabled:opacity-50`}
                        >
                          {v.thumbnail && (
                            <img src={v.thumbnail} alt="" className="w-20 h-14 object-cover rounded-lg shrink-0" />
                          )}
                          <div className="min-w-0 flex-1">
                            <p className="text-xs font-medium text-gray-700 line-clamp-2 leading-snug">{v.title}</p>
                            <div className="flex items-center gap-2 mt-1.5 text-[11px] text-gray-400">
                              <span>{formatNumber(v.views)} 조회</span>
                              <span>{formatNumber(v.comments)} 댓글</span>
                            </div>
                          </div>
                        </button>
                      ))}
                  </div>
                </div>

                {/* Analysis results */}
                {isAnalyzingComments && (
                  <div className="flex items-center justify-center py-12 gap-3 bg-gray-50 rounded-xl">
                    <Loader className="w-5 h-5 animate-spin text-brand-500" />
                    <span className="text-sm text-gray-500">댓글을 수집하고 AI 분석 중입니다...</span>
                  </div>
                )}

                {commentAnalysis && !isAnalyzingComments && (
                  <div className="mt-4">
                    {commentAnalysis.disabled && (
                      <div className="text-center py-8 bg-gray-50 rounded-xl">
                        <MessageCircle size={32} className="text-gray-300 mx-auto mb-2" />
                        <p className="text-sm text-gray-400">이 영상은 댓글이 비활성화되어 있습니다.</p>
                      </div>
                    )}
                    {commentAnalysis.empty && (
                      <div className="text-center py-8 bg-gray-50 rounded-xl">
                        <MessageCircle size={32} className="text-gray-300 mx-auto mb-2" />
                        <p className="text-sm text-gray-400">댓글이 없습니다.</p>
                      </div>
                    )}
                    {commentAnalysis.error && (
                      <div className="text-center py-8 bg-red-50 rounded-xl">
                        <p className="text-sm text-red-500">{commentAnalysis.error}</p>
                      </div>
                    )}
                    {commentAnalysis.analysis && (
                      <div className="bg-gradient-to-br from-brand-50/50 via-white to-amber-50/30 rounded-xl border border-brand-100 p-5">
                        <div className="flex items-center gap-2 mb-3">
                          <Sparkles size={16} className="text-amber-500" />
                          <h3 className="text-sm font-bold text-gray-800">AI 감성 분석 결과</h3>
                          <span className="text-[11px] text-gray-400 ml-auto">
                            {commentAnalysis.analyzedCount}개 댓글 분석 · {commentAnalysis.generatedAt ? new Date(commentAnalysis.generatedAt).toLocaleString('ko-KR') : ''}
                          </span>
                        </div>
                        <div
                          className="prose-sm max-w-none text-sm text-gray-600 leading-relaxed [&_h3]:text-sm [&_h3]:font-bold [&_h3]:text-gray-800 [&_h3]:mt-4 [&_h3]:mb-2 [&_li]:ml-4 [&_li]:list-disc [&_li]:mb-1 [&_strong]:text-gray-700"
                          dangerouslySetInnerHTML={{ __html: renderInsightText(commentAnalysis.analysis) }}
                        />
                      </div>
                    )}
                  </div>
                )}
              </>
            )}
          </div>
        </div>
      )}

      {activeTab === 'monitoring' && (
        <div>
          <div className="bg-white rounded-xl shadow-sm p-5 border border-gray-100">
            <div className="flex items-center gap-2 mb-3">
              <input
                type="text"
                value={newKeywordInput}
                onChange={(e) => setNewKeywordInput(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && !e.isComposing && handleAddKeyword()}
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
                  <Users size={12} className="text-red-500" />
                  우리 채널 {ownChannels.length}개
                </span>
                <span className="flex items-center gap-1 px-2.5 py-1 bg-gray-50 rounded-full">
                  <BarChart3 size={12} className="text-blue-500" />
                  경쟁 채널 {competitorChannels.length}개
                </span>
                <span className="flex items-center gap-1 px-2.5 py-1 bg-gray-50 rounded-full">
                  <Video size={12} className="text-purple-500" />
                  최근 콘텐츠 {Math.min(enrichedVideos.length, 12)}개
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
                <label className="block text-sm font-medium text-gray-700 mb-2">채널 추가</label>
                {/* 플랫폼 선택 */}
                <div className="flex gap-2 mb-3">
                  {['youtube', 'instagram'].map((p) => {
                    const cfg = PLATFORM_CONFIG[p];
                    const Icon = cfg.icon;
                    return (
                      <button
                        key={p}
                        onClick={() => { setNewChannelPlatform(p); setNewChannelInput(''); }}
                        className={`flex-1 flex items-center justify-center gap-2 py-2.5 rounded-lg text-sm font-medium border transition-all ${
                          newChannelPlatform === p
                            ? `${cfg.bgColor} ${cfg.textColor} ${cfg.borderColor} shadow-sm`
                            : 'bg-gray-50 text-gray-400 border-gray-200 hover:bg-gray-100'
                        }`}
                      >
                        <Icon size={16} />
                        {cfg.label}
                      </button>
                    );
                  })}
                </div>
                <input
                  type="text"
                  value={newChannelInput}
                  onChange={(e) => setNewChannelInput(e.target.value)}
                  onKeyDown={(e) => e.key === 'Enter' && !e.isComposing && handleAddChannel()}
                  placeholder={PLATFORM_CONFIG[newChannelPlatform].idPlaceholder}
                  className={`w-full px-3 py-2.5 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 ${PLATFORM_CONFIG[newChannelPlatform].ringColor} focus:border-transparent mb-3`}
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
                  className={`w-full flex items-center justify-center gap-2 px-4 py-2.5 text-white text-sm font-medium rounded-lg transition-colors disabled:opacity-50 ${
                    newChannelPlatform === 'instagram'
                      ? 'bg-pink-500 hover:bg-pink-600'
                      : 'bg-red-500 hover:bg-red-600'
                  }`}
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
                    {channels.map((ch) => {
                      const chCfg = PLATFORM_CONFIG[ch.platform || 'youtube'];
                      const ChIcon = chCfg.icon;
                      return (
                        <div key={ch.id} className="flex items-center gap-3 p-3 rounded-lg border border-gray-100 bg-gray-50">
                          {ch.thumbnail ? (
                            <img src={ch.thumbnail} alt={ch.name} className="w-8 h-8 rounded-full object-cover" />
                          ) : (
                            <div className={`w-8 h-8 rounded-full ${chCfg.bgColor} flex items-center justify-center`}>
                              <ChIcon size={14} className={chCfg.textColor} />
                            </div>
                          )}
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-1.5">
                              <ChIcon size={12} className={chCfg.textColor} />
                              <p className="text-sm font-medium text-gray-700 truncate">{ch.name}</p>
                            </div>
                            <p className="text-[11px] text-gray-400">{ch.handle || ch.channel_id}</p>
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
                      );
                    })}
                  </div>
                </div>
              )}

              <div className="mt-5 p-3 bg-amber-50 rounded-lg">
                {newChannelPlatform === 'youtube' ? (
                  <p className="text-xs text-amber-700 leading-relaxed">
                    <strong>YouTube 채널 ID 찾는 방법:</strong>
                    <br />
                    채널 페이지 URL에서 <code className="bg-amber-100 px-1 rounded">/channel/UCxxxxxxx</code> 부분을 복사하세요.
                    <br />
                    또는 <code className="bg-amber-100 px-1 rounded">@handle</code> 형식도 지원합니다.
                  </p>
                ) : (
                  <p className="text-xs text-amber-700 leading-relaxed">
                    <strong>Instagram Business Account ID 찾는 방법:</strong>
                    <br />
                    Meta Business Suite → 설정 → 비즈니스 자산 → Instagram 계정에서 확인할 수 있습니다.
                    <br />
                    <span className="text-amber-600">※ Instagram Business/Creator 계정만 지원됩니다.</span>
                  </p>
                )}
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
