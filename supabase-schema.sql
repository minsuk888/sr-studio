-- =====================================================
-- SR STUDIO - SUPABASE SCHEMA + SEED DATA
-- =====================================================

-- 1. MEMBERS
create table if not exists members (
  id          bigint generated always as identity primary key,
  name        text not null,
  role        text not null,
  avatar      text not null default '👤',
  email       text,
  created_at  timestamptz default now()
);

-- 2. TASKS
create table if not exists tasks (
  id          bigint generated always as identity primary key,
  title       text not null,
  assignee    bigint references members(id) on delete set null,
  status      text not null default 'todo'
              check (status in ('todo', 'in-progress', 'done')),
  priority    text not null default 'medium'
              check (priority in ('high', 'medium', 'low')),
  progress    integer not null default 0
              check (progress >= 0 and progress <= 100),
  deadline    date,
  memo        text,
  created_at  timestamptz default now()
);

-- 3. CALENDAR EVENTS
create table if not exists calendar_events (
  id          text primary key default ('evt-' || gen_random_uuid()::text),
  title       text not null,
  date        date not null,
  type        text not null default 'meeting'
              check (type in ('meeting', 'event')),
  color       text default '#6366f1',
  created_at  timestamptz default now()
);

-- 4. SNS OVERVIEW
create table if not exists sns_overview (
  platform    text primary key,
  subscribers text,
  total_views text,
  engagement  text,
  growth      text,
  icon        text,
  color       text
);

-- 5. SNS GROWTH
create table if not exists sns_growth (
  id          bigint generated always as identity primary key,
  month       text not null,
  youtube     integer,
  instagram   integer,
  tiktok      integer
);

-- 6. SNS ENGAGEMENT
create table if not exists sns_engagement (
  id          bigint generated always as identity primary key,
  month       text not null,
  youtube     numeric(5,2),
  instagram   numeric(5,2),
  tiktok      numeric(5,2)
);

-- 7. RECENT CONTENTS
create table if not exists recent_contents (
  id          bigint generated always as identity primary key,
  platform    text not null,
  title       text not null,
  views       text,
  likes       text,
  date        date,
  thumbnail   text
);

-- 8. AI INSIGHTS
create table if not exists ai_insights (
  id          bigint generated always as identity primary key,
  type        text not null,
  message     text not null,
  priority    text not null
              check (priority in ('high', 'medium', 'low'))
);

-- 9. NEWS ARTICLES
create table if not exists news_articles (
  id          bigint generated always as identity primary key,
  source      text not null
              check (source in ('naver', 'google')),
  title       text not null,
  publisher   text,
  reporter    text,
  date        date,
  summary     text,
  url         text,
  created_at  timestamptz default now()
);

-- =====================================================
-- RLS POLICIES
-- =====================================================
alter table members         enable row level security;
alter table tasks           enable row level security;
alter table calendar_events enable row level security;
alter table sns_overview    enable row level security;
alter table sns_growth      enable row level security;
alter table sns_engagement  enable row level security;
alter table recent_contents enable row level security;
alter table ai_insights     enable row level security;
alter table news_articles   enable row level security;

create policy "allow_all" on members         for all using (true) with check (true);
create policy "allow_all" on tasks           for all using (true) with check (true);
create policy "allow_all" on calendar_events for all using (true) with check (true);
create policy "allow_all" on sns_overview    for all using (true) with check (true);
create policy "allow_all" on sns_growth      for all using (true) with check (true);
create policy "allow_all" on sns_engagement  for all using (true) with check (true);
create policy "allow_all" on recent_contents for all using (true) with check (true);
create policy "allow_all" on ai_insights     for all using (true) with check (true);
create policy "allow_all" on news_articles   for all using (true) with check (true);

-- =====================================================
-- SEED DATA
-- =====================================================

insert into members (name, role, avatar, email) values
  ('김민수', '마케팅 팀장', '🧑‍💼', 'minsu@sr-studio.co.kr'),
  ('이서연', 'SNS 매니저', '👩‍💻', 'seoyeon@sr-studio.co.kr'),
  ('박준혁', '콘텐츠 기획', '🧑‍🎨', 'junhyuk@sr-studio.co.kr'),
  ('최수진', '영상 제작', '🎬', 'sujin@sr-studio.co.kr'),
  ('정다은', '퍼포먼스 마케터', '📊', 'daeun@sr-studio.co.kr'),
  ('한승우', 'PR 담당', '📰', 'seungwoo@sr-studio.co.kr');

