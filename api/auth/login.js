// Vercel Serverless Function — 서버사이드 로그인 인증
// POST /api/auth/login  body: { password }

import { handleCors, getAdminClient, hashPassword, verifyPassword, isHashed } from '../_utils/security.js';

export default async function handler(req, res) {
  if (handleCors(req, res)) return;

  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const { password } = req.body || {};

    if (!password || !password.trim()) {
      return res.status(400).json({ success: false, error: '비밀번호를 입력해주세요.' });
    }

    const admin = getAdminClient();

    // app_settings에서 저장된 비밀번호 조회 (service_role → RLS 우회)
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
      // 해시된 비밀번호 검증
      isValid = verifyPassword(password, storedValue);
    } else {
      // 레거시: 평문 비밀번호 → 자동 해시 마이그레이션
      isValid = (storedValue === password);

      if (isValid) {
        // 첫 로그인 시 평문을 해시로 자동 업그레이드
        const hashed = hashPassword(password);
        await admin
          .from('app_settings')
          .update({ value: hashed })
          .eq('key', 'password');
        console.log('Password auto-migrated to hash');
      }
    }

    if (isValid) {
      return res.status(200).json({ success: true });
    } else {
      return res.status(401).json({ success: false, error: '비밀번호가 일치하지 않습니다.' });
    }
  } catch (err) {
    console.error('Login error:', err);
    return res.status(500).json({ success: false, error: '서버 오류가 발생했습니다.' });
  }
}
