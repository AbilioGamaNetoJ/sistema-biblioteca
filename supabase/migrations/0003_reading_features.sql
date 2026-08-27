-- ============================================================
-- 0003: leitor PDF, notas, metas, conquistas e backup
-- ============================================================

alter table public.books
  add column if not exists pdf_path text,
  add column if not exists pdf_file_name text,
  add column if not exists pdf_file_size bigint,
  add column if not exists pdf_uploaded_at timestamptz,
  add column if not exists pdf_page_count integer;

alter table public.books
  add constraint books_pdf_file_size_check
  check (pdf_file_size is null or pdf_file_size > 0),
  add constraint books_pdf_page_count_check
  check (pdf_page_count is null or pdf_page_count > 0);

create table public.notes (
  id uuid primary key default gen_random_uuid(),
  book_id uuid not null references public.books (id) on delete cascade,
  page_number integer not null check (page_number > 0),
  content text not null check (length(trim(content)) > 0),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.reading_goals (
  user_id uuid primary key references auth.users (id) on delete cascade,
  pages_per_day integer check (pages_per_day is null or pages_per_day > 0),
  books_per_month integer check (books_per_month is null or books_per_month > 0),
  books_per_year integer check (books_per_year is null or books_per_year > 0),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.achievements (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users (id) on delete cascade,
  kind text not null check (kind in ('daily_pages', 'monthly_books', 'yearly_books')),
  period_key text not null,
  target_value integer not null check (target_value > 0),
  actual_value integer not null check (actual_value >= target_value),
  unlocked_at timestamptz not null default now(),
  unique (user_id, kind, period_key)
);

create index notes_book_page_idx on public.notes (book_id, page_number, created_at desc);
create index achievements_user_unlocked_idx on public.achievements (user_id, unlocked_at desc);

create trigger notes_set_updated_at
  before update on public.notes
  for each row execute function public.set_updated_at();

create trigger reading_goals_set_updated_at
  before update on public.reading_goals
  for each row execute function public.set_updated_at();

alter table public.notes enable row level security;
alter table public.reading_goals enable row level security;
alter table public.achievements enable row level security;

create policy "notes: select próprio"
  on public.notes for select
  to authenticated
  using (exists (
    select 1 from public.books b
    where b.id = notes.book_id and b.user_id = auth.uid()
  ));

create policy "notes: insert próprio"
  on public.notes for insert
  to authenticated
  with check (exists (
    select 1 from public.books b
    where b.id = book_id and b.user_id = auth.uid()
  ));

create policy "notes: update próprio"
  on public.notes for update
  to authenticated
  using (exists (
    select 1 from public.books b
    where b.id = notes.book_id and b.user_id = auth.uid()
  ))
  with check (exists (
    select 1 from public.books b
    where b.id = book_id and b.user_id = auth.uid()
  ));

create policy "notes: delete próprio"
  on public.notes for delete
  to authenticated
  using (exists (
    select 1 from public.books b
    where b.id = notes.book_id and b.user_id = auth.uid()
  ));

create policy "reading_goals: select próprio"
  on public.reading_goals for select
  to authenticated
  using (auth.uid() = user_id);

create policy "reading_goals: insert próprio"
  on public.reading_goals for insert
  to authenticated
  with check (auth.uid() = user_id);

create policy "reading_goals: update próprio"
  on public.reading_goals for update
  to authenticated
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

create policy "reading_goals: delete próprio"
  on public.reading_goals for delete
  to authenticated
  using (auth.uid() = user_id);

create policy "achievements: select próprio"
  on public.achievements for select
  to authenticated
  using (auth.uid() = user_id);

create policy "achievements: insert próprio"
  on public.achievements for insert
  to authenticated
  with check (auth.uid() = user_id);

create policy "achievements: update próprio"
  on public.achievements for update
  to authenticated
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

create policy "achievements: delete próprio"
  on public.achievements for delete
  to authenticated
  using (auth.uid() = user_id);

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values (
  'book-pdfs',
  'book-pdfs',
  false,
  52428800,
  array['application/pdf']::text[]
)
on conflict (id) do update set
  public = false,
  file_size_limit = excluded.file_size_limit,
  allowed_mime_types = excluded.allowed_mime_types;

create policy "book-pdfs: leitura própria"
  on storage.objects for select
  to authenticated
  using (
    bucket_id = 'book-pdfs'
    and (storage.foldername(name))[1] = auth.uid()::text
  );

create policy "book-pdfs: upload próprio"
  on storage.objects for insert
  to authenticated
  with check (
    bucket_id = 'book-pdfs'
    and (storage.foldername(name))[1] = auth.uid()::text
  );

create policy "book-pdfs: atualização própria"
  on storage.objects for update
  to authenticated
  using (
    bucket_id = 'book-pdfs'
    and (storage.foldername(name))[1] = auth.uid()::text
  )
  with check (
    bucket_id = 'book-pdfs'
    and (storage.foldername(name))[1] = auth.uid()::text
  );

create policy "book-pdfs: exclusão própria"
  on storage.objects for delete
  to authenticated
  using (
    bucket_id = 'book-pdfs'
    and (storage.foldername(name))[1] = auth.uid()::text
  );

-- Registra o avanço e o delta do dia em uma única transação.
create or replace function public.record_book_progress(
  p_book_id uuid,
  p_page integer,
  p_read_on date
)
returns table (pages_added integer, finished boolean)
language plpgsql
security invoker
set search_path = public
as $$
declare
  v_book public.books%rowtype;
  v_delta integer;
  v_finished boolean;
begin
  if p_page is null or p_page < 0 then
    raise exception 'invalid_page';
  end if;

  if p_read_on is null then
    raise exception 'invalid_read_date';
  end if;

  select * into v_book
  from public.books
  where id = p_book_id and user_id = auth.uid()
  for update;

  if not found then
    raise exception 'book_not_found';
  end if;

  if p_page < v_book.current_page then
    raise exception 'page_cannot_decrease';
  end if;

  if coalesce(v_book.pdf_page_count, v_book.total_pages) is not null
    and p_page > coalesce(v_book.pdf_page_count, v_book.total_pages) then
    raise exception 'page_exceeds_total';
  end if;

  v_delta := p_page - v_book.current_page;
  v_finished := coalesce(v_book.pdf_page_count, v_book.total_pages) is not null
    and p_page >= coalesce(v_book.pdf_page_count, v_book.total_pages);

  if v_delta > 0 then
    insert into public.progress_log (book_id, read_on, pages_read)
    values (p_book_id, p_read_on, v_delta);
  end if;

  update public.books
  set current_page = p_page,
      status = case
        when v_finished then 'read'::public.book_status
        when p_page > 0 and status = 'want_to_read' then 'reading'::public.book_status
        else status
      end,
      started_at = case
        when v_book.current_page = 0 and p_page > 0 then p_read_on
        else started_at
      end,
      finished_at = case
        when v_finished then coalesce(finished_at, p_read_on)
        else finished_at
      end
  where id = p_book_id;

  return query select v_delta, v_finished;
end;
$$;

grant execute on function public.record_book_progress(uuid, integer, date) to authenticated;
