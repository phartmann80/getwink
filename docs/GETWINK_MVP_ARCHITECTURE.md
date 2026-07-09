# GetWink MVP Architecture & Roadmap

**Repo:** github.com/janpaul80/getwink  
**Status:** Patch 001 bootstrap  
**Domain:** getwink.app  
**Date:** 2026-07-09

## Confirmed direction

GetWink is a beta Android dating/social discovery app with an early landing page. The MVP is inspired by swipe-based discovery patterns but must not copy Tinder branding, logo, colors, or exact UI.

Core interaction language:

- **Wink:** playful interest signal.
- **Pass:** polite non-interest signal.
- **Match:** created when both users Wink each other.

The 30-day beta trial starts when profile onboarding becomes complete, not at account creation.

## Stack

| Area | Decision |
|---|---|
| Web / backend routes | Next.js + TypeScript |
| Deployment | Vercel |
| Android | React Native + Expo + TypeScript |
| Auth/database/storage/realtime | Supabase |
| AI | Langdock through secure server-side provider abstraction |
| Domain | getwink.app |

## Current repository state

The GitHub repository is empty. Patch 001 bootstraps the root Next.js landing/API project, Supabase migration folder, documentation, and an Expo mobile starter under `apps/mobile`.

## Roadmap

1. Patch 001: Bootstrap repo, landing page, docs, core migration, AI abstraction skeleton.
2. Patch 002: Supabase server client, auth/profile/bootstrap APIs, AI usage audit inserts.
3. Patch 003: Discovery candidate service and transaction-safe Wink/Pass API wiring.
4. Patch 004: Blocking/reporting/account deletion APIs and UI foundations.
5. Patch 005: Chat/matches APIs and mobile screens.
6. Patch 006: Expo onboarding/discovery/matches/chat/AI assistant flows.
7. Patch 007: APK build, APK hosting config, end-to-end beta QA.
