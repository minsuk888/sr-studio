// Vercel Serverless Function — YouTube 댓글 수집
// POST /api/sns/youtube-comments  body: { videoId, maxResults }

export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
  if (req.method === 'OPTIONS') return res.status(200).end();

  const apiKey = process.env.YOUTUBE_API_KEY;
  if (!apiKey) {
    return res.status(500).json({ error: 'YouTube API 키가 설정되지 않았습니다.' });
  }

  try {
    const { videoId, maxResults = 100 } = req.body || {};
    if (!videoId) {
      return res.status(400).json({ error: 'videoId가 필요합니다.' });
    }

    const params = new URLSearchParams({
      part: 'snippet',
      videoId,
      maxResults: String(Math.min(Number(maxResults), 100)),
      order: 'relevance',
      textFormat: 'plainText',
      key: apiKey,
    });

    const response = await fetch(
      `https://www.googleapis.com/youtube/v3/commentThreads?${params}`
    );

    if (!response.ok) {
      const errText = await response.text();
      console.error('YouTube comments error:', response.status, errText);
      // Comments might be disabled
      if (response.status === 403) {
        return res.status(200).json({ comments: [], disabled: true });
      }
      return res.status(response.status).json({ error: `댓글 조회 오류: ${errText}` });
    }

    const data = await response.json();
    const comments = (data.items || []).map((item) => {
      const snippet = item.snippet.topLevelComment.snippet;
      return {
        commentId: item.id,
        author: snippet.authorDisplayName,
        text: snippet.textDisplay,
        likeCount: snippet.likeCount || 0,
        publishedAt: snippet.publishedAt,
      };
    });

    return res.status(200).json({
      comments,
      totalCount: data.pageInfo?.totalResults || comments.length,
    });
  } catch (err) {
    console.error('YouTube comments error:', err);
    return res.status(500).json({ error: err.message });
  }
}
