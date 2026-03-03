// =====================================================
// SR STUDIO — Gemini API 공통 헬퍼
// Google Gemini 2.5 Flash를 사용한 AI 분석
// =====================================================

const GEMINI_MODEL = 'gemini-2.5-flash';
const GEMINI_URL = `https://generativelanguage.googleapis.com/v1beta/models/${GEMINI_MODEL}:generateContent`;

/**
 * Gemini API 호출 헬퍼
 *
 * Gemini 2.5 Flash는 응답 시 내부 thinking 토큰을 사용하므로
 * maxOutputTokens를 충분히 높게 설정해야 실제 출력이 잘리지 않습니다.
 *
 * @param {Object} options
 * @param {string} options.apiKey - Gemini API 키
 * @param {string} options.systemPrompt - 시스템 프롬프트
 * @param {string} options.userMessage - 사용자 메시지
 * @param {number} [options.maxTokens=16384] - 최대 출력 토큰 (thinking 포함)
 * @param {number} [options.temperature=0.7] - 생성 온도
 * @returns {Promise<string>} AI 응답 텍스트
 */
export async function callGemini({ apiKey, systemPrompt, userMessage, maxTokens = 16384, temperature = 0.7 }) {
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
    let detail = errText;
    try {
      const errJson = JSON.parse(errText);
      detail = errJson.error?.message || errText;
    } catch { /* 파싱 실패 시 원문 사용 */ }
    const err = new Error(`Gemini API 오류 (${response.status}): ${detail}`);
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
