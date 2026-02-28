import { useState, useEffect } from 'react';
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
} from 'lucide-react';
import { analyticsService } from '../services/analyticsService';

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

// 마크다운 → HTML (News.jsx와 동일 패턴)
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

// ============================================================
// Main Component
// ============================================================
export default function Analytics() {
  // ---- 채널 데이터 ----
  const [channels, setChannels] = useState([]);
  const [channelStats, setChannelStats] = useState({});
  const [recentVideos, setRecentVideos] = useState([]);

  // ---- 모니터링 ----
  const [monitoringKeywords, setMonitoringKeywords] = useState([]);
  const [monitoringResults, setMonitoringResults] = useState([]);
  const [newKeywordInput, setNewKeywordInput] = useState('');
  const [isSearching, setIsSearching] = useState(false);

  // ---- AI 인사이트 ----
  const [aiInsight, setAiInsight] = useState('');
  const [isGeneratingInsight, setIsGeneratingInsight] = useState(false);
  const [showInsight, setShowInsight] = useState(false);
  const [insightGeneratedAt, setInsightGeneratedAt] = useState('');

  // ---- 채널 관리 모달 ----
  const [showChannelModal, setShowChannelModal] = useState(false);
  const [newChannelInput, setNewChannelInput] = useState('');
  const [newChannelIsOwn, setNewChannelIsOwn] = useState(true);
  const [addingChannel, setAddingChannel] = useState(false);

  // ---- UI ----
  const [loaded, setLoaded] = useState(false);
  const [isRefreshing, setIsRefreshing] = useState(false);

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
            new Date(cachedInsight.generated_at).toLocaleTimeString('ko-KR', { hour: '2-digit', minute: '2-digit' })
          );
        }

        // 캐시된 영상 불러오기
        const ownIds = (channelsData || []).filter((c) => c.is_own).map((c) => c.channel_id);
        if (ownIds.length > 0) {
          const videos = await analyticsService.getCachedVideos(ownIds);
          setRecentVideos(videos || []);
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
      await analyticsService.removeChannel(id);
      setChannels((prev) => prev.filter((c) => c.id !== id));
    } catch (err) {
      alert(`채널 삭제 실패: ${err.message}`);
    }
  };

  // ---- AI 인사이트 생성 ----
  const handleGenerateInsight = async () => {
    const ownChannels = channels.filter((c) => c.is_own);
    if (ownChannels.length === 0 && recentVideos.length === 0) {
      alert('분석할 데이터가 없습니다. 먼저 채널을 등록하고 데이터를 새로고침해주세요.');
      return;
    }
    setIsGeneratingInsight(true);
    setShowInsight(true);
    setAiInsight('');
    try {
      const channelData = ownChannels.map((ch) => ({
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
      const videoData = recentVideos.slice(0, 12).map((v) => ({
        title: v.title,
        views: v.views,
        likes: v.likes,
        comments: v.comments,
        publishedAt: v.publishedAt || v.published_at,
      }));
      const data = await analyticsService.generateSnsInsights(channelData, videoData, competitorData);
      setAiInsight(data.insight || '인사이트를 생성하지 못했습니다.');
      setInsightGeneratedAt(new Date().toLocaleTimeString('ko-KR', { hour: '2-digit', minute: '2-digit' }));
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
        analyticsService.searchYouTube(kw.keyword, 5)
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

  // ---- 파생 데이터 ----
  const ownChannels = channels.filter((c) => c.is_own);
  const competitorChannels = channels.filter((c) => !c.is_own);

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
              ? `YouTube 채널 ${channels.length}개 등록됨`
              : 'YouTube 채널을 등록하면 실시간 분석이 시작됩니다'}
          </p>
        </div>
        <div className="flex items-center gap-2 flex-wrap">
          <button
            onClick={handleGenerateInsight}
            disabled={isGeneratingInsight}
            className="flex items-center gap-1.5 px-3 py-2 bg-gradient-to-r from-purple-500 to-indigo-500 text-white text-sm font-medium rounded-lg hover:from-purple-600 hover:to-indigo-600 transition-all disabled:opacity-50 shadow-sm"
          >
            <Sparkles size={15} className={isGeneratingInsight ? 'animate-spin' : ''} />
            AI 인사이트
          </button>
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

      {/* ===== AI 인사이트 패널 ===== */}
      {showInsight && (
        <div className="bg-gradient-to-br from-indigo-50 via-white to-purple-50 rounded-xl shadow-sm border border-indigo-100 p-5 relative">
          <button
            onClick={() => setShowInsight(false)}
            className="absolute top-3 right-3 p-1 rounded-full hover:bg-gray-200/50 text-gray-400 hover:text-gray-600 transition-colors"
          >
            <X size={16} />
          </button>
          <div className="flex items-center gap-2 mb-3">
            <Sparkles size={18} className="text-purple-500" />
            <h2 className="text-base font-semibold text-gray-800">AI SNS 인사이트</h2>
            {insightGeneratedAt && (
              <span className="text-xs text-gray-400 ml-auto mr-6">생성: {insightGeneratedAt}</span>
            )}
          </div>
          {isGeneratingInsight ? (
            <div className="flex items-center gap-2 py-8 justify-center text-sm text-indigo-600">
              <Loader className="w-5 h-5 animate-spin" />
              Claude AI가 채널 데이터와 영상 성과를 분석하고 있습니다...
            </div>
          ) : aiInsight ? (
            <div
              className="prose-sm max-w-none"
              dangerouslySetInnerHTML={{ __html: renderInsightText(aiInsight) }}
            />
          ) : null}
        </div>
      )}

      {/* ===== 채널 없을 때 안내 ===== */}
      {channels.length === 0 && (
        <div className="bg-white rounded-xl shadow-sm p-12 text-center">
          <Youtube size={48} className="text-red-400 mx-auto mb-4" />
          <h3 className="text-lg font-semibold text-gray-700 mb-2">YouTube 채널을 등록해보세요</h3>
          <p className="text-sm text-gray-500 mb-4">
            채널을 등록하면 구독자 수, 조회수, 최근 영상 성과를 실시간으로 분석할 수 있습니다.
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

      {/* ===== 채널 KPI 카드 ===== */}
      {channels.length > 0 && (
        <>
          {ownChannels.length > 0 && (
            <div>
              <h2 className="text-sm font-semibold text-gray-600 mb-3 flex items-center gap-1.5">
                <Youtube size={15} className="text-red-500" />
                우리 채널
              </h2>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {ownChannels.map((ch, idx) => {
                  const stats = channelStats[ch.channel_id] || {};
                  const color = CHANNEL_COLORS[idx % CHANNEL_COLORS.length];
                  return (
                    <div
                      key={ch.id}
                      className="bg-white rounded-xl shadow-sm p-5 border-l-4 relative overflow-hidden hover:shadow-md transition-shadow"
                      style={{ borderLeftColor: color }}
                    >
                      <div className="flex items-center gap-3 mb-4">
                        {ch.thumbnail ? (
                          <img src={ch.thumbnail} alt={ch.name} className="w-10 h-10 rounded-full object-cover" />
                        ) : (
                          <div className="w-10 h-10 rounded-full bg-red-100 flex items-center justify-center">
                            <Youtube size={18} className="text-red-500" />
                          </div>
                        )}
                        <div className="min-w-0">
                          <h3 className="font-semibold text-gray-800 text-sm truncate">{ch.name}</h3>
                          {ch.handle && <p className="text-xs text-gray-400">{ch.handle}</p>}
                        </div>
                      </div>
                      <div className="space-y-2.5">
                        <div className="flex items-center justify-between">
                          <span className="text-xs text-gray-500 flex items-center gap-1"><Users size={13} /> 구독자</span>
                          <span className="text-lg font-bold text-gray-900">{formatNumber(stats.subscribers || 0)}</span>
                        </div>
                        <div className="flex items-center justify-between">
                          <span className="text-xs text-gray-500 flex items-center gap-1"><Eye size={13} /> 총 조회수</span>
                          <span className="text-sm font-semibold text-gray-700">{formatNumber(stats.totalViews || 0)}</span>
                        </div>
                        <div className="flex items-center justify-between">
                          <span className="text-xs text-gray-500 flex items-center gap-1"><Video size={13} /> 영상 수</span>
                          <span className="text-sm font-semibold text-gray-700">{formatNumber(stats.videoCount || 0)}</span>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {competitorChannels.length > 0 && (
            <div>
              <h2 className="text-sm font-semibold text-gray-600 mb-3 flex items-center gap-1.5">
                <BarChart3 size={15} className="text-blue-500" />
                경쟁/관련 채널
              </h2>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {competitorChannels.map((ch) => {
                  const stats = channelStats[ch.channel_id] || {};
                  return (
                    <div key={ch.id} className="bg-white rounded-xl shadow-sm p-4 border border-gray-100 hover:shadow-md transition-shadow">
                      <div className="flex items-center gap-3 mb-3">
                        {ch.thumbnail ? (
                          <img src={ch.thumbnail} alt={ch.name} className="w-9 h-9 rounded-full object-cover" />
                        ) : (
                          <div className="w-9 h-9 rounded-full bg-gray-100 flex items-center justify-center">
                            <Youtube size={16} className="text-gray-400" />
                          </div>
                        )}
                        <div className="min-w-0 flex-1">
                          <h3 className="font-medium text-gray-700 text-sm truncate">{ch.name}</h3>
                        </div>
                        <span className="text-[10px] px-2 py-0.5 rounded-full bg-blue-50 text-blue-600 font-medium">경쟁</span>
                      </div>
                      <div className="flex items-center gap-4 text-xs text-gray-500">
                        <span><Users size={12} className="inline mr-1" />{formatNumber(stats.subscribers || 0)}</span>
                        <span><Eye size={12} className="inline mr-1" />{formatNumber(stats.totalViews || 0)}</span>
                        <span><Video size={12} className="inline mr-1" />{stats.videoCount || 0}</span>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}
        </>
      )}

      {/* ===== 최근 콘텐츠 ===== */}
      {recentVideos.length > 0 && (
        <div>
          <h2 className="text-base font-semibold text-gray-800 flex items-center gap-2 mb-4">
            <Play size={18} className="text-indigo-500" />
            최근 콘텐츠 성과
          </h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {recentVideos.slice(0, 6).map((video, idx) => (
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
                  <div className="absolute top-2 right-2 bg-black/70 text-white text-[10px] px-1.5 py-0.5 rounded">
                    <Youtube size={10} className="inline mr-0.5" /> YouTube
                  </div>
                </div>
                <div className="p-3">
                  <h3 className="text-sm font-medium text-gray-800 line-clamp-2 mb-2 group-hover:text-indigo-600 transition-colors leading-snug">
                    {video.title}
                  </h3>
                  <div className="flex items-center justify-between text-xs text-gray-500">
                    <div className="flex items-center gap-2.5">
                      <span className="flex items-center gap-0.5"><Eye size={12} />{formatNumber(video.views)}</span>
                      <span className="flex items-center gap-0.5"><ThumbsUp size={12} />{formatNumber(video.likes)}</span>
                      <span className="flex items-center gap-0.5"><MessageCircle size={12} />{formatNumber(video.comments)}</span>
                    </div>
                    <span>{formatFullDate(video.published_at || video.publishedAt)}</span>
                  </div>
                </div>
              </a>
            ))}
          </div>
        </div>
      )}

      {/* ===== 업계 모니터링 ===== */}
      <div>
        <h2 className="text-base font-semibold text-gray-800 flex items-center gap-2 mb-4">
          <Search size={18} className="text-emerald-500" />
          업계 모니터링
        </h2>
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
              {monitoringResults.slice(0, 9).map((result, idx) => (
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

      {/* ===== 채널 관리 모달 ===== */}
      {showChannelModal && (
        <div className="fixed inset-0 bg-black/40 backdrop-blur-sm flex items-center justify-center z-50 p-4" onClick={() => setShowChannelModal(false)}>
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-lg max-h-[80vh] overflow-y-auto" onClick={(e) => e.stopPropagation()}>
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
                        <span className={`text-[10px] px-2 py-0.5 rounded-full font-medium ${ch.is_own ? 'bg-red-50 text-red-600' : 'bg-blue-50 text-blue-600'}`}>
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
                  <strong>채널 ID 찾는 방법:</strong><br />
                  YouTube 채널 페이지 URL에서 <code className="bg-amber-100 px-1 rounded">/channel/UCxxxxxxx</code> 부분을 복사하세요.<br />
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
