// Vercel Serverless Function — 네이버 블로그/카페 통합 검색 API 프록시
// POST /api/sns/naver-search  body: { type: 'blog'|'cafe', query, display, sort }
import { handleCors } from '../_utils/security.js';

const TYPE_CONFIG = {
  blog: {
    endpoint: 'https://openapi.naver.com/v1/search/blog.json',
    source: 'blog',
    getPublisher: (item) => item.bloggername,
    parseDate: (item) => {
      const raw = item.postdate || '';
      if (raw.length === 8) {
        return `${raw.slice(0, 4)}-${raw.slice(4, 6)}-${raw.slice(6, 8)}`;
      }
      return '';
    },
  },
  cafe: {
    endpoint: 'https://openapi.naver.com/v1/search/cafearticle.json',
    source: 'cafe',
    getPublisher: (item) => item.cafename,
    parseDate: (item) => {
      try {
        const d = new Date(item.pubDate || item.postdate);
        if (!isNaN(d.getTime())) {
          return d.toISOString().split('T')[0];
        }
      } catch {
        // fallback
      }
      return '';
    },
  },
};

const clean = (str) =>
  (str || '')
    .replace(/<[^>]*>/g, '')
    .replace(/&quot;/g, '"')
    .replace(/&amp;/g, '&')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>');

export default async function handler(req, res) {
  if (handleCors(req, res)) return;

  const clientId = process.env.NAVER_CLIENT_ID;
  const clientSecret = process.env.NAVER_CLIENT_SECRET;

  if (!clientId || !clientSecret) {
    return res.status(500).json({ error: '네이버 API 키가 설정되지 않았습니다.' });
  }

  try {
    const { type = 'blog', query = '슈퍼레이스', display = 10, sort = 'date' } =
      req.method === 'POST' ? req.body || {} : req.query || {};

    const config = TYPE_CONFIG[type];
    if (!config) {
      return res.status(400).json({ error: `지원하지 않는 type: ${type}. blog 또는 cafe를 사용하세요.` });
    }

    const params = new URLSearchParams({
      query: String(query),
      display: String(Math.min(Number(display), 10)),
      sort: String(sort),
    });

    const response = await fetch(`${config.endpoint}?${params}`, {
      headers: {
        'X-Naver-Client-Id': clientId,
        'X-Naver-Client-Secret': clientSecret,
      },
    });

    if (!response.ok) {
      const errText = await response.text();
      return res.status(response.status).json({ error: errText });
    }

    const data = await response.json();

    const articles = (data.items || []).map((item) => ({
      source: config.source,
      title: clean(item.title),
      publisher: clean(config.getPublisher(item)),
      date: config.parseDate(item),
      summary: clean(item.description),
      url: item.link,
    }));

    return res.status(200).json({
      total: data.total,
      articles,
    });
  } catch (err) {
    return res.status(500).json({ error: err.message });
  }
}
