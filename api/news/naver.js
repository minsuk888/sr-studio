// Vercel Serverless Function — 네이버 뉴스 검색 API 프록시
// POST /api/news/naver  body: { query, display, start, sort }

export default async function handler(req, res) {
  // CORS
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
  if (req.method === 'OPTIONS') return res.status(200).end();

  const clientId = process.env.NAVER_CLIENT_ID;
  const clientSecret = process.env.NAVER_CLIENT_SECRET;

  if (!clientId || !clientSecret) {
    return res.status(500).json({ error: '네이버 API 키가 설정되지 않았습니다.' });
  }

  try {
    const { query = '슈퍼레이스', display = 10, start = 1, sort = 'date' } =
      req.method === 'POST' ? req.body || {} : req.query || {};

    const params = new URLSearchParams({
      query: String(query),
      display: String(display),
      start: String(start),
      sort: String(sort),
    });

    const response = await fetch(
      `https://openapi.naver.com/v1/search/news.json?${params}`,
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

    // 네이버 API 결과를 우리 스키마에 맞게 변환
    const articles = (data.items || []).map((item) => {
      // HTML 태그 제거
      const clean = (str) => (str || '').replace(/<[^>]*>/g, '').replace(/&quot;/g, '"').replace(/&amp;/g, '&').replace(/&lt;/g, '<').replace(/&gt;/g, '>');

      // 날짜 변환 (Mon, 28 Feb 2026 09:00:00 +0900 → 2026-02-28)
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

    return res.status(200).json({
      total: data.total,
      start: data.start,
      display: data.display,
      articles,
    });
  } catch (err) {
    return res.status(500).json({ error: err.message });
  }
}
