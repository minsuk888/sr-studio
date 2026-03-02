// Vercel Serverless Function — Instagram 프로필 + 미디어 통합 엔드포인트
// POST /api/sns/instagram  body: { type: 'profile'|'media', accountId, maxResults? }
import { handleCors } from '../_utils/security.js';

export default async function handler(req, res) {
  if (handleCors(req, res)) return;

  const accessToken = process.env.INSTAGRAM_ACCESS_TOKEN;
  if (!accessToken) {
    return res.status(500).json({
      error: 'Instagram Access Token이 설정되지 않았습니다. Vercel 환경변수에 INSTAGRAM_ACCESS_TOKEN을 추가해주세요.',
    });
  }

  const { type = 'profile' } = req.body || {};

  if (type === 'profile') {
    return handleProfile(req, res, accessToken);
  } else if (type === 'media') {
    return handleMedia(req, res, accessToken);
  } else {
    return res.status(400).json({ error: '알 수 없는 type입니다. (profile 또는 media)' });
  }
}

// ---- 프로필 조회 ----
async function handleProfile(req, res, accessToken) {
  try {
    const { accountId } = req.body || {};
    if (!accountId) {
      return res.status(400).json({ error: 'accountId가 필요합니다. (Instagram Business Account ID)' });
    }

    const fields = 'id,username,name,profile_picture_url,followers_count,media_count,biography';
    const url = `https://graph.facebook.com/v21.0/${accountId}?fields=${fields}&access_token=${accessToken}`;

    const response = await fetch(url);

    if (!response.ok) {
      const errData = await response.json().catch(() => ({}));
      const errMsg = errData.error?.message || `Instagram API 오류 (${response.status})`;
      console.error('Instagram API error:', response.status, errMsg);
      return res.status(response.status).json({ error: errMsg });
    }

    const data = await response.json();

    const channel = {
      id: String(data.id),
      name: data.name || data.username || '',
      thumbnail: data.profile_picture_url || '',
      handle: data.username ? `@${data.username}` : '',
      description: (data.biography || '').slice(0, 200),
      subscribers: Number(data.followers_count) || 0,
      totalViews: 0,
      videoCount: Number(data.media_count) || 0,
    };

    return res.status(200).json({ channel });
  } catch (err) {
    console.error('Instagram profile error:', err);
    return res.status(500).json({ error: err.message });
  }
}

// ---- 미디어 조회 ----
async function handleMedia(req, res, accessToken) {
  try {
    const { accountId, maxResults = 12 } = req.body || {};
    if (!accountId) {
      return res.status(400).json({ error: 'accountId가 필요합니다.' });
    }

    const limit = Math.min(Number(maxResults), 25);
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
        views: 0,
        likes: Number(item.like_count) || 0,
        comments: Number(item.comments_count) || 0,
        publishedAt: item.timestamp || '',
        permalink: item.permalink || '',
        mediaType: item.media_type || 'IMAGE',
      };
    });

    return res.status(200).json({ videos });
  } catch (err) {
    console.error('Instagram media error:', err);
    return res.status(500).json({ error: err.message });
  }
}
