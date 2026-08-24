# CN-PDRRMO EOC — Full Codebase Audit
**Audit date:** 2026-08-24 · **Scope:** Android app (`/app`), Web app (`/frontend`), Firebase Functions (`/functions`), SDK (`/sdk`), infra (`firebase.json`, rules)

Legend: ✅ fixed in this pass · ⚠️ needs your action (see `ANDROID_STUDIO_PROMPTS.md`) · 🔴 was build/business-breaking

---

## 1. Android App (Kotlin / Compose / Hilt / Firestore / MapLibre)

### 1.1 Build-breaking errors
| # | Issue | Status |
|---|-------|--------|
| A1 | 🔴 `IncidentReport` referenced by `AppDatabase`, `IncidentDao`, and `IncidentApiService` but **the class did not exist anywhere** → Kotlin compile failure. | ✅ Defined as the offline-outbox Room entity in `Models.kt`; wired end-to-end (queue on failed submit, `syncPendingReports()` replay at startup/login). |
| A2 | 🔴 `AgencyAlert` referenced in `GisViewModel` and imported in `MainScreen` but **never defined** → compile failure. | ✅ Defined in `Models.kt`. |
| A3 | 🔴 `GisViewModel.verifyIncident()` called `repository.verifyIncident(...)` which **did not exist** (Operations Center "Verify" button was dead code) → compile failure. | ✅ Implemented in `GisRepository` (+ `resolveIncident()`). |
| A4 | 🔴 `google-services.json` still declares `package_name: "com.example.cnpdrrmoeoc"` but `applicationId` was changed to `"com.cnpdrrmceoc"` → the google-services Gradle plugin **fails the build** with "No matching client found". | ⚠️ Requires downloading a new `google-services.json` from Firebase Console (Prompt P-01). |
| A5 | 🔴 Foreground service would **crash on Android 14+: missing `FOREGROUND_SERVICE_LOCATION` permission** (service declared `foregroundServiceType="location"`), and missing `POST_NOTIFICATIONS` for Android 13+. | ✅ Manifest fixed; runtime notification permission request added in `MainScreen`. |

### 1.2 Runtime crashes & logic errors
| # | Issue | Status |
|---|-------|--------|
| A6 | `getEvacuationCenters()` deserialized Firestore docs into `CriticalFacility` — a Room `@Entity` with **no no-arg constructor** → guaranteed `RuntimeException` on first data. Also never stamped the Firestore doc id. | ✅ New plain `Facility` model (all defaults); doc id stamped via `copy(id = doc.id)`. Room entities slimmed to the outbox only. |
| A7 | `Room` `incident_reports` query was `ORDER BY createdDate` — the (missing) entity had no such field in the Firestore model's naming (`created_at`). Whole Room layer was dead weight. | ✅ Room now serves one purpose: offline outbox with matching `createdDate` field. |
| A8 | `updateUnitLocation()` wrote `last_location_at` but the `Unit` model reads `last_location_update` — breadcrumb timestamps silently invisible. | ✅ Field unified. |
| A9 | `advanceAssignmentStatus()` wrote the assignment status onto `units.status` **twice** (once `enroute`/`on_scene`, then `available`), corrupting the dispatcher's availability list with invalid unit states; incident never moved to `responding`. | ✅ Unit stays `dispatched` for the mission; incident → `responding` on scene; unit → `available` on completion. |
| A10 | All 7 `callbackFlow` Firestore listeners did `close(error)` on listener errors (missing index, permission) → unhandled exception crashed collectors. | ✅ Listeners now log and degrade to an empty list. |
| A11 | Firestore PAGASA feed was requested from the **PHIVOLCS domain** (`phivolcs.dost.gov.ph/rss/weather.xml`) → 404 HTML returned as if it were an advisory. | ✅ Absolute URLs per endpoint with correct hosts. |
| A12 | `fetchLatestAgencyAlerts()` displayed the **first 200 characters of raw XML** as the advisory "description". | ⚠️ Works but needs a proper RSS parser — see Prompt F-06. |
| A13 | `register()` left an **orphaned Firebase Auth account** if the Firestore profile write failed (email locked forever, no profile). | ✅ Auth user deleted on rollback. Same fix in web SDK. |
| A14 | `MapViewContainer`: offline/online style choice was captured once in the `getMapAsync` closure → **the "Offline Map" switch did nothing**; `asset://styles/offline_style.json` **didn't exist**; map leaked on dispose. | ✅ Map rebuilds on toggle; offline style asset added; deterministic `onDestroy`. |
| A15 | Alert/ops ringtone fired on **first data load** (historical items) — cried wolf every app start. | ✅ First emission skipped. |
| A16 | `AnalyticsView` progress bar divided by `maxExposed` → NaN/crash when all zeros. | ✅ `coerceAtLeast(1)` guard. |
| A17 | `LaunchedEffect(trackingStatus)` started the service with `ACTION_STOP` on **every cold start** just to stop it. | ✅ STOP only sent if previously started; START uses `ContextCompat.startForegroundService`. |
| A18 | "Get Directions" button in Evacuation Centers was a **no-op stub**. | ✅ Opens Google Maps navigation (browser fallback). |
| A19 | Barangay was a free-text field → inconsistent spellings breaking municipality/barangay analytics joins. | ✅ Dropdown bound to the official 282-barangay reference (web Field Reports got the same fix). |
| A20 | Admin nav bar has 8 items; role switches left a stale out-of-range `selectedIndex`. | ✅ Clamped on role change. |

