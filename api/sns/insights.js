// Vercel Serverless Function — Claude AI SNS 성과 인사이트
// POST /api/sns/insights  body: { channels, videos, competitors }

export default async function handler(req, res) {
  // CORS
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
  if (req.method === 'OPTIONS') return res.status(200).end();

  const apiKey = process.env.ANTHROPIC_API_KEY;
  if (!apiKey) {
    return res.status(500).json({ error: 'Anthropic API 키가 설정되지 않았습니다.' });
  }

  try {
    const { channels = [], videos = [], competitors = [] } = req.body || {};

    if (channels.length === 0 && videos.length === 0) {
      return res.status(400).json({ error: '분석할 채널 또는 영상 데이터가 없습니다.' });
    }

    // 채널 요약
    const channelSummary = channels.map((ch, i) =>
      `${i + 1}. [${ch.platform || 'youtube'}] ${ch.name} — 구독자: ${(ch.subscribers || 0).toLocaleString()}, 총 조회수: ${(ch.totalViews || 0).toLocaleString()}, 영상 수: ${ch.videoCount || 0}`
    ).join('\n');

    // 최근 영상 요약
    const videoSummary = videos.slice(0, 12).map((v, i) =>
      `${i + 1}. "${v.title}" — 조회수: ${(v.views || 0).toLocaleString()}, 좋아요: ${(v.likes || 0).toLocaleString()}, 댓글: ${(v.comments || 0).toLocaleString()}, 게시일: ${v.publishedAt?.split('T')[0] || ''}`
    ).join('\n');

    // 경쟁사 요약
    const competitorSummary = competitors.length > 0
      ? competitors.map((c, i) =>
          `${i + 1}. ${c.name} — 구독자: ${(c.subscribers || 0).toLocaleString()}, 총 조회수: ${(c.totalViews || 0).toLocaleString()}`
        ).join('\n')
      : '경쟁사 데이터 없음';

    const userMessage = `아래 슈퍼레이스(Super Race) SNS 채널 데이터를 분석하고, 마케팅 인사이트를 제공해주세요.

## 우리 채널 현황
${channelSummary || '데이터 없음'}

## 최근 영상 성과
${videoSummary || '데이터 없음'}

## 경쟁/관련 채널
${competitorSummary}

## 요청사항
다음 형식으로 한국어로 답변해주세요. 각 섹션은 반드시 포함해주세요:

### 📊 채널 성과 요약
- 현재 채널의 전반적 성과를 2~3줄로 요약

### 🏆 Top 콘텐츠 분석
- 가장 성과가 좋은 영상 2~3개를 분석하고, 성공 요인을 구체적으로 설명

### 💡 콘텐츠 전략 제안
- 데이터 기반으로 향후 콘텐츠 방향을 3~4개 구체적으로 제안
- 실행 가능한 액션 아이템 포함
- 유사 업계 레퍼런스가 있다면 참조 권장

### 📈 성장 기회
- 구독자/조회수 성장을 위한 기회 포인트 2~3개

### 🔍 경쟁 분석
- 경쟁 채널 대비 우리 채널의 강점/약점 (데이터가 있을 경우)
- 벤치마킹 포인트 제안`;

    // Claude API 호출
    const response = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': apiKey,
        'anthropic-version': '2023-06-01',
      },
      body: JSON.stringify({
        model: 'claude-haiku-4-5',
        max_tokens: 2048,
        system: '당신은 슈퍼레이스(Super Race) 모터스포츠 마케팅 팀의 SNS 전문 분석가입니다. YouTube 채널 데이터와 영상 성과를 분석하고, 데이터 기반의 실질적 마케팅 인사이트를 제공합니다. 항상 구체적인 수치를 인용하며 실행 가능한 제안을 합니다.',
        messages: [
          { role: 'user', content: userMessage },
        ],
      }),
    });

    if (!response.ok) {
      const errText = await response.text();
      console.error('Claude API error:', response.status, errText);
      return res.status(response.status).json({ error: `Claude API 오류 (${response.status}): ${errText}` });
    }

    const data = await response.json();
    const text = data.content?.[0]?.text || '';

    if (!text) {
      return res.status(500).json({ error: 'AI 응답을 생성하지 못했습니다.' });
    }

    return res.status(200).json({
      insight: text,
      analyzedCount: channels.length + videos.length,
      generatedAt: new Date().toISOString(),
    });
  } catch (err) {
    console.error('SNS Insights error:', err);
    return res.status(500).json({ error: err.message });
  }
}
