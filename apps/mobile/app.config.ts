import type { ConfigContext, ExpoConfig } from 'expo/config';
export default ({ config }: ConfigContext): ExpoConfig => ({
  ...config,
  name: 'GetWink',
  slug: 'getwink',
  scheme: 'getwink',
  owner: 'janpaul80',
  version: '0.3.0',
  orientation: 'portrait',
  icon: './assets/logo.png',
  userInterfaceStyle: 'light',
  android: {
    package: 'app.getwink.beta',
    versionCode: 3,
    adaptiveIcon: { foregroundImage: './assets/logo.png', backgroundColor: '#F7F0FF' }
  },
  plugins: [
    ['expo-image-picker', {
      photosPermission: 'GetWink uses a photo you choose for your dating profile.',
      cameraPermission: 'GetWink uses the camera only when you choose to take a profile photo.',
      microphonePermission: false
    }],
    ['expo-secure-store', { configureAndroidBackup: true }]
  ],
  extra: {
    supabaseUrl: process.env.EXPO_PUBLIC_SUPABASE_URL,
    supabaseAnonKey: process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY,
    apiBaseUrl:
      process.env.EXPO_PUBLIC_API_BASE_URL || 'https://www.getwink.app',
    eas: {
      projectId: '038749ac-763a-4af9-bb43-9f725be4711c',
    },
  },
});
