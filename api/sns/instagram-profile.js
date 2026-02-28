// Vercel Serverless Function — Instagram 프로필 통계 조회
// POST /api/sns/instagram-profile  body: { accountId }

export default async function handler(req, res) {
  // CORS
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
  if (req.method === 'OPTIONS') return res.status(200).end();

  const accessToken = process.env.INSTAGRAM_ACCESS_TOKEN;
  if (!accessToken) {
    return res.status(500).json({
      error: 'Instagram Access Token이 설정되지 않았습니다. Vercel 환경변수에 INSTAGRAM_ACCESS_TOKEN을 추가해주세요.',
    });
  }

  try {
    const { accountId } = req.body || {};
    if (!accountId) {
      return res.status(400).json({ error: 'accountId가 필요합니다. (Instagram Business Account ID)' });
    }

    // Instagram Graph API — 프로필 정보 + 통계
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
      totalViews: 0, // Instagram Graph API basic에서 총 조회수 미제공
      videoCount: Number(data.media_count) || 0,
    };

    return res.status(200).json({ channel });
  } catch (err) {
    console.error('Instagram profile error:', err);
    return res.status(500).json({ error: err.message });
  }
}
