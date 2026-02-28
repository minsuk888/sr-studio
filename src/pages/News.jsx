import { useState, useEffect, useMemo } from 'react';
import {
  Newspaper,
  Search,
  ExternalLink,
  Clock,
  User,
  Building2,
  Globe,
  Filter,
  RefreshCw,
  Bookmark,
  BookmarkCheck,
  Loader,
} from 'lucide-react';
import { newsService } from '../services/newsService';

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------

const KEYWORD_TAGS = ['전체', '슈퍼레이스', '모터스포츠', '레이싱', '하이브리드'];

const SOURCE_TABS = [
  { key: 'all', label: '전체' },
  { key: 'naver', label: '네이버 뉴스' },
  { key: 'google', label: '구글 뉴스' },
];

const TRENDING_KEYWORDS = [
  { keyword: '슈퍼레이스', volume: 100 },
  { keyword: '개막전', volume: 85 },
  { keyword: '티켓', volume: 72 },
  { keyword: '모터스포츠', volume: 65 },
  { keyword: '하이브리드', volume: 50 },
  { keyword: '스트리밍', volume: 38 },
];

const today = new Date().toISOString().split('T')[0];

// ---------------------------------------------------------------------------
// Main Component
// ---------------------------------------------------------------------------

export default function News() {
  const [newsArticles, setNewsArticles] = useState([]);
  const [loaded, setLoaded] = useState(false);
  const [activeTab, setActiveTab] = useState('all');
  const [searchKeyword, setSearchKeyword] = useState('');
  const [bookmarkedIds, setBookmarkedIds] = useState([]);
  const [autoScroll, setAutoScroll] = useState(true);
  const [activeTagKeyword, setActiveTagKeyword] = useState('전체');
  const [isRefreshing, setIsRefreshing] = useState(false);

  useEffect(() => {
    newsService.getAll().then((data) => {
      setNewsArticles(data);
    }).catch(console.error)
      .finally(() => setLoaded(true));
  }, []);

  // ---- Filtering ----
  const filteredArticles = useMemo(() => {
    let result = [...newsArticles];
    if (activeTab !== 'all') result = result.filter((a) => a.source === activeTab);
    if (activeTagKeyword !== '전체') result = result.filter((a) => a.title.toLowerCase().includes(activeTagKeyword.toLowerCase()));
    if (searchKeyword.trim()) result = result.filter((a) => a.title.toLowerCase().includes(searchKeyword.trim().toLowerCase()));
    return result.sort((a, b) => new Date(b.date) - new Date(a.date));
  }, [newsArticles, activeTab, activeTagKeyword, searchKeyword]);

  const tabCounts = useMemo(() => ({
    all: newsArticles.length,
    naver: newsArticles.filter((a) => a.source === 'naver').length,
    google: newsArticles.filter((a) => a.source === 'google').length,
  }), [newsArticles]);

  const todayCount = useMemo(() => newsArticles.filter((a) => a.date === today).length, [newsArticles]);

  const lastUpdated = new Date().toLocaleTimeString('ko-KR', { hour: '2-digit', minute: '2-digit' });

  const toggleBookmark = (id) => {
    setBookmarkedIds((prev) => prev.includes(id) ? prev.filter((bid) => bid !== id) : [...prev, id]);
  };

  const handleRefresh = () => {
    setIsRefreshing(true);
    newsService.fetchAndSaveAll('슈퍼레이스')
      .then((data) => {
        if (data && data.length > 0) setNewsArticles(data);
      })
      .catch((err) => console.error('뉴스 새로고침 실패:', err))
      .finally(() => setTimeout(() => setIsRefreshing(false), 800));
  };

  const tickerItems = useMemo(() => {
    const sorted = [...newsArticles].sort((a, b) => new Date(b.date) - new Date(a.date));
    return [...sorted, ...sorted];
  }, [newsArticles]);

  if (!loaded) {
    return (
      <div className="flex items-center justify-center h-64 text-slate-400">
        <Loader className="w-6 h-6 animate-spin mr-2" />
        데이터를 불러오는 중...
      </div>
    );
  }

  return (
    <div className="space-y-5">
      {/* Marquee keyframes */}
      <style>{`
        @keyframes marquee {
          0% { transform: translateX(0); }
          100% { transform: translateX(-50%); }
        }
        @keyframes fadeInUp {
          from { opacity: 0; transform: translateY(12px); }
          to { opacity: 1; transform: translateY(0); }
        }
      `}</style>

      {/* HEADER */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-slate-800 flex items-center gap-2">
            <Newspaper className="w-7 h-7 text-brand-500" />
            뉴스 스크랩
          </h1>
          <p className="text-sm text-slate-500 mt-1">슈퍼레이스 &amp; 모터스포츠 관련 최신 뉴스</p>
        </div>
        <button onClick={handleRefresh} disabled={isRefreshing} className="flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium text-white bg-brand-500 hover:bg-brand-600 disabled:opacity-60 disabled:cursor-not-allowed transition-colors cursor-pointer shadow-sm">
          <RefreshCw className={`w-4 h-4 ${isRefreshing ? 'animate-spin' : ''}`} />
          {isRefreshing ? '뉴스 수집 중...' : '최신 뉴스 가져오기'}
        </button>
      </div>

      {/* NEWS TICKER */}
      <div className="bg-slate-900 text-white py-2.5 rounded-xl overflow-hidden relative">
        <div className="flex items-center">
          <div className="shrink-0 flex items-center gap-1.5 px-4 z-10 bg-slate-900">
            <span className="relative flex h-2 w-2">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-red-400 opacity-75" />
              <span className="relative inline-flex rounded-full h-2 w-2 bg-red-500" />
            </span>
            <span className="text-xs font-bold text-red-400 tracking-wider">LIVE</span>
          </div>
          <div className="overflow-hidden flex-1">
            <div className="flex gap-12 whitespace-nowrap" style={{ animation: autoScroll ? 'marquee 30s linear infinite' : 'none' }}>
              {tickerItems.map((article, idx) => (
                <span key={`${article.id}-${idx}`} className="inline-flex items-center gap-2 text-sm">
                  <span className={`shrink-0 text-[10px] font-bold px-1.5 py-0.5 rounded ${article.source === 'naver' ? 'bg-green-500/20 text-green-400' : 'bg-blue-500/20 text-blue-400'}`}>
                    {article.source === 'naver' ? 'N' : 'G'}
                  </span>
                  <span className="text-slate-200">{article.title}</span>
                  <span className="text-slate-500 text-xs">{article.publisher}</span>
                </span>
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* STATS ROW */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        <div className="bg-white rounded-xl shadow-sm p-4 flex items-center gap-3">
          <div className="w-9 h-9 rounded-lg bg-brand-100 flex items-center justify-center"><Newspaper className="w-4.5 h-4.5 text-brand-600" /></div>
          <div><p className="text-lg font-bold text-slate-800">{newsArticles.length}</p><p className="text-xs text-slate-500">전체 기사</p></div>
        </div>
        <div className="bg-white rounded-xl shadow-sm p-4 flex items-center gap-3">
          <div className="w-9 h-9 rounded-lg bg-blue-100 flex items-center justify-center"><Clock className="w-4.5 h-4.5 text-blue-600" /></div>
          <div><p className="text-lg font-bold text-slate-800">{todayCount}</p><p className="text-xs text-slate-500">오늘의 기사</p></div>
        </div>
        <div className="bg-white rounded-xl shadow-sm p-4 flex items-center gap-3">
          <div className="w-9 h-9 rounded-lg bg-amber-100 flex items-center justify-center"><BookmarkCheck className="w-4.5 h-4.5 text-amber-600" /></div>
          <div><p className="text-lg font-bold text-slate-800">{bookmarkedIds.length}</p><p className="text-xs text-slate-500">북마크</p></div>
        </div>
        <div className="bg-white rounded-xl shadow-sm p-4 flex items-center gap-3">
          <div className="w-9 h-9 rounded-lg bg-green-100 flex items-center justify-center"><RefreshCw className="w-4.5 h-4.5 text-green-600" /></div>
          <div><p className="text-lg font-bold text-slate-800">{lastUpdated}</p><p className="text-xs text-slate-500">마지막 업데이트</p></div>
        </div>
      </div>

      {/* KEYWORD TAGS */}
      <div className="flex items-center gap-3 flex-wrap">
        <div className="flex items-center gap-1.5 mr-1">
          <Filter className="w-4 h-4 text-slate-400" />
          <span className="text-sm font-medium text-slate-500">키워드</span>
        </div>
        {KEYWORD_TAGS.map((tag) => (
          <button key={tag} onClick={() => setActiveTagKeyword(tag)} className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-colors cursor-pointer ${activeTagKeyword === tag ? 'bg-brand-500 text-white shadow-sm' : 'bg-white text-slate-600 hover:bg-slate-50 border border-slate-200'}`}>{tag}</button>
        ))}
        <div className="relative ml-auto">
          <input type="text" placeholder="뉴스 검색..." value={searchKeyword} onChange={(e) => setSearchKeyword(e.target.value)} className="w-56 pl-3 pr-9 py-2 rounded-lg border border-slate-200 text-sm focus:outline-none focus:ring-2 focus:ring-brand-500/30 focus:border-brand-500 transition bg-white" />
          <Search className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
        </div>
      </div>

      {/* SOURCE TABS */}
      <div className="flex items-center gap-1 border-b border-slate-200">
        {SOURCE_TABS.map((tab) => (
          <button key={tab.key} onClick={() => setActiveTab(tab.key)} className={`relative px-4 py-2.5 text-sm font-medium transition-colors cursor-pointer ${activeTab === tab.key ? 'text-brand-500' : 'text-slate-500 hover:text-slate-700'}`}>
            <span className="flex items-center gap-1.5">
              {tab.label}
              <span className={`text-[11px] px-1.5 py-0.5 rounded-full font-semibold ${activeTab === tab.key ? 'bg-brand-100 text-brand-600' : 'bg-slate-100 text-slate-500'}`}>{tabCounts[tab.key]}</span>
            </span>
            {activeTab === tab.key && <span className="absolute bottom-0 left-0 right-0 h-0.5 bg-brand-500 rounded-full" />}
          </button>
        ))}
        <div className="ml-auto flex items-center gap-2 pr-2 py-2">
          <span className="text-xs text-slate-400">자동 스크롤</span>
          <button onClick={() => setAutoScroll(!autoScroll)} className={`relative w-9 h-5 rounded-full transition-colors cursor-pointer ${autoScroll ? 'bg-brand-500' : 'bg-slate-300'}`}>
            <span className={`absolute top-0.5 left-0.5 w-4 h-4 rounded-full bg-white shadow transition-transform ${autoScroll ? 'translate-x-4' : 'translate-x-0'}`} />
          </button>
        </div>
      </div>

      {/* MAIN CONTENT */}
      <div className="flex gap-5">
        {/* Articles */}
        <div className="flex-1 min-w-0 space-y-4">
          {filteredArticles.length === 0 && (
            <div className="bg-white rounded-xl shadow-sm p-10 text-center">
              <Globe className="w-10 h-10 text-slate-300 mx-auto mb-3" />
              <p className="text-sm text-slate-400">검색 조건에 맞는 뉴스가 없습니다.</p>
            </div>
          )}
          {filteredArticles.map((article, index) => {
            const isNaver = article.source === 'naver';
            const isBookmarked = bookmarkedIds.includes(article.id);
            return (
              <a
                href={article.url}
                target="_blank"
                rel="noopener noreferrer"
                key={article.id}
                className={`block bg-white rounded-xl shadow-sm p-5 hover:shadow-md hover:-translate-y-0.5 transition-all cursor-pointer border-l-4 ${isNaver ? 'border-l-green-400' : 'border-l-blue-400'} no-underline`}
                style={{ animation: `fadeInUp 0.4s ease-out ${index * 0.06}s both` }}
              >
                <div className="flex items-start justify-between gap-3 mb-2">
                  <div className="flex items-center gap-2">
                    <span className={`text-[11px] font-semibold px-2 py-0.5 rounded-md ${isNaver ? 'bg-green-100 text-green-700' : 'bg-blue-100 text-blue-700'}`}>
                      {isNaver ? '네이버' : '구글'}
                    </span>
                    <span className="text-xs text-slate-400">{article.date}</span>
                  </div>
                  <button onClick={(e) => { e.stopPropagation(); toggleBookmark(article.id); }} className="p-1 rounded-md hover:bg-slate-100 transition-colors cursor-pointer shrink-0">
                    {isBookmarked ? <BookmarkCheck className="w-4.5 h-4.5 text-brand-500" /> : <Bookmark className="w-4.5 h-4.5 text-slate-300" />}
                  </button>
                </div>
                <h3 className="text-base font-bold text-slate-800 mb-1.5 leading-snug">{article.title}</h3>
                <p className="text-sm text-slate-500 mb-3 line-clamp-2 leading-relaxed">{article.summary}</p>
                <div className="flex items-center gap-4 text-xs text-slate-400">
                  <span className="flex items-center gap-1"><User className="w-3.5 h-3.5" />{article.reporter}</span>
                  <span className="flex items-center gap-1"><Building2 className="w-3.5 h-3.5" />{article.publisher}</span>
                  <span className="flex items-center gap-1"><Clock className="w-3.5 h-3.5" />{article.date}</span>
                  <span className="ml-auto flex items-center gap-1 text-brand-500 hover:text-brand-600 font-medium">기사 보기<ExternalLink className="w-3 h-3" /></span>
                </div>
              </a>
            );
          })}
        </div>

        {/* Trending Keywords sidebar */}
        <div className="w-72 shrink-0 hidden lg:block">
          <div className="bg-white rounded-xl shadow-sm p-5 sticky top-5">
            <h3 className="text-sm font-semibold text-slate-700 flex items-center gap-2 mb-4">
              <Globe className="w-4 h-4 text-brand-500" />
              인기 키워드
            </h3>
            <div className="space-y-3">
              {TRENDING_KEYWORDS.map((item, idx) => (
                <div key={item.keyword}>
                  <div className="flex items-center justify-between mb-1">
                    <span className="text-sm text-slate-700 font-medium flex items-center gap-2">
                      <span className="text-xs text-slate-400 w-4 text-right">{idx + 1}</span>
                      {item.keyword}
                    </span>
                    <span className="text-[11px] text-slate-400">{item.volume}%</span>
                  </div>
                  <div className="w-full h-2 bg-slate-100 rounded-full overflow-hidden">
                    <div className="h-full rounded-full transition-all" style={{ width: `${item.volume}%`, background: idx === 0 ? '#ef4444' : idx === 1 ? '#f97316' : idx === 2 ? '#eab308' : '#94a3b8' }} />
                  </div>
                </div>
              ))}
            </div>
            <div className="border-t border-slate-100 mt-5 pt-4">
              <h4 className="text-xs font-semibold text-slate-500 uppercase tracking-wider mb-3">소스 분포</h4>
              <div className="flex items-center gap-3">
                <div className="flex-1">
                  <div className="flex items-center gap-1.5 mb-1"><span className="w-2.5 h-2.5 rounded-full bg-green-500" /><span className="text-xs text-slate-600">네이버</span></div>
                  <p className="text-lg font-bold text-slate-800">{tabCounts.naver}</p>
                </div>
                <div className="w-px h-10 bg-slate-100" />
                <div className="flex-1">
                  <div className="flex items-center gap-1.5 mb-1"><span className="w-2.5 h-2.5 rounded-full bg-blue-500" /><span className="text-xs text-slate-600">구글</span></div>
                  <p className="text-lg font-bold text-slate-800">{tabCounts.google}</p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
