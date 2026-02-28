// Vercel Serverless Function — YouTube 키워드 검색 (업계 모니터링용)
// POST /api/sns/youtube-search  body: { query, maxResults, type }

export default async function handler(req, res) {
  // CORS
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
  if (req.method === 'OPTIONS') return res.status(200).end();

  const apiKey = process.env.YOUTUBE_API_KEY;
  if (!apiKey) {
    return res.status(500).json({ error: 'YouTube API 키가 설정되지 않았습니다.' });
  }

  try {
    const { query, maxResults = 10, type = 'video', order = 'date' } = req.body || {};
    if (!query) {
      return res.status(400).json({ error: '검색 키워드가 필요합니다.' });
    }

    const searchParams = new URLSearchParams({
      part: 'snippet',
      q: query,
      type,
      order,
      maxResults: String(Math.min(Number(maxResults), 15)),
      key: apiKey,
    });

    const response = await fetch(
      `https://www.googleapis.com/youtube/v3/search?${searchParams}`
    );

    if (!response.ok) {
      const errText = await response.text();
      console.error('YouTube search error:', response.status, errText);
      return res.status(response.status).json({ error: `YouTube 검색 오류: ${errText}` });
    }

    const data = await response.json();

    const results = (data.items || []).map((item) => ({
      videoId: item.id?.videoId || null,
      channelId: item.id?.channelId || item.snippet?.channelId || '',
      title: item.snippet?.title || '',
      thumbnail: item.snippet?.thumbnails?.medium?.url || item.snippet?.thumbnails?.default?.url || '',
      channelTitle: item.snippet?.channelTitle || '',
      description: item.snippet?.description?.slice(0, 200) || '',
      publishedAt: item.snippet?.publishedAt || '',
    }));

    return res.status(200).json({
      results,
      total: data.pageInfo?.totalResults || 0,
    });
  } catch (err) {
    console.error('YouTube search error:', err);
    return res.status(500).json({ error: err.message });
  }
}
