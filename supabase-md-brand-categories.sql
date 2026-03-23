-- ============================================
-- MD 카테고리 → 브랜드 기반 재구성
-- 기존: 의류, 액세서리, 스티커/인쇄물, 기타
-- 변경: 슈퍼레이스, 오네레이싱
-- 실행: Supabase Dashboard > SQL Editor
-- ============================================

-- ─── 1. 새 카테고리 생성 ────────────────────────────────────────────────────────
INSERT INTO md_categories (name, color, icon, sort_order)
SELECT '슈퍼레이스', '#ef4444', '🏎️', 1
WHERE NOT EXISTS (SELECT 1 FROM md_categories WHERE name = '슈퍼레이스');

INSERT INTO md_categories (name, color, icon, sort_order)
SELECT '오네레이싱', '#3b82f6', '🏁', 2
WHERE NOT EXISTS (SELECT 1 FROM md_categories WHERE name = '오네레이싱');

-- ─── 2. 기존 품목의 category_id를 brand 기반으로 재할당 ─────────────────────────
UPDATE md_items
SET category_id = (SELECT id FROM md_categories WHERE name = '슈퍼레이스' LIMIT 1)
WHERE brand = 'SR';

UPDATE md_items
SET category_id = (SELECT id FROM md_categories WHERE name = '오네레이싱' LIMIT 1)
WHERE brand = 'ONE';

-- ─── 3. 기존 카테고리 삭제 (더 이상 사용 안 함) ────────────────────────────────────
DELETE FROM md_categories
WHERE name IN ('의류', '액세서리', '스티커/인쇄물', '기타');

-- ============================================
-- 완료! 검증:
-- SELECT * FROM md_categories ORDER BY sort_order;
-- → 슈퍼레이스, 오네레이싱 2개만 존재해야 함
-- SELECT name, brand, category_id FROM md_items;
-- → brand별로 올바른 category_id 매핑 확인
-- ============================================
