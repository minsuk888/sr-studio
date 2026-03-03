// Vercel Serverless Function — YouTube 댓글 수집 + AI 감성 분석 (통합)
// POST /api/sns/youtube-comments  body: { videoId, maxResults, analyze?, videoTitle? }
// analyze=true 이면 댓글 수집 후 Gemini AI 감성 분석까지 수행
import { handleCors } from '../_utils/security.js';
import { callGemini, getGeminiKey } from '../_utils/gemini.js';

export default async function handler(req, res) {
  if (handleCors(req, res)) return;

  const ytApiKey = process.env.YOUTUBE_API_KEY;
  if (!ytApiKey) {
    return res.status(500).json({ error: 'YouTube API 키가 설정되지 않았습니다.' });
  }

  try {
    const { videoId, maxResults = 100, analyze = false, videoTitle = '' } = req.body || {};
    if (!videoId) {
      return res.status(400).json({ error: 'videoId가 필요합니다.' });
    }

    // Step 1: Fetch comments from YouTube
    const params = new URLSearchParams({
      part: 'snippet',
      videoId,
      maxResults: String(Math.min(Number(maxResults), 100)),
      order: 'relevance',
      textFormat: 'plainText',
      key: ytApiKey,
    });

    const ytResponse = await fetch(
      `https://www.googleapis.com/youtube/v3/commentThreads?${params}`
    );

    if (!ytResponse.ok) {
      const errText = await ytResponse.text();
      console.error('YouTube comments error:', ytResponse.status, errText);
      if (ytResponse.status === 403) {
        return res.status(200).json({ comments: [], disabled: true });
      }
      return res.status(ytResponse.status).json({ error: `댓글 조회 오류: ${errText}` });
    }

    const ytData = await ytResponse.json();
    const comments = (ytData.items || []).map((item) => {
      const snippet = item.snippet.topLevelComment.snippet;
      return {
        commentId: item.id,
        author: snippet.authorDisplayName,
        text: snippet.textDisplay,
        likeCount: snippet.likeCount || 0,
        publishedAt: snippet.publishedAt,
      };
    });

    // If no analysis requested, return comments only
    if (!analyze || comments.length === 0) {
      return res.status(200).json({
        comments,
        totalCount: ytData.pageInfo?.totalResults || comments.length,
      });
    }

    // Step 2: AI sentiment analysis with Gemini
    const geminiKey = getGeminiKey();
    if (!geminiKey) {
      return res.status(200).json({
        comments,
        totalCount: ytData.pageInfo?.totalResults || comments.length,
        analysis: null,
        error: 'Gemini API 키가 설정되지 않아 감성 분석을 건너뜁니다.',
      });
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

    let analysisText = '';
    let sentiments = [];

    try {
      analysisText = await callGemini({
        apiKey: geminiKey,
        systemPrompt: '당신은 슈퍼레이스(Super Race) 모터스포츠 마케팅 팀의 소셜미디어 분석가입니다. YouTube 댓글을 분석하여 시청자 감성, 핵심 피드백, 콘텐츠 개선 인사이트를 제공합니다. 항상 구체적이고 실행 가능한 제안을 합니다.',
        userMessage,
      });

      const jsonMatch = analysisText.match(/```json\s*([\s\S]*?)\s*```/);
      if (jsonMatch) {
        try {
          sentiments = JSON.parse(jsonMatch[1]);
        } catch (e) {
          console.error('Sentiment JSON parse error:', e);
        }
      }
    } catch (aiErr) {
      console.error('Gemini analysis error:', aiErr);
      return res.status(200).json({
        comments,
        totalCount: ytData.pageInfo?.totalResults || comments.length,
        analysis: null,
        error: `AI 분석 실패: ${aiErr.message}`,
      });
    }

    return res.status(200).json({
      comments,
      totalCount: ytData.pageInfo?.totalResults || comments.length,
      analysis: analysisText,
      sentiments,
      analyzedCount: Math.min(comments.length, 50),
      generatedAt: new Date().toISOString(),
    });
  } catch (err) {
    console.error('YouTube comments error:', err);
    return res.status(500).json({ error: err.message });
  }
}
