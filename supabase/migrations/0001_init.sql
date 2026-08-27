-- ============================================================
-- Biblioteca — schema inicial
-- Execute este arquivo no SQL Editor do Supabase (ou via CLI).
-- ============================================================

-- Tipos -------------------------------------------------------
create type public.book_status as enum ('want_to_read', 'reading', 'read');

-- Tabelas -----------------------------------------------------
create table public.profiles (
  id uuid primary key references auth.users (id) on delete cascade,
  username text not null default '',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.books (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users (id) on delete cascade,
  google_books_id text,
  title text not null,
  authors text,
  cover_url text,
  total_pages integer check (total_pages is null or total_pages > 0),
  current_page integer not null default 0 check (current_page >= 0),
  status public.book_status not null default 'want_to_read',
  rating integer check (rating between 1 and 5),
  started_at date,
  finished_at date,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.progress_log (
  id uuid primary key default gen_random_uuid(),
  book_id uuid not null references public.books (id) on delete cascade,
  read_on date not null default current_date,
  pages_read integer not null check (pages_read > 0),
  created_at timestamptz not null default now()
);

-- Índices -----------------------------------------------------
create index books_user_status_idx on public.books (user_id, status);
create index books_user_created_idx on public.books (user_id, created_at desc);
create index progress_log_book_idx on public.progress_log (book_id, read_on desc);

-- Triggers ----------------------------------------------------
create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public.profiles (id, username)
  values (new.id, coalesce(new.raw_user_meta_data ->> 'username', ''));
  return new;
end;
$$;

create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();

create or replace function public.set_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

create trigger profiles_set_updated_at
  before update on public.profiles
  for each row execute function public.set_updated_at();

create trigger books_set_updated_at
  before update on public.books
  for each row execute function public.set_updated_at();

-- RLS ---------------------------------------------------------
alter table public.profiles enable row level security;
alter table public.books enable row level security;
alter table public.progress_log enable row level security;

create policy "profiles: select próprio"
  on public.profiles for select
  to authenticated
  using (auth.uid() = id);

create policy "profiles: update próprio"
  on public.profiles for update
  to authenticated
  using (auth.uid() = id)
  with check (auth.uid() = id);

create policy "books: select próprio"
  on public.books for select
  to authenticated
  using (auth.uid() = user_id);

create policy "books: insert próprio"
  on public.books for insert
  to authenticated
  with check (auth.uid() = user_id);

create policy "books: update próprio"
  on public.books for update
  to authenticated
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

create policy "books: delete próprio"
  on public.books for delete
  to authenticated
  using (auth.uid() = user_id);

create policy "progress_log: select próprio"
  on public.progress_log for select
  to authenticated
  using (exists (
    select 1 from public.books b
    where b.id = progress_log.book_id and b.user_id = auth.uid()
  ));

create policy "progress_log: insert próprio"
  on public.progress_log for insert
  to authenticated
  with check (exists (
    select 1 from public.books b
    where b.id = book_id and b.user_id = auth.uid()
  ));

create policy "progress_log: delete próprio"
  on public.progress_log for delete
  to authenticated
  using (exists (
    select 1 from public.books b
    where b.id = progress_log.book_id and b.user_id = auth.uid()
  ));

-- Storage: bucket público de capas ----------------------------
insert into storage.buckets (id, name, public)
values ('covers', 'covers', true)
on conflict (id) do nothing;

create policy "covers: leitura pública"
  on storage.objects for select
  to public
  using (bucket_id = 'covers');

create policy "covers: upload na própria pasta"
  on storage.objects for insert
  to authenticated
  with check (
    bucket_id = 'covers'
    and (storage.foldername(name))[1] = auth.uid()::text
  );

create policy "covers: update na própria pasta"
  on storage.objects for update
  to authenticated
  using (
    bucket_id = 'covers'
    and (storage.foldername(name))[1] = auth.uid()::text
  )
  with check (
    bucket_id = 'covers'
    and (storage.foldername(name))[1] = auth.uid()::text
  );

create policy "covers: delete na própria pasta"
  on storage.objects for delete
  to authenticated
  using (
    bucket_id = 'covers'
    and (storage.foldername(name))[1] = auth.uid()::text
  );
