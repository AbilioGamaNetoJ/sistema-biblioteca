-- ============================================================
-- 0002: username único + verificação pública de disponibilidade
-- ============================================================

-- Índice único parcial: usernames não vazios são únicos
create unique index if not exists profiles_username_not_empty_unique
  on public.profiles (username)
  where username <> '';

-- Permite checar disponibilidade antes do signUp (profiles tem RLS,
-- então usamos security definer para consultar sem sessão)
create or replace function public.is_username_taken(p_username text)
returns boolean
language sql
security definer
set search_path = public
stable
as $$
  select exists (
    select 1 from public.profiles
    where lower(username) = lower(p_username)
  );
$$;

grant execute on function public.is_username_taken(text) to anon, authenticated;
