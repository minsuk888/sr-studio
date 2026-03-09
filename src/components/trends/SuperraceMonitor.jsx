import { useState, useEffect, useCallback } from 'react';
import {
  Search,
  RefreshCw,
  Loader,
  ExternalLink,
  Tag,
  X,
  Plus,
  Youtube,
  Newspaper,
  Clock,
} from 'lucide-react';
import { trendService } from '../../services/trendService';

function formatDate(dateStr) {
  if (!dateStr) return '';
  const d = new Date(dateStr);
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${y}.${m}.${day}`;
}

function stripHtml(html) {
  if (!html) return '';
  return html.replace(/<[^>]*>/g, '');
}

export default function SuperraceMonitor() {
  const [keywords, setKeywords] = useState([]);
  const [newKeyword, setNewKeyword] = useState('');
  const [youtubeResults, setYoutubeResults] = useState([]);
  const [newsResults, setNewsResults] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [lastFetched, setLastFetched] = useState(null);
  const [activeFilter, setActiveFilter] = useState('all'); // all | youtube | news

  // 키워드 로드
  const loadKeywords = useCallback(async () => {
    try {
      const data = await trendService.getKeywords();
      setKeywords(data || []);
      return data || [];
    } catch (err) {
      console.error('키워드 로드 실패:', err);
      return [];
    }
  }, []);

  // 자동 검색
  const autoSearch = useCallback(async (kws) => {
    if (!kws || kws.length === 0) {
      setYoutubeResults([]);
      setNewsResults([]);
      setLoading(false);
      return;
    }
    setLoading(true);
    try {
      const { youtube, news } = await trendService.searchAllKeywords(kws);
      setYoutubeResults(youtube);
      setNewsResults(news);
      const fetchTimes = youtube.map((r) => r.fetchedAt).filter(Boolean);
      if (fetchTimes.length > 0) {
        setLastFetched(new Date(Math.max(...fetchTimes.map((t) => new Date(t).getTime()))));
      }
    } catch (err) {
      console.error('자동 검색 실패:', err);
    } finally {
      setLoading(false);
    }
  }, []);

  // 마운트 시 키워드 로드 → 자동 검색
  useEffect(() => {
    (async () => {
      const kws = await loadKeywords();
      await autoSearch(kws);
    })();
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  // 강제 새로고침
  const handleRefresh = async () => {
    setRefreshing(true);
    try {
      const { youtube, news } = await trendService.forceRefreshAll(keywords);
      setYoutubeResults(youtube);
      setNewsResults(news);
      setLastFetched(new Date());
    } catch (err) {
      console.error('새로고침 실패:', err);
    } finally {
      setRefreshing(false);
    }
  };

  // 키워드 추가
  const handleAddKeyword = async () => {
    const trimmed = newKeyword.trim();
    if (!trimmed) return;
    if (keywords.some((kw) => kw.keyword === trimmed)) return;

    try {
      const created = await trendService.addKeyword(trimmed, 'youtube');
      const updated = [...keywords, created];
      setKeywords(updated);
      setNewKeyword('');
      await autoSearch(updated);
    } catch (err) {
      console.error('키워드 추가 실패:', err);
    }
  };

  // 키워드 삭제
  const handleRemoveKeyword = async (id) => {
    try {
      await trendService.removeKeyword(id);
      const updated = keywords.filter((kw) => kw.id !== id);
      setKeywords(updated);
      await autoSearch(updated);
    } catch (err) {
      console.error('키워드 삭제 실패:', err);
    }
  };

  // YouTube 결과 평탄화
  const flatYoutube = youtubeResults.flatMap((r) =>
    (r.results || []).map((item) => ({ ...item, _keyword: r.keyword, _type: 'youtube' })),
  );

  // 뉴스 결과에 타입 추가
  const flatNews = newsResults.map((a) => ({ ...a, _type: 'news' }));

  // 필터 적용
  const filteredItems =
    activeFilter === 'youtube'
      ? flatYoutube
      : activeFilter === 'news'
        ? flatNews
        : [...flatYoutube, ...flatNews];

  const cachedCount = youtubeResults.filter((r) => r.fromCache).length;
  const totalYoutubeKws = youtubeResults.length;

  return (
    <div className="space-y-4">
      {/* 헤더 + 새로고침 */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <Search size={18} className="text-emerald-500" />
          <h2 className="text-base font-semibold text-white">슈퍼레이스 모니터링</h2>
          {lastFetched && (
            <span className="flex items-center gap-1 text-xs text-gray-500">
              <Clock size={11} />
              {formatDate(lastFetched)}
            </span>
          )}
          {totalYoutubeKws > 0 && cachedCount > 0 && (
            <span className="text-[10px] text-gray-600 bg-surface-700 px-2 py-0.5 rounded-full">
              캐시 {cachedCount}/{totalYoutubeKws}
            </span>
          )}
        </div>
        <button
          onClick={handleRefresh}
          disabled={refreshing || loading}
          className="flex items-center gap-1.5 px-3 py-1.5 bg-emerald-500 text-white text-xs font-medium rounded-lg hover:bg-emerald-600 transition-colors disabled:opacity-50 cursor-pointer"
        >
          <RefreshCw size={13} className={refreshing ? 'animate-spin' : ''} />
          {refreshing ? '검색 중...' : '새로고침'}
        </button>
      </div>

      {/* 키워드 관리 */}
      <div className="bg-surface-800 rounded-xl border border-surface-700 p-4">
        <div className="flex items-center gap-2 mb-3">
          <input
            type="text"
            value={newKeyword}
            onChange={(e) => setNewKeyword(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && !e.isComposing && handleAddKeyword()}
            placeholder="모니터링 키워드 추가 (예: 슈퍼레이스, SUPERRACE)"
            className="flex-1 px-3 py-2 bg-surface-700 border border-surface-600 rounded-lg text-sm text-gray-300 placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:border-transparent"
          />
          <button
            onClick={handleAddKeyword}
            className="flex items-center gap-1 px-3 py-2 bg-emerald-500/10 text-emerald-400 text-sm font-medium rounded-lg hover:bg-emerald-500/20 transition-colors cursor-pointer"
          >
            <Plus size={14} />
            추가
          </button>
        </div>
        {keywords.length > 0 ? (
          <div className="flex flex-wrap gap-2">
            {keywords.map((kw) => (
              <span
                key={kw.id}
                className="inline-flex items-center gap-1 px-2.5 py-1 bg-emerald-500/10 text-emerald-400 text-xs font-medium rounded-full"
              >
                <Tag size={11} />
                {kw.keyword}
                <button
                  onClick={() => handleRemoveKeyword(kw.id)}
                  className="ml-0.5 hover:text-red-400 transition-colors cursor-pointer"
                >
                  <X size={12} />
                </button>
              </span>
            ))}
          </div>
        ) : (
          <p className="text-xs text-gray-500">
            키워드를 등록하면 YouTube와 뉴스에서 관련 콘텐츠를 자동으로 검색합니다
          </p>
        )}
      </div>

      {/* 필터 탭 */}
      {!loading && (flatYoutube.length > 0 || flatNews.length > 0) && (
        <div className="flex items-center gap-2">
          {[
            { id: 'all', label: '전체', count: flatYoutube.length + flatNews.length },
            { id: 'youtube', label: 'YouTube', icon: Youtube, count: flatYoutube.length },
            { id: 'news', label: '뉴스', icon: Newspaper, count: flatNews.length },
          ].map((f) => {
            const Icon = f.icon;
            return (
              <button
                key={f.id}
                onClick={() => setActiveFilter(f.id)}
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium transition-colors cursor-pointer ${
                  activeFilter === f.id
                    ? 'bg-brand-500/15 text-brand-400 border border-brand-500/30'
                    : 'bg-surface-800 text-gray-400 border border-surface-700 hover:bg-white/5'
                }`}
              >
                {Icon && <Icon size={12} />}
                {f.label}
                <span className="text-[10px] opacity-70">({f.count})</span>
              </button>
            );
          })}
        </div>
      )}

      {/* 로딩 */}
      {loading && (
        <div className="flex items-center justify-center gap-2 py-16 text-sm text-gray-400">
          <Loader className="w-5 h-5 animate-spin" />
          키워드별 YouTube · 뉴스 검색 중...
        </div>
      )}

      {/* 결과 그리드 */}
      {!loading && filteredItems.length > 0 && (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
          {filteredItems.map((item, idx) =>
            item._type === 'youtube' ? (
              <YoutubeCard key={item.videoId || idx} item={item} />
            ) : (
              <NewsCard key={item.url || idx} item={item} />
            ),
          )}
        </div>
      )}

      {/* 빈 상태 */}
      {!loading && filteredItems.length === 0 && keywords.length > 0 && (
        <div className="text-center py-12">
          <Search size={36} className="text-gray-600 mx-auto mb-3" />
          <p className="text-sm text-gray-400">검색 결과가 없습니다</p>
          <p className="text-xs text-gray-500 mt-1">새로고침을 시도하거나 키워드를 변경해보세요</p>
        </div>
      )}
    </div>
  );
}

