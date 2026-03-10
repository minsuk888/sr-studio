import { supabase } from '../lib/supabase';
import { analyticsService } from './analyticsService';
import { newsService } from './newsService';

/*
 * Supabase 테이블 생성 SQL (Supabase Dashboard → SQL Editor에서 실행):
 *
 * CREATE TABLE IF NOT EXISTS trend_monitor_cache (
 *   id BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
 *   keyword TEXT NOT NULL,
 *   platform TEXT NOT NULL DEFAULT 'youtube',
 *   results JSONB NOT NULL DEFAULT '[]'::jsonb,
 *   fetched_at TIMESTAMPTZ DEFAULT now(),
 *   UNIQUE(keyword, platform)
 * );
 * ALTER TABLE trend_monitor_cache ENABLE ROW LEVEL SECURITY;
 * CREATE POLICY "trend_monitor_cache_all" ON trend_monitor_cache
 *   FOR ALL USING (true) WITH CHECK (true);
 */

const CACHE_TTL_MS = 60 * 60 * 1000; // 1시간

function isCacheFresh(fetchedAt) {
  if (!fetchedAt) return false;
  return Date.now() - new Date(fetchedAt).getTime() < CACHE_TTL_MS;
}

export const trendService = {
  // ---- 캐시 조회 (테이블 없으면 null 반환) ----
  async getCachedResult(keyword, platform = 'youtube') {
    try {
      const { data, error } = await supabase
        .from('trend_monitor_cache')
        .select('*')
        .eq('keyword', keyword)
        .eq('platform', platform)
        .maybeSingle();
      if (error) return null;
      return data;
    } catch {
      return null;
    }
  },

  // ---- 캐시 저장 ----
  async saveCacheEntry(keyword, platform, results) {
    try {
      await supabase
        .from('trend_monitor_cache')
        .upsert(
          { keyword, platform, results, fetched_at: new Date().toISOString() },
          { onConflict: 'keyword,platform' },
        );
    } catch {
      // 테이블 미존재 시 무시
    }
  },

  // ---- 단일 키워드 YouTube 검색 (캐시 우선) ----
  async searchKeyword(keyword) {
    const cached = await this.getCachedResult(keyword, 'youtube');
    if (cached && isCacheFresh(cached.fetched_at)) {
      return {
        keyword,
        results: cached.results || [],
        fromCache: true,
        fetchedAt: cached.fetched_at,
      };
    }

    const response = await analyticsService.searchYouTube(keyword, 10);
    const results = response.results || [];

    await this.saveCacheEntry(keyword, 'youtube', results);

    return {
      keyword,
      results,
      fromCache: false,
      fetchedAt: new Date().toISOString(),
    };
  },

  // ---- 전체 키워드 검색 (YouTube + 뉴스 + 블로그 + 카페) ----
  async searchAllKeywords(keywords, sort = 'date') {
    const kwStrings = keywords.map((k) =>
      typeof k === 'string' ? k : k.keyword,
    );
    if (kwStrings.length === 0) return { youtube: [], news: [], blog: [], cafe: [] };

    const youtubePromises = kwStrings.map((kw) =>
      this.searchKeyword(kw).catch(() => ({
        keyword: kw,
        results: [],
        fromCache: false,
        fetchedAt: null,
      })),
    );

    const naverSort = sort === 'relevance' ? 'sim' : 'date';
    const primaryKw = kwStrings[0] || '슈퍼레이스';
    const [youtubeResults, naverNews, googleNews, blogResults, cafeResults] = await Promise.all([
      Promise.all(youtubePromises),
      newsService.fetchNaverNews(primaryKw, 10).catch(() => []),
      newsService.fetchGoogleNews(primaryKw).catch(() => []),
      newsService.fetchNaverBlog(primaryKw, 10, naverSort).catch(() => []),
      newsService.fetchNaverCafe(primaryKw, 10, naverSort).catch(() => []),
    ]);

    return {
      youtube: youtubeResults,
      news: dedupeNews([...naverNews, ...googleNews]),
      blog: blogResults,
      cafe: cafeResults,
    };
  },

  // ---- 강제 새로고침 (캐시 무시) ----
  async forceRefreshAll(keywords, sort = 'date') {
    const kwStrings = keywords.map((k) =>
      typeof k === 'string' ? k : k.keyword,
    );
    if (kwStrings.length === 0) return { youtube: [], news: [], blog: [], cafe: [] };

    const youtubePromises = kwStrings.map(async (kw) => {
      try {
        const response = await analyticsService.searchYouTube(kw, 10);
        const results = response.results || [];
        await this.saveCacheEntry(kw, 'youtube', results);
        return { keyword: kw, results, fromCache: false, fetchedAt: new Date().toISOString() };
      } catch {
        return { keyword: kw, results: [], fromCache: false, fetchedAt: null };
      }
    });

    const naverSort = sort === 'relevance' ? 'sim' : 'date';
    const primaryKw = kwStrings[0] || '슈퍼레이스';
    const [youtubeResults, naverNews, googleNews, blogResults, cafeResults] = await Promise.all([
      Promise.all(youtubePromises),
      newsService.fetchNaverNews(primaryKw, 10).catch(() => []),
      newsService.fetchGoogleNews(primaryKw).catch(() => []),
      newsService.fetchNaverBlog(primaryKw, 10, naverSort).catch(() => []),
      newsService.fetchNaverCafe(primaryKw, 10, naverSort).catch(() => []),
    ]);

    return {
      youtube: youtubeResults,
      news: dedupeNews([...naverNews, ...googleNews]),
      blog: blogResults,
      cafe: cafeResults,
    };
  },

  // ---- 키워드 CRUD (analyticsService 위임) ----
  getKeywords: () => analyticsService.getMonitoringKeywords(),
  addKeyword: (keyword, platform) =>
    analyticsService.addMonitoringKeyword(keyword, platform),
  removeKeyword: (id) => analyticsService.removeMonitoringKeyword(id),
};

// URL 기준 뉴스 중복 제거
function dedupeNews(articles) {
  const seen = new Set();
  return articles.filter((a) => {
    if (!a.url || seen.has(a.url)) return false;
    seen.add(a.url);
    return true;
  });
}