insert into tasks (title, assignee, status, priority, progress, deadline, memo) values
  ('2026 시즌 티저 영상 제작',    1, 'in-progress', 'high',   65, '2026-03-10', '30초 티저 + 15초 숏폼 버전 동시 제작'),
  ('인스타그램 릴스 캠페인 기획', 2, 'in-progress', 'high',   40, '2026-03-05', '#슈퍼레이스2026 해시태그 챌린지'),
  ('파트너 스폰서 미디어킷 업데이트', 3, 'todo', 'medium', 10, '2026-03-15', '2025 시즌 결산 데이터 반영'),
  ('개막전 프로모션 영상 편집',    4, 'todo',        'high',    0, '2026-03-20', '드론 촬영본 + 인터뷰 편집'),
  ('GA4 전환 추적 세팅',          5, 'done',        'medium', 100, '2026-02-25', '티켓 구매 퍼널 전환 이벤트 설정 완료'),
  ('보도자료 배포 - 시즌 라인업', 6, 'in-progress', 'medium',  80, '2026-03-01', '주요 매체 20곳 + 모터스포츠 전문지'),
  ('유튜브 쇼츠 시리즈 촬영',     4, 'todo',        'low',     0, '2026-03-25', '드라이버 인터뷰 숏폼 5편'),
  ('틱톡 인플루언서 협업 계약',    2, 'in-progress', 'high',   55, '2026-03-08', '자동차/라이프스타일 크리에이터 3명 선정'),
  ('Q1 마케팅 리포트 작성',        5, 'todo',        'low',     0, '2026-03-31', '채널별 KPI 달성률 정리'),
  ('팬 이벤트 SNS 홍보물 디자인', 3, 'done',        'medium', 100, '2026-02-20', '인스타 피드 + 스토리 템플릿');

insert into calendar_events (id, title, date, type, color) values
  ('evt-1', '마케팅 주간 회의',      '2026-03-02', 'meeting', '#6366f1'),
  ('evt-2', '시즌 개막전 D-30 미팅', '2026-03-05', 'meeting', '#6366f1'),
  ('evt-3', '스폰서 미팅 (CJ)',       '2026-03-10', 'meeting', '#6366f1'),
  ('evt-4', '영진공 촬영 허가 미팅', '2026-03-12', 'meeting', '#8b5cf6'),
  ('evt-5', '팬미팅 이벤트',         '2026-03-15', 'event',   '#ec4899'),
  ('evt-6', '시즌 개막전',           '2026-04-05', 'event',   '#ef4444'),
  ('evt-7', '마케팅 월간 리뷰',      '2026-03-28', 'meeting', '#6366f1'),
  ('evt-8', '인플루언서 촬영일',     '2026-03-18', 'event',   '#f59e0b');

insert into sns_overview (platform, subscribers, total_views, engagement, growth, icon, color) values
  ('YouTube',  '12.8만', '2,340만', '4.2%', '+12.5%', 'youtube',   '#FF0000'),
  ('Instagram','8.5만',  '1,850만', '5.8%', '+8.3%',  'instagram', '#E4405F'),
  ('TikTok',   '5.2만',  '3,120만', '7.1%', '+25.6%', 'tiktok',    '#000000');

insert into sns_growth (month, youtube, instagram, tiktok) values
  ('2025.09', 98000,  65000, 22000),
  ('2025.10', 102000, 68000, 28000),
  ('2025.11', 108000, 72000, 33000),
  ('2025.12', 112000, 75000, 38000),
  ('2026.01', 120000, 80000, 45000),
  ('2026.02', 128000, 85000, 52000);

insert into sns_engagement (month, youtube, instagram, tiktok) values
  ('2025.09', 3.5, 4.8, 5.2),
  ('2025.10', 3.8, 5.0, 5.8),
  ('2025.11', 3.9, 5.2, 6.1),
  ('2025.12', 4.0, 5.5, 6.5),
  ('2026.01', 4.1, 5.6, 6.8),
  ('2026.02', 4.2, 5.8, 7.1);

