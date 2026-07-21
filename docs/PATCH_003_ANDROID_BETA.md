# Patch 003 - Android beta foundation

## Included
- Expo SDK 55 / React Native Android source.
- Secure Supabase email/password authentication.
- Profile onboarding, private photo upload, preferences, and trial-start RPC.
- Discovery with Wink/Pass, mutual matches, chat, block/report, account deletion, and AI wingmate.
- EAS internal APK and production AAB profiles.
- Web AI route correction validating the mobile Supabase bearer token.

## Honest build status
The source patch is delivered, but no signed APK is included. EAS must build and sign the APK in the team's connected Expo account. This delivery environment has no repository network, package registry, Expo account, Android signing credentials, or physical device.

## Security
Only public Supabase URL/publishable values belong in `EXPO_PUBLIC_*`. Never bundle the service-role key, Langdock key, OpenRouter key, or another server secret. The `profile-photos` bucket must remain private and RLS/RPC enforcement remains authoritative.
