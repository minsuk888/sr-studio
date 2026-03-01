// Vercel Serverless Function — Claude AI 댓글 감성 분석
// POST /api/sns/comment-analysis  body: { comments: [{text, author}], videoTitle }

export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
  if (req.method === 'OPTIONS') return res.status(200).end();

  const apiKey = process.env.ANTHROPIC_API_KEY;
  if (!apiKey) {
    return res.status(500).json({ error: 'Anthropic API 키가 설정되지 않았습니다.' });
  }

  try {
    const { comments = [], videoTitle = '' } = req.body || {};
    if (comments.length === 0) {
      return res.status(400).json({ error: '분석할 댓글이 없습니다.' });
    }

    const commentList = comments.slice(0, 50).map((c, i) =>
      `${i + 1}. [${c.author || '익명'}] ${c.text}`
    ).join('\n');

    const userMessage = `아래는 "${videoTitle}" 영상의 YouTube 댓글입니다. 분석해주세요.

## 댓글 목록
${commentList}

## 요청사항
다음 형식으로 한국어로 답변해주세요:

### 📊 감성 분석 요약
- 전체 댓글의 감성 분포를 분석해주세요 (긍정/중립/부정 비율)
- 주요 감성 키워드를 추출해주세요

### 💬 핵심 피드백
- 시청자들이 가장 많이 언급하는 주제 3-5개
- 긍정적 피드백 핵심 포인트
- 부정적/개선 요청 피드백 핵심 포인트

### 📈 콘텐츠 개선 제안
- 댓글 기반 콘텐츠 개선 방향 2-3개
- 시청자 참여를 높일 수 있는 방법

### 🏷️ 개별 댓글 감성
각 댓글의 감성을 JSON 배열로 제공해주세요:
\`\`\`json
[{"index": 1, "sentiment": "positive"}, {"index": 2, "sentiment": "neutral"}, ...]
\`\`\`
sentiment 값: "positive", "neutral", "negative" 중 하나`;

    const response = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': apiKey,
        'anthropic-version': '2023-06-01',
      },
      body: JSON.stringify({
        model: 'claude-haiku-4-5',
        max_tokens: 4096,
        system: '당신은 슈퍼레이스(Super Race) 모터스포츠 마케팅 팀의 소셜미디어 분석가입니다. YouTube 댓글을 분석하여 시청자 감성, 핵심 피드백, 콘텐츠 개선 인사이트를 제공합니다. 항상 구체적이고 실행 가능한 제안을 합니다.',
        messages: [{ role: 'user', content: userMessage }],
      }),
    });

    if (!response.ok) {
      const errText = await response.text();
      console.error('Claude API error:', response.status, errText);
      return res.status(response.status).json({ error: `Claude API 오류: ${errText}` });
    }

    const data = await response.json();
    const analysisText = data.content?.[0]?.text || '';

    // Extract sentiment JSON from the response
    let sentiments = [];
    const jsonMatch = analysisText.match(/```json\s*([\s\S]*?)\s*```/);
    if (jsonMatch) {
      try {
        sentiments = JSON.parse(jsonMatch[1]);
      } catch (e) {
        console.error('Sentiment JSON parse error:', e);
      }
    }

    return res.status(200).json({
      analysis: analysisText,
      sentiments,
      analyzedCount: Math.min(comments.length, 50),
      generatedAt: new Date().toISOString(),
    });
  } catch (err) {
    console.error('Comment analysis error:', err);
    return res.status(500).json({ error: err.message });
  }
}
