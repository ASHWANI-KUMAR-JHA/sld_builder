-- File-upload support for installations.
-- Adds three JSONB columns that preserve the logical keys used in the form:
--   site_image  : single file metadata object  -> { name, path, url, size, type }
--   signed_pdf  : single file metadata object  -> { name, path, url, size, type }
--   attachments : array of file metadata objects
-- Run this in the Supabase SQL editor.

alter table public.installations
  add column if not exists site_image  jsonb,
  add column if not exists signed_pdf  jsonb,
  add column if not exists attachments jsonb;

-- ===== Storage bucket for the uploaded files =====
-- Public bucket so the stored URLs can be viewed directly.
insert into storage.buckets (id, name, public)
values ('installation-files', 'installation-files', true)
on conflict (id) do update set public = true;

-- Allow uploads and reads for the bucket.
-- Adjust these policies to your auth model (anon vs authenticated) as needed.
drop policy if exists "installation-files read" on storage.objects;
create policy "installation-files read"
  on storage.objects for select
  using (bucket_id = 'installation-files');

drop policy if exists "installation-files insert" on storage.objects;
create policy "installation-files insert"
  on storage.objects for insert
  with check (bucket_id = 'installation-files');

-- ===== Location: state column =====
-- Stores the state auto-filled from reverse-geocoding the captured site photo.
alter table public.installations
  add column if not exists state text;
