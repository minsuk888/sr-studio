-- =====================================================
-- SR STUDIO v8 - SECURITY UPDATE: RLS 정책 강화
-- =====================================================
-- 실행 방법: Supabase Dashboard > SQL Editor에서 실행
-- 주의: 반드시 SUPABASE_SERVICE_ROLE_KEY를 Vercel 환경변수에
--       설정한 후 실행하세요!
-- =====================================================

-- =====================================================
-- 1단계: 기존 allow_all 정책 삭제
-- =====================================================

-- 기본 테이블
DROP POLICY IF EXISTS "allow_all" ON members;
DROP POLICY IF EXISTS "allow_all" ON tasks;
DROP POLICY IF EXISTS "allow_all" ON calendar_events;
DROP POLICY IF EXISTS "allow_all" ON sns_overview;
DROP POLICY IF EXISTS "allow_all" ON sns_growth;
DROP POLICY IF EXISTS "allow_all" ON sns_engagement;
DROP POLICY IF EXISTS "allow_all" ON recent_contents;
DROP POLICY IF EXISTS "allow_all" ON ai_insights;
DROP POLICY IF EXISTS "allow_all" ON news_articles;
DROP POLICY IF EXISTS "allow_all" ON app_settings;

-- SNS v2 테이블
DROP POLICY IF EXISTS "allow_all" ON sns_channels;
DROP POLICY IF EXISTS "allow_all" ON sns_channel_stats;
DROP POLICY IF EXISTS "allow_all" ON sns_videos;
DROP POLICY IF EXISTS "allow_all" ON sns_comments;
DROP POLICY IF EXISTS "allow_all" ON sns_monitoring_keywords;
DROP POLICY IF EXISTS "allow_all" ON sns_ai_insights;

-- KPI 테이블
DROP POLICY IF EXISTS "allow_all" ON kpi_items;
DROP POLICY IF EXISTS "allow_all" ON kpi_history;

-- Meetings 테이블
DROP POLICY IF EXISTS "allow_all" ON meetings;
DROP POLICY IF EXISTS "allow_all" ON meeting_attendees;
DROP POLICY IF EXISTS "allow_all" ON meeting_agendas;
DROP POLICY IF EXISTS "allow_all" ON meeting_minutes;
DROP POLICY IF EXISTS "allow_all" ON meeting_action_items;


-- =====================================================
-- 2단계: app_settings — anon 접근 완전 차단
-- 비밀번호 등 민감정보 보호
-- 서버사이드 API route에서 service_role key로만 접근
-- (service_role은 RLS를 자동 우회)
-- =====================================================

-- anon 롤에 대한 정책이 없으므로 자동 차단됨
-- (RLS가 활성화된 상태에서 정책이 없으면 접근 불가)


-- =====================================================
-- 3단계: 운영 테이블 — 세분화된 권한 설정
-- =====================================================

-- ▸ members: 읽기/추가/수정 허용, 삭제 제한
CREATE POLICY "members_select" ON members
  FOR SELECT TO anon USING (true);
CREATE POLICY "members_insert" ON members
  FOR INSERT TO anon WITH CHECK (true);
CREATE POLICY "members_update" ON members
  FOR UPDATE TO anon USING (true) WITH CHECK (true);

-- ▸ tasks: 전체 CRUD 허용 (업무 삭제 기능 필요)
CREATE POLICY "tasks_select" ON tasks
  FOR SELECT TO anon USING (true);
CREATE POLICY "tasks_insert" ON tasks
  FOR INSERT TO anon WITH CHECK (true);
CREATE POLICY "tasks_update" ON tasks
  FOR UPDATE TO anon USING (true) WITH CHECK (true);
CREATE POLICY "tasks_delete" ON tasks
  FOR DELETE TO anon USING (true);

-- ▸ calendar_events: 전체 CRUD 허용
CREATE POLICY "calendar_select" ON calendar_events
  FOR SELECT TO anon USING (true);
CREATE POLICY "calendar_insert" ON calendar_events
  FOR INSERT TO anon WITH CHECK (true);
