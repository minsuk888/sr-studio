// Vercel Serverless Function — 로그 조회 + 테이블 초기화
// GET  /api/logs?type=login&limit=20
// POST /api/logs  body: { action: 'init' }  → 테이블 자동 생성
import { handleCors, getAdminClient } from './_utils/security.js';

const DAILY_AI_LIMIT = 30;

export default async function handler(req, res) {
  if (handleCors(req, res)) return;

  const admin = getAdminClient();

  if (req.method === 'POST') {
    return handleInit(admin, req, res);
  }

  if (req.method === 'GET') {
    return handleGetLogs(admin, req, res);
  }

  return res.status(405).json({ error: 'Method not allowed' });
}

// ---- 테이블 자동 생성 ----
async function handleInit(admin, req, res) {
  try {
    const { action } = req.body || {};
    if (action !== 'init') {
      return res.status(400).json({ error: 'Invalid action' });
    }

    // 테이블 존재 여부 확인
    const { error: checkErr } = await admin
      .from('app_logs')
      .select('id')
      .limit(1);

    if (checkErr && checkErr.message.includes('app_logs')) {
      // 테이블이 없으면 SQL로 생성 (Supabase rpc 방식)
      // service_role은 직접 SQL 실행 불가하므로, REST로 우회
      return res.status(200).json({
        exists: false,
        message: 'app_logs 테이블이 없습니다. Supabase SQL Editor에서 아래 SQL을 실행해주세요.',
        sql: `CREATE TABLE IF NOT EXISTS app_logs (
  id BIGSERIAL PRIMARY KEY,
  type TEXT NOT NULL,
  feature TEXT,
  detail TEXT,
  created_at TIMESTAMPTZ DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_app_logs_type_date ON app_logs (type, created_at);

-- RLS 활성화 (service_role만 접근)
ALTER TABLE app_logs ENABLE ROW LEVEL SECURITY;`,
      });
    }

    return res.status(200).json({ exists: true, message: 'app_logs 테이블이 이미 존재합니다.' });
  } catch (err) {
    console.error('Init error:', err);
    return res.status(500).json({ error: err.message });
  }
}

// ---- 로그 조회 ----
async function handleGetLogs(admin, req, res) {
  try {
    const { type, limit: limitStr } = req.query || {};
    const limit = Math.min(Number(limitStr) || 20, 100);

    // 오늘 AI 사용량 계산 (KST)
    const now = new Date();
    const kstOffset = 9 * 60 * 60 * 1000;
    const kstNow = new Date(now.getTime() + kstOffset);
    const kstDateStr = kstNow.toISOString().split('T')[0];
    const todayStart = `${kstDateStr}T00:00:00+09:00`;

    const { count: aiUsedToday } = await admin
      .from('app_logs')
      .select('id', { count: 'exact', head: true })
      .eq('type', 'ai_call')
      .gte('created_at', todayStart);

    // 로그 조회
    let query = admin
      .from('app_logs')
      .select('id, type, feature, detail, created_at')
      .order('created_at', { ascending: false })
      .limit(limit);

    if (type) {
      if (type === 'login') {
        query = query.in('type', ['login', 'login_fail']);
      } else {
        query = query.eq('type', type);
      }
    }

    const { data: logs, error } = await query;

    if (error) {
      console.error('Logs query error:', error);
      return res.status(500).json({ error: '로그를 조회할 수 없습니다.' });
    }

    return res.status(200).json({
      logs: logs || [],
      todayAiUsage: {
        used: aiUsedToday || 0,
        limit: DAILY_AI_LIMIT,
      },
    });
  } catch (err) {
    console.error('Get logs error:', err);
    return res.status(500).json({ error: err.message });
  }
}
