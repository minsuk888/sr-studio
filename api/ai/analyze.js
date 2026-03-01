// Vercel Serverless Function — 범용 AI 분석 엔드포인트
// POST /api/ai/analyze  body: { feature, context, prompt }

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
    const { feature = 'dashboard', context = '', prompt = '' } = req.body || {};

    if (!context && !prompt) {
      return res.status(400).json({ error: '분석할 데이터가 없습니다.' });
    }

    const systemPrompts = {
      dashboard: '당신은 슈퍼레이스(Super Race) 마케팅 팀의 업무 현황 분석가입니다. 현재 팀 상황을 파악하고 이번 주 우선순위와 리스크를 식별합니다. 항상 구체적인 수치를 인용하며 실행 가능한 제안을 합니다.',
      tasks: '당신은 슈퍼레이스 마케팅 팀의 업무 관리 전문가입니다. 업무 우선순위, 워크로드 분석, 일정 최적화를 제안합니다. 실질적이고 구체적인 조언을 합니다.',
      calendar: '당신은 슈퍼레이스 마케팅 팀의 일정 최적화 전문가입니다. 일정 충돌, 여유 기간, 효율적 스케줄링을 분석합니다.',
      kpi: '당신은 슈퍼레이스 모터스포츠 마케팅 KPI 분석가입니다. KPI 달성률을 분석하고, 위험 요소를 식별하며, 구체적인 개선 전략을 제시합니다. 모터스포츠 마케팅 업계 관점에서 인사이트를 제공합니다.',
      meetings: '당신은 슈퍼레이스 마케팅 팀의 회의 분석 전문가입니다. 회의록을 요약하고, 핵심 결정사항과 액션 아이템을 추출합니다.',
      news: '당신은 슈퍼레이스 마케팅 팀의 뉴스/트렌드 분석가입니다. 뉴스를 분석하고 마케팅 인사이트를 제공합니다.',
    };

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
        system: systemPrompts[feature] || systemPrompts.dashboard,
        messages: [{ role: 'user', content: `${context}\n\n${prompt}` }],
      }),
    });

    if (!response.ok) {
      const errText = await response.text();
      console.error('Claude API error:', response.status, errText);
      return res.status(response.status).json({ error: `Claude API 오류 (${response.status})` });
    }

    const data = await response.json();
    const text = data.content?.[0]?.text || '';

    if (!text) {
      return res.status(500).json({ error: 'AI 응답을 생성하지 못했습니다.' });
    }

    return res.status(200).json({
      insight: text,
      feature,
      generatedAt: new Date().toISOString(),
    });
  } catch (err) {
    console.error('AI Analyze error:', err);
    return res.status(500).json({ error: err.message });
  }
}
