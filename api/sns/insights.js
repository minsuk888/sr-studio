// Vercel Serverless Function — Gemini AI SNS 성과 인사이트
// POST /api/sns/insights  body: { channels, videos, competitors }
import { handleCors } from '../_utils/security.js';
import { callGemini, getGeminiKey } from '../_utils/gemini.js';

export default async function handler(req, res) {
  if (handleCors(req, res)) return;

  const apiKey = getGeminiKey();
  if (!apiKey) {
    return res.status(500).json({ error: 'Gemini API 키가 설정되지 않았습니다. Vercel 환경변수에 GEMINI_API_KEY를 추가해주세요.' });
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

    // 최근 영상 요약 (인게이지먼트 데이터 포함)
    const videoSummary = videos.slice(0, 12).map((v, i) =>
      `${i + 1}. "${v.title}" — 조회수: ${(v.views || 0).toLocaleString()}, 좋아요: ${(v.likes || 0).toLocaleString()}, 댓글: ${(v.comments || 0).toLocaleString()}, 인게이지먼트율: ${v.engagementRate || 'N/A'}%, 좋아요율: ${v.likeRatio || 'N/A'}%, 게시일: ${v.publishedAt?.split('T')[0] || ''}, 길이: ${v.duration || 'N/A'}`
    ).join('\n');

    // 게시 주기 분석
    const dates = videos.filter(v => v.publishedAt).map(v => new Date(v.publishedAt)).sort((a, b) => a - b);
    let postingPattern = '';
    if (dates.length >= 2) {
      const daySpan = Math.max((dates[dates.length - 1] - dates[0]) / (1000 * 60 * 60 * 24), 1);
      postingPattern = `게시 주기: ${videos.length}개 콘텐츠 / ${Math.round(daySpan)}일 = 주 ${(videos.length / (daySpan / 7)).toFixed(1)}개`;
    }

    // 경쟁사 요약
    const competitorSummary = competitors.length > 0
      ? competitors.map((c, i) =>
          `${i + 1}. ${c.name} — 구독자: ${(c.subscribers || 0).toLocaleString()}, 총 조회수: ${(c.totalViews || 0).toLocaleString()}`
        ).join('\n')
      : '경쟁사 데이터 없음';

    const userMessage = `아래 슈퍼레이스(Super Race) SNS 채널 데이터를 분석하고, 마케팅 인사이트를 제공해주세요.

## 우리 채널 현황
${channelSummary || '데이터 없음'}

## 최근 콘텐츠 성과 (인게이지먼트 데이터 포함)
${videoSummary || '데이터 없음'}
${postingPattern ? `\n${postingPattern}` : ''}

## 경쟁/관련 채널
${competitorSummary}

## 요청사항
다음 형식으로 한국어로 답변해주세요. 각 섹션은 반드시 포함해주세요:

### 📊 채널 성과 요약
- 현재 채널의 전반적 성과를 2~3줄로 요약
- 인게이지먼트율, 좋아요율 등 핵심 지표 평가

### 📹 개별 콘텐츠 분석
- 각 콘텐츠를 유형별로 분류 (VLOG, 하이라이트, 인터뷰, 숏폼, 리뷰 등)
- 유형별 평균 인게이지먼트율 비교
- 가장 성과가 좋은 콘텐츠 2~3개의 성공 요인 분석

### 📈 트렌드 감지
- 최근 조회수/인게이지먼트 추세 (상승/하락)
- 어떤 유형의 콘텐츠가 성장하고 있는지
- 게시 주기 및 최적 업로드 타이밍 분석

### 💡 향후 콘텐츠 방향성
- 데이터 기반 콘텐츠 전략 3~5개 구체적으로 제안
- 주간/월간 콘텐츠 캘린더 제안
- 실행 가능한 액션 아이템 포함

### 🚀 성장 기회
- 구독자/조회수 성장을 위한 기회 포인트 2~3개

### 🔍 경쟁 분석
- 경쟁 채널 대비 우리 채널의 강점/약점 (데이터가 있을 경우)
- 벤치마킹 포인트 제안`;

    const text = await callGemini({
      apiKey,
      systemPrompt: '당신은 슈퍼레이스(Super Race) 모터스포츠 마케팅 팀의 SNS 전문 분석가입니다. YouTube/Instagram 채널 데이터와 콘텐츠 성과를 분석하고, 데이터 기반의 실질적 마케팅 인사이트를 제공합니다. 항상 구체적인 수치를 인용하며 실행 가능한 제안을 합니다. 콘텐츠 유형(VLOG, 하이라이트, 인터뷰, 숏폼, 리뷰 등)을 분류하고, 유형별 성과를 비교 분석합니다. 게시 주기와 최적 업로드 타이밍도 분석합니다.',
      userMessage,
      maxTokens: 4096,
    });

    return res.status(200).json({
      insight: text,
      analyzedCount: channels.length + videos.length,
      generatedAt: new Date().toISOString(),
    });
  } catch (err) {
    console.error('SNS Insights error:', err);
    const status = err.status || 500;
    return res.status(status).json({ error: err.message });
  }
}
