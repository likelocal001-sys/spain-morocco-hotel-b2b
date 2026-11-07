-- Attachments bucket: rooming lists (agencies) and hotel vouchers (Morocco operations team).
-- Idempotent: safe to run again in the Supabase SQL editor.

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values (
  'attachments',
  'attachments',
  false, -- private: files are only reachable through short-lived signed URLs
  20971520, -- 20 MB, matches MAX_ATTACHMENT_BYTES in lib/attachments.ts
  array[
    'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
    'application/vnd.ms-excel',
    'application/pdf',
    'image/png',
    'image/jpeg',
    'image/webp'
  ]
)
on conflict (id) do update
set public = excluded.public,
    file_size_limit = excluded.file_size_limit,
    allowed_mime_types = excluded.allowed_mime_types;

-- Helpers run as definer so the policies below do not depend on profiles/reservations RLS.
create or replace function public.attachments_is_operator()
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1 from public.profiles p
    where p.id = auth.uid() and p.role in ('admin', 'staff')
  );
$$;

-- An agency user may read a file only when it is attached to one of its own reservations.
create or replace function public.attachments_agency_can_read(object_name text)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1
    from public.reservations r
    join public.profiles p on p.agency_id = r.agency_id
    where p.id = auth.uid()
      and (
        r.data -> 'roomingList' ->> 'path' = object_name
        or r.data -> 'voucherFile' ->> 'path' = object_name
      )
  );
$$;

revoke all on function public.attachments_is_operator() from public;
revoke all on function public.attachments_agency_can_read(text) from public;
grant execute on function public.attachments_is_operator() to authenticated;
grant execute on function public.attachments_agency_can_read(text) to authenticated;

drop policy if exists "attachments_select" on storage.objects;
drop policy if exists "attachments_insert" on storage.objects;
drop policy if exists "attachments_delete" on storage.objects;

-- Read (signed URL creation): operators see everything; agencies see their own reservations'
-- files, plus files they uploaded themselves (a rooming list before the booking is saved).
create policy "attachments_select" on storage.objects
for select to authenticated
using (
  bucket_id = 'attachments'
  and (
    public.attachments_is_operator()
    or owner_id = auth.uid()::text
    or public.attachments_agency_can_read(name)
  )
);

-- Upload: agencies may only add rooming lists; vouchers are uploaded by the operations team.
create policy "attachments_insert" on storage.objects
for insert to authenticated
with check (
  bucket_id = 'attachments'
  and (
    public.attachments_is_operator()
    or (storage.foldername(name))[1] = 'rooming'
  )
);

-- Delete: operators, or the user who uploaded the file. Files are never overwritten (upsert: false),
-- so no update policy is granted.
create policy "attachments_delete" on storage.objects
for delete to authenticated
using (
  bucket_id = 'attachments'
  and (public.attachments_is_operator() or owner_id = auth.uid()::text)
);