### 1.3 Security
| # | Issue | Status |
|---|-------|--------|
| A21 | 🔴 **Gemini API key hardcoded in source** (`ChatViewModel.kt`) and committed to git. | ✅ Moved to `BuildConfig.GEMINI_API_KEY` read from `local.properties`/`gradle.properties`/env. ⚠️ Rotate the leaked key (Prompt P-02). Degrades gracefully when unset. |
| A22 | `gemini-1.5-flash` deprecated; legacy Google AI client SDK. | ✅ Model bumped to `gemini-2.0-flash`. ⚠️ Migration prompt to Firebase AI Logic provided (F-05/F-07). |
| A23 | Encrypted session prefs were included in Auto Backup / device transfer (unreadable on new device; bad hygiene). | ✅ Excluded via `backup_rules.xml` + `data_extraction_rules.xml`. |
| A24 | `release` builds don't minify/shrink. | ⚠️ Prompt M-03 (needs keep-rules verification in your environment). |

### 1.4 Conflicting / dead code removed
- `IncidentApiService` + its Retrofit instance (`api/entities/IncidentReport` pointed at the Vercel SPA — **which has no API endpoints**; left over from the platform template). The app writes incidents straight to Firestore.
- `UserRole` enum (unused), dead `HazardLayer`/`CriticalFacility` Room entities, unused imports (`OpenInNew`, `LazyColumn` leftovers), unused `RiskAnalytics`/`GisExtensions` kept but documented (see Prompt M-04 to actually use Turf for facility exposure).
- `isLoading` dead variables on several screens noted (cosmetic; see prompts).

---

## 2. Web App (React / Vite / Firebase)

### 2.1 Build-breaking errors
| # | Issue | Status |
|---|-------|--------|
| W1 | 🔴 **`vite build` failed in production**: `@shaughnexiababe/sdk: file:../sdk` is a symlink **outside** `frontend/node_modules`, so Rollup couldn't resolve `firebase/app`/`axios` from `sdk/index.js`. Vercel deploys were un-buildable. | ✅ Externalized dep removed; `@shaughnexiababe/sdk` is always aliased to the self-contained `src/lib/sdk-shim.js`; `sdk/` kept as a synced reference copy. **Build verified green (3,312 modules).** |
| W2 | 🔴 `npm run lint` **crashed** — `eslint-plugin-react` and 4 more plugins were in `eslint.config.js` but not in `package.json`. | ✅ Deps added; eslint passes (0 errors, 1 benign warning). |
| W3 | 🔴 `lib/firebase.js` ran a **second `initializeApp()`** on the `[DEFAULT]` app (sdk-shim already initialized it) → `Firebase App named '[DEFAULT]' already exists` threw at module load → white screen. | ✅ `getApps()` guard in both modules. |

