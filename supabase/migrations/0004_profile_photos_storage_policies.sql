-- GetWink Patch 003A: profile-photos storage bucket policies
-- Date: 2026-08-08
-- Purpose:
--   - Codify the profile-photos bucket configuration and RLS policies. Live
--     verification found the bucket already exists and is private, but has
--     zero storage.objects policies, no file-size-limit override (50 MB
--     default), and no MIME restriction -- meaning the client upload path
--     has never actually been exercised against a policy-protected bucket.
--   - INSERT and DELETE are scoped strictly to the caller's own objects
--     (first path segment = auth.uid()), matching the app's storage_path
--     convention of "<user_id>/<timestamp>.jpg".
--   - SELECT mirrors the visibility rule already enforced on the
--     public.profile_photos metadata table (self, or an active/onboarded
--     profile the caller has not blocked/been blocked by). Discover and
--     Matches read other users' photos via supabase.storage.createSignedUrl
--     using the caller's own session -- an "own objects only" SELECT policy
--     would silently break both features, so this intentionally does not
--     match the literal "own objects only" phrasing for reads. Flag if
--     photo delivery should instead go through a server-side/service-role
--     endpoint, which would let SELECT be narrowed to owner-only.
-- Apply after 0001_getwink_core.sql.
-- Staging-gated: do not apply to production until staging photo
-- upload/replace/delete tests (own-object success, cross-user rejection)
-- pass. See docs/PATCH_003A_TEST_MATRIX.md.

begin;

insert into storage.buckets (id, name, public)
values ('profile-photos', 'profile-photos', false)
on conflict (id) do update set public = false;

update storage.buckets
set file_size_limit = 5242880, -- 5 MB
    allowed_mime_types = array['image/jpeg', 'image/png', 'image/webp']
where id = 'profile-photos';

drop policy if exists profile_photos_storage_insert_own on storage.objects;
drop policy if exists profile_photos_storage_select_visible on storage.objects;
drop policy if exists profile_photos_storage_delete_own on storage.objects;

create policy profile_photos_storage_insert_own
on storage.objects for insert to authenticated
with check (
  bucket_id = 'profile-photos'
  and (storage.foldername(name))[1] = auth.uid()::text
);

create policy profile_photos_storage_select_visible
on storage.objects for select to authenticated
using (
  bucket_id = 'profile-photos'
  and (
    (storage.foldername(name))[1] = auth.uid()::text
    or exists (
      select 1 from public.profiles p
      where p.id::text = (storage.foldername(name))[1]
        and p.account_status = 'active'
        and p.onboarding_completed_at is not null
        and not public.users_are_blocked(auth.uid(), p.id)
    )
  )
);

create policy profile_photos_storage_delete_own
on storage.objects for delete to authenticated
using (
  bucket_id = 'profile-photos'
  and (storage.foldername(name))[1] = auth.uid()::text
);

commit;
