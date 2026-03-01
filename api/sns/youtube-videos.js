// Vercel Serverless Function — YouTube 채널 최근 영상 + 통계
// POST /api/sns/youtube-videos  body: { channelId, maxResults, uploadsPlaylistId }

export default async function handler(req, res) {
  // CORS headers (keep existing)
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
  if (req.method === 'OPTIONS') return res.status(200).end();

  const apiKey = process.env.YOUTUBE_API_KEY;
  if (!apiKey) return res.status(500).json({ error: 'YouTube API 키가 설정되지 않았습니다.' });

  try {
    const { channelId, maxResults = 6, uploadsPlaylistId } = req.body || {};
    if (!channelId && !uploadsPlaylistId) {
      return res.status(400).json({ error: 'channelId 또는 uploadsPlaylistId가 필요합니다.' });
    }

    let videoIds;

    if (uploadsPlaylistId) {
      // Optimized path: playlistItems.list (1 quota unit)
      const playlistParams = new URLSearchParams({
        part: 'contentDetails',
        playlistId: uploadsPlaylistId,
        maxResults: String(Math.min(Number(maxResults), 50)),
        key: apiKey,
      });
      const playlistRes = await fetch(
        `https://www.googleapis.com/youtube/v3/playlistItems?${playlistParams}`
      );
      if (!playlistRes.ok) {
        const errText = await playlistRes.text();
        console.error('YouTube playlistItems error:', playlistRes.status, errText);
        return res.status(playlistRes.status).json({ error: `YouTube 재생목록 오류: ${errText}` });
      }
      const playlistData = await playlistRes.json();
      videoIds = (playlistData.items || [])
        .map((item) => item.contentDetails?.videoId)
        .filter(Boolean);
    } else {
      // Fallback: search.list (100 quota units)
      const searchParams = new URLSearchParams({
        part: 'snippet',
        channelId,
        order: 'date',
        type: 'video',
        maxResults: String(Math.min(Number(maxResults), 12)),
        key: apiKey,
      });
      const searchRes = await fetch(
        `https://www.googleapis.com/youtube/v3/search?${searchParams}`
      );
      if (!searchRes.ok) {
        const errText = await searchRes.text();
        console.error('YouTube search error:', searchRes.status, errText);
        return res.status(searchRes.status).json({ error: `YouTube 검색 오류: ${errText}` });
      }
      const searchData = await searchRes.json();
      videoIds = (searchData.items || [])
        .map((item) => item.id?.videoId)
        .filter(Boolean);
    }

    if (videoIds.length === 0) {
      return res.status(200).json({ videos: [] });
    }

    // Step 2: videos.list — detailed stats + tags (1 unit)
    const statsParams = new URLSearchParams({
      part: 'statistics,snippet,contentDetails',
      id: videoIds.join(','),
      key: apiKey,
    });
    const statsRes = await fetch(
      `https://www.googleapis.com/youtube/v3/videos?${statsParams}`
    );
    if (!statsRes.ok) {
      const errText = await statsRes.text();
      console.error('YouTube stats error:', statsRes.status, errText);
      return res.status(statsRes.status).json({ error: `YouTube 통계 오류: ${errText}` });
    }
    const statsData = await statsRes.json();

    const videos = (statsData.items || []).map((item) => ({
      videoId: item.id,
      title: item.snippet.title,
      thumbnail: item.snippet.thumbnails?.medium?.url || item.snippet.thumbnails?.default?.url || '',
      description: item.snippet.description?.slice(0, 200) || '',
      channelId: item.snippet.channelId,
      channelTitle: item.snippet.channelTitle,
      views: Number(item.statistics.viewCount) || 0,
      likes: Number(item.statistics.likeCount) || 0,
      comments: Number(item.statistics.commentCount) || 0,
      publishedAt: item.snippet.publishedAt,
      duration: item.contentDetails?.duration || '',
      tags: item.snippet.tags || [],
    }));

    return res.status(200).json({ videos });
  } catch (err) {
    console.error('YouTube videos error:', err);
    return res.status(500).json({ error: err.message });
  }
}