CREATE POLICY "calendar_update" ON calendar_events
  FOR UPDATE TO anon USING (true) WITH CHECK (true);
CREATE POLICY "calendar_delete" ON calendar_events
  FOR DELETE TO anon USING (true);

-- ▸ sns_overview: 읽기 전용 (시드 데이터)
CREATE POLICY "sns_overview_select" ON sns_overview
  FOR SELECT TO anon USING (true);

-- ▸ sns_growth: 읽기 전용 (시드 데이터)
CREATE POLICY "sns_growth_select" ON sns_growth
  FOR SELECT TO anon USING (true);

-- ▸ sns_engagement: 읽기 전용 (시드 데이터)
CREATE POLICY "sns_engagement_select" ON sns_engagement
  FOR SELECT TO anon USING (true);

-- ▸ recent_contents: 읽기 전용
CREATE POLICY "recent_contents_select" ON recent_contents
  FOR SELECT TO anon USING (true);

-- ▸ ai_insights: 읽기 전용
CREATE POLICY "ai_insights_select" ON ai_insights
  FOR SELECT TO anon USING (true);

-- ▸ news_articles: 전체 CRUD (스크랩/삭제 기능 필요)
CREATE POLICY "news_select" ON news_articles
  FOR SELECT TO anon USING (true);
CREATE POLICY "news_insert" ON news_articles
  FOR INSERT TO anon WITH CHECK (true);
CREATE POLICY "news_update" ON news_articles
  FOR UPDATE TO anon USING (true) WITH CHECK (true);
CREATE POLICY "news_delete" ON news_articles
  FOR DELETE TO anon USING (true);


-- =====================================================
-- 4단계: SNS v2 테이블
-- =====================================================

-- ▸ sns_channels: 전체 CRUD (채널 관리)
CREATE POLICY "sns_channels_select" ON sns_channels
  FOR SELECT TO anon USING (true);
CREATE POLICY "sns_channels_insert" ON sns_channels
  FOR INSERT TO anon WITH CHECK (true);
CREATE POLICY "sns_channels_update" ON sns_channels
  FOR UPDATE TO anon USING (true) WITH CHECK (true);
CREATE POLICY "sns_channels_delete" ON sns_channels
  FOR DELETE TO anon USING (true);

-- ▸ sns_channel_stats: 읽기 + 쓰기 (API 수집)
CREATE POLICY "sns_stats_select" ON sns_channel_stats
  FOR SELECT TO anon USING (true);
CREATE POLICY "sns_stats_insert" ON sns_channel_stats
  FOR INSERT TO anon WITH CHECK (true);

-- ▸ sns_videos: 읽기 + 쓰기 + 수정 (API 수집)
CREATE POLICY "sns_videos_select" ON sns_videos
  FOR SELECT TO anon USING (true);
CREATE POLICY "sns_videos_insert" ON sns_videos
  FOR INSERT TO anon WITH CHECK (true);
CREATE POLICY "sns_videos_update" ON sns_videos
  FOR UPDATE TO anon USING (true) WITH CHECK (true);

-- ▸ sns_comments: 읽기 + 쓰기 (API 수집)
CREATE POLICY "sns_comments_select" ON sns_comments
  FOR SELECT TO anon USING (true);
CREATE POLICY "sns_comments_insert" ON sns_comments
  FOR INSERT TO anon WITH CHECK (true);

-- ▸ sns_monitoring_keywords: 전체 CRUD
CREATE POLICY "sns_keywords_select" ON sns_monitoring_keywords
  FOR SELECT TO anon USING (true);
CREATE POLICY "sns_keywords_insert" ON sns_monitoring_keywords
  FOR INSERT TO anon WITH CHECK (true);
CREATE POLICY "sns_keywords_update" ON sns_monitoring_keywords
  FOR UPDATE TO anon USING (true) WITH CHECK (true);
CREATE POLICY "sns_keywords_delete" ON sns_monitoring_keywords
  FOR DELETE TO anon USING (true);

-- ▸ sns_ai_insights: 읽기 + 쓰기 + 수정
CREATE POLICY "sns_ai_select" ON sns_ai_insights
  FOR SELECT TO anon USING (true);
