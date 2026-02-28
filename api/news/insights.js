// Vercel Serverless Function — Gemini AI 뉴스 인사이트
// POST /api/news/insights  body: { articles: [{ title, summary, date, source, publisher }] }

export default async function handler(req, res) {
  // CORS
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
  if (req.method === 'OPTIONS') return res.status(200).end();

  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) {
    return res.status(500).json({ error: 'Gemini API 키가 설정되지 않았습니다.' });
  }

  try {
    const { articles = [] } = req.body || {};

    if (articles.length === 0) {
      return res.status(400).json({ error: '분석할 기사가 없습니다.' });
    }

    // 기사 목록을 텍스트로 변환 (최대 20개)
    const articleList = articles.slice(0, 20).map((a, i) =>
      `${i + 1}. [${a.source}] ${a.title} (${a.date}) - ${a.publisher}\n   ${a.summary || '요약 없음'}`
    ).join('\n');

    const prompt = `당신은 슈퍼레이스(Super Race) 모터스포츠 마케팅 팀의 전문 분석가입니다.
아래 수집된 최신 뉴스 기사들을 분석하고, 마케팅 관점에서 인사이트를 제공해주세요.

## 수집된 기사 목록
${articleList}

## 요청사항
다음 형식으로 한국어로 답변해주세요. 각 섹션은 반드시 포함해주세요:

### 📰 주요 뉴스 요약
- 가장 중요한 3~5개 뉴스를 핵심만 간결하게 요약 (각 1~2줄)

### 🔍 주목할 기사
- 마케팅적으로 가장 주목할만한 1~2개 기사를 선정하고, 왜 중요한지 설명

### 💡 마케팅 인사이트
- 이 뉴스들에서 발견되는 트렌드나 마케팅 기회를 2~3개 제시
- 실행 가능한 액션 아이템 포함

### 📊 전체 동향
- 현재 슈퍼레이스/모터스포츠 업계의 전반적 분위기를 2~3문장으로 정리`;

    // Gemini API 호출 (1.5-flash → 2.0-flash 순으로 시도)
    const models = ['gemini-1.5-flash', 'gemini-2.0-flash'];
    let response = null;
    let lastError = '';

    for (const model of models) {
      const geminiUrl = `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${apiKey}`;

      response = await fetch(geminiUrl, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          contents: [{ parts: [{ text: prompt }] }],
          generationConfig: {
            temperature: 0.7,
            maxOutputTokens: 2048,
          },
        }),
      });

      if (response.ok) break;

      lastError = await response.text();
      console.error(`Gemini ${model} error (${response.status}):`, lastError);
      response = null; // reset for fallback
    }

    if (!response || !response.ok) {
      return res.status(500).json({ error: `Gemini API 오류: ${lastError || 'all models failed'}` });
    }

    const data = await response.json();

    // 응답에서 텍스트 추출
    const text = data.candidates?.[0]?.content?.parts?.[0]?.text || '';

    if (!text) {
      return res.status(500).json({ error: 'AI 응답을 생성하지 못했습니다.' });
    }

    return res.status(200).json({
      insight: text,
      analyzedCount: Math.min(articles.length, 20),
      generatedAt: new Date().toISOString(),
    });
  } catch (err) {
    console.error('Insights error:', err);
    return res.status(500).json({ error: err.message });
  }
}
