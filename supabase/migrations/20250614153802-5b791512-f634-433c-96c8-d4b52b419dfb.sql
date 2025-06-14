
-- Create the `garage-assets` bucket if it doesn't exist (no-op if already present)
insert into storage.buckets (id, name, public)
  values ('garage-assets', 'garage-assets', true)
  on conflict do nothing;

-- Enable public RLS policies for all objects in `garage-assets`
-- 1. Allow insert (upload)
create policy "Allow public upload to garage-assets"
on storage.objects for insert
with check (bucket_id = 'garage-assets');

-- 2. Allow update (overwrite)
create policy "Allow public update to garage-assets"
on storage.objects for update
using (bucket_id = 'garage-assets');

-- 3. Allow select (download/list)
create policy "Allow public read from garage-assets"
on storage.objects for select
using (bucket_id = 'garage-assets');

-- 4. Allow delete
create policy "Allow public delete from garage-assets"
on storage.objects for delete
using (bucket_id = 'garage-assets');
