// Vercel Serverless Function — 인증 시스템 마이그레이션
// POST /api/migrate-auth
// members 테이블에 password_hash, is_admin 컬럼 추가 후 초기 비밀번호 설정

import { handleCors, getAdminClient, hashPassword } from './_utils/security.js';

const DEFAULT_PASSWORD = '7889';

export default async function handler(req, res) {
  if (handleCors(req, res)) return;

  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const admin = getAdminClient();

    // 1. password_hash 컬럼 존재 여부 확인
    const { error: columnCheckError } = await admin
      .from('members')
      .select('password_hash')
      .limit(1);

    if (columnCheckError) {
      return res.status(400).json({
        success: false,
        error: 'password_hash 컬럼이 존재하지 않습니다. Supabase Dashboard에서 다음 SQL을 실행하세요.',
        sql: [
          'ALTER TABLE members ADD COLUMN password_hash TEXT;',
          'ALTER TABLE members ADD COLUMN is_admin BOOLEAN DEFAULT FALSE NOT NULL;',
        ].join('\n'),
      });
    }

    // 2. password_hash가 NULL인 멤버 조회
    const { data: members, error: fetchError } = await admin
      .from('members')
      .select('id, name, password_hash')
      .is('password_hash', null);

    if (fetchError) {
      console.error('Members fetch error:', fetchError);
      return res.status(500).json({ success: false, error: '멤버 조회에 실패했습니다.' });
    }

    // 3. 기본 비밀번호 해시 생성 및 일괄 업데이트
    const hashed = hashPassword(DEFAULT_PASSWORD);
    let migratedCount = 0;

    for (const member of members) {
      const { error: updateError } = await admin
        .from('members')
        .update({ password_hash: hashed })
        .eq('id', member.id);

      if (updateError) {
        console.error(`Failed to update member ${member.name}:`, updateError);
      } else {
        migratedCount++;
      }
    }

    // 4. 김민석을 관리자로 설정
    const { error: adminError } = await admin
      .from('members')
      .update({ is_admin: true })
      .eq('name', '김민석');

    if (adminError) {
      console.error('Admin flag update error:', adminError);
    }

    return res.status(200).json({
      success: true,
      message: `마이그레이션 완료: ${migratedCount}명 비밀번호 설정, 관리자 지정 완료`,
      migrated_count: migratedCount,
    });
  } catch (err) {
    console.error('Migration error:', err);
    return res.status(500).json({ success: false, error: '서버 오류가 발생했습니다.' });
  }
}
