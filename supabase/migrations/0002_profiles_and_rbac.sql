-- ============================================================================
-- Roles / RBAC
-- ============================================================================
-- Four tiers, per spec: super_admin > admin > editor > author.
-- Coarse-grained tier checks protect the DB via RLS (see 0012_rls_policies.sql).
-- Fine-grained, *configurable* permissions live in role_permissions and are
-- read by the app layer (lib/auth/permissions.ts) to gate UI + server actions.

create table public.profiles (
  id uuid primary key references auth.users (id) on delete cascade,
  email text not null,
  display_name text,
  avatar_url text,
  role text not null default 'author'
    check (role in ('super_admin', 'admin', 'editor', 'author')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
comment on table public.profiles is 'One row per auth.users row; carries display info + RBAC role.';

create trigger profiles_set_updated_at
  before update on public.profiles
  for each row execute function public.set_updated_at();

create index profiles_role_idx on public.profiles (role);

create table public.permissions (
  key text primary key,
  description text not null
);
comment on table public.permissions is 'Catalog of fine-grained permission keys (posts.publish, ads.manage, ...).';

create table public.role_permissions (
  role text not null check (role in ('super_admin', 'admin', 'editor', 'author')),
  permission_key text not null references public.permissions (key) on delete cascade,
  primary key (role, permission_key)
);
comment on table public.role_permissions is
  'Configurable role -> permission matrix, editable from Admin -> Users -> Roles.';

-- ----------------------------------------------------------------------------
-- Helper functions used throughout RLS policies.
-- ----------------------------------------------------------------------------

create or replace function public.get_my_role()
returns text
language sql
stable
security definer
set search_path = public
as $$
  select role from public.profiles where id = auth.uid();
$$;
comment on function public.get_my_role() is 'Current user''s RBAC role, or NULL if signed out / no profile.';

create or replace function public.role_rank(r text)
returns int
language sql
immutable
as $$
  select case r
    when 'super_admin' then 4
    when 'admin' then 3
    when 'editor' then 2
    when 'author' then 1
    else 0
  end;
$$;

create or replace function public.has_role_at_least(min_role text)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select public.role_rank(public.get_my_role()) >= public.role_rank(min_role);
$$;
comment on function public.has_role_at_least(text) is
  'True if the signed-in user''s role tier is >= min_role. Used by nearly every RLS policy.';

create or replace function public.has_permission(perm_key text)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select
    public.get_my_role() = 'super_admin'
    or exists (
      select 1 from public.role_permissions rp
      where rp.role = public.get_my_role() and rp.permission_key = perm_key
    );
$$;
comment on function public.has_permission(text) is
  'Fine-grained permission check, used by server actions for anything RLS can''t express well.';

-- ----------------------------------------------------------------------------
-- Auto-provision a profile whenever a Supabase Auth user is created.
-- The very first user ever created becomes super_admin (bootstraps the admin
-- account without needing a manual SQL step); everyone after defaults to author
-- and must be promoted by an admin.
-- ----------------------------------------------------------------------------

create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  v_role text := 'author';
begin
  if not exists (select 1 from public.profiles) then
    v_role := 'super_admin';
  end if;

  insert into public.profiles (id, email, display_name, role)
  values (
    new.id,
    new.email,
    coalesce(new.raw_user_meta_data ->> 'display_name', split_part(new.email, '@', 1)),
    v_role
  )
  on conflict (id) do nothing;

  return new;
end;
$$;

create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();

-- Prevent privilege escalation: only a super_admin may set/keep role =
-- 'super_admin' on any row, and non-admins may never change the role column
-- at all (enforced again at the app layer, this is the DB-level backstop).
create or replace function public.protect_profile_role_changes()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if new.role is distinct from old.role then
    if new.role = 'super_admin' and public.get_my_role() <> 'super_admin' then
      raise exception 'Only a super_admin can grant the super_admin role';
    end if;
    if public.role_rank(public.get_my_role()) < public.role_rank('admin') then
      raise exception 'Insufficient privileges to change roles';
    end if;
  end if;
  return new;
end;
$$;

create trigger profiles_protect_role_changes
  before update on public.profiles
  for each row execute function public.protect_profile_role_changes();
