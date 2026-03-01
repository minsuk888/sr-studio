-- =====================================================
-- SR STUDIO v4 — Calendar Description + SNS Duration + Meetings Live Mode
-- Supabase SQL Editor에서 실행
-- =====================================================

-- Mod 2: 캘린더 이벤트 메모/설명 필드
ALTER TABLE calendar_events ADD COLUMN IF NOT EXISTS description text;

-- Mod 3: 영상 duration 저장
ALTER TABLE sns_videos ADD COLUMN IF NOT EXISTS duration text;

-- Mod 4: 회의 안건 라이브 모드 확장
ALTER TABLE meeting_agendas ADD COLUMN IF NOT EXISTS notes text;
ALTER TABLE meeting_agendas ADD COLUMN IF NOT EXISTS duration_minutes integer DEFAULT 0;
ALTER TABLE meeting_agendas ADD COLUMN IF NOT EXISTS status text NOT NULL DEFAULT 'pending';

-- 안건 상태 체크 제약조건
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'meeting_agendas_status_check'
  ) THEN
    ALTER TABLE meeting_agendas ADD CONSTRAINT meeting_agendas_status_check
      CHECK (status IN ('pending', 'discussing', 'done'));
  END IF;
END $$;

ALTER TABLE meeting_agendas ADD COLUMN IF NOT EXISTS started_at timestamptz;
ALTER TABLE meeting_agendas ADD COLUMN IF NOT EXISTS completed_at timestamptz;

-- Mod 4: 회의 실제 시간 추적
ALTER TABLE meetings ADD COLUMN IF NOT EXISTS actual_start_time timestamptz;
ALTER TABLE meetings ADD COLUMN IF NOT EXISTS actual_end_time timestamptz;
