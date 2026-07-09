# ADR-001: Supabase + Next.js + Expo with Server-Side AI Provider Abstraction

**Date:** 2026-07-09  
**Status:** Accepted

## Context

GetWink needs a fast MVP path for a beta Android app and public landing page. The confirmed architecture avoids a separate backend service unless a strong technical reason appears.

## Decision

Use Next.js on Vercel for web and secure server routes, Supabase for Auth/Postgres/Storage/Realtime, Expo for Android, and a server-side AI provider abstraction for Langdock.

## Consequences

- Faster MVP delivery with fewer services.
- AI credentials remain server-side.
- Supabase RLS and Postgres RPCs are critical security boundaries.
- Long-running AI or moderation workflows may need queues later.
