// Vercel Serverless Function — Instagram 최근 게시물 + 인게이지먼트 조회
// POST /api/sns/instagram-media  body: { accountId, maxResults }

export default async function handler(req, res) {
  // CORS
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
  if (req.method === 'OPTIONS') return res.status(200).end();

  const accessToken = process.env.INSTAGRAM_ACCESS_TOKEN;
  if (!accessToken) {
    return res.status(500).json({
      error: 'Instagram Access Token이 설정되지 않았습니다.',
    });
  }

  try {
    const { accountId, maxResults = 12 } = req.body || {};
    if (!accountId) {
      return res.status(400).json({ error: 'accountId가 필요합니다.' });
    }

    const limit = Math.min(Number(maxResults), 25); // Instagram API 최대 25
    const fields = 'id,caption,media_type,media_url,thumbnail_url,permalink,timestamp,like_count,comments_count';
    const url = `https://graph.facebook.com/v21.0/${accountId}/media?fields=${fields}&limit=${limit}&access_token=${accessToken}`;

    const response = await fetch(url);

    if (!response.ok) {
      const errData = await response.json().catch(() => ({}));
      const errMsg = errData.error?.message || `Instagram API 오류 (${response.status})`;
      console.error('Instagram media error:', response.status, errMsg);
      return res.status(response.status).json({ error: errMsg });
    }

    const data = await response.json();

    const videos = (data.data || []).map((item) => {
      const caption = item.caption || '';
      return {
        videoId: String(item.id),
        title: caption.length > 50 ? caption.slice(0, 50) + '…' : caption || '(캡션 없음)',
        thumbnail: item.thumbnail_url || item.media_url || '',
        description: caption.slice(0, 200),
        channelId: accountId,
        views: 0, // Instagram Graph API basic에서 조회수 미제공
        likes: Number(item.like_count) || 0,
        comments: Number(item.comments_count) || 0,
        publishedAt: item.timestamp || '',
        permalink: item.permalink || '',
        mediaType: item.media_type || 'IMAGE', // IMAGE, VIDEO, CAROUSEL_ALBUM
      };
    });

    return res.status(200).json({ videos });
  } catch (err) {
    console.error('Instagram media error:', err);
    return res.status(500).json({ error: err.message });
  }
}
