import { useState, useEffect, useMemo, useCallback } from 'react';
import {
  Newspaper,
  Search,
  ExternalLink,
  Clock,
  User,
  Building2,
  Globe,
  RefreshCw,
  Bookmark,
  BookmarkCheck,
  Loader,
  Plus,
  X,
  Tag,
  ChevronLeft,
  ChevronRight,
  Sparkles,
  CalendarDays,
} from 'lucide-react';
import { newsService } from '../services/newsService';

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------

const ITEMS_PER_PAGE = 10;

const SOURCE_TABS = [
  { key: 'all', label: '전체' },
  { key: 'naver', label: '네이버 뉴스' },
  { key: 'google', label: '구글 뉴스' },
];

const DATE_FILTERS = [
  { key: 'all', label: '전체 기간' },
  { key: 'today', label: '오늘' },
  { key: 'week', label: '최근 1주일' },
];

const STORAGE_KEY = 'sr-studio-news-keywords';

function loadKeywords() {
  try {
    const stored = localStorage.getItem(STORAGE_KEY);
    return stored ? JSON.parse(stored) : [];
  } catch {
    return [];
  }
}

function saveKeywords(keywords) {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(keywords));
}

const today = new Date().toISOString().split('T')[0];

function getOneWeekAgo() {
  const d = new Date();
  d.setDate(d.getDate() - 7);
  return d.toISOString().split('T')[0];
}

