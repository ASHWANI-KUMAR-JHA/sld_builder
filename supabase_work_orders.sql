-- ===== Work Orders =====
-- A work order groups a master list of equipment serials (solar panels,
-- batteries, luminaires) that field users then "use" by matching them
-- against installed equipment. Run this in the Supabase SQL editor.

-- Parent table: one row per work order.
create table if not exists public.work_orders (
  id            uuid primary key default gen_random_uuid(),
  name          text not null,
  -- Every individual work order number entered on the PDI form. The shared
  -- equipment pool (SPV / battery / luminaire) can be reached by matching any
  -- one of these numbers.
  order_numbers text[] not null default '{}',
  description   text,
  created_by    text,
  created_at    timestamptz not null default now()
);

-- Add the column for databases created before order_numbers existed.
alter table public.work_orders
  add column if not exists order_numbers text[] not null default '{}';

-- GIN index so "does this order number belong to any work order" lookups
-- (order_numbers @> array[...] / && array[...]) stay fast.
create index if not exists work_orders_order_numbers_idx
  on public.work_orders using gin (order_numbers);

-- Child table: the master list of serials belonging to a work order.
-- category is one of: 'module' (solar panel), 'battery', 'luminaire'.
-- status is 'available' until the serial is used on the public form.
create table if not exists public.work_order_items (
  id            uuid primary key default gen_random_uuid(),
  work_order_id uuid not null references public.work_orders(id) on delete cascade,
  category      text not null check (category in ('module', 'battery', 'luminaire')),
  serial        text not null,
  status        text not null default 'available' check (status in ('available', 'used')),
  used_by       text,
  used_at       timestamptz,
  created_at    timestamptz not null default now()
);

create index if not exists work_order_items_wo_idx on public.work_order_items (work_order_id);
create index if not exists work_order_items_status_idx on public.work_order_items (status);
create unique index if not exists work_order_items_unique_serial
  on public.work_order_items (work_order_id, category, serial);

-- ===== Row Level Security =====
alter table public.work_orders enable row level security;
alter table public.work_order_items enable row level security;

drop policy if exists "work_orders all" on public.work_orders;
create policy "work_orders all" on public.work_orders
  for all using (true) with check (true);

drop policy if exists "work_order_items all" on public.work_order_items;
create policy "work_order_items all" on public.work_order_items
  for all using (true) with check (true);

-- ===== Storage bucket for work order PDFs =====
-- Public bucket so the stored PDF URLs can be viewed directly.
-- The upload code (src/utils/storageUploads.js) writes to this bucket.
insert into storage.buckets (id, name, public)
values ('work-order-pdfs', 'work-order-pdfs', true)
on conflict (id) do update set public = true;

-- Allow uploads, reads, updates, and deletes for the bucket.
-- Applies to both anon and authenticated roles so the app works with the
-- public anon key. Tighten these (e.g. to `to authenticated`) if you add auth.
drop policy if exists "work-order-pdfs read" on storage.objects;
create policy "work-order-pdfs read"
  on storage.objects for select
  to anon, authenticated
  using (bucket_id = 'work-order-pdfs');

drop policy if exists "work-order-pdfs insert" on storage.objects;
create policy "work-order-pdfs insert"
  on storage.objects for insert
  to anon, authenticated
  with check (bucket_id = 'work-order-pdfs');

drop policy if exists "work-order-pdfs update" on storage.objects;
create policy "work-order-pdfs update"
  on storage.objects for update
  to anon, authenticated
  using (bucket_id = 'work-order-pdfs')
  with check (bucket_id = 'work-order-pdfs');

drop policy if exists "work-order-pdfs delete" on storage.objects;
create policy "work-order-pdfs delete"
  on storage.objects for delete
  to anon, authenticated
  using (bucket_id = 'work-order-pdfs');
