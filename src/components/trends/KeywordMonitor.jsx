import { useState, useEffect, useCallback } from 'react';
import {
  Search,
  RefreshCw,
  Loader,
  Tag,
  X,
  Plus,
  Youtube,
  Newspaper,
  Clock,
  BookOpen,
  MessageSquare,
  ArrowUpDown,
} from 'lucide-react';
import { trendService } from '../../services/trendService';
import { YoutubeCard, NewsCard, BlogCard, CafeCard, formatDate } from './ResultCards';

// Static class map — Tailwind JIT can detect these at build time
const ACCENT = {
  emerald: {
    icon: 'text-emerald-500',
    btn: 'bg-emerald-500 hover:bg-emerald-600',
    btnLight: 'bg-emerald-500/10 text-emerald-400 hover:bg-emerald-500/20',
    tag: 'bg-emerald-500/10 text-emerald-400',
    ring: 'focus:ring-emerald-500',
  },
  red: {
    icon: 'text-red-500',
    btn: 'bg-red-500 hover:bg-red-600',
    btnLight: 'bg-red-500/10 text-red-400 hover:bg-red-500/20',
    tag: 'bg-red-500/10 text-red-400',
    ring: 'focus:ring-red-500',
  },
  blue: {
    icon: 'text-blue-500',
    btn: 'bg-blue-500 hover:bg-blue-600',
    btnLight: 'bg-blue-500/10 text-blue-400 hover:bg-blue-500/20',
    tag: 'bg-blue-500/10 text-blue-400',
    ring: 'focus:ring-blue-500',
  },
};

