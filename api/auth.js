// Vercel Serverless Function — 서버사이드 인증 + 로그 조회
// POST /api/auth  body: { action: 'login'|'change-password' }
// GET  /api/auth?logs=true&type=login&limit=20

import { handleCors, getAdminClient, hashPassword, verifyPassword } from './_utils/security.js';
import { logAccess, extractClientInfo, DAILY_AI_LIMIT } from './_utils/rateLimit.js';

export default async function handler(req, res) {
  if (handleCors(req, res)) return;

  if (req.method === 'GET') {
    return handleGetLogs(req, res);
  }

  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const { action = 'login' } = req.body || {};

  if (action === 'login') {
    return handleLogin(req, res);
  } else if (action === 'change-password') {
    return handleChangePassword(req, res);
  } else {
    return res.status(400).json({ error: '알 수 없는 action입니다.' });
  }
}

// ---- 로그인 ----
async function handleLogin(req, res) {
  try {
    const { username, password } = req.body || {};

    if (!username || !username.trim()) {
      return res.status(400).json({ success: false, error: '사용자 이름을 입력해주세요.' });
    }

    if (!password || !password.trim()) {
      return res.status(400).json({ success: false, error: '비밀번호를 입력해주세요.' });
    }

    const admin = getAdminClient();

    const { data: member, error } = await admin
      .from('members')
      .select('id, name, role, avatar, is_admin, password_hash')
      .eq('name', username)
      .single();

    const clientInfo = extractClientInfo(req);

    if (error || !member) {
      await logAccess(admin, 'login_fail', `사용자 찾기 실패: ${username}`, clientInfo).catch(() => {});
      return res.status(401).json({ success: false, error: '사용자를 찾을 수 없습니다.' });
    }

    if (!member.password_hash) {
      await logAccess(admin, 'login_fail', `비밀번호 미설정: ${username}`, clientInfo).catch(() => {});
      return res.status(401).json({ success: false, error: '비밀번호가 설정되지 않았습니다. 관리자에게 문의하세요.' });
    }

    const isValid = verifyPassword(password, member.password_hash);

    if (isValid) {
      await logAccess(admin, 'login', `로그인 성공: ${username}`, clientInfo).catch(() => {});
      return res.status(200).json({
        success: true,
        user: {
          id: member.id,
          name: member.name,
          role: member.role,
          avatar: member.avatar,
          is_admin: member.is_admin,
        },
      });
    } else {
      await logAccess(admin, 'login_fail', `비밀번호 불일치: ${username}`, clientInfo).catch(() => {});
      return res.status(401).json({ success: false, error: '비밀번호가 일치하지 않습니다.' });
    }
  } catch (err) {
    console.error('Login error:', err);
    return res.status(500).json({ success: false, error: '서버 오류가 발생했습니다.' });
  }
}

// ---- 비밀번호 변경 ----
async function handleChangePassword(req, res) {
  try {
    const { memberId, currentPassword, newPassword, isAdminAction } = req.body || {};

    if (!memberId) {
      return res.status(400).json({ error: '멤버 ID가 필요합니다.' });
    }

    if (!newPassword) {
      return res.status(400).json({ error: '새 비밀번호를 입력해주세요.' });
    }

    if (newPassword.length < 4) {
      return res.status(400).json({ error: '비밀번호는 최소 4자리 이상이어야 합니다.' });
    }

    const admin = getAdminClient();

    if (isAdminAction) {
      // 관리자 비밀번호 재설정: 현재 비밀번호 검증 생략
      const { error: updateError } = await admin
        .from('members')
        .update({ password_hash: hashPassword(newPassword) })
        .eq('id', memberId);

      if (updateError) {
        console.error('Admin password reset error:', updateError);
        return res.status(500).json({ error: '비밀번호 변경에 실패했습니다.' });
      }

      return res.status(200).json({ success: true });
    }

    // 일반 비밀번호 변경: 현재 비밀번호 검증 필요
    if (!currentPassword) {
      return res.status(400).json({ error: '현재 비밀번호를 입력해주세요.' });
    }

    const { data: member, error: fetchError } = await admin
      .from('members')
      .select('id, password_hash')
      .eq('id', memberId)
      .single();

    if (fetchError || !member) {
      return res.status(404).json({ error: '멤버를 찾을 수 없습니다.' });
    }

    if (!member.password_hash || !verifyPassword(currentPassword, member.password_hash)) {
      return res.status(401).json({ error: '현재 비밀번호가 일치하지 않습니다.' });
    }

    const { error: updateError } = await admin
      .from('members')
      .update({ password_hash: hashPassword(newPassword) })
      .eq('id', memberId);

    if (updateError) {
      console.error('Password update error:', updateError);
      return res.status(500).json({ error: '비밀번호 변경에 실패했습니다.' });
    }

    return res.status(200).json({ success: true });
  } catch (err) {
    console.error('Change password error:', err);
    return res.status(500).json({ error: '서버 오류가 발생했습니다.' });
  }
}

// ---- 로그 조회 ----
async function handleGetLogs(req, res) {
  try {
    const admin = getAdminClient();
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
      .select('id, type, feature, detail, ip, location, created_at')
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
