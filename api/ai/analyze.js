// Vercel Serverless Function — 범용 AI 분석 엔드포인트
// POST /api/ai/analyze  body: { feature, context, prompt }
import { handleCors, getAdminClient } from '../_utils/security.js';
import { callGemini, getGeminiKey } from '../_utils/gemini.js';
import { checkAiRateLimit, logAiCall } from '../_utils/rateLimit.js';

export default async function handler(req, res) {
  if (handleCors(req, res)) return;

  const apiKey = getGeminiKey();
  if (!apiKey) {
    return res.status(500).json({ error: 'Gemini API 키가 설정되지 않았습니다. Vercel 환경변수에 GEMINI_API_KEY를 추가해주세요.' });
  }

  try {
    const admin = getAdminClient();
    const rateCheck = await checkAiRateLimit(admin);
    if (!rateCheck.allowed) {
      return res.status(429).json({ error: '일일 AI 분석 한도(30회)를 초과했습니다. 내일 다시 시도해주세요.', used: rateCheck.used, limit: rateCheck.limit });
    }

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

    const text = await callGemini({
      apiKey,
      systemPrompt: systemPrompts[feature] || systemPrompts.dashboard,
      userMessage: `${context}\n\n${prompt}`,
    });

    await logAiCall(admin, feature);

    return res.status(200).json({
      insight: text,
      feature,
      generatedAt: new Date().toISOString(),
    });
  } catch (err) {
    console.error('AI Analyze error:', err);
    const status = err.status || 500;
    return res.status(status).json({ error: err.message });
  }
}