// ---- YouTube 카드 ----
function YoutubeCard({ item }) {
  return (
    <a
      href={item.videoId ? `https://youtube.com/watch?v=${item.videoId}` : '#'}
      target="_blank"
      rel="noopener noreferrer"
      className="flex gap-3 p-3 rounded-lg border border-surface-700 bg-surface-800 hover:bg-white/5 transition-colors group"
    >
      {item.thumbnail && (
        <img
          src={item.thumbnail}
          alt=""
          className="w-28 h-[72px] rounded object-cover flex-shrink-0"
        />
      )}
      <div className="min-w-0 flex-1">
        <div className="flex items-center gap-1.5 mb-1">
          <Youtube size={11} className="text-red-500 flex-shrink-0" />
          <span className="text-[10px] text-red-400 font-medium">YouTube</span>
          {item._keyword && (
            <span className="text-[10px] text-gray-600 bg-surface-700 px-1.5 py-0.5 rounded">
              {item._keyword}
            </span>
          )}
        </div>
        <h4 className="text-xs font-medium text-white line-clamp-2 mb-1">
          {stripHtml(item.title)}
        </h4>
        <p className="text-[11px] text-gray-400">{item.channelTitle}</p>
        <p className="text-[11px] text-gray-500">{formatDate(item.publishedAt)}</p>
      </div>
      <ExternalLink
        size={12}
        className="text-gray-600 group-hover:text-gray-300 flex-shrink-0 mt-1 transition-colors"
      />
    </a>
  );
}

