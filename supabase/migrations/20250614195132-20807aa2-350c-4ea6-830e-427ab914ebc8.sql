
-- Create 'invoice-pdfs' storage bucket (if it doesn't exist)
insert into storage.buckets (id, name, public)
  values ('invoice-pdfs', 'invoice-pdfs', true)
  on conflict do nothing;

-- Allow public insert (upload)
create policy "Allow public upload to invoice-pdfs"
on storage.objects for insert
with check (bucket_id = 'invoice-pdfs');

-- Allow public update (overwrite)
create policy "Allow public update to invoice-pdfs"
on storage.objects for update
using (bucket_id = 'invoice-pdfs');

-- Allow public select (download/list)
create policy "Allow public read from invoice-pdfs"
on storage.objects for select
using (bucket_id = 'invoice-pdfs');

-- Allow public delete
create policy "Allow public delete from invoice-pdfs"
on storage.objects for delete
using (bucket_id = 'invoice-pdfs');
