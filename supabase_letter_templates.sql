-- ===== Letter Templates =====
-- Stores reusable letter templates for the Letter Generator. A template's
-- body may contain {{variable}} placeholders. The generator page scans the
-- body for these placeholders, renders an input field per unique variable,
-- and substitutes the entered values to produce the final letter for PDF
-- export. Run this in the Supabase SQL editor.

create table if not exists public.letter_templates (
  id          uuid primary key default gen_random_uuid(),
  name        text not null,
  subject     text,
  body        text not null default '',
  created_by  text,
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now()
);

create index if not exists letter_templates_created_idx
  on public.letter_templates (created_at desc);

-- Keep updated_at fresh on every update.
create or replace function public.set_letter_templates_updated_at()
returns trigger as $$
begin
  new.updated_at = now();
  return new;
end;
$$ language plpgsql;

drop trigger if exists letter_templates_set_updated_at on public.letter_templates;
create trigger letter_templates_set_updated_at
  before update on public.letter_templates
  for each row execute function public.set_letter_templates_updated_at();

-- ===== Row Level Security =====
alter table public.letter_templates enable row level security;

drop policy if exists "letter_templates all" on public.letter_templates;
create policy "letter_templates all" on public.letter_templates
  for all using (true) with check (true);
