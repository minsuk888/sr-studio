// =====================================================
// SR STUDIO — Gemini API 공통 헬퍼
// Google Gemini 2.0 Flash를 사용한 AI 분석
// =====================================================

const GEMINI_MODEL = 'gemini-2.0-flash';
const GEMINI_URL = `https://generativelanguage.googleapis.com/v1beta/models/${GEMINI_MODEL}:generateContent`;

/**
 * Gemini API 호출 헬퍼
 * @param {Object} options
 * @param {string} options.apiKey - Gemini API 키
 * @param {string} options.systemPrompt - 시스템 프롬프트
 * @param {string} options.userMessage - 사용자 메시지
 * @param {number} [options.maxTokens=2048] - 최대 출력 토큰
 * @param {number} [options.temperature=0.7] - 생성 온도
 * @returns {Promise<string>} AI 응답 텍스트
 */
export async function callGemini({ apiKey, systemPrompt, userMessage, maxTokens = 2048, temperature = 0.7 }) {
  const response = await fetch(`${GEMINI_URL}?key=${apiKey}`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      system_instruction: { parts: [{ text: systemPrompt }] },
      contents: [{ role: 'user', parts: [{ text: userMessage }] }],
      generationConfig: {
        maxOutputTokens: maxTokens,
        temperature,
      },
    }),
  });

  if (!response.ok) {
    const errText = await response.text();
    console.error('Gemini API error:', response.status, errText);
    const err = new Error(`Gemini API 오류 (${response.status})`);
    err.status = response.status;
    err.detail = errText;
    throw err;
  }

  const data = await response.json();
  const text = data.candidates?.[0]?.content?.parts?.[0]?.text || '';

  if (!text) {
    throw new Error('AI 응답을 생성하지 못했습니다.');
  }

  return text;
}

/**
 * Gemini API 키 확인
 * @returns {string|null} API 키 또는 null
 */
export function getGeminiKey() {
  return process.env.GEMINI_API_KEY || null;
}
