// Vercel Serverless Function — 서버사이드 비밀번호 변경
// POST /api/auth/change-password  body: { currentPassword, newPassword }

import { handleCors, getAdminClient, hashPassword, verifyPassword, isHashed } from '../_utils/security.js';

export default async function handler(req, res) {
  if (handleCors(req, res)) return;

  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const { currentPassword, newPassword } = req.body || {};

    if (!currentPassword || !newPassword) {
      return res.status(400).json({ error: '현재 비밀번호와 새 비밀번호를 입력해주세요.' });
    }

    if (newPassword.length < 4) {
      return res.status(400).json({ error: '비밀번호는 최소 4자리 이상이어야 합니다.' });
    }

    const admin = getAdminClient();

    // 현재 비밀번호 확인
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

    // 새 비밀번호를 해시하여 저장
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
