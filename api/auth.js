// Vercel Serverless Function — 서버사이드 인증 (로그인 + 비밀번호 변경)
// POST /api/auth  body: { action: 'login'|'change-password', ... }

import { handleCors, getAdminClient, hashPassword, verifyPassword, isHashed } from './_utils/security.js';
import { logAccess } from './_utils/rateLimit.js';

export default async function handler(req, res) {
  if (handleCors(req, res)) return;

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
    const { password } = req.body || {};

    if (!password || !password.trim()) {
      return res.status(400).json({ success: false, error: '비밀번호를 입력해주세요.' });
    }

    const admin = getAdminClient();

    const { data, error } = await admin
      .from('app_settings')
      .select('value')
      .eq('key', 'password')
      .single();

    if (error || !data) {
      console.error('Password fetch error:', error);
      return res.status(500).json({ success: false, error: '설정을 불러올 수 없습니다.' });
    }

    const storedValue = data.value;
    let isValid = false;

    if (isHashed(storedValue)) {
      isValid = verifyPassword(password, storedValue);
    } else {
      // 레거시: 평문 비밀번호 → 자동 해시 마이그레이션
      isValid = (storedValue === password);

      if (isValid) {
        const hashed = hashPassword(password);
        await admin
          .from('app_settings')
          .update({ value: hashed })
          .eq('key', 'password');
        console.log('Password auto-migrated to hash');
      }
    }

    if (isValid) {
      await logAccess(admin, 'login', '로그인 성공').catch(() => {});
      return res.status(200).json({ success: true });
    } else {
      await logAccess(admin, 'login_fail', '비밀번호 불일치').catch(() => {});
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
    const { currentPassword, newPassword } = req.body || {};

    if (!currentPassword || !newPassword) {
      return res.status(400).json({ error: '현재 비밀번호와 새 비밀번호를 입력해주세요.' });
    }

    if (newPassword.length < 4) {
      return res.status(400).json({ error: '비밀번호는 최소 4자리 이상이어야 합니다.' });
    }

    const admin = getAdminClient();

    const { data, error } = await admin
      .from('app_settings')
      .select('value')
      .eq('key', 'password')
      .single();

    if (error || !data) {
      return res.status(500).json({ error: '설정을 불러올 수 없습니다.' });
    }

    const storedValue = data.value;
    let isCurrentValid = false;

    if (isHashed(storedValue)) {
      isCurrentValid = verifyPassword(currentPassword, storedValue);
    } else {
      isCurrentValid = (storedValue === currentPassword);
    }

    if (!isCurrentValid) {
      return res.status(401).json({ error: '현재 비밀번호가 일치하지 않습니다.' });
    }

    const hashedNew = hashPassword(newPassword);
    const { error: updateError } = await admin
      .from('app_settings')
      .update({ value: hashedNew })
      .eq('key', 'password');

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
