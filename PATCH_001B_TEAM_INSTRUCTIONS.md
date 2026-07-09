# GetWink Patch 001B — Correct Core Supabase Migration

## What this patch contains

- Replacement for `supabase/migrations/0001_getwink_core.sql`
- Real MVP Supabase schema, RLS policies, grants, and RPC functions
- Migration notes in `docs/PATCH_001B_MIGRATION_NOTES.md`

## Why this patch is needed

Patch 001 was successfully pushed, but the migration file may be only a placeholder comment. This patch replaces it with the real database foundation before Supabase setup proceeds.

## Install

No new app dependencies.

## Apply summary

1. Start from the Patch 001 branch.
2. Create a corrective branch named `patch-001b-core-migration`.
3. Unzip this patch.
4. Copy the inner folder contents into the repo root.
5. Confirm the migration file is a full SQL file, not a placeholder.
6. Run the existing web build and health checks.
7. Apply the SQL migration to the intended Supabase project.
8. Verify tables and RPCs exist.
9. Commit and push the branch.

## Review gate

Patch 001B is complete only when:

- Placeholder migration is replaced.
- Migration applies successfully to the intended Supabase project.
- Table and RPC verification queries pass.
- Branch is pushed to GitHub.
- Walkthrough confirms no secrets were logged.
