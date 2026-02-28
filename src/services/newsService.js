import { supabase } from '../lib/supabase';

// API base — 개발: Vite proxy, 프로덕션: Vercel serverless
const API_BASE = import.meta.env.DEV ? '' : '';

export const newsService = {
  // ---- Supabase (캐시된 기사) ----
  async getAll() {
    const { data, error } = await supabase
      .from('news_articles')
      .select('*')
      .order('date', { ascending: false });
    if (error) throw error;
    return data;
  },

  async getBySource(source) {
    const { data, error } = await supabase
      .from('news_articles')
      .select('*')
      .eq('source', source)
      .order('date', { ascending: false });
    if (error) throw error;
    return data;
  },

  async search(keyword) {
    const { data, error } = await supabase
      .from('news_articles')
      .select('*')
      .or(`title.ilike.%${keyword}%,summary.ilike.%${keyword}%`)
      .order('date', { ascending: false });
    if (error) throw error;
    return data;
  },

  // ---- 실시간 API에서 뉴스 가져오기 ----
  async fetchNaverNews(query = '슈퍼레이스', display = 10) {
    try {
      const res = await fetch(`${API_BASE}/api/news/naver`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ query, display, sort: 'date' }),
      });
      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        throw new Error(err.error || `Naver API error: ${res.status}`);
      }
      const data = await res.json();
      return data.articles || [];
    } catch (err) {
      console.error('네이버 뉴스 조회 실패:', err);
      return [];
    }
  },

  async fetchGoogleNews(query = 'super race korea') {
    try {
      const res = await fetch(`${API_BASE}/api/news/google`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ query }),
      });
      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        throw new Error(err.error || `Google API error: ${res.status}`);
      }
      const data = await res.json();
      return data.articles || [];
    } catch (err) {
      console.error('구글 뉴스 조회 실패:', err);
      return [];
    }
  },

  // ---- 모든 소스에서 뉴스 가져와서 Supabase에 저장 ----
  async fetchAndSaveAll(query = '슈퍼레이스') {
    const [naverArticles, googleArticles] = await Promise.all([
      this.fetchNaverNews(query, 10),
      this.fetchGoogleNews(query + ' motorsport'),
    ]);

    const allArticles = [...naverArticles, ...googleArticles];
    if (allArticles.length === 0) return [];

    // 기존 기사 URL 목록 조회 (중복 방지)
    const { data: existing } = await supabase
      .from('news_articles')
      .select('url');
    const existingUrls = new Set((existing || []).map((e) => e.url));

    // 새 기사만 필터
    const newArticles = allArticles.filter((a) => a.url && !existingUrls.has(a.url));

    if (newArticles.length > 0) {
      const { error } = await supabase
        .from('news_articles')
        .insert(newArticles);
      if (error) console.error('뉴스 저장 실패:', error);
    }

    // 전체 목록 다시 조회
    return this.getAll();
  },
};
