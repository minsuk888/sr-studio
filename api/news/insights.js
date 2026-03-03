// Vercel Serverless Function — Gemini AI 뉴스 인사이트
// POST /api/news/insights  body: { articles: [{ title, summary, date, source, publisher }] }
import { handleCors } from '../_utils/security.js';
import { callGemini, getGeminiKey } from '../_utils/gemini.js';

export default async function handler(req, res) {
  if (handleCors(req, res)) return;

  const apiKey = getGeminiKey();
  if (!apiKey) {
    return res.status(500).json({ error: 'Gemini API 키가 설정되지 않았습니다. Vercel 환경변수에 GEMINI_API_KEY를 추가해주세요.' });
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

    const userMessage = `아래 수집된 최신 뉴스 기사들을 분석하고 결과를 JSON 형식으로만 반환해주세요.

## 수집된 기사 목록
${articleList}

## 응답 형식 (반드시 JSON만 출력, 다른 텍스트 없음)
{
  "insight": "마크다운 형식의 인사이트 전체 텍스트",
  "negativeArticles": [
    { "title": "부정 기사 제목 (원문 그대로)", "reason": "부정적인 이유 한 줄 요약" }
  ]
}

## insight 필드 작성 지침 (마크다운 형식)
다음 섹션을 순서대로 작성하세요:

### 📰 주요 뉴스 요약
- 가장 중요한 3~5개 뉴스를 핵심만 간결하게 요약 (각 1~2줄)

### 🔍 주목할 기사
- 마케팅적으로 가장 주목할만한 1~2개 기사를 선정하고, 왜 중요한지 설명

### ⚠️ 부정 기사 경고
- 브랜드/단체에 부정적 영향을 줄 수 있는 기사가 있다면 제목과 대응 방안 언급
- 부정 기사가 없으면: "이번 스크랩에서 주의가 필요한 부정 기사는 발견되지 않았습니다."

### 💡 마케팅 인사이트
- 이 뉴스들에서 발견되는 트렌드나 마케팅 기회를 2~3개 제시
- 실행 가능한 액션 아이템 포함

### 📊 전체 동향
- 현재 슈퍼레이스/모터스포츠 업계의 전반적 분위기를 2~3문장으로 정리

## negativeArticles 필드 작성 지침
부정 기사 판단 기준:
- 사고, 부상, 사망 관련 보도
- 브랜드/단체/선수에 대한 비판, 논란, 구설수
- 규정 위반, 불공정 의혹
- 스폰서/팬 이탈, 재정 문제
- 안전 문제 제기

부정 기사가 없으면 빈 배열 [] 반환`;

    const rawText = await callGemini({
      apiKey,
      systemPrompt: '당신은 슈퍼레이스(Super Race) 모터스포츠 마케팅 팀의 전문 분석가입니다. 수집된 뉴스를 분석하고 요청된 JSON 형식으로만 응답합니다. JSON 외에 다른 텍스트는 절대 출력하지 않습니다.',
      userMessage,
      maxTokens: 4096,
    });

    // JSON 파싱 (AI가 JSON 외 텍스트를 추가할 경우 대비해 추출)
    let insight = '';
    let negativeArticles = [];

    try {
      const jsonMatch = rawText.match(/\{[\s\S]*\}/);
      if (jsonMatch) {
        const parsed = JSON.parse(jsonMatch[0]);
        insight = parsed.insight || rawText;
        negativeArticles = Array.isArray(parsed.negativeArticles) ? parsed.negativeArticles : [];
      } else {
        insight = rawText;
      }
    } catch {
      // JSON 파싱 실패 시 텍스트 그대로 사용
      insight = rawText;
    }

    return res.status(200).json({
      insight,
      negativeArticles,
      negativeCount: negativeArticles.length,
      analyzedCount: Math.min(articles.length, 20),
      generatedAt: new Date().toISOString(),
    });
  } catch (err) {
    console.error('Insights error:', err);
    const status = err.status || 500;
    return res.status(status).json({ error: err.message });
  }
}