insert into recent_contents (platform, title, views, likes, date, thumbnail) values
  ('YouTube',   '2026 슈퍼레이스 시즌 프리뷰 | 올해 달라진 점은?', '45.2만', '3,200',  '2026-02-25', '🎬'),
  ('YouTube',   '[VLOG] 드라이버들의 오프시즌 훈련 현장',           '28.7만', '2,100',  '2026-02-20', '🏎️'),
  ('Instagram', '2026 신규 머신 공개 🔥',                          '12.3만', '8,500',  '2026-02-24', '📸'),
  ('Instagram', '팬 이벤트 현장 스케치',                            '8.9만',  '6,200',  '2026-02-22', '🎉'),
  ('TikTok',    '슈퍼레이스 속도감 체험 #shorts',                    '89.5만', '52,000', '2026-02-26', '⚡'),
  ('TikTok',    '드라이버 챌린지 | 누가 더 빠를까?',                 '67.3만', '41,200', '2026-02-23', '🏁');

insert into ai_insights (type, message, priority) values
  ('trend',    '틱톡의 최근 숏폼 반응률이 인스타그램 대비 22% 높습니다. 숏폼 콘텐츠 비중을 현재 30%에서 45%로 늘리는 것을 권장합니다.', 'high'),
  ('content',  'VLOG 형식의 비하인드 콘텐츠가 평균 대비 1.8배 높은 인게이지먼트를 기록 중입니다. 드라이버 일상 콘텐츠를 주 2회로 늘려보세요.', 'medium'),
  ('timing',   '유튜브 업로드 최적 시간대: 화/목 오후 6-8시. 현재 업로드 시간 대비 예상 조회수 +15% 효과를 기대할 수 있습니다.', 'medium'),
  ('audience', '25-34세 남성 시청자 비율이 전월 대비 8% 증가했습니다. 해당 타겟층에 맞는 테크니컬 분석 콘텐츠를 기획해 보세요.', 'low');

insert into news_articles (source, title, publisher, reporter, date, summary) values
  ('naver',  '2026 CJ대한통운 슈퍼레이스, 역대 최대 규모 시즌 예고', '스포츠조선', '김태훈 기자', '2026-02-28', '올해 슈퍼레이스 챔피언십이 역대 최대 규모의 라인업과 함께 시즌을 준비하고 있다.'),
  ('naver',  '슈퍼레이스 개막전 티켓, 오픈 3일 만에 80% 판매 완료', '한국경제', '이수민 기자', '2026-02-27', '2026 시즌 개막전 티켓이 폭발적인 관심 속에 빠르게 소진되고 있다.'),
  ('google', 'Korean Super Race 2026 season set for international expansion', 'Motorsport.com', 'James Mitchell', '2026-02-27', 'The championship is exploring partnerships with international racing series.'),
  ('naver',  '모터스포츠 팬 문화, MZ세대가 이끈다', '중앙일보', '박서준 기자', '2026-02-26', 'SNS와 숏폼 콘텐츠를 통해 모터스포츠에 유입되는 젊은 팬층이 크게 늘고 있다.'),
  ('google', 'Super Race Championship attracts record sponsorship deals for 2026', 'Racing News 365', 'Sarah Chen', '2026-02-26', 'Major corporate sponsors line up for the upcoming season.'),
  ('naver',  '슈퍼레이스, 친환경 레이싱 시대 연다…하이브리드 클래스 신설', '동아일보', '정현우 기자', '2026-02-25', '2026 시즌부터 하이브리드 전용 클래스가 신설되어 친환경 모터스포츠 시대를 열 예정이다.'),
  ('naver',  '슈퍼레이스 유튜브, 구독자 13만 돌파 눈앞', '디지털타임스', '최예린 기자', '2026-02-24', '디지털 콘텐츠 전략이 효과를 거두며 유튜브 채널이 빠르게 성장 중이다.'),
  ('google', 'Motorsport marketing trends: How Korean racing leverages social media', 'The Drum', 'Alex Kim', '2026-02-24', 'An analysis of how Korean motorsport brands are winning on social platforms.'),
  ('naver',  '2026 슈퍼레이스, 전 경기 실시간 스트리밍 확정', '매일경제', '오승환 기자', '2026-02-23', '올해 모든 경기가 유튜브와 네이버 스포츠를 통해 실시간 중계될 예정이다.'),
  ('naver',  '국내 모터스포츠 마케팅, 디지털 전환 가속화', '조선비즈', '강민호 기자', '2026-02-22', '데이터 기반 마케팅과 디지털 전환이 모터스포츠 업계 전반으로 확산되고 있다.');
