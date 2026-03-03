// =====================================================
// SR STUDIO — AI 호출 일일 제한 유틸리티
// app_logs 테이블 기반 rate limiting (KST 기준 일일 30회)
// =====================================================

export const DAILY_AI_LIMIT = 30;

/**
 * 오늘(KST) AI 호출 횟수를 확인하고 제한 내인지 반환
 * @param {import('@supabase/supabase-js').SupabaseClient} admin
 * @returns {Promise<{ allowed: boolean, used: number, limit: number }>}
 */
export async function checkAiRateLimit(admin) {
  const todayKST = getTodayStartKST();

  const { count, error } = await admin
    .from('app_logs')
    .select('id', { count: 'exact', head: true })
    .eq('type', 'ai_call')
    .gte('created_at', todayKST);

  if (error) {
    console.error('Rate limit check error:', error);
    // DB 오류 시 허용 (서비스 중단 방지)
    return { allowed: true, used: 0, limit: DAILY_AI_LIMIT };
  }

  const used = count || 0;
  return {
    allowed: used < DAILY_AI_LIMIT,
    used,
    limit: DAILY_AI_LIMIT,
  };
}

/**
 * AI 호출 로그 기록
 * @param {import('@supabase/supabase-js').SupabaseClient} admin
 * @param {string} feature - 기능명 (dashboard, calendar, tasks, news, sns, meetings, youtube-comments)
 */
export async function logAiCall(admin, feature) {
  const { error } = await admin
    .from('app_logs')
    .insert({ type: 'ai_call', feature, detail: `AI 분석: ${feature}` });

  if (error) {
    console.error('AI call log error:', error);
  }
}

/**
 * 접속 로그 기록 (IP/지역 포함)
 * @param {import('@supabase/supabase-js').SupabaseClient} admin
 * @param {'login'|'login_fail'} type
 * @param {string} detail
 * @param {{ ip?: string, location?: string }} [meta]
 */
export async function logAccess(admin, type, detail, meta = {}) {
  const { error } = await admin
    .from('app_logs')
    .insert({ type, detail, ip: meta.ip || null, location: meta.location || null });

  if (error) {
    console.error('Access log error:', error);
  }
}

/**
 * Vercel 요청 헤더에서 IP + 지역 정보 추출
 * @param {import('http').IncomingMessage} req
 * @returns {{ ip: string, location: string }}
 */
export function extractClientInfo(req) {
  const ip = req.headers['x-forwarded-for']?.split(',')[0]?.trim()
    || req.headers['x-real-ip']
    || 'unknown';

  const country = req.headers['x-vercel-ip-country'] || '';
  const city = req.headers['x-vercel-ip-city'] || '';

  const parts = [city, country].filter(Boolean);
  const location = parts.length > 0 ? decodeURIComponent(parts.join(', ')) : '';

  return { ip, location };
}

/**
 * 오늘 KST 00:00:00을 ISO 문자열로 반환
 */
function getTodayStartKST() {
  const now = new Date();
  const kstOffset = 9 * 60 * 60 * 1000;
  const kstNow = new Date(now.getTime() + kstOffset);
  const kstDateStr = kstNow.toISOString().split('T')[0];
  return `${kstDateStr}T00:00:00+09:00`;
}
