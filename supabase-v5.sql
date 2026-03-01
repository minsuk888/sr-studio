-- SR Studio v5 마이그레이션
-- 1. YouTube API 쿼터 최적화: uploads_playlist_id
-- 2. 태그 분석: tags 컬럼
-- 3. 세부 안건: parent_id
-- 4. 댓글 수집: sns_comments 테이블

-- 채널에 uploads playlist ID 저장
ALTER TABLE sns_channels ADD COLUMN IF NOT EXISTS uploads_playlist_id text;

-- 비디오에 태그 저장
ALTER TABLE sns_videos ADD COLUMN IF NOT EXISTS tags text[];

-- 안건 세부 항목 (parent-child 관계)
ALTER TABLE meeting_agendas ADD COLUMN IF NOT EXISTS parent_id bigint
  REFERENCES meeting_agendas(id) ON DELETE CASCADE;

-- 댓글 수집 테이블
CREATE TABLE IF NOT EXISTS sns_comments (
  id            bigint generated always as identity primary key,
  video_id      text not null,
  channel_id    text not null,
  author        text,
  text          text not null,
  like_count    integer default 0,
  published_at  timestamptz,
  sentiment     text check (sentiment in ('positive', 'neutral', 'negative')),
  created_at    timestamptz default now()
);

CREATE INDEX IF NOT EXISTS idx_sns_comments_video ON sns_comments(video_id);
CREATE INDEX IF NOT EXISTS idx_sns_comments_channel ON sns_comments(channel_id);

ALTER TABLE sns_comments ENABLE ROW LEVEL SECURITY;
CREATE POLICY "allow_all_comments" ON sns_comments FOR ALL USING (true) WITH CHECK (true);
