-- =====================================================
-- SR STUDIO - SNS ANALYTICS V2 - 신규 테이블 5개
-- Supabase SQL Editor에서 실행
-- =====================================================

-- 10. SNS CHANNELS (등록된 YouTube 채널)
create table if not exists sns_channels (
  id          bigint generated always as identity primary key,
  platform    text not null default 'youtube'
              check (platform in ('youtube', 'instagram')),
  channel_id  text not null,
  name        text not null,
  thumbnail   text,
  handle      text,
  is_own      boolean not null default false,
  created_at  timestamptz default now(),
  unique(platform, channel_id)
);

-- 11. SNS CHANNEL STATS (일별 통계 스냅샷)
create table if not exists sns_channel_stats (
  id              bigint generated always as identity primary key,
  channel_id      text not null,
  platform        text not null default 'youtube',
  subscribers     bigint,
  total_views     bigint,
  video_count     integer,
  fetched_date    date not null default current_date,
  created_at      timestamptz default now(),
  unique(channel_id, platform, fetched_date)
);

-- 12. SNS VIDEOS (캐시된 영상 데이터)
create table if not exists sns_videos (
  id              bigint generated always as identity primary key,
  channel_id      text not null,
  platform        text not null default 'youtube',
  video_id        text not null,
  title           text not null,
  thumbnail       text,
  description     text,
  views           bigint default 0,
  likes           bigint default 0,
  comments        bigint default 0,
  published_at    timestamptz,
  created_at      timestamptz default now(),
  unique(platform, video_id)
);

-- 13. SNS MONITORING KEYWORDS (업계 모니터링 키워드)
create table if not exists sns_monitoring_keywords (
  id          bigint generated always as identity primary key,
  keyword     text not null,
  platform    text not null default 'youtube'
              check (platform in ('youtube', 'instagram')),
  created_at  timestamptz default now(),
  unique(keyword, platform)
);

-- 14. SNS AI INSIGHTS (AI 인사이트 캐시)
create table if not exists sns_ai_insights (
  id              bigint generated always as identity primary key,
  insight_text    text not null,
  analyzed_count  integer,
  generated_at    timestamptz default now()
);

-- RLS 설정
alter table sns_channels            enable row level security;
alter table sns_channel_stats       enable row level security;
alter table sns_videos              enable row level security;
alter table sns_monitoring_keywords enable row level security;
alter table sns_ai_insights         enable row level security;

create policy "allow_all" on sns_channels            for all using (true) with check (true);
create policy "allow_all" on sns_channel_stats       for all using (true) with check (true);
create policy "allow_all" on sns_videos              for all using (true) with check (true);
create policy "allow_all" on sns_monitoring_keywords for all using (true) with check (true);
create policy "allow_all" on sns_ai_insights         for all using (true) with check (true);
