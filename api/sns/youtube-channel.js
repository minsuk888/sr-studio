// Vercel Serverless Function — YouTube 채널 통계 조회
// POST /api/sns/youtube-channel  body: { channelId }

export default async function handler(req, res) {
  // CORS
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
  if (req.method === 'OPTIONS') return res.status(200).end();

  const apiKey = process.env.YOUTUBE_API_KEY;
  if (!apiKey) {
    return res.status(500).json({ error: 'YouTube API 키가 설정되지 않았습니다. Vercel 환경변수에 YOUTUBE_API_KEY를 추가해주세요.' });
  }

  try {
    const { channelId } = req.body || {};
    if (!channelId) {
      return res.status(400).json({ error: 'channelId가 필요합니다.' });
    }

    // channelId가 @handle 형식인 경우 forHandle 파라미터 사용
    const isHandle = channelId.startsWith('@');
    const params = new URLSearchParams({
      part: 'snippet,statistics,contentDetails',
      key: apiKey,
    });
    if (isHandle) {
      params.set('forHandle', channelId.replace('@', ''));
    } else {
      params.set('id', channelId);
    }

    const response = await fetch(
      `https://www.googleapis.com/youtube/v3/channels?${params}`
    );

    if (!response.ok) {
      const errText = await response.text();
      console.error('YouTube API error:', response.status, errText);
      return res.status(response.status).json({ error: `YouTube API 오류 (${response.status}): ${errText}` });
    }

    const data = await response.json();
    const item = data.items?.[0];

    if (!item) {
      return res.status(404).json({ error: '채널을 찾을 수 없습니다. 채널 ID를 확인해주세요.' });
    }

    const channel = {
      id: item.id,
      name: item.snippet.title,
      thumbnail: item.snippet.thumbnails?.medium?.url || item.snippet.thumbnails?.default?.url || '',
      handle: item.snippet.customUrl || '',
      description: item.snippet.description?.slice(0, 200) || '',
      subscribers: Number(item.statistics.subscriberCount) || 0,
      totalViews: Number(item.statistics.viewCount) || 0,
      videoCount: Number(item.statistics.videoCount) || 0,
      hiddenSubscribers: item.statistics.hiddenSubscriberCount || false,
      uploadsPlaylistId: item.contentDetails?.relatedPlaylists?.uploads || null,
    };

    return res.status(200).json({ channel });
  } catch (err) {
    console.error('YouTube channel error:', err);
    return res.status(500).json({ error: err.message });
  }
}
