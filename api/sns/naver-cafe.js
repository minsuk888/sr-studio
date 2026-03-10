// Vercel Serverless Function — 네이버 카페 검색 API 프록시
// POST /api/sns/naver-cafe  body: { query, display, sort }
import { handleCors } from '../_utils/security.js';

export default async function handler(req, res) {
  if (handleCors(req, res)) return;

  const clientId = process.env.NAVER_CLIENT_ID;
  const clientSecret = process.env.NAVER_CLIENT_SECRET;

  if (!clientId || !clientSecret) {
    return res.status(500).json({ error: '네이버 API 키가 설정되지 않았습니다.' });
  }

  try {
    const { query = '슈퍼레이스', display = 10, sort = 'date' } =
      req.method === 'POST' ? req.body || {} : req.query || {};

    const params = new URLSearchParams({
      query: String(query),
      display: String(Math.min(Number(display), 10)),
      sort: String(sort), // date: 최신순, sim: 정확도순
    });

    const response = await fetch(
      `https://openapi.naver.com/v1/search/cafearticle.json?${params}`,
      {
        headers: {
          'X-Naver-Client-Id': clientId,
          'X-Naver-Client-Secret': clientSecret,
        },
      }
    );

    if (!response.ok) {
      const errText = await response.text();
      return res.status(response.status).json({ error: errText });
    }

    const data = await response.json();

    const clean = (str) =>
      (str || '')
        .replace(/<[^>]*>/g, '')
        .replace(/&quot;/g, '"')
        .replace(/&amp;/g, '&')
        .replace(/&lt;/g, '<')
        .replace(/&gt;/g, '>');

    const articles = (data.items || []).map((item) => {
      let dateStr = '';
      try {
        const d = new Date(item.pubDate || item.postdate);
        if (!isNaN(d.getTime())) {
          dateStr = d.toISOString().split('T')[0];
        }
      } catch {
        dateStr = '';
      }

      return {
        source: 'cafe',
        title: clean(item.title),
        publisher: clean(item.cafename),
        date: dateStr,
        summary: clean(item.description),
        url: item.link,
      };
    });

    return res.status(200).json({
      total: data.total,
      articles,
    });
  } catch (err) {
    return res.status(500).json({ error: err.message });
  }
}