// 마크다운 → 간단 HTML 변환 (### 헤더, **, -, 줄바꿈)
function renderInsightText(text) {
  return text
    .split('\n')
    .map((line) => {
      // ### 헤더
      if (line.startsWith('### ')) return `<h3 class="text-sm font-bold text-slate-800 mt-4 mb-2 flex items-center gap-1">${line.slice(4)}</h3>`;
      if (line.startsWith('## ')) return `<h3 class="text-sm font-bold text-slate-800 mt-4 mb-2 flex items-center gap-1">${line.slice(3)}</h3>`;
      // 리스트
      if (line.startsWith('- ')) {
        const content = line.slice(2).replace(/\*\*(.*?)\*\*/g, '<strong class="text-slate-700">$1</strong>');
        return `<li class="text-sm text-slate-600 leading-relaxed ml-4 mb-1 list-disc">${content}</li>`;
      }
      // 빈 줄
      if (line.trim() === '') return '<div class="h-1"></div>';
      // 일반 텍스트
      const content = line.replace(/\*\*(.*?)\*\*/g, '<strong class="text-slate-700">$1</strong>');
      return `<p class="text-sm text-slate-600 leading-relaxed mb-1">${content}</p>`;
    })
    .join('');
}

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
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [currentPage, setCurrentPage] = useState(1);
  const [dateFilter, setDateFilter] = useState('all');

  // ---- 키워드 관리 ----
  const [keywords, setKeywords] = useState(loadKeywords);
  const [newKeywordInput, setNewKeywordInput] = useState('');

  // ---- AI 인사이트 ----
  const [aiInsight, setAiInsight] = useState('');
  const [isGeneratingInsight, setIsGeneratingInsight] = useState(false);
  const [showInsight, setShowInsight] = useState(false);
  const [insightGeneratedAt, setInsightGeneratedAt] = useState('');

  const addKeyword = useCallback(() => {
    const kw = newKeywordInput.trim();
    if (!kw || keywords.includes(kw)) return;
    const updated = [...keywords, kw];
    setKeywords(updated);
    saveKeywords(updated);
    setNewKeywordInput('');
  }, [newKeywordInput, keywords]);

  const removeKeyword = useCallback((kw) => {
    const updated = keywords.filter((k) => k !== kw);
    setKeywords(updated);
    saveKeywords(updated);
  }, [keywords]);

  // ---- 데이터 로드 ----
  useEffect(() => {
    newsService.getAll()
      .then((data) => setNewsArticles(data || []))
      .catch(console.error)
      .finally(() => setLoaded(true));
  }, []);

  // ---- Filtering (소스 + 기간 + 검색) ----
  const filteredArticles = useMemo(() => {
    let result = [...newsArticles];
    // 소스 필터
    if (activeTab !== 'all') result = result.filter((a) => a.source === activeTab);
    // 기간 필터
    if (dateFilter === 'today') {
      result = result.filter((a) => a.date === today);
    } else if (dateFilter === 'week') {
      const weekAgo = getOneWeekAgo();
      result = result.filter((a) => a.date >= weekAgo);
    }
    // 검색 필터
    if (searchKeyword.trim()) {
      const q = searchKeyword.trim().toLowerCase();
      result = result.filter((a) =>
        a.title?.toLowerCase().includes(q) || a.summary?.toLowerCase().includes(q)
      );
    }
    return result.sort((a, b) => new Date(b.date) - new Date(a.date));
  }, [newsArticles, activeTab, dateFilter, searchKeyword]);

  // ---- Pagination ----
  const totalPages = Math.max(1, Math.ceil(filteredArticles.length / ITEMS_PER_PAGE));
  const safePage = Math.min(currentPage, totalPages);

  const paginatedArticles = useMemo(() => {
    const start = (safePage - 1) * ITEMS_PER_PAGE;
    return filteredArticles.slice(start, start + ITEMS_PER_PAGE);
  }, [filteredArticles, safePage]);

  // 필터 변경 시 1페이지로 리셋
  useEffect(() => { setCurrentPage(1); }, [activeTab, searchKeyword, dateFilter]);

  const tabCounts = useMemo(() => ({
    all: newsArticles.length,
    naver: newsArticles.filter((a) => a.source === 'naver').length,
    google: newsArticles.filter((a) => a.source === 'google').length,
  }), [newsArticles]);

  const todayCount = useMemo(() => newsArticles.filter((a) => a.date === today).length, [newsArticles]);
  const weekCount = useMemo(() => {
    const weekAgo = getOneWeekAgo();
    return newsArticles.filter((a) => a.date >= weekAgo).length;
  }, [newsArticles]);

  const lastUpdated = new Date().toLocaleTimeString('ko-KR', { hour: '2-digit', minute: '2-digit' });

  const toggleBookmark = (id) => {
    setBookmarkedIds((prev) => prev.includes(id) ? prev.filter((bid) => bid !== id) : [...prev, id]);
  };

  // ---- 스크랩 실행 ----
  const handleRefresh = () => {
    if (keywords.length === 0) {
      alert('스크랩할 키워드를 먼저 등록해주세요.');
      return;
    }
    setIsRefreshing(true);
    newsService.fetchByKeywords(keywords)
      .then((data) => {
        if (data && data.length > 0) setNewsArticles(data);
        setCurrentPage(1);
      })
      .catch((err) => console.error('뉴스 스크랩 실패:', err))
      .finally(() => setTimeout(() => setIsRefreshing(false), 800));
  };

  // ---- AI 인사이트 생성 ----
  const handleGenerateInsight = () => {
    if (newsArticles.length === 0) {
      alert('분석할 기사가 없습니다. 먼저 스크랩을 실행해주세요.');
      return;
    }
    setIsGeneratingInsight(true);
    setShowInsight(true);
    setAiInsight('');
    newsService.generateInsights(newsArticles)
      .then((data) => {
        setAiInsight(data.insight || '인사이트를 생성하지 못했습니다.');
        setInsightGeneratedAt(new Date().toLocaleTimeString('ko-KR', { hour: '2-digit', minute: '2-digit' }));
      })
      .catch((err) => {
        console.error('AI 인사이트 실패:', err);
        setAiInsight('AI 인사이트 생성에 실패했습니다. Anthropic API 키가 Vercel 환경변수에 설정되어 있는지 확인해주세요.');
      })
      .finally(() => setIsGeneratingInsight(false));
  };

  const tickerItems = useMemo(() => {
    const sorted = [...newsArticles].sort((a, b) => new Date(b.date) - new Date(a.date));
    return [...sorted, ...sorted];
  }, [newsArticles]);

  // ---- 페이지 번호 계산 ----
  const pageNumbers = useMemo(() => {
    const pages = [];
    const maxVisible = 5;
    let start = Math.max(1, safePage - Math.floor(maxVisible / 2));
    let end = Math.min(totalPages, start + maxVisible - 1);
    if (end - start + 1 < maxVisible) start = Math.max(1, end - maxVisible + 1);
    for (let i = start; i <= end; i++) pages.push(i);
    return pages;
  }, [safePage, totalPages]);

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
          <p className="text-sm text-slate-500 mt-1">등록된 키워드로 실시간 뉴스를 수집합니다</p>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={handleGenerateInsight}
            disabled={isGeneratingInsight || newsArticles.length === 0}
            className="flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium text-slate-700 bg-white border border-slate-200 hover:bg-slate-50 disabled:opacity-50 disabled:cursor-not-allowed transition-colors cursor-pointer shadow-sm"
          >
            <Sparkles className={`w-4 h-4 text-amber-500 ${isGeneratingInsight ? 'animate-pulse' : ''}`} />
            {isGeneratingInsight ? 'AI 분석 중...' : 'AI 인사이트'}
          </button>
          <button onClick={handleRefresh} disabled={isRefreshing} className="flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium text-white bg-brand-500 hover:bg-brand-600 disabled:opacity-60 disabled:cursor-not-allowed transition-colors cursor-pointer shadow-sm">
            <RefreshCw className={`w-4 h-4 ${isRefreshing ? 'animate-spin' : ''}`} />
            {isRefreshing ? '뉴스 수집 중...' : '스크랩 실행'}
          </button>
        </div>
      </div>

      {/* AI INSIGHT PANEL */}
      {showInsight && (
        <div className="bg-gradient-to-br from-amber-50 via-white to-orange-50 rounded-xl shadow-sm border border-amber-200 overflow-hidden">
          <div className="flex items-center justify-between px-5 py-3 bg-amber-50/80 border-b border-amber-200">
            <div className="flex items-center gap-2">
              <Sparkles className="w-4.5 h-4.5 text-amber-500" />
              <h3 className="text-sm font-bold text-slate-800">AI 뉴스 인사이트</h3>
              {insightGeneratedAt && <span className="text-xs text-slate-400">({insightGeneratedAt} 생성)</span>}
            </div>
            <button onClick={() => setShowInsight(false)} className="p-1 rounded-md hover:bg-amber-100 transition-colors cursor-pointer">
              <X className="w-4 h-4 text-slate-400" />
            </button>
          </div>
          <div className="p-5">
            {isGeneratingInsight ? (
              <div className="flex items-center justify-center py-8 gap-3">
                <Loader className="w-5 h-5 animate-spin text-amber-500" />
                <span className="text-sm text-slate-500">Claude AI가 {newsArticles.length}개 기사를 분석하고 있습니다...</span>
              </div>
            ) : (
              <div dangerouslySetInnerHTML={{ __html: renderInsightText(aiInsight) }} />
            )}
          </div>
        </div>
      )}

      {/* KEYWORD MANAGER */}
      <div className="bg-white rounded-xl shadow-sm p-5">
        <div className="flex items-center gap-2 mb-3">
          <Tag className="w-4.5 h-4.5 text-brand-500" />
          <h3 className="text-sm font-semibold text-slate-700">스크랩 키워드</h3>
          <span className="text-xs text-slate-400">({keywords.length}개)</span>
        </div>
        <div className="flex items-center gap-2 mb-3">
          <input
            type="text"
            value={newKeywordInput}
            onChange={(e) => setNewKeywordInput(e.target.value)}
            onKeyDown={(e) => { if (e.key === 'Enter') { e.preventDefault(); addKeyword(); } }}
            placeholder="키워드 입력 후 Enter 또는 + 클릭"
            className="flex-1 px-3 py-2 rounded-lg border border-slate-200 text-sm focus:outline-none focus:ring-2 focus:ring-brand-500/30 focus:border-brand-500 transition bg-white"
          />
          <button
            onClick={addKeyword}
            disabled={!newKeywordInput.trim()}
            className="flex items-center gap-1 px-3 py-2 rounded-lg text-sm font-medium bg-slate-800 text-white hover:bg-slate-700 disabled:opacity-40 disabled:cursor-not-allowed transition-colors cursor-pointer"
          >
            <Plus className="w-4 h-4" />
            추가
          </button>
        </div>
        <div className="flex flex-wrap gap-2">
          {keywords.length === 0 && (
            <p className="text-xs text-slate-400 py-1">등록된 키워드가 없습니다. 키워드를 추가하고 스크랩을 실행하세요.</p>
          )}
          {keywords.map((kw) => (
            <span key={kw} className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-brand-50 text-brand-700 text-sm font-medium border border-brand-200">
              {kw}
              <button onClick={() => removeKeyword(kw)} className="p-0.5 rounded-full hover:bg-brand-200 transition-colors cursor-pointer">
                <X className="w-3 h-3" />
              </button>
            </span>
          ))}
        </div>
      </div>

      {/* NEWS TICKER */}
      {newsArticles.length > 0 && (
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
      )}

      {/* STATS ROW — 클릭 가능한 기간 필터 */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        <button
          onClick={() => setDateFilter('all')}
          className={`bg-white rounded-xl shadow-sm p-4 flex items-center gap-3 transition-all cursor-pointer text-left ${dateFilter === 'all' ? 'ring-2 ring-brand-500 shadow-md' : 'hover:shadow-md'}`}
        >
          <div className="w-9 h-9 rounded-lg bg-brand-100 flex items-center justify-center"><Newspaper className="w-4.5 h-4.5 text-brand-600" /></div>
          <div><p className="text-lg font-bold text-slate-800">{newsArticles.length}</p><p className="text-xs text-slate-500">전체 기사</p></div>
        </button>
        <button
          onClick={() => setDateFilter(dateFilter === 'today' ? 'all' : 'today')}
          className={`bg-white rounded-xl shadow-sm p-4 flex items-center gap-3 transition-all cursor-pointer text-left ${dateFilter === 'today' ? 'ring-2 ring-blue-500 shadow-md' : 'hover:shadow-md'}`}
        >
          <div className="w-9 h-9 rounded-lg bg-blue-100 flex items-center justify-center"><Clock className="w-4.5 h-4.5 text-blue-600" /></div>
          <div><p className="text-lg font-bold text-slate-800">{todayCount}</p><p className="text-xs text-slate-500">오늘의 기사</p></div>
        </button>
        <button
          onClick={() => setDateFilter(dateFilter === 'week' ? 'all' : 'week')}
          className={`bg-white rounded-xl shadow-sm p-4 flex items-center gap-3 transition-all cursor-pointer text-left ${dateFilter === 'week' ? 'ring-2 ring-purple-500 shadow-md' : 'hover:shadow-md'}`}
        >
          <div className={`w-9 h-9 rounded-lg flex items-center justify-center ${dateFilter === 'week' ? 'bg-purple-100' : 'bg-amber-100'}`}><CalendarDays className={`w-4.5 h-4.5 ${dateFilter === 'week' ? 'text-purple-600' : 'text-amber-600'}`} /></div>
          <div><p className="text-lg font-bold text-slate-800">{weekCount}</p><p className="text-xs text-slate-500">최근 1주일</p></div>
        </button>
        <div className="bg-white rounded-xl shadow-sm p-4 flex items-center gap-3">
          <div className="w-9 h-9 rounded-lg bg-green-100 flex items-center justify-center"><RefreshCw className="w-4.5 h-4.5 text-green-600" /></div>
          <div><p className="text-lg font-bold text-slate-800">{lastUpdated}</p><p className="text-xs text-slate-500">마지막 업데이트</p></div>
        </div>
      </div>

      {/* 기간 필터 활성 표시 */}
      {dateFilter !== 'all' && (
        <div className="flex items-center gap-2">
          <span className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium ${
            dateFilter === 'today' ? 'bg-blue-100 text-blue-700 border border-blue-200' : 'bg-purple-100 text-purple-700 border border-purple-200'
          }`}>
            <CalendarDays className="w-3.5 h-3.5" />
            {dateFilter === 'today' ? '오늘 기사만 보기' : '최근 1주일 기사만 보기'}
            <button onClick={() => setDateFilter('all')} className="p-0.5 rounded-full hover:bg-white/50 transition-colors cursor-pointer ml-1">
              <X className="w-3 h-3" />
            </button>
          </span>
          <span className="text-xs text-slate-400">{filteredArticles.length}건</span>
        </div>
      )}

      {/* SOURCE TABS + SEARCH */}
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
        <div className="ml-auto flex items-center gap-3 pr-2 py-2">
          <div className="relative">
            <input type="text" placeholder="기사 검색..." value={searchKeyword} onChange={(e) => setSearchKeyword(e.target.value)} className="w-48 pl-3 pr-9 py-1.5 rounded-lg border border-slate-200 text-sm focus:outline-none focus:ring-2 focus:ring-brand-500/30 focus:border-brand-500 transition bg-white" />
            <Search className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
          </div>
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
              <p className="text-sm text-slate-400">
                {newsArticles.length === 0
                  ? '수집된 기사가 없습니다. 키워드를 등록하고 스크랩을 실행하세요.'
                  : dateFilter === 'today'
                    ? '오늘 수집된 기사가 없습니다.'
                    : dateFilter === 'week'
                      ? '최근 1주일 내 기사가 없습니다.'
                      : '검색 조건에 맞는 뉴스가 없습니다.'}
              </p>
              {dateFilter !== 'all' && (
                <button onClick={() => setDateFilter('all')} className="mt-3 text-sm text-brand-500 hover:text-brand-600 font-medium cursor-pointer">전체 기사 보기</button>
              )}
            </div>
          )}
          {paginatedArticles.map((article, index) => {
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
                    {article.date === today && <span className="text-[10px] font-bold px-1.5 py-0.5 rounded bg-red-100 text-red-600">NEW</span>}
                  </div>
                  <button onClick={(e) => { e.preventDefault(); e.stopPropagation(); toggleBookmark(article.id); }} className="p-1 rounded-md hover:bg-slate-100 transition-colors cursor-pointer shrink-0">
                    {isBookmarked ? <BookmarkCheck className="w-4.5 h-4.5 text-brand-500" /> : <Bookmark className="w-4.5 h-4.5 text-slate-300" />}
                  </button>
                </div>
                <h3 className="text-base font-bold text-slate-800 mb-1.5 leading-snug">{article.title}</h3>
                <p className="text-sm text-slate-500 mb-3 line-clamp-2 leading-relaxed">{article.summary}</p>
                <div className="flex items-center gap-4 text-xs text-slate-400">
                  {article.reporter && <span className="flex items-center gap-1"><User className="w-3.5 h-3.5" />{article.reporter}</span>}
                  {article.publisher && <span className="flex items-center gap-1"><Building2 className="w-3.5 h-3.5" />{article.publisher}</span>}
                  <span className="flex items-center gap-1"><Clock className="w-3.5 h-3.5" />{article.date}</span>
                  <span className="ml-auto flex items-center gap-1 text-brand-500 hover:text-brand-600 font-medium">기사 보기<ExternalLink className="w-3 h-3" /></span>
                </div>
              </a>
            );
          })}

          {/* PAGINATION */}
          {filteredArticles.length > ITEMS_PER_PAGE && (
            <div className="flex items-center justify-center gap-1 pt-2 pb-4">
              <button
                onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
                disabled={safePage <= 1}
                className="p-2 rounded-lg hover:bg-slate-100 disabled:opacity-30 disabled:cursor-not-allowed transition-colors cursor-pointer"
              >
                <ChevronLeft className="w-4 h-4 text-slate-600" />
              </button>
              {pageNumbers[0] > 1 && (
                <>
                  <button onClick={() => setCurrentPage(1)} className="w-9 h-9 rounded-lg text-sm font-medium text-slate-600 hover:bg-slate-100 transition-colors cursor-pointer">1</button>
                  {pageNumbers[0] > 2 && <span className="w-9 h-9 flex items-center justify-center text-slate-400 text-sm">...</span>}
                </>
              )}
              {pageNumbers.map((num) => (
                <button
                  key={num}
                  onClick={() => setCurrentPage(num)}
                  className={`w-9 h-9 rounded-lg text-sm font-medium transition-colors cursor-pointer ${
                    safePage === num
                      ? 'bg-brand-500 text-white shadow-sm'
                      : 'text-slate-600 hover:bg-slate-100'
                  }`}
                >
                  {num}
                </button>
              ))}
              {pageNumbers[pageNumbers.length - 1] < totalPages && (
                <>
                  {pageNumbers[pageNumbers.length - 1] < totalPages - 1 && <span className="w-9 h-9 flex items-center justify-center text-slate-400 text-sm">...</span>}
                  <button onClick={() => setCurrentPage(totalPages)} className="w-9 h-9 rounded-lg text-sm font-medium text-slate-600 hover:bg-slate-100 transition-colors cursor-pointer">{totalPages}</button>
                </>
              )}
              <button
                onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))}
                disabled={safePage >= totalPages}
                className="p-2 rounded-lg hover:bg-slate-100 disabled:opacity-30 disabled:cursor-not-allowed transition-colors cursor-pointer"
              >
                <ChevronRight className="w-4 h-4 text-slate-600" />
              </button>
              <span className="ml-3 text-xs text-slate-400">{safePage} / {totalPages} 페이지 ({filteredArticles.length}건)</span>
            </div>
          )}
        </div>

        {/* Sidebar */}
        <div className="w-72 shrink-0 hidden lg:block">
          <div className="bg-white rounded-xl shadow-sm p-5 sticky top-5">
            <h3 className="text-sm font-semibold text-slate-700 flex items-center gap-2 mb-4">
              <Globe className="w-4 h-4 text-brand-500" />
              스크랩 현황
            </h3>
            <div className="space-y-3 mb-5">
              <div className="flex items-center justify-between text-sm">
                <span className="text-slate-500">전체 기사</span>
                <span className="font-bold text-slate-800">{newsArticles.length}건</span>
              </div>
              <div className="flex items-center justify-between text-sm">
                <span className="text-slate-500">오늘 수집</span>
                <span className="font-bold text-blue-600">{todayCount}건</span>
              </div>
              <div className="flex items-center justify-between text-sm">
                <span className="text-slate-500">최근 1주일</span>
                <span className="font-bold text-purple-600">{weekCount}건</span>
              </div>
              <div className="flex items-center justify-between text-sm">
                <span className="text-slate-500">등록 키워드</span>
                <span className="font-bold text-brand-600">{keywords.length}개</span>
              </div>
            </div>
            <div className="border-t border-slate-100 pt-4">
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
              {newsArticles.length > 0 && (
                <div className="mt-3">
                  <div className="w-full h-2.5 bg-slate-100 rounded-full overflow-hidden flex">
                    <div className="h-full bg-green-500 rounded-l-full" style={{ width: `${(tabCounts.naver / newsArticles.length) * 100}%` }} />
                    <div className="h-full bg-blue-500 rounded-r-full" style={{ width: `${(tabCounts.google / newsArticles.length) * 100}%` }} />
                  </div>
                </div>
              )}
            </div>
            {keywords.length > 0 && (
              <div className="border-t border-slate-100 mt-4 pt-4">
                <h4 className="text-xs font-semibold text-slate-500 uppercase tracking-wider mb-3">등록 키워드</h4>
                <div className="flex flex-wrap gap-1.5">
                  {keywords.map((kw) => (
                    <span key={kw} className="inline-block px-2 py-1 rounded-md bg-slate-100 text-slate-600 text-xs font-medium">{kw}</span>
                  ))}
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
