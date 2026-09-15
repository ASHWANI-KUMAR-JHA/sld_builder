-- ===== Work Orders =====
-- A work order groups a master list of equipment serials (solar panels,
-- batteries, luminaires) that field users then "use" by matching them
-- against installed equipment. Run this in the Supabase SQL editor.

-- Parent table: one row per work order.
create table if not exists public.work_orders (
  id           uuid primary key default gen_random_uuid(),
  name         text not null,
  description  text,
  created_by   text,
  created_at   timestamptz not null default now()
);

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