### 2.2 Cross-platform data-model split-brain (the biggest functional bug)
| # | Issue | Status |
|---|-------|--------|
| W4 | Web pages queried/Firestore-listed **`incidentreports`** (via the SDK fallback `IncidentReport → incidentreports`) while Android and the Ops Center read **`incidents`** — field reports were invisible to the EOC and to the app. | ✅ SDK maps `Incident`→`incidents` with `IncidentReport` kept as an alias to the same collection; all pages renamed to `entities.Incident`. |
| W5 | List queries ordered by **`created_date`** — the SDK writes **`created_at`**, and Firestore `orderBy` **silently drops documents missing the field** → dashboards showed empty lists despite data existing. (10 files affected.) | ✅ `created_date`→`created_at` everywhere. |
| W6 | `Alert.issued_at` was written as an **ISO string** while Android orders it as a Firestore **Timestamp** (mixed-type sorting chaos). No `expires_at` was ever set, so alerts never expired anywhere. | ✅ Web writes real `Timestamp`s, + new `expires_at` input + hourly `expireHazardAlerts` Cloud Function. |
| W7 | `lib/firebase.js` incident toast queried `province == 'Camarines Norte'` + `orderBy('timestamp')` — **neither field exists** → always-empty + would demand a composite index. The "initial snapshot" guard (`!fromCache`) also didn't work. | ✅ Correct collection/fields; proper `isInitialSnapshot` gate. |
| W8 | Android incidents stored coordinates only as a GeoPoint `location`; the web map reads `latitude/longitude` → **Android reports never appeared on the web map** (and web reports weren't normalized either). Also, `GISMap` received `incidents` but **never rendered them at all**. | ✅ Both platforms now write `location` **and** `latitude/longitude`; GISMap gained an "Active Incidents" overlay reading both shapes. |

### 2.3 Runtime crashes & logic errors
| # | Issue | Status |
|---|-------|--------|
| W9 | `cnpdrrmceoc.integrations.Core.UploadFile(...)` — **`integrations` does not exist** on the Firebase SDK (platform-template leftover) → photo/layer upload crashed with TypeError. (2 files.) | ✅ New `cnpdrrmceoc.uploadFile()` backed by **Firebase Storage** (+ `storage.rules`). |
| W10 | `entities.Facility.createMany(...)` — **method didn't exist** → bulk GeoJSON import crashed. | ✅ `createMany` implemented with 450-write batch chunks. |
| W11 | "Clear registry" deleted a **`localStorage` mock-cache key** from the old mock SDK — did nothing to Firestore. | ✅ Real Firestore deletion. |
| W12 | `moment()`/`new Date()` called directly on Firestore Timestamps → "Invalid date" labels across 6 components. | ✅ Shared `fsDate()` helper in `lib/utils.js`. |
| W13 | Role checks only hid sidebar items — a citizen could browse to `/users` and `/layers` directly. With no Firestore rules, that meant full client-side privilege escalation. | ✅ Route-level `roles` gating in `ProtectedRoute` + real `firestore.rules`. |
| W14 | `AuthContext` called `/api/apps/public/prod/public-settings/...` — a **dead platform backend** that 404s on every page load; spilled full SDK config to `console.log`. | ✅ Removed; context is Firebase-native now. |
| W15 | Boy Kalasag stripped `[TRIGGER_SOS]` from the bubble but **took no action** (unlike Android) → a plea for help produced nothing. API key missing = cryptic failure. | ✅ SOS confirmation bar → creates a critical `sos` incident with geolocation + hotline guidance; graceful unconfigured-state message. |
| W16 | Dashboard charts (`MunicipalityBreakdown`, `RiskSeverityPie`, `HazardExposureChart`) showed **fabricated, mutually inconsistent numbers** (e.g. Daet population 116,786 vs 111,700 in constants) — dangerous in a decision-support tool. `MunicipalityBreakdown` was imported but never rendered. | ✅ All three now derive from the shared `MUNICIPALITY_DATA`/analytics-engine baseline with the **same susceptibility multipliers as Android (0.45/0.30/0.15/0.05)**; breakdown restored into the dashboard layout. |
| W17 | `AgencyDataPanel` and `ANALYTICS_DATA_SOURCES` hardcode fake agency advisories ("Thunderstorm Advisory #5, 15 mins ago"). | ⚠️ Deliberately left as link-hub, flagged for real feed integration (Prompt W-04). |
| W18 | Login used `password || 'password'` fallback. | ✅ Removed. |

### 2.4 Security
| # | Issue | Status |
|---|-------|--------|
| W19 | 🔴 **Public demo backdoor on the login page**: one-click "System Administrator" (`admin@camnorte.gov.ph`), "EOC Personnel", and "Citizen" buttons with hardcoded password `password`. | ✅ Removed entirely. ⚠️ If those accounts exist in Firebase Auth, **delete or reset them now** (Prompt P-03). |
| W20 | `VITE_GEMINI_API_KEY` bundled client-side (any VITE_ var is public). | ⚠️ Kept for dev parity, plus a shipped **`askBantayGateway` Cloud Function** as the secure path (Prompt P-04/W-05). |
| W21 | 🔴 **No `firestore.rules` / `storage.rules` / `firestore.indexes.json` existed at all** — nothing versioned, nothing deployed; RBAC was purely cosmetic client-side. | ✅ Full rule suites + composite indexes written; `firebase.json` wired. ⚠️ Deploy them (Prompt P-05). |

### 2.5 Dead code & leftovers removed
- `frontend/src/schemas/*.json` (unused Base44 entity schemas), `frontend/.npmrc` (tracked despite gitignore; referenced a token for a registry no longer used), `app-params.js` public-settings machinery, double axios retry shims, `checkUserAuth` double-call effect in `ProtectedRoute`.

---

## 3. Firebase Functions & Infra
| # | Issue | Status |
|---|-------|--------|
| F1 | `click_action: 'FLUTTER_NOTIFICATION_CLICK'` — leftover from a Flutter template; meaningless for native Android/FCM. | ✅ Replaced with proper `android.priority=high` + channel hints + `navigate_to` data payloads (deep-link handling prompt F-02). |
| F2 | No `engines` in `functions/package.json` (Node default drift). | ✅ `node: 20`. Also region pinned (`us-central1`) — keep clients matching. |
| F3 | Alerts never expired automatically. | ✅ `expireHazardAlerts` hourly scheduler. |
| F4 | EOC staff got **no push** when a critical incident/SOS arrived. | ✅ `onCriticalIncident` trigger → `dispatch_staff` topic; Android now subscribes staff to it. |
| F5 | AI key protection option missing server-side. | ✅ `askBantayGateway` callable with Secret Manager wiring. |

## 4. Data layer (assets)
| # | Issue | Status |
|---|-------|--------|
| D1 | Web hazard files are **placeholders**: flood has 1 polygon; landslide / storm surge / faults have **0 features** — maps are effectively empty. Android assets mirror this; landslide empty; storm-surge & fault files **missing** on Android. | ⚠️ Data refresh procedure in Prompts D-01/D-02 (follows `DATA_GUIDE.md`). |
| D2 | `README.md` was UTF-16-encoded (renders as mojibake in many viewers). | ✅ Rewritten UTF-8. |

---

## Verified after fixes
- [x] `npx vite build` — **passes** (was failing in both modes before)
- [x] `npx eslint .` — 0 errors (was crashing outright)
- [x] `vite preview` serves the production bundle (HTTP 200)
- [x] Kotlin sources pass brace/paren integrity check (no JDK in this workspace — run Gradle sync/check in Android Studio)
- [x] No hardcoded Google API keys remain in source (`AIzaSy` sweep clean)

## Not touchable from here (your action needed — with prompts)
1. Re-download `google-services.json` for `com.cnpdrrmceoc` (P-01)
2. Rotate the leaked Gemini key; put it in `local.properties` (P-02)
3. Delete/reset any real demo accounts in Firebase Auth (P-03)
4. Set Firestore rules + indexes live (`firebase deploy --only firestore`) (P-05)
5. Set Vercel server env vars (`FIREBASE_SERVICE_ACCOUNT_JSON`, `GEMINI_API_KEY`, `CRON_SECRET`) (P-06)
6. Vercel env vars for web Firebase config (P-07)
7. Refresh hazard GeoJSON data (D-01/D-02)

---

## Addendum — 2026-08-24: Free-route migration (no billing account required)

Cloud Storage and Cloud Functions both require the Blaze plan, so the project
was migrated to a zero-card architecture:

**Incident photos — no Cloud Storage:**
- Web (`sdk-shim.uploadFile`, `FieldReports.jsx`): images compress client-side (canvas, max 1024px / JPEG q70) to inline base64 data URLs stored in `Incident.photo_urls[]` — max 2 per report, <300KB each enforced. Data URLs render with plain `<img>`; thumbnails now show in the form, the report list, Android Ops Center.
- Android (`util/PhotoCompressor.kt`, `FieldView.kt`): camera (FileProvider + TakePicture) and gallery (Photo Picker) attachments; offline Room outbox v2 carries `photoUrls` to replay; `ui/components/Base64Photo.kt` renders them without any network loader.
- `sdk/index.js` reference copy synced; `storage.rules` retained but undeployed (removed from `firebase.json`); `firebase-storage` import dropped from the web bundle.

**Backend logic — Vercel API routes (`frontend/api/`) replacing Cloud Functions:**
- `/api/invite-staff` (admin authr'd), `/api/notify-hazard-alert` (staff → FCM), `/api/notify-critical-incident` (any authed user → staff FCM; called by web SOS/Field Reports and Android `GisRepository` via new `data/remote/NotifyApi.kt`), `/api/cron-expire-alerts` (Vercel Cron daily; config in `vercel.json`), `/api/ask-bantay` (server-side Gemini key — `BoyKalasagChat` now uses the gateway with local-key fallback).
- Web calls go through `frontend/src/lib/api.js` with Firebase ID-token auth; server verifies tokens + roles via firebase-admin (`api/_lib/firebase-admin.js`).
- `functions/` retained as the Blaze-ready equivalent (`functions/README.md` maps equivalents 1:1).

Also fixed in passing: Android `triggerSOS` now uses canonical `type = "sos"` (drives critical priority + notify; previously "Emergency"), web `create` returns the doc id, Android SOS/field reports notify staff devices on submit.
