-- Verification queries for Patch 003A profile-photos storage policies.
-- Run after 0004_profile_photos_storage_policies.sql.

-- 1. Confirm bucket config.
select id, public, file_size_limit, allowed_mime_types
from storage.buckets
where id = 'profile-photos';

-- Expected: public = false, file_size_limit = 5242880,
-- allowed_mime_types = {image/jpeg,image/png,image/webp}.

-- 2. Confirm the three policies exist on storage.objects.
select policyname, cmd, roles
from pg_policies
where schemaname = 'storage'
  and tablename = 'objects'
  and policyname like 'profile_photos_storage_%'
order by policyname;

-- Expected: profile_photos_storage_insert_own (INSERT),
-- profile_photos_storage_select_visible (SELECT),
-- profile_photos_storage_delete_own (DELETE). No UPDATE policy.

-- 3. Positive test (run as an authenticated user's own session):
--    upload to '<own-uid>/test.jpg' -> succeeds.
--    createSignedUrl('<own-uid>/test.jpg') -> succeeds.
--    remove(['<own-uid>/test.jpg']) -> succeeds.

-- 4. Negative test (own session, target another user's object path):
--    upload to '<other-uid>/test.jpg' -> rejected.
--    remove(['<other-uid>/test.jpg']) -> rejected.

-- 5. Cross-user read test: as user A, createSignedUrl for user B's photo.
--    Expect success only if B is active, onboarded, and not blocked
--    relative to A; expect failure once A blocks B (or B blocks A).

-- 6. Size/type enforcement: attempt an upload over 5 MB, and an upload
--    with a disallowed content-type (e.g. image/gif or application/pdf).
--    Both expected to be rejected by the bucket config, independent of
--    the RLS policies above.
