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
  Trash2,
  AlertTriangle,
  ShieldAlert,
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
      if (line.startsWith('### ')) return `<h3 class="text-sm font-bold text-gray-100 mt-4 mb-2 flex items-center gap-1">${line.slice(4)}</h3>`;
      if (line.startsWith('## ')) return `<h3 class="text-sm font-bold text-gray-100 mt-4 mb-2 flex items-center gap-1">${line.slice(3)}</h3>`;
      // 리스트
      if (line.startsWith('- ')) {
        const content = line.slice(2).replace(/\*\*(.*?)\*\*/g, '<strong class="text-gray-200">$1</strong>');
        return `<li class="text-sm text-gray-300 leading-relaxed ml-4 mb-1 list-disc">${content}</li>`;
      }
      // 빈 줄
      if (line.trim() === '') return '<div class="h-1"></div>';
      // 일반 텍스트
      const content = line.replace(/\*\*(.*?)\*\*/g, '<strong class="text-gray-200">$1</strong>');
      return `<p class="text-sm text-gray-300 leading-relaxed mb-1">${content}</p>`;
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
  const [negativeArticles, setNegativeArticles] = useState([]);

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

  // ---- 기사 초기화 ----
  const [isResetting, setIsResetting] = useState(false);

  const handleResetArticles = useCallback(async () => {
    if (!window.confirm('스크랩한 기사를 모두 삭제하시겠습니까? 이 작업은 되돌릴 수 없습니다.')) return;
    setIsResetting(true);
    try {
      await newsService.deleteAll();
      setNewsArticles([]);
      setAiInsight('');
      setNegativeArticles([]);
      setBookmarkedIds([]);
      setCurrentPage(1);
      setShowInsight(false);
      setInsightGeneratedAt('');
    } catch (err) {
      console.error('기사 초기화 실패:', err);
    } finally {
      setIsResetting(false);
    }
  }, []);

  // ---- AI 인사이트 생성 ----
  const handleGenerateInsight = () => {
    if (newsArticles.length === 0) {
      alert('분석할 기사가 없습니다. 먼저 스크랩을 실행해주세요.');
      return;
    }
    setIsGeneratingInsight(true);
    setShowInsight(true);
    setAiInsight('');
    setNegativeArticles([]);
    newsService.generateInsights(newsArticles)
      .then((data) => {
        setAiInsight(data.insight || '인사이트를 생성하지 못했습니다.');
        setNegativeArticles(data.negativeArticles || []);
        setInsightGeneratedAt(new Date().toLocaleTimeString('ko-KR', { hour: '2-digit', minute: '2-digit' }));
      })
      .catch((err) => {
        console.error('AI 인사이트 실패:', err);
        setAiInsight('AI 인사이트 생성에 실패했습니다. Gemini API 키가 Vercel 환경변수에 설정되어 있는지 확인해주세요.');
      })
      .finally(() => setIsGeneratingInsight(false));
  };

  // 부정 기사 제목 Set (카드 매칭용 — 제목 앞 30자로 fuzzy 매칭)
  const negativeTitleSet = useMemo(() => {
    return new Set(negativeArticles.map((n) => n.title?.slice(0, 30).toLowerCase()));
  }, [negativeArticles]);

  const isNegativeArticle = (article) => {
    if (negativeTitleSet.size === 0) return false;
    const titlePrefix = (article.title || '').slice(0, 30).toLowerCase();
    return negativeTitleSet.has(titlePrefix);
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
      <div className="flex items-center justify-center h-64 text-gray-400">
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
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold text-white flex items-center gap-2">
            <Newspaper className="w-7 h-7 text-brand-500" />
            뉴스 스크랩
          </h1>
          <p className="text-sm text-gray-400 mt-1">등록된 키워드로 실시간 뉴스를 수집합니다</p>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={handleGenerateInsight}
            disabled={isGeneratingInsight || newsArticles.length === 0}
            className="flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium text-gray-300 bg-surface-800 border border-surface-700 hover:bg-white/5 disabled:opacity-50 disabled:cursor-not-allowed transition-colors cursor-pointer shadow-sm"
          >
            <Sparkles className={`w-4 h-4 text-amber-500 ${isGeneratingInsight ? 'animate-pulse' : ''}`} />
            {isGeneratingInsight ? 'AI 분석 중...' : 'AI 인사이트'}
          </button>
          <button onClick={handleRefresh} disabled={isRefreshing} className="flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium text-white bg-brand-500 hover:bg-brand-600 disabled:opacity-60 disabled:cursor-not-allowed transition-colors cursor-pointer shadow-sm">
            <RefreshCw className={`w-4 h-4 ${isRefreshing ? 'animate-spin' : ''}`} />
            {isRefreshing ? '뉴스 수집 중...' : '스크랩 실행'}
          </button>
          <button
            onClick={handleResetArticles}
            disabled={isResetting || isRefreshing}
            className="flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium bg-red-500/10 text-red-400 border border-red-500/20 hover:bg-red-500/20 disabled:opacity-50 disabled:cursor-not-allowed transition-colors cursor-pointer shadow-sm"
          >
            <Trash2 className={`w-4 h-4 ${isResetting ? 'animate-spin' : ''}`} />
            {isResetting ? '삭제 중...' : '초기화'}
          </button>
        </div>
      </div>

      {/* AI INSIGHT PANEL */}
      {showInsight && (
        <div className="bg-surface-800 rounded-xl shadow-sm border border-surface-700">
          <div className="flex items-center justify-between px-5 py-3 bg-white/5 border-b border-surface-700">
            <div className="flex items-center gap-2">
              <Sparkles className="w-4.5 h-4.5 text-amber-500" />
              <h3 className="text-sm font-bold text-white">AI 뉴스 인사이트</h3>
              {insightGeneratedAt && <span className="text-xs text-gray-500">({insightGeneratedAt} 생성)</span>}
              {negativeArticles.length > 0 && (
                <span className="flex items-center gap-1 text-[11px] px-2 py-0.5 rounded-full bg-red-500/15 text-red-400 font-semibold">
                  <AlertTriangle size={10} />
                  부정 기사 {negativeArticles.length}건
                </span>
              )}
            </div>
            <button onClick={() => setShowInsight(false)} className="p-1 rounded-md hover:bg-white/10 transition-colors cursor-pointer">
              <X className="w-4 h-4 text-gray-500" />
            </button>
          </div>
          <div className="p-5 space-y-5">
            {isGeneratingInsight ? (
              <div className="flex items-center justify-center py-8 gap-3">
                <Loader className="w-5 h-5 animate-spin text-amber-500" />
                <span className="text-sm text-gray-400">AI가 {newsArticles.length}개 기사를 분석하고 있습니다...</span>
              </div>
            ) : (
              <>
                {/* 부정 기사 경고 카드 */}
                {negativeArticles.length > 0 && (
                  <div className="bg-red-500/8 border border-red-500/25 rounded-xl p-4">
                    <div className="flex items-center gap-2 mb-3">
                      <ShieldAlert size={16} className="text-red-400 shrink-0" />
                      <h4 className="text-sm font-bold text-red-300">부정 기사 모니터링 — {negativeArticles.length}건 감지</h4>
                    </div>
                    <div className="space-y-2.5">
                      {negativeArticles.map((neg, i) => (
                        <div key={i} className="flex items-start gap-2.5 p-2.5 bg-red-500/8 rounded-lg border border-red-500/15">
                          <AlertTriangle size={13} className="text-red-400 shrink-0 mt-0.5" />
                          <div className="min-w-0">
                            <p className="text-xs font-semibold text-red-200 leading-snug mb-0.5 line-clamp-2">{neg.title}</p>
                            <p className="text-[11px] text-red-400/80 leading-relaxed">{neg.reason}</p>
                          </div>
                        </div>
                      ))}
                    </div>
                    <p className="text-[11px] text-red-400/60 mt-3">위 기사들을 확인하고 필요 시 대응 전략을 수립하세요.</p>
                  </div>
                )}

                {/* 일반 인사이트 */}
                <div
                  className="prose-sm max-w-none"
                  dangerouslySetInnerHTML={{ __html: renderInsightText(aiInsight) }}
                />
              </>
            )}
          </div>
        </div>
      )}

      {/* KEYWORD MANAGER */}
      <div className="bg-surface-800 rounded-xl shadow-sm p-5">
        <div className="flex items-center gap-2 mb-3">
          <Tag className="w-4.5 h-4.5 text-brand-500" />
          <h3 className="text-sm font-semibold text-gray-300">스크랩 키워드</h3>
          <span className="text-xs text-gray-500">({keywords.length}개)</span>
        </div>
        <div className="flex items-center gap-2 mb-3">
          <input
            type="text"
            value={newKeywordInput}
            onChange={(e) => setNewKeywordInput(e.target.value)}
            onKeyDown={(e) => { if (e.key === 'Enter' && !e.isComposing) { e.preventDefault(); addKeyword(); } }}
            placeholder="키워드 입력 후 Enter 또는 + 클릭"
            className="flex-1 px-3 py-2 rounded-lg border border-surface-700 text-sm focus:outline-none focus:ring-2 focus:ring-brand-500/30 focus:border-brand-500 transition bg-surface-900 text-white"
          />
          <button
            onClick={addKeyword}
            disabled={!newKeywordInput.trim()}
            className="flex items-center gap-1 px-3 py-2 rounded-lg text-sm font-medium bg-brand-500 text-white hover:bg-brand-600 disabled:opacity-40 disabled:cursor-not-allowed transition-colors cursor-pointer"
          >
            <Plus className="w-4 h-4" />
            추가
          </button>
        </div>
        <div className="flex flex-wrap gap-2">
          {keywords.length === 0 && (
            <p className="text-xs text-gray-500 py-1">등록된 키워드가 없습니다. 키워드를 추가하고 스크랩을 실행하세요.</p>
          )}
          {keywords.map((kw) => (
            <span key={kw} className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-brand-500/10 text-brand-400 text-sm font-medium border border-brand-500/30">
              {kw}
              <button onClick={() => removeKeyword(kw)} className="p-0.5 rounded-full hover:bg-white/10 transition-colors cursor-pointer">
                <X className="w-3 h-3" />
              </button>
            </span>
          ))}
        </div>
      </div>

      {/* NEWS TICKER */}
      {newsArticles.length > 0 && (
        <div className="bg-surface-900 text-white py-2.5 rounded-xl overflow-hidden relative">
          <div className="flex items-center">
            <div className="shrink-0 flex items-center gap-1.5 px-4 z-10 bg-surface-900">
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
                    <span className="text-gray-400">{article.title}</span>
                    <span className="text-gray-400 text-xs">{article.publisher}</span>
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
          className={`bg-surface-800 rounded-xl shadow-sm p-4 flex items-center gap-3 transition-all cursor-pointer text-left ${dateFilter === 'all' ? 'ring-2 ring-brand-500 shadow-md' : 'hover:shadow-md'}`}
        >
          <div className="w-9 h-9 rounded-lg bg-brand-500/20 flex items-center justify-center"><Newspaper className="w-4.5 h-4.5 text-brand-400" /></div>
          <div><p className="text-lg font-bold text-white">{newsArticles.length}</p><p className="text-xs text-gray-400">전체 기사</p></div>
        </button>
        <button
          onClick={() => setDateFilter(dateFilter === 'today' ? 'all' : 'today')}
          className={`bg-surface-800 rounded-xl shadow-sm p-4 flex items-center gap-3 transition-all cursor-pointer text-left ${dateFilter === 'today' ? 'ring-2 ring-blue-500 shadow-md' : 'hover:shadow-md'}`}
        >
          <div className="w-9 h-9 rounded-lg bg-blue-500/20 flex items-center justify-center"><Clock className="w-4.5 h-4.5 text-blue-400" /></div>
          <div><p className="text-lg font-bold text-white">{todayCount}</p><p className="text-xs text-gray-400">오늘의 기사</p></div>
        </button>
        <button
          onClick={() => setDateFilter(dateFilter === 'week' ? 'all' : 'week')}
          className={`bg-surface-800 rounded-xl shadow-sm p-4 flex items-center gap-3 transition-all cursor-pointer text-left ${dateFilter === 'week' ? 'ring-2 ring-purple-500 shadow-md' : 'hover:shadow-md'}`}
        >
          <div className={`w-9 h-9 rounded-lg flex items-center justify-center ${dateFilter === 'week' ? 'bg-purple-500/20' : 'bg-amber-500/20'}`}><CalendarDays className={`w-4.5 h-4.5 ${dateFilter === 'week' ? 'text-purple-400' : 'text-amber-400'}`} /></div>
          <div><p className="text-lg font-bold text-white">{weekCount}</p><p className="text-xs text-gray-400">최근 1주일</p></div>
        </button>
        <div className="bg-surface-800 rounded-xl shadow-sm p-4 flex items-center gap-3">
          <div className="w-9 h-9 rounded-lg bg-green-500/20 flex items-center justify-center"><RefreshCw className="w-4.5 h-4.5 text-green-400" /></div>
          <div><p className="text-lg font-bold text-white">{lastUpdated}</p><p className="text-xs text-gray-400">마지막 업데이트</p></div>
        </div>
      </div>

      {/* 기간 필터 활성 표시 */}
      {dateFilter !== 'all' && (
        <div className="flex items-center gap-2">
          <span className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium ${
            dateFilter === 'today' ? 'bg-blue-500/10 text-blue-400 border border-blue-200' : 'bg-purple-100 text-purple-700 border border-purple-200'
          }`}>
            <CalendarDays className="w-3.5 h-3.5" />
            {dateFilter === 'today' ? '오늘 기사만 보기' : '최근 1주일 기사만 보기'}
            <button onClick={() => setDateFilter('all')} className="p-0.5 rounded-full hover:bg-white/50 transition-colors cursor-pointer ml-1">
              <X className="w-3 h-3" />
            </button>
          </span>
          <span className="text-xs text-gray-500">{filteredArticles.length}건</span>
        </div>
      )}

      {/* SOURCE TABS + SEARCH */}
      <div className="flex flex-col sm:flex-row sm:items-center gap-1 border-b border-surface-700">
        {SOURCE_TABS.map((tab) => (
          <button key={tab.key} onClick={() => setActiveTab(tab.key)} className={`relative px-4 py-2.5 text-sm font-medium transition-colors cursor-pointer ${activeTab === tab.key ? 'text-brand-500' : 'text-gray-400 hover:text-gray-200'}`}>
            <span className="flex items-center gap-1.5">
              {tab.label}
              <span className={`text-[11px] px-1.5 py-0.5 rounded-full font-semibold ${activeTab === tab.key ? 'bg-brand-500/10 text-brand-400' : 'bg-surface-700 text-gray-400'}`}>{tabCounts[tab.key]}</span>
            </span>
            {activeTab === tab.key && <span className="absolute bottom-0 left-0 right-0 h-0.5 bg-brand-500 rounded-full" />}
          </button>
        ))}
        <div className="flex items-center gap-3 sm:ml-auto pr-2 py-2">
          <div className="relative">
            <input type="text" placeholder="기사 검색..." value={searchKeyword} onChange={(e) => setSearchKeyword(e.target.value)} className="w-full sm:w-48 pl-3 pr-9 py-1.5 rounded-lg border border-surface-700 text-sm focus:outline-none focus:ring-2 focus:ring-brand-500/30 focus:border-brand-500 transition bg-surface-800 text-white" />
            <Search className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-500" />
          </div>
          <span className="text-xs text-gray-500">자동 스크롤</span>
          <button onClick={() => setAutoScroll(!autoScroll)} className={`relative w-9 h-5 rounded-full transition-colors cursor-pointer ${autoScroll ? 'bg-brand-500' : 'bg-gray-600'}`}>
            <span className={`absolute top-0.5 left-0.5 w-4 h-4 rounded-full bg-white shadow transition-transform ${autoScroll ? 'translate-x-4' : 'translate-x-0'}`} />
          </button>
        </div>
      </div>

      {/* MAIN CONTENT */}
      <div className="flex flex-col lg:flex-row gap-5">
        {/* Articles */}
        <div className="flex-1 min-w-0 space-y-4">
          {filteredArticles.length === 0 && (
            <div className="bg-surface-800 rounded-xl shadow-sm p-10 text-center">
              <Globe className="w-10 h-10 text-gray-400 mx-auto mb-3" />
              <p className="text-sm text-gray-500">
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
            const isNegative = isNegativeArticle(article);
            return (
              <a
                href={article.url}
                target="_blank"
                rel="noopener noreferrer"
                key={article.id}
                className={`block bg-surface-800 rounded-xl shadow-sm p-5 hover:shadow-md hover:-translate-y-0.5 transition-all cursor-pointer border-l-4 no-underline ${
                  isNegative
                    ? 'border-l-red-500 ring-1 ring-red-500/20'
                    : isNaver
                      ? 'border-l-green-400'
                      : 'border-l-blue-400'
                }`}
                style={{ animation: `fadeInUp 0.4s ease-out ${index * 0.06}s both` }}
              >
                <div className="flex items-start justify-between gap-3 mb-2">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className={`text-[11px] font-semibold px-2 py-0.5 rounded-md ${isNaver ? 'bg-green-500/15 text-green-400' : 'bg-blue-500/10 text-blue-400'}`}>
                      {isNaver ? '네이버' : '구글'}
                    </span>
                    <span className="text-xs text-gray-500">{article.date}</span>
                    {article.date === today && <span className="text-[10px] font-bold px-1.5 py-0.5 rounded bg-red-500/10 text-red-400">NEW</span>}
                    {isNegative && (
                      <span className="flex items-center gap-0.5 text-[10px] font-bold px-1.5 py-0.5 rounded bg-red-500/15 text-red-400">
                        <AlertTriangle size={9} />
                        부정
                      </span>
                    )}
                  </div>
                  <button onClick={(e) => { e.preventDefault(); e.stopPropagation(); toggleBookmark(article.id); }} className="p-1 rounded-md hover:bg-white/5 transition-colors cursor-pointer shrink-0">
                    {isBookmarked ? <BookmarkCheck className="w-4.5 h-4.5 text-brand-500" /> : <Bookmark className="w-4.5 h-4.5 text-gray-400" />}
                  </button>
                </div>
                <h3 className="text-base font-bold text-white mb-1.5 leading-snug">{article.title}</h3>
                <p className="text-sm text-gray-400 mb-3 line-clamp-2 leading-relaxed">{article.summary}</p>
                <div className="flex items-center gap-4 text-xs text-gray-500">
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
                className="p-2 rounded-lg hover:bg-white/5 disabled:opacity-30 disabled:cursor-not-allowed transition-colors cursor-pointer"
              >
                <ChevronLeft className="w-4 h-4 text-gray-400" />
              </button>
              {pageNumbers[0] > 1 && (
                <>
                  <button onClick={() => setCurrentPage(1)} className="w-9 h-9 rounded-lg text-sm font-medium text-gray-400 hover:bg-white/5 transition-colors cursor-pointer">1</button>
                  {pageNumbers[0] > 2 && <span className="w-9 h-9 flex items-center justify-center text-gray-500 text-sm">...</span>}
                </>
              )}
              {pageNumbers.map((num) => (
                <button
                  key={num}
                  onClick={() => setCurrentPage(num)}
                  className={`w-9 h-9 rounded-lg text-sm font-medium transition-colors cursor-pointer ${
                    safePage === num
                      ? 'bg-brand-500 text-white shadow-sm'
                      : 'text-gray-400 hover:bg-white/5'
                  }`}
                >
                  {num}
                </button>
              ))}
              {pageNumbers[pageNumbers.length - 1] < totalPages && (
                <>
                  {pageNumbers[pageNumbers.length - 1] < totalPages - 1 && <span className="w-9 h-9 flex items-center justify-center text-gray-500 text-sm">...</span>}
                  <button onClick={() => setCurrentPage(totalPages)} className="w-9 h-9 rounded-lg text-sm font-medium text-gray-400 hover:bg-white/5 transition-colors cursor-pointer">{totalPages}</button>
                </>
              )}
              <button
                onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))}
                disabled={safePage >= totalPages}
                className="p-2 rounded-lg hover:bg-white/5 disabled:opacity-30 disabled:cursor-not-allowed transition-colors cursor-pointer"
              >
                <ChevronRight className="w-4 h-4 text-gray-400" />
              </button>
              <span className="ml-3 text-xs text-gray-500">{safePage} / {totalPages} 페이지 ({filteredArticles.length}건)</span>
            </div>
          )}
        </div>

        {/* Sidebar */}
        <div className="w-72 shrink-0 hidden lg:block">
          <div className="bg-surface-800 rounded-xl shadow-sm p-5 sticky top-5">
            <h3 className="text-sm font-semibold text-gray-300 flex items-center gap-2 mb-4">
              <Globe className="w-4 h-4 text-brand-500" />
              스크랩 현황
            </h3>
            <div className="space-y-3 mb-5">
              <div className="flex items-center justify-between text-sm">
                <span className="text-gray-400">전체 기사</span>
                <span className="font-bold text-white">{newsArticles.length}건</span>
              </div>
              <div className="flex items-center justify-between text-sm">
                <span className="text-gray-400">오늘 수집</span>
                <span className="font-bold text-blue-400">{todayCount}건</span>
              </div>
              <div className="flex items-center justify-between text-sm">
                <span className="text-gray-400">최근 1주일</span>
                <span className="font-bold text-purple-400">{weekCount}건</span>
              </div>
              <div className="flex items-center justify-between text-sm">
                <span className="text-gray-400">등록 키워드</span>
                <span className="font-bold text-brand-400">{keywords.length}개</span>
              </div>
              {negativeArticles.length > 0 && (
                <div className="flex items-center justify-between text-sm pt-1 border-t border-surface-700">
                  <span className="flex items-center gap-1 text-red-400">
                    <AlertTriangle size={12} />
                    부정 기사
                  </span>
                  <span className="font-bold text-red-400">{negativeArticles.length}건</span>
                </div>
              )}
            </div>
            <div className="border-t border-surface-700 pt-4">
              <h4 className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-3">소스 분포</h4>
              <div className="flex items-center gap-3">
                <div className="flex-1">
                  <div className="flex items-center gap-1.5 mb-1"><span className="w-2.5 h-2.5 rounded-full bg-green-500" /><span className="text-xs text-gray-400">네이버</span></div>
                  <p className="text-lg font-bold text-white">{tabCounts.naver}</p>
                </div>
                <div className="w-px h-10 bg-surface-700" />
                <div className="flex-1">
                  <div className="flex items-center gap-1.5 mb-1"><span className="w-2.5 h-2.5 rounded-full bg-blue-500" /><span className="text-xs text-gray-400">구글</span></div>
                  <p className="text-lg font-bold text-white">{tabCounts.google}</p>
                </div>
              </div>
              {newsArticles.length > 0 && (
                <div className="mt-3">
                  <div className="w-full h-2.5 bg-surface-700 rounded-full overflow-hidden flex">
                    <div className="h-full bg-green-500 rounded-l-full" style={{ width: `${(tabCounts.naver / newsArticles.length) * 100}%` }} />
                    <div className="h-full bg-blue-500 rounded-r-full" style={{ width: `${(tabCounts.google / newsArticles.length) * 100}%` }} />
                  </div>
                </div>
              )}
            </div>
            {keywords.length > 0 && (
              <div className="border-t border-surface-700 mt-4 pt-4">
                <h4 className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-3">등록 키워드</h4>
                <div className="flex flex-wrap gap-1.5">
                  {keywords.map((kw) => (
                    <span key={kw} className="inline-block px-2 py-1 rounded-md bg-surface-700 text-gray-400 text-xs font-medium">{kw}</span>
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
