# HerSpace Android — native app (Kotlin + Jetpack Compose)

Real native Android app, **not a WebView wrapper**. Shares the SAME Supabase
project as the TanStack web app (`src/integrations/supabase/config.ts`):

- URL: `https://syvqiqhyaoohbjbkftaj.supabase.co`
- Auth, tables, RLS, realtime all shared — log in on web, see it on Android.

## Full port coverage

| Web route | Android screen |
|---|---|
| `/dashboard` | `DashboardScreen` |
| `/health` (period, wellness, hormones, AI, tracker) | `HealthScreen` (log + recent; cycle math ported) |
| `/pregnancy` (planning/test/journey/health/learn/AI) | `PregnancyScreen` (stage, journey, health logs, visits) |
| `/community` | `CommunityScreen` (posts + filter + anonymous) |
| `/mentorship` | `MentorshipScreen` |
| `/marketplace` | `MarketplaceScreen` |
| `/careers` | `CareersScreen` |
| `/travel` + `/travel/inbox` | `TravelScreen` (requests + hosts) |
| `/safety` | `SafetyScreen` (places + alerts) |
| `/library` | `LibraryScreen` |
| `/wellness` | `WellnessScreen` (journal) |
| `/settings/appearance` | `SettingsScreen` |

Domain logic ported 1:1 from web:
- `src/lib/cycle-stats.ts` → `core/util/DomainMath.kt` (`CycleMath`)
- `src/lib/pregnancy.ts` → `PregnancyMath` (due dates, gestational age, trimester, baby size, fertile window)

## Stack

- Kotlin 2.4.x (AGP 9 built-in Kotlin), AGP 9.4.0, Gradle 9.8.0, JDK 25 (Android Studio JBR)
- compileSdk/targetSdk 37 (Android 17), minSdk 26
- Jetpack Compose (BOM 2026.09.00) Material3 + Navigation-Compose 2.10
- Supabase-KT BOM 3.8.0 (`auth-kt`, `postgrest-kt`, `realtime-kt`, `storage-kt`, `functions-kt`)
- Coroutines + StateFlow ViewModels, kotlinx-serialization, java.time
- Unit tests: `DomainMathTest`

## Open in Android Studio

1. Open folder `android/` (not the repo root) in Android Studio Ladybug+.
2. Let Gradle sync (needs internet for Maven Central + Google).
3. Run `app` on emulator (Pixel 6, API 34) or USB device.

No extra setup needed — `BuildConfig.SUPABASE_URL / SUPABASE_ANON_KEY`
default to the web app's project. To override, edit `app/build.gradle.kts`.

## Google sign-in (native + browser fallback)

"Continue with Google" uses **native Android Credential Manager** (account
sheet, completes fully in-app, session lands directly in Supabase). One-time
setup — the Web client ID already exists because the web app's Google sign-in
works:

1. Supabase dashboard → Authentication → Providers → Google → copy the
   **Client ID** (`xxxx.apps.googleusercontent.com`).
2. Put it in `android/local.properties` (project-local, already gitignored —
   same file as your `sdk.dir`, so it never touches your other apps):
   `GOOGLE_WEB_CLIENT_ID=xxxx.apps.googleusercontent.com`
3. Rebuild + reinstall.

Without the ID, the button falls back to the browser flow: Supabase redirects
to `herspace://auth-callback` (handled by `MainActivity` →
`SupabaseClient.handleDeeplinks`). That fallback needs the URL allowlisted
once in Supabase dashboard → Authentication → URL Configuration →
Redirect URLs:

```
herspace://auth-callback
```

## UI / theme parity with the web

- `ui/theme/Theme.kt` mirrors the tokens in `src/styles.css`
  (light `#FAFAF9` / primary earth `#C2410C`, dark `#13110F`, accent `#AFDDFF`
  via `HerSpaceColors.Accent`); dark follows the system by default.
- `ui/theme.Appearance` = the web theme provider: light/dark/system mode,
  accent color and background preset (plain/warm/sage/dusk/gradient/grain),
  persisted locally and editable in **Settings → Appearance**.
- `ui/screens/AuthScreen.kt` reproduces the web `/auth` screen (black grid
  background, badges, Continue with Google, guest/demo access, email form).
- `ui/navigation/AppNav.kt` reproduces the web authenticated shell: drawer
  sidebar with the 12 nav entries, sticky header with Appearance / welcome /
  avatar.

## Build APK from CLI

```bash
cd android
./gradlew :app:assembleDebug
# APK: app/build/outputs/apk/debug/app-debug.apk
./gradlew :app:testDebugUnitTest
```

Requires JDK 17+ (Android Studio's embedded JBR is fine) + Android SDK 37.
If Gradle cannot find the SDK, check `android/local.properties` contains:

```
sdk.dir=C\:\\Users\\YOU\\AppData\\Local\\Android\\Sdk
```

## Notes / next steps

- AI Symptom Assistant + Research Simplifier currently call TanStack server
  functions (`src/lib/ai.functions.ts`). Native path: expose them as Supabase
  Edge Functions, then call via `functions-kt` — stub ready in `SupabaseProvider`.
- Realtime community feed uses `realtime-kt`; current list uses polling +
  refresh — wire `realtime` channel for live badge parity.
- Push notifications: add Firebase + `notification_prefs` table wiring.
- Icons/splash: replace default launcher icon in `res/mipmap-*` before store release.
