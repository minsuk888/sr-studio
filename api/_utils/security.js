// =====================================================
// SR STUDIO — 공통 보안 유틸리티
// CORS 제한 + 비밀번호 해싱 + Supabase Admin
// =====================================================

import { createClient } from '@supabase/supabase-js';
import crypto from 'node:crypto';

// ----- CORS 설정 -----
const LOCALHOST_ORIGINS = [
  'http://localhost:5173',
  'http://localhost:5174',
  'http://localhost:3000',
];

function getAllowedOrigins() {
  const origins = [...LOCALHOST_ORIGINS];
  // 환경변수에서 커스텀 도메인 추가 (쉼표 구분)
  if (process.env.ALLOWED_ORIGIN) {
    origins.push(...process.env.ALLOWED_ORIGIN.split(',').map(s => s.trim()));
  }
  return origins;
}

function isAllowedOrigin(origin) {
  if (!origin) return true; // same-origin 요청
  const allowed = getAllowedOrigins();
  if (allowed.includes(origin)) return true;
  // Vercel 프리뷰 배포 자동 허용 (*.vercel.app)
  if (origin.endsWith('.vercel.app')) return true;
  return false;
}

/**
 * CORS 헤더 설정 (제한된 origin만 허용)
 */
export function setCorsHeaders(req, res) {
  const origin = req.headers.origin || '';

  if (isAllowedOrigin(origin)) {
    res.setHeader('Access-Control-Allow-Origin', origin || '*');
  }

  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');
  res.setHeader('Access-Control-Allow-Credentials', 'true');
  // 보안 헤더 추가
  res.setHeader('X-Content-Type-Options', 'nosniff');
  res.setHeader('X-Frame-Options', 'DENY');
}

/**
 * OPTIONS 프리플라이트 핸들링
 * @returns {boolean} true면 핸들러 종료 필요
 */
export function handleCors(req, res) {
  setCorsHeaders(req, res);
  if (req.method === 'OPTIONS') {
    res.status(200).end();
    return true;
  }
  return false;
}

// ----- Supabase Admin 클라이언트 -----
let adminClient = null;

/**
 * service_role key를 사용하는 관리자 Supabase 클라이언트
 * RLS를 우회하여 app_settings 등 보호된 테이블에 접근
 */
export function getAdminClient() {
  if (!adminClient) {
    const url = process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL;
    const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

    if (!url || !serviceKey) {
      throw new Error('SUPABASE_URL 또는 SUPABASE_SERVICE_ROLE_KEY가 설정되지 않았습니다.');
    }

    adminClient = createClient(url, serviceKey);
  }
  return adminClient;
}

// ----- 비밀번호 해싱 -----
const HASH_ITERATIONS = 10000;
const HASH_KEYLEN = 64;
const HASH_ALGO = 'sha512';
const SALT = 'sr-studio-auth-v1';

/**
 * 비밀번호를 PBKDF2로 해싱
 */
export function hashPassword(password) {
  return crypto
    .pbkdf2Sync(password, SALT, HASH_ITERATIONS, HASH_KEYLEN, HASH_ALGO)
    .toString('hex');
}

/**
 * 비밀번호 검증 (timing-safe 비교)
 */
export function verifyPassword(password, storedHash) {
  const hash = hashPassword(password);
  try {
    return crypto.timingSafeEqual(Buffer.from(hash, 'hex'), Buffer.from(storedHash, 'hex'));
  } catch {
    return false;
  }
}

/**
 * 저장된 값이 해시인지 판별 (128자 hex = 64바이트 PBKDF2)
 */
export function isHashed(value) {
  return value && value.length === 128 && /^[0-9a-f]+$/i.test(value);
}
