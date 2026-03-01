-- =====================================================
-- SR STUDIO v3 — KPI + 회의록 테이블
-- Supabase SQL Editor에서 실행
-- =====================================================

-- =====================================================
-- 1. KPI 관리
-- =====================================================

create table if not exists kpi_items (
  id            bigint generated always as identity primary key,
  title         text not null,
  category      text not null default 'sns_growth'
                check (category in ('sns_growth','engagement','content','sponsorship','event')),
  target_value  numeric not null default 0,
  current_value numeric not null default 0,
  unit          text not null default '',
  period_start  date not null,
  period_end    date not null,
  status        text not null default 'active'
                check (status in ('active','completed','paused')),
  notes         text,
  created_by    bigint references members(id) on delete set null,
  created_at    timestamptz default now(),
  updated_at    timestamptz default now()
);

create table if not exists kpi_history (
  id            bigint generated always as identity primary key,
  kpi_id        bigint references kpi_items(id) on delete cascade,
  value         numeric not null,
  recorded_date date not null default current_date,
  created_at    timestamptz default now(),
  unique(kpi_id, recorded_date)
);

alter table kpi_items enable row level security;
alter table kpi_history enable row level security;
create policy "allow_all" on kpi_items for all using (true) with check (true);
create policy "allow_all" on kpi_history for all using (true) with check (true);

-- =====================================================
-- 2. 회의록
-- =====================================================

create table if not exists meetings (
  id            bigint generated always as identity primary key,
  title         text not null,
  date          date not null,
  start_time    time,
  end_time      time,
  location      text,
  calendar_event_id text references calendar_events(id) on delete set null,
  status        text not null default 'scheduled'
                check (status in ('scheduled','in_progress','completed')),
  created_at    timestamptz default now(),
  updated_at    timestamptz default now()
);

create table if not exists meeting_attendees (
  id            bigint generated always as identity primary key,
  meeting_id    bigint references meetings(id) on delete cascade,
  member_id     bigint references members(id) on delete cascade,
  unique(meeting_id, member_id)
);

create table if not exists meeting_agendas (
  id            bigint generated always as identity primary key,
  meeting_id    bigint references meetings(id) on delete cascade,
  title         text not null,
  description   text,
  sort_order    integer not null default 0
);

create table if not exists meeting_minutes (
  id            bigint generated always as identity primary key,
  meeting_id    bigint references meetings(id) on delete cascade,
  content       text not null default '',
  ai_summary    text,
  updated_at    timestamptz default now(),
  unique(meeting_id)
);

create table if not exists meeting_action_items (
  id            bigint generated always as identity primary key,
  meeting_id    bigint references meetings(id) on delete cascade,
  title         text not null,
  assignee      bigint references members(id) on delete set null,
  due_date      date,
  status        text not null default 'pending'
                check (status in ('pending','done')),
  task_id       bigint references tasks(id) on delete set null
);

alter table meetings enable row level security;
alter table meeting_attendees enable row level security;
alter table meeting_agendas enable row level security;
alter table meeting_minutes enable row level security;
alter table meeting_action_items enable row level security;

create policy "allow_all" on meetings for all using (true) with check (true);
create policy "allow_all" on meeting_attendees for all using (true) with check (true);
create policy "allow_all" on meeting_agendas for all using (true) with check (true);
create policy "allow_all" on meeting_minutes for all using (true) with check (true);
create policy "allow_all" on meeting_action_items for all using (true) with check (true);

-- =====================================================
-- 시드 데이터
-- =====================================================

-- created_by는 실제 members 테이블의 첫 번째 멤버 ID를 사용
insert into kpi_items (title, category, target_value, current_value, unit, period_start, period_end, notes, created_by) values
  ('유튜브 구독자 15만 달성', 'sns_growth', 150000, 128000, '명', '2026-01-01', '2026-06-30', '2026 상반기 목표', (select id from members order by id limit 1)),
  ('인스타그램 팔로워 10만 달성', 'sns_growth', 100000, 85000, '명', '2026-01-01', '2026-06-30', '2026 상반기 목표', (select id from members order by id limit 1)),
  ('월 평균 인게이지먼트 5%', 'engagement', 5.0, 4.2, '%', '2026-01-01', '2026-12-31', '전 채널 평균', (select id from members order by id limit 1 offset 1)),
  ('월 콘텐츠 20개 이상 게시', 'content', 20, 14, '개', '2026-03-01', '2026-03-31', '유튜브+인스타+틱톡 합산', (select id from members order by id limit 1 offset 2)),
  ('시즌 개막전 티켓 판매율 90%', 'event', 90, 80, '%', '2026-02-01', '2026-04-05', '온라인 판매 기준', (select id from members order by id limit 1)),
  ('시즌 스폰서 계약 5건', 'sponsorship', 5, 3, '건', '2026-01-01', '2026-04-30', '신규 스폰서 계약', (select id from members order by id limit 1));

insert into meetings (title, date, start_time, end_time, location, status) values
  ('마케팅 주간 회의', '2026-03-02', '10:00', '11:00', '회의실 A', 'completed'),
  ('시즌 개막전 D-30 미팅', '2026-03-05', '14:00', '15:30', '회의실 B', 'scheduled');
