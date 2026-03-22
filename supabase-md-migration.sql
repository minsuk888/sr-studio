-- ============================================
-- MD 재고/판매 관리 시스템 - Supabase Migration
-- 실행: Supabase Dashboard > SQL Editor
-- ============================================

-- 1. 카테고리 테이블
CREATE TABLE IF NOT EXISTS md_categories (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name        TEXT NOT NULL UNIQUE,
  color       TEXT DEFAULT '#6b7280',
  icon        TEXT DEFAULT 'Package',
  sort_order  INT DEFAULT 0,
  created_at  TIMESTAMPTZ DEFAULT now()
);

-- 기본 카테고리
INSERT INTO md_categories (name, color, icon, sort_order) VALUES
  ('의류', '#3b82f6', 'Shirt', 0),
  ('액세서리', '#f59e0b', 'Watch', 1),
  ('스티커/인쇄물', '#10b981', 'Sticker', 2),
  ('기타', '#8b5cf6', 'Package', 3)
ON CONFLICT (name) DO NOTHING;

-- 2. 품목 테이블
CREATE TABLE IF NOT EXISTS md_items (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name            TEXT NOT NULL,
  category_id     UUID REFERENCES md_categories(id) ON DELETE SET NULL,
  description     TEXT,
  image_url       TEXT,
  production_cost INT DEFAULT 0,
  selling_price   INT DEFAULT 0,
  initial_stock   INT DEFAULT 0,
  initial_jaso    INT DEFAULT 0,
  is_active       BOOLEAN DEFAULT true,
  created_by      TEXT,
  created_at      TIMESTAMPTZ DEFAULT now(),
  updated_at      TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_md_items_category ON md_items(category_id);
CREATE INDEX IF NOT EXISTS idx_md_items_active ON md_items(is_active);

-- 3. 재고 변동 이력
CREATE TABLE IF NOT EXISTS md_stock_logs (
  id                UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  item_id           UUID NOT NULL REFERENCES md_items(id) ON DELETE CASCADE,
  log_type          TEXT NOT NULL CHECK (log_type IN ('inbound', 'sale', 'jaso')),
  quantity          INT NOT NULL CHECK (quantity > 0),
  unit_price        INT DEFAULT 0,
  log_date          DATE NOT NULL DEFAULT CURRENT_DATE,
  jaso_destination  TEXT,
  jaso_purpose      TEXT CHECK (jaso_purpose IS NULL OR jaso_purpose IN ('event', 'sponsor', 'team', 'other')),
  memo              TEXT,
  created_by        TEXT,
  created_at        TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_md_stock_logs_item ON md_stock_logs(item_id);
CREATE INDEX IF NOT EXISTS idx_md_stock_logs_type ON md_stock_logs(log_type);
CREATE INDEX IF NOT EXISTS idx_md_stock_logs_date ON md_stock_logs(log_date);

-- 4. 재고 요약 뷰 (재고/자소 분리 계산)
CREATE OR REPLACE VIEW md_stock_summary AS
SELECT
  i.id AS item_id,
  i.name,
  i.category_id,
  i.production_cost,
  i.selling_price,
  i.initial_stock,
  i.initial_jaso,
  i.is_active,
  i.image_url,
  COALESCE(SUM(CASE WHEN l.log_type = 'inbound' THEN l.quantity ELSE 0 END), 0)::INT AS total_inbound,
  COALESCE(SUM(CASE WHEN l.log_type = 'sale' THEN l.quantity ELSE 0 END), 0)::INT AS total_sold,
  COALESCE(SUM(CASE WHEN l.log_type = 'jaso' THEN l.quantity ELSE 0 END), 0)::INT AS total_jaso,
  (i.initial_stock
    + COALESCE(SUM(CASE WHEN l.log_type = 'inbound' THEN l.quantity ELSE 0 END), 0)
    - COALESCE(SUM(CASE WHEN l.log_type = 'sale' THEN l.quantity ELSE 0 END), 0)
  )::INT AS current_stock,
  (i.initial_jaso
    - COALESCE(SUM(CASE WHEN l.log_type = 'jaso' THEN l.quantity ELSE 0 END), 0)
  )::INT AS current_jaso,
  COALESCE(SUM(CASE WHEN l.log_type = 'sale' THEN l.quantity * l.unit_price ELSE 0 END), 0)::INT AS total_revenue,
  (COALESCE(SUM(CASE WHEN l.log_type = 'sale' THEN l.quantity ELSE 0 END), 0) * i.production_cost)::INT AS total_cost,
  (COALESCE(SUM(CASE WHEN l.log_type = 'sale' THEN l.quantity * l.unit_price ELSE 0 END), 0)
    - COALESCE(SUM(CASE WHEN l.log_type = 'sale' THEN l.quantity ELSE 0 END), 0) * i.production_cost
  )::INT AS total_profit
FROM md_items i
LEFT JOIN md_stock_logs l ON l.item_id = i.id
GROUP BY i.id, i.name, i.category_id, i.production_cost, i.selling_price, i.initial_stock, i.initial_jaso, i.is_active, i.image_url;

-- 5. RLS 정책
ALTER TABLE md_categories ENABLE ROW LEVEL SECURITY;
CREATE POLICY "md_categories_all" ON md_categories FOR ALL USING (true) WITH CHECK (true);

ALTER TABLE md_items ENABLE ROW LEVEL SECURITY;
CREATE POLICY "md_items_all" ON md_items FOR ALL USING (true) WITH CHECK (true);

ALTER TABLE md_stock_logs ENABLE ROW LEVEL SECURITY;
CREATE POLICY "md_stock_logs_all" ON md_stock_logs FOR ALL USING (true) WITH CHECK (true);
