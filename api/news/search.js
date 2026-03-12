// Vercel Serverless Function — 뉴스 검색 통합 (네이버 + 구글)
// POST /api/news/search  body: { source: 'naver'|'google', query, display, start, sort }
import { handleCors } from '../_utils/security.js';

const clean = (str) =>
  (str || '')
    .replace(/<[^>]*>/g, '')
    .replace(/&quot;/g, '"')
    .replace(/&amp;/g, '&')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>');

async function fetchNaverNews({ query, display, start, sort }) {
  const clientId = process.env.NAVER_CLIENT_ID;
  const clientSecret = process.env.NAVER_CLIENT_SECRET;

  if (!clientId || !clientSecret) {
    throw Object.assign(new Error('네이버 API 키가 설정되지 않았습니다.'), { status: 500 });
  }

  const params = new URLSearchParams({
    query: String(query),
    display: String(display),
    start: String(start),
    sort: String(sort),
  });

  const response = await fetch(`https://openapi.naver.com/v1/search/news.json?${params}`, {
    headers: {
      'X-Naver-Client-Id': clientId,
      'X-Naver-Client-Secret': clientSecret,
    },
  });

  if (!response.ok) {
    const errText = await response.text();
    throw Object.assign(new Error(errText), { status: response.status });
  }

  const data = await response.json();

  const articles = (data.items || []).map((item) => {
    let dateStr = '';
    try {
      const d = new Date(item.pubDate);
      dateStr = d.toISOString().split('T')[0];
    } catch { dateStr = ''; }

    return {
      source: 'naver',
      title: clean(item.title),
      publisher: clean(item.originallink ? new URL(item.originallink).hostname.replace('www.', '') : ''),
      reporter: '',
      date: dateStr,
      summary: clean(item.description),
      url: item.originallink || item.link,
    };
  });

  return { total: data.total, start: data.start, display: data.display, articles };
}

async function fetchGoogleNews({ query }) {
  const rssUrl = `https://news.google.com/rss/search?q=${encodeURIComponent(query)}&hl=en&gl=US&ceid=US:en`;

  const response = await fetch(rssUrl, {
    headers: { 'User-Agent': 'Mozilla/5.0 (compatible; SRStudio/1.0)' },
  });

  if (!response.ok) {
    throw Object.assign(new Error('Google News fetch failed'), { status: response.status });
  }

  const xml = await response.text();
  const articles = [];
  const itemRegex = /<item>([\s\S]*?)<\/item>/g;
  let match;

  while ((match = itemRegex.exec(xml)) !== null && articles.length < 10) {
    const itemXml = match[1];

    const getTag = (tag) => {
      const r = new RegExp(`<${tag}[^>]*>(?:<!\\[CDATA\\[)?(.*?)(?:\\]\\]>)?</${tag}>`, 's');
      const m = itemXml.match(r);
      return m ? m[1].trim() : '';
    };

    let dateStr = '';
    try {
      const d = new Date(getTag('pubDate'));
      dateStr = d.toISOString().split('T')[0];
    } catch { dateStr = ''; }

    articles.push({
      source: 'google',
      title: clean(getTag('title')),
      publisher: clean(getTag('source')),
      reporter: '',
      date: dateStr,
      summary: '',
      url: getTag('link'),
    });
  }

  return { total: articles.length, articles };
}

export default async function handler(req, res) {
  if (handleCors(req, res)) return;

  try {
    const body = req.method === 'POST' ? req.body || {} : req.query || {};
    const {
      source = 'naver',
      query = '슈퍼레이스',
      display = 10,
      start = 1,
      sort = 'date',
    } = body;

    if (source === 'google') {
      const result = await fetchGoogleNews({ query });
      return res.status(200).json(result);
    }

    if (source === 'naver') {
      const result = await fetchNaverNews({ query, display, start, sort });
      return res.status(200).json(result);
    }

    return res.status(400).json({ error: `지원하지 않는 source: ${source}. naver 또는 google을 사용하세요.` });
  } catch (err) {
    const status = err.status || 500;
    return res.status(status).json({ error: err.message });
  }
}
