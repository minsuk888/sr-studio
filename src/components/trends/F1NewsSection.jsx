import { useState, useEffect, useCallback } from 'react';
import { Loader, RefreshCw, Newspaper } from 'lucide-react';
import { newsService } from '../../services/newsService';
import { analyticsService } from '../../services/analyticsService';
import { YoutubeCard, NewsCard, BlogCard } from './ResultCards';

const FILTERS = [
  { id: 'all', label: '전체' },
  { id: 'youtube', label: 'YouTube' },
  { id: 'news', label: '뉴스' },
  { id: 'blog', label: '블로그' },
];

const SORT_OPTIONS = [
  { id: 'date', label: '최신순' },
  { id: 'relevance', label: '정확도순' },
];

export default function F1NewsSection() {
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState('all');
  const [sort, setSort] = useState('date');

  const fetchAll = useCallback(async () => {
    setLoading(true);
    try {
      const [naverNews, googleNews, blogs, ytResult] = await Promise.all([
        newsService.fetchNaverNews('F1', 10),
        newsService.fetchGoogleNews('Formula 1'),
        newsService.fetchNaverBlog('포뮬러원 F1', 10),
        analyticsService.searchYouTube('F1', 10).catch(() => ({ videos: [] })),
      ]);

      const tagged = [
        ...naverNews.map((a) => ({ ...a, _type: 'news' })),
        ...googleNews.map((a) => ({ ...a, _type: 'news' })),
        ...blogs.map((a) => ({ ...a, _type: 'blog' })),
        ...(ytResult.videos || []).map((v) => ({ ...v, _type: 'youtube' })),
      ];

      setItems(tagged);
    } catch (err) {
      console.error('F1 뉴스 로드 실패:', err);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { fetchAll(); }, [fetchAll]);

  const filtered = filter === 'all'
    ? items
    : items.filter((i) => i._type === filter);

  const sorted = [...filtered].sort((a, b) => {
    const dateA = a.date || a.publishedAt || '';
    const dateB = b.date || b.publishedAt || '';
    if (sort === 'date') return dateB.localeCompare(dateA);
    return 0;
  });

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <Newspaper size={18} className="text-red-500" />
          <h2 className="text-base font-semibold text-white">F1 뉴스 & 콘텐츠</h2>
          <span className="text-[10px] text-gray-600 bg-surface-700 px-2 py-0.5 rounded-full">
            {filtered.length}건
          </span>
        </div>
        <button
          onClick={fetchAll}
          disabled={loading}
          className="flex items-center gap-1.5 text-xs text-gray-400 hover:text-white transition-colors cursor-pointer disabled:opacity-50"
        >
          <RefreshCw size={12} className={loading ? 'animate-spin' : ''} />
          새로고침
        </button>
      </div>

      {/* Filters + Sort */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-1.5">
          {FILTERS.map((f) => (
            <button
              key={f.id}
              onClick={() => setFilter(f.id)}
              className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-colors cursor-pointer ${
                filter === f.id
                  ? 'bg-red-500/20 text-red-400'
                  : 'text-gray-400 hover:text-gray-200 hover:bg-white/5'
              }`}
            >
              {f.label}
            </button>
          ))}
        </div>
        <div className="flex items-center gap-1.5">
          {SORT_OPTIONS.map((s) => (
            <button
              key={s.id}
              onClick={() => setSort(s.id)}
              className={`px-2.5 py-1 rounded text-[11px] transition-colors cursor-pointer ${
                sort === s.id
                  ? 'text-white bg-surface-700'
                  : 'text-gray-500 hover:text-gray-300'
              }`}
            >
              {s.label}
            </button>
          ))}
        </div>
      </div>

      {/* Results */}
      {loading ? (
        <div className="flex items-center justify-center gap-2 py-12 text-sm text-gray-400">
          <Loader className="w-5 h-5 animate-spin" />
          F1 콘텐츠 검색 중...
        </div>
      ) : sorted.length === 0 ? (
        <div className="text-center py-12">
          <Newspaper size={36} className="text-gray-600 mx-auto mb-3" />
          <p className="text-sm text-gray-400">검색 결과가 없습니다</p>
        </div>
      ) : (
        <div className="space-y-2">
          {sorted.map((item, idx) => {
            const key = item.url || item.videoId || idx;
            if (item._type === 'youtube') return <YoutubeCard key={key} item={item} />;
            if (item._type === 'blog') return <BlogCard key={key} item={item} />;
            return <NewsCard key={key} item={item} />;
          })}
        </div>
      )}
    </div>
  );
}