CREATE POLICY "sns_ai_insert" ON sns_ai_insights
  FOR INSERT TO anon WITH CHECK (true);
CREATE POLICY "sns_ai_update" ON sns_ai_insights
  FOR UPDATE TO anon USING (true) WITH CHECK (true);


-- =====================================================
-- 5단계: KPI 테이블
-- =====================================================

CREATE POLICY "kpi_items_select" ON kpi_items
  FOR SELECT TO anon USING (true);
CREATE POLICY "kpi_items_insert" ON kpi_items
  FOR INSERT TO anon WITH CHECK (true);
CREATE POLICY "kpi_items_update" ON kpi_items
  FOR UPDATE TO anon USING (true) WITH CHECK (true);
CREATE POLICY "kpi_items_delete" ON kpi_items
  FOR DELETE TO anon USING (true);

CREATE POLICY "kpi_history_select" ON kpi_history
  FOR SELECT TO anon USING (true);
CREATE POLICY "kpi_history_insert" ON kpi_history
  FOR INSERT TO anon WITH CHECK (true);


-- =====================================================
-- 6단계: Meetings 테이블
-- =====================================================

CREATE POLICY "meetings_select" ON meetings
  FOR SELECT TO anon USING (true);
CREATE POLICY "meetings_insert" ON meetings
  FOR INSERT TO anon WITH CHECK (true);
CREATE POLICY "meetings_update" ON meetings
  FOR UPDATE TO anon USING (true) WITH CHECK (true);
CREATE POLICY "meetings_delete" ON meetings
  FOR DELETE TO anon USING (true);

CREATE POLICY "attendees_select" ON meeting_attendees
  FOR SELECT TO anon USING (true);
CREATE POLICY "attendees_insert" ON meeting_attendees
  FOR INSERT TO anon WITH CHECK (true);
CREATE POLICY "attendees_update" ON meeting_attendees
  FOR UPDATE TO anon USING (true) WITH CHECK (true);
CREATE POLICY "attendees_delete" ON meeting_attendees
  FOR DELETE TO anon USING (true);

CREATE POLICY "agendas_select" ON meeting_agendas
  FOR SELECT TO anon USING (true);
CREATE POLICY "agendas_insert" ON meeting_agendas
  FOR INSERT TO anon WITH CHECK (true);
CREATE POLICY "agendas_update" ON meeting_agendas
  FOR UPDATE TO anon USING (true) WITH CHECK (true);
CREATE POLICY "agendas_delete" ON meeting_agendas
  FOR DELETE TO anon USING (true);

CREATE POLICY "minutes_select" ON meeting_minutes
  FOR SELECT TO anon USING (true);
CREATE POLICY "minutes_insert" ON meeting_minutes
  FOR INSERT TO anon WITH CHECK (true);
CREATE POLICY "minutes_update" ON meeting_minutes
  FOR UPDATE TO anon USING (true) WITH CHECK (true);
CREATE POLICY "minutes_delete" ON meeting_minutes
  FOR DELETE TO anon USING (true);

CREATE POLICY "action_items_select" ON meeting_action_items
  FOR SELECT TO anon USING (true);
CREATE POLICY "action_items_insert" ON meeting_action_items
  FOR INSERT TO anon WITH CHECK (true);
CREATE POLICY "action_items_update" ON meeting_action_items
  FOR UPDATE TO anon USING (true) WITH CHECK (true);
CREATE POLICY "action_items_delete" ON meeting_action_items
  FOR DELETE TO anon USING (true);


-- =====================================================
-- 완료!
-- =====================================================
-- 변경 요약:
-- 1. app_settings: anon 접근 완전 차단 (비밀번호 보호)
-- 2. 시드 데이터 테이블: 읽기 전용 (sns_overview 등)
-- 3. members: 삭제 불가 (읽기/추가/수정만)
-- 4. 운영 테이블: 필요한 CRUD만 허용
-- 5. service_role: RLS 자동 우회 (서버사이드 API)
-- =====================================================
