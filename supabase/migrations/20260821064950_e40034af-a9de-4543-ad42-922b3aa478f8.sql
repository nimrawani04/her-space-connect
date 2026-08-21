-- 1. Move SECURITY DEFINER helpers out of the exposed API schema
create schema if not exists private;
revoke all on schema private from public;
grant usage on schema private to authenticated, service_role;

alter function public.has_role(uuid, app_role) set schema private;
alter function public.is_journey_member(uuid, uuid) set schema private;

revoke all on function private.has_role(uuid, app_role) from public;
revoke all on function private.is_journey_member(uuid, uuid) from public;
grant execute on function private.has_role(uuid, app_role) to authenticated, service_role;
grant execute on function private.is_journey_member(uuid, uuid) to authenticated, service_role;

create or replace function private.is_verified(_user_id uuid)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select coalesce((select p.is_verified from public.profiles p where p.id = _user_id), false)
$$;
revoke all on function private.is_verified(uuid) from public;
grant execute on function private.is_verified(uuid) to authenticated, service_role;

-- 2. profiles: own row only + limited public card view
drop policy if exists "Profiles are viewable by authenticated users" on public.profiles;
create policy "Users can view their own profile"
  on public.profiles for select to authenticated
  using (auth.uid() = id);

create or replace view public.public_profiles
with (security_invoker = off, security_barrier = true) as
  select id, display_name, username, bio, avatar_url, city, country, is_verified
  from public.profiles;
grant select on public.public_profiles to authenticated;

-- 3. safety_alerts: hide reporter identity
drop policy if exists "Alerts readable" on public.safety_alerts;
create policy "Reporters and admins read alerts"
  on public.safety_alerts for select to authenticated
  using (auth.uid() = reporter_id or private.has_role(auth.uid(), 'admin'::app_role));

create or replace view public.safety_alerts_public
with (security_invoker = off, security_barrier = true) as
  select id, alert_type, city, country, location, description, severity, is_verified, created_at
  from public.safety_alerts;
grant select on public.safety_alerts_public to authenticated;

-- 4. travel_requests: contact only for owner or accepted connection
drop policy if exists "Authenticated can read travel requests" on public.travel_requests;
drop policy if exists "travel_requests read" on public.travel_requests;
drop policy if exists "travel_requests insert" on public.travel_requests;

create policy "Owner or accepted connection reads travel request"
  on public.travel_requests for select to authenticated
  using (
    auth.uid() = user_id
    or exists (
      select 1 from public.travel_connections c
      where c.request_id = travel_requests.id
        and c.status = 'accepted'
        and (c.from_user = auth.uid() or c.to_user = auth.uid())
        and private.is_verified(auth.uid())
    )
  );

create or replace view public.travel_requests_public
with (security_invoker = off, security_barrier = true) as
  select id, user_id, city, country, need, created_at
  from public.travel_requests;
grant select on public.travel_requests_public to authenticated;

-- 5. travel_connections: only verified members may initiate
drop policy if exists "sisters can request" on public.travel_connections;
create policy "verified sisters can request"
  on public.travel_connections for insert to authenticated
  with check (
    auth.uid() = from_user
    and from_user <> to_user
    and private.is_verified(auth.uid())
  );

-- 6. quarantined_files: admin review + cleanup
create policy "Admins review quarantined files"
  on public.quarantined_files for select to authenticated
  using (private.has_role(auth.uid(), 'admin'::app_role));
create policy "Admins update quarantined files"
  on public.quarantined_files for update to authenticated
  using (private.has_role(auth.uid(), 'admin'::app_role))
  with check (private.has_role(auth.uid(), 'admin'::app_role));
create policy "Admins delete quarantined files"
  on public.quarantined_files for delete to authenticated
  using (private.has_role(auth.uid(), 'admin'::app_role));