// ---- 뉴스 카드 ----
function NewsCard({ item }) {
  return (
    <a
      href={item.url || '#'}
      target="_blank"
      rel="noopener noreferrer"
      className="flex gap-3 p-3 rounded-lg border border-surface-700 bg-surface-800 hover:bg-white/5 transition-colors group"
    >
      <div className="w-28 h-[72px] rounded bg-surface-700 flex items-center justify-center flex-shrink-0">
        <Newspaper size={20} className="text-gray-600" />
      </div>
      <div className="min-w-0 flex-1">
        <div className="flex items-center gap-1.5 mb-1">
          <Newspaper size={11} className="text-blue-500 flex-shrink-0" />
          <span className="text-[10px] text-blue-400 font-medium">
            {item.source === 'naver' ? '네이버' : '구글'}
          </span>
          {item.publisher && (
            <span className="text-[10px] text-gray-600 truncate">{item.publisher}</span>
          )}
        </div>
        <h4 className="text-xs font-medium text-white line-clamp-2 mb-1">
          {stripHtml(item.title)}
        </h4>
        {item.summary && (
          <p className="text-[11px] text-gray-400 line-clamp-1">{stripHtml(item.summary)}</p>
        )}
        <p className="text-[11px] text-gray-500">{formatDate(item.date)}</p>
      </div>
      <ExternalLink
        size={12}
        className="text-gray-600 group-hover:text-gray-300 flex-shrink-0 mt-1 transition-colors"
      />
    </a>
  );
}
