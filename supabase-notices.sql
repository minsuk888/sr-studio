-- 공지사항 게시판 테이블
CREATE TABLE IF NOT EXISTS notices (
  id          bigint generated always as identity primary key,
  title       text not null,
  content     text not null default '',
  is_pinned   boolean not null default false,
  is_active   boolean not null default true,
  author_name text default '',
  created_at  timestamptz default now(),
  updated_at  timestamptz default now()
);

ALTER TABLE notices ENABLE ROW LEVEL SECURITY;
CREATE POLICY "allow_all" ON notices FOR ALL USING (true) WITH CHECK (true);
