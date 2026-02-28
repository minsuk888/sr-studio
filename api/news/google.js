// Vercel Serverless Function — 구글 뉴스 RSS 프록시
// GET/POST /api/news/google?query=super+race

export default async function handler(req, res) {
  // CORS
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
  if (req.method === 'OPTIONS') return res.status(200).end();

  try {
    const { query = 'super race korea' } =
      req.method === 'POST' ? req.body || {} : req.query || {};

    // Google News RSS feed
    const rssUrl = `https://news.google.com/rss/search?q=${encodeURIComponent(query)}&hl=en&gl=US&ceid=US:en`;

    const response = await fetch(rssUrl, {
      headers: { 'User-Agent': 'Mozilla/5.0 (compatible; SRStudio/1.0)' },
    });

    if (!response.ok) {
      return res.status(response.status).json({ error: 'Google News fetch failed' });
    }

    const xml = await response.text();

    // 간단한 XML 파싱 (RSS <item> 추출)
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

      const title = getTag('title');
      const link = getTag('link');
      const pubDate = getTag('pubDate');
      const source = getTag('source');

      // 날짜 변환
      let dateStr = '';
      try {
        const d = new Date(pubDate);
        dateStr = d.toISOString().split('T')[0];
      } catch { dateStr = ''; }

      articles.push({
        source: 'google',
        title: title.replace(/<[^>]*>/g, '').replace(/&amp;/g, '&').replace(/&quot;/g, '"'),
        publisher: source.replace(/<[^>]*>/g, ''),
        reporter: '',
        date: dateStr,
        summary: '',
        url: link,
      });
    }

    return res.status(200).json({ total: articles.length, articles });
  } catch (err) {
    return res.status(500).json({ error: err.message });
  }
}
