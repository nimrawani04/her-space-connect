drop view if exists public.public_profiles;
drop view if exists public.safety_alerts_public;
drop view if exists public.travel_requests_public;

-- ============ profiles: private preferences split out ============
create table public.profile_settings (
  user_id uuid primary key references auth.users(id) on delete cascade,
  theme_mode text,
  accent_color text,
  background_style text,
  calendar_overlay jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
grant select, insert, update, delete on public.profile_settings to authenticated;
grant all on public.profile_settings to service_role;
alter table public.profile_settings enable row level security;
create policy "Users manage their own settings"
  on public.profile_settings for all to authenticated
  using (auth.uid() = user_id) with check (auth.uid() = user_id);
create trigger touch_profile_settings before update on public.profile_settings
  for each row execute function public.touch_updated_at();

insert into public.profile_settings (user_id, theme_mode, accent_color, background_style, calendar_overlay)
  select id, theme_mode, accent_color, background_style, calendar_overlay from public.profiles;

alter table public.profiles
  drop column theme_mode,
  drop column accent_color,
  drop column background_style,
  drop column calendar_overlay;

drop policy if exists "Users can view their own profile" on public.profiles;
create policy "Profiles are viewable by authenticated users"
  on public.profiles for select to authenticated using (true);

-- ============ safety_alerts: reporter identity hidden ============
create table public.safety_alert_reporters (
  alert_id uuid primary key references public.safety_alerts(id) on delete cascade,
  reporter_id uuid not null references auth.users(id) on delete cascade,
  created_at timestamptz not null default now()
);
grant select on public.safety_alert_reporters to authenticated;
grant all on public.safety_alert_reporters to service_role;
alter table public.safety_alert_reporters enable row level security;
create policy "Reporter or admin sees reporter identity"
  on public.safety_alert_reporters for select to authenticated
  using (auth.uid() = reporter_id or private.has_role(auth.uid(), 'admin'::app_role));

insert into public.safety_alert_reporters (alert_id, reporter_id)
  select id, reporter_id from public.safety_alerts;

create or replace function public.capture_alert_reporter()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public.safety_alert_reporters (alert_id, reporter_id)
  values (new.id, auth.uid())
  on conflict (alert_id) do nothing;
  return new;
end;
$$;
revoke all on function public.capture_alert_reporter() from public;

create trigger t_capture_alert_reporter after insert on public.safety_alerts
  for each row execute function public.capture_alert_reporter();

drop policy if exists "Report alert" on public.safety_alerts;
drop policy if exists "Reporters and admins read alerts" on public.safety_alerts;
alter table public.safety_alerts drop column reporter_id;

create policy "Members can report alerts"
  on public.safety_alerts for insert to authenticated with check (true);
create policy "Alerts readable by members"
  on public.safety_alerts for select to authenticated using (true);

-- ============ travel contact details split out ============
create table public.travel_request_contacts (
  request_id uuid primary key references public.travel_requests(id) on delete cascade,
  contact text not null,
  created_at timestamptz not null default now()
);
grant select, insert, update, delete on public.travel_request_contacts to authenticated;
grant all on public.travel_request_contacts to service_role;
alter table public.travel_request_contacts enable row level security;

create policy "Owner or accepted verified connection reads contact"
  on public.travel_request_contacts for select to authenticated
  using (
    exists (select 1 from public.travel_requests r where r.id = request_id and r.user_id = auth.uid())
    or exists (
      select 1 from public.travel_connections c
      where c.request_id = travel_request_contacts.request_id
        and c.status = 'accepted'
        and (c.from_user = auth.uid() or c.to_user = auth.uid())
        and private.is_verified(auth.uid())
    )
  );
create policy "Owner writes contact"
  on public.travel_request_contacts for insert to authenticated
  with check (exists (select 1 from public.travel_requests r where r.id = request_id and r.user_id = auth.uid()));
create policy "Owner updates contact"
  on public.travel_request_contacts for update to authenticated
  using (exists (select 1 from public.travel_requests r where r.id = request_id and r.user_id = auth.uid()))
  with check (exists (select 1 from public.travel_requests r where r.id = request_id and r.user_id = auth.uid()));
create policy "Owner deletes contact"
  on public.travel_request_contacts for delete to authenticated
  using (exists (select 1 from public.travel_requests r where r.id = request_id and r.user_id = auth.uid()));

insert into public.travel_request_contacts (request_id, contact)
  select id, contact from public.travel_requests;

alter table public.travel_requests drop column contact;

drop policy if exists "Owner or accepted connection reads travel request" on public.travel_requests;
create policy "Members can browse travel requests"
  on public.travel_requests for select to authenticated using (true);