export default function KeywordMonitor({ category = 'superrace', title = '모니터링', accentColor = 'emerald' }) {
  const c = ACCENT[accentColor] || ACCENT.emerald;

  const [keywords, setKeywords] = useState([]);
  const [newKeyword, setNewKeyword] = useState('');
  const [youtubeResults, setYoutubeResults] = useState([]);
  const [newsResults, setNewsResults] = useState([]);
  const [blogResults, setBlogResults] = useState([]);
  const [cafeResults, setCafeResults] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [lastFetched, setLastFetched] = useState(null);
  const [activeFilter, setActiveFilter] = useState('all');
  const [sortMode, setSortMode] = useState('date');

  // 키워드 로드
  const loadKeywords = useCallback(async () => {
    try {
      const data = await trendService.getKeywords(category);
      setKeywords(data || []);
      return data || [];
    } catch (err) {
      console.error('키워드 로드 실패:', err);
      return [];
    }
  }, [category]);

  // 자동 검색
  const autoSearch = useCallback(async (kws, sort = 'date') => {
    if (!kws || kws.length === 0) {
      setYoutubeResults([]);
      setNewsResults([]);
      setBlogResults([]);
      setCafeResults([]);
      setLoading(false);
      return;
    }
    setLoading(true);
    try {
      const { youtube, news, blog, cafe } = await trendService.searchAllKeywords(kws, sort);
      setYoutubeResults(youtube);
      setNewsResults(news);
      setBlogResults(blog || []);
      setCafeResults(cafe || []);
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
      await autoSearch(kws, sortMode);
    })();
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  // 정렬 변경 시 재검색
  const handleSortChange = (newSort) => {
    if (newSort === sortMode) return;
    setSortMode(newSort);
    if (keywords.length > 0) {
      autoSearch(keywords, newSort);
    }
  };

  // 강제 새로고침
  const handleRefresh = async () => {
    setRefreshing(true);
    try {
      const { youtube, news, blog, cafe } = await trendService.forceRefreshAll(keywords, sortMode);
      setYoutubeResults(youtube);
      setNewsResults(news);
      setBlogResults(blog || []);
      setCafeResults(cafe || []);
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
      const created = await trendService.addKeyword(trimmed, 'youtube', category);
      const updated = [...keywords, created];
      setKeywords(updated);
      setNewKeyword('');
      await autoSearch(updated, sortMode);
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
      await autoSearch(updated, sortMode);
    } catch (err) {
      console.error('키워드 삭제 실패:', err);
    }
  };

  // 결과 평탄화
  const flatYoutube = youtubeResults.flatMap((r) =>
    (r.results || []).map((item) => ({ ...item, _keyword: r.keyword, _type: 'youtube' })),
  );
  const flatNews = newsResults.map((a) => ({ ...a, _type: 'news' }));
  const flatBlog = blogResults.map((a) => ({ ...a, _type: 'blog' }));
  const flatCafe = cafeResults.map((a) => ({ ...a, _type: 'cafe' }));

  // 필터 적용
  const filterMap = {
    all: [...flatYoutube, ...flatNews, ...flatBlog, ...flatCafe],
    youtube: flatYoutube,
    news: flatNews,
    blog: flatBlog,
    cafe: flatCafe,
  };
  const filteredItems = filterMap[activeFilter] || filterMap.all;

  // 최신순 정렬 (date 모드에서 전체 탭일 때 날짜 기준 통합 정렬)
  const sortedItems = sortMode === 'date' && activeFilter === 'all'
    ? [...filteredItems].sort((a, b) => {
        const dateA = a.publishedAt || a.date || '';
        const dateB = b.publishedAt || b.date || '';
        return dateB.localeCompare(dateA);
      })
    : filteredItems;

  const cachedCount = youtubeResults.filter((r) => r.fromCache).length;
  const totalYoutubeKws = youtubeResults.length;

  return (
    <div className="space-y-4">
      {/* 헤더 + 새로고침 */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <Search size={18} className={c.icon} />
          <h2 className="text-base font-semibold text-white">{title}</h2>
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
          className={`flex items-center gap-1.5 px-3 py-1.5 ${c.btn} text-white text-xs font-medium rounded-lg transition-colors disabled:opacity-50 cursor-pointer`}
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
            className={`flex-1 px-3 py-2 bg-surface-700 border border-surface-600 rounded-lg text-sm text-gray-300 placeholder-gray-500 focus:outline-none focus:ring-2 ${c.ring} focus:border-transparent`}
          />
          <button
            onClick={handleAddKeyword}
            className={`flex items-center gap-1 px-3 py-2 ${c.btnLight} text-sm font-medium rounded-lg transition-colors cursor-pointer`}
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
                className={`inline-flex items-center gap-1 px-2.5 py-1 ${c.tag} text-xs font-medium rounded-full`}
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

      {/* 정렬 버튼 — 항상 표시 */}
      {keywords.length > 0 && (
        <div className="flex items-center justify-between gap-2 flex-wrap">
          {/* 필터 탭 — 결과 있을 때만 */}
          <div className="flex items-center gap-2 flex-wrap">
            {!loading && (flatYoutube.length > 0 || flatNews.length > 0 || flatBlog.length > 0 || flatCafe.length > 0) && (
              [
                { id: 'all', label: '전체', count: flatYoutube.length + flatNews.length + flatBlog.length + flatCafe.length },
                { id: 'youtube', label: 'YouTube', icon: Youtube, count: flatYoutube.length },
                { id: 'news', label: '뉴스', icon: Newspaper, count: flatNews.length },
                { id: 'blog', label: '블로그', icon: BookOpen, count: flatBlog.length },
                { id: 'cafe', label: '카페', icon: MessageSquare, count: flatCafe.length },
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
              })
            )}
          </div>
          {/* 정렬 토글 */}
          <div className="flex items-center gap-1 bg-surface-700 border border-surface-600 rounded-lg p-0.5 shrink-0">
            <button
              onClick={() => handleSortChange('date')}
              className={`flex items-center gap-1 px-3 py-1.5 rounded-md text-xs font-semibold transition-colors cursor-pointer ${
                sortMode === 'date'
                  ? 'bg-brand-500 text-white shadow-sm'
                  : 'text-gray-400 hover:text-white hover:bg-white/5'
              }`}
            >
              <Clock size={12} />
              최신순
            </button>
            <button
              onClick={() => handleSortChange('relevance')}
              className={`flex items-center gap-1 px-3 py-1.5 rounded-md text-xs font-semibold transition-colors cursor-pointer ${
                sortMode === 'relevance'
                  ? 'bg-brand-500 text-white shadow-sm'
                  : 'text-gray-400 hover:text-white hover:bg-white/5'
              }`}
            >
              <ArrowUpDown size={12} />
              정확도순
            </button>
          </div>
        </div>
      )}

      {/* 로딩 */}
      {loading && (
        <div className="flex items-center justify-center gap-2 py-16 text-sm text-gray-400">
          <Loader className="w-5 h-5 animate-spin" />
          키워드별 YouTube · 뉴스 · 블로그 · 카페 검색 중...
        </div>
      )}

      {/* 결과 그리드 */}
      {!loading && sortedItems.length > 0 && (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
          {sortedItems.map((item, idx) => {
            if (item._type === 'youtube') return <YoutubeCard key={item.videoId || idx} item={item} />;
            if (item._type === 'blog') return <BlogCard key={item.url || `blog-${idx}`} item={item} />;
            if (item._type === 'cafe') return <CafeCard key={item.url || `cafe-${idx}`} item={item} />;
            return <NewsCard key={item.url || idx} item={item} />;
          })}
        </div>
      )}

      {/* 빈 상태 */}
      {!loading && sortedItems.length === 0 && keywords.length > 0 && (
        <div className="text-center py-12">
          <Search size={36} className="text-gray-600 mx-auto mb-3" />
          <p className="text-sm text-gray-400">검색 결과가 없습니다</p>
          <p className="text-xs text-gray-500 mt-1">새로고침을 시도하거나 키워드를 변경해보세요</p>
        </div>
      )}
    </div>
  );
}
