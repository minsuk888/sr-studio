// Vercel Serverless Function — 회의록 AI 요약
// POST /api/meetings/summary  body: { title, date, agendas, minutes, attendees }
import { handleCors } from '../_utils/security.js';

export default async function handler(req, res) {
  if (handleCors(req, res)) return;

  const apiKey = process.env.ANTHROPIC_API_KEY;
  if (!apiKey) {
    return res.status(500).json({ error: 'Anthropic API 키가 설정되지 않았습니다.' });
  }

  try {
    const { title = '', date = '', agendas = [], minutes = '', attendees = [] } = req.body || {};

    if (!minutes && agendas.length === 0) {
      return res.status(400).json({ error: '요약할 회의록 또는 안건 데이터가 없습니다.' });
    }

    const agendaText = agendas.map((a, i) => `${i + 1}. ${a.title}${a.description ? ` - ${a.description}` : ''}`).join('\n');
    const attendeeText = attendees.join(', ');

    const userMessage = `아래 회의 내용을 분석하고 요약해주세요.

## 회의 정보
- 제목: ${title}
- 일시: ${date}
- 참석자: ${attendeeText || '미정'}

## 안건
${agendaText || '안건 없음'}

## 회의록
${minutes || '회의록 없음'}

## 요청사항
다음 형식으로 한국어로 답변해주세요:

### 📋 회의 요약
- 회의 핵심 내용을 3~5문장으로 요약

### 🎯 핵심 결정사항
- 회의에서 결정된 주요 사항을 리스트로 정리

### ✅ 액션 아이템
- 구체적인 후속 조치 사항
- 가능하면 담당자와 마감일 제안

### 💡 참고 사항
- 추가로 고려할 점이나 리스크`;

    const response = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': apiKey,
        'anthropic-version': '2023-06-01',
      },
      body: JSON.stringify({
        model: 'claude-haiku-4-5-20251001',
        max_tokens: 2048,
        system: '당신은 슈퍼레이스(Super Race) 마케팅 팀의 회의 분석 전문가입니다. 회의록을 읽고 핵심 내용을 요약하며, 결정사항과 액션 아이템을 명확하게 추출합니다.',
        messages: [{ role: 'user', content: userMessage }],
      }),
    });

    if (!response.ok) {
      const errText = await response.text();
      console.error('Claude API error:', response.status, errText);
      return res.status(response.status).json({ error: `Claude API 오류 (${response.status})` });
    }

    const data = await response.json();
    const text = data.content?.[0]?.text || '';

    return res.status(200).json({
      summary: text,
      generatedAt: new Date().toISOString(),
    });
  } catch (err) {
    console.error('Meeting summary error:', err);
    return res.status(500).json({ error: err.message });
  }
}
