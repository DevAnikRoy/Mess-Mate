# মেসমেট · Android

The React Native (Expo) app. Same Supabase backend and the same mess rules as the website. The web app in the repo root is unchanged.

## Run on a phone

```bash
cd mobile
cp .env.example .env   # then paste the Supabase URL and anon key
npx expo start
```

Scan the QR with Expo Go (Android).

## Make an APK

This machine does not need Android Studio if you use EAS:

```bash
cd mobile
npx eas-cli@latest login
npx eas-cli@latest build -p android --profile preview
```

That uploads the project and returns a downloadable APK.

Local build (needs JDK 17 and Android SDK):

```bash
npx expo run:android
```

## Google sign-in

In Supabase → Authentication → URL Configuration, add:

- `messmate://auth/callback`
- your Expo Go redirect, e.g. `exp://127.0.0.1:8081/--/auth/callback`
