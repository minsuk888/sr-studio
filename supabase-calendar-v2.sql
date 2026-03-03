-- 캘린더 이벤트: end_date 추가 + type 10종 확장
ALTER TABLE calendar_events ADD COLUMN IF NOT EXISTS end_date date;

-- 기존 데이터: end_date = date (단일 날짜)
UPDATE calendar_events SET end_date = date WHERE end_date IS NULL;

-- type 제약조건 교체 (기존 check 삭제 후 새로 추가)
ALTER TABLE calendar_events DROP CONSTRAINT IF EXISTS calendar_events_type_check;
ALTER TABLE calendar_events ADD CONSTRAINT calendar_events_type_check
  CHECK (type IN (
    'meeting',    -- 미팅
    'event',      -- 이벤트
    'leave',      -- 연차
    'business',   -- 출장
    'deadline',   -- 마감일
    'workshop',   -- 워크숍
    'review',     -- 리뷰
    'birthday',   -- 생일
    'holiday',    -- 공휴일
    'other'       -- 기타
  ));
