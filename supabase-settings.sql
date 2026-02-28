-- =====================================================
-- SR STUDIO - APP SETTINGS (비밀번호 보호 등)
-- Supabase SQL Editor에서 실행
-- =====================================================

create table if not exists app_settings (
  key    text primary key,
  value  text not null
);

alter table app_settings enable row level security;
create policy "allow_all" on app_settings for all using (true) with check (true);

-- 초기 비밀번호: 7889
insert into app_settings (key, value) values ('password', '7889')
on conflict (key) do nothing;
