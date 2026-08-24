# CN-PDRRMO EOC — Android Studio Prompt Pack
Everything below is written to be pasted into **Gemini in Android Studio** (the chat / Agent Mode panel) or your AI assistant of choice, or executed manually. Prompts are grouped by urgency.

> How to use: open the project root (`CNPDRRMCEOC-`) in Android Studio, open the Gemini panel, paste a prompt (verbatim — they include exact file paths), review the diff, and apply.

---

## PART 0 — REQUIRED FIRST (the app cannot build/run without these)

### P-01 · Fix the google-services.json / applicationId mismatch *(blocks Android build)*
The repo's `app/google-services.json` still registers `com.example.cnpdrrmoeoc`, but `app/build.gradle.kts` sets `applicationId = "com.cnpdrrmceoc"`. Gradle sync fails with "No matching client found for package name 'com.cnpdrrmceoc'".
1. Firebase Console → project `cnpdrrmceoc` → Project Settings → **Add app** → Android, package name `com.cnpdrrmceoc`.
2. Download the new `google-services.json` and **replace** `app/google-services.json`.
3. (Alternative: change `applicationId` back to `com.example.cnpdrrmoeoc` — but note the last commit intentionally moved to the new ID.)

### P-02 · Rotate the leaked Gemini key & configure Android AI
A real-format Gemini key was committed to git history (`ChatViewModel.kt`, now removed — rotated anyway).
1. Google AI Studio → revoke the old key (it is still visible in git history at `app/src/main/java/com/example/cnpdrrmoeoc/ui/ChatViewModel.kt` in commits before this work) and create a new one. Do NOT paste keys into docs or code — repo is scanned by GitGuardian.
2. Add to **`local.properties`** (already gitignored) at the repo root:
   ```
   GEMINI_API_KEY=your-new-key
   ```
   `app/build.gradle.kts` injects it into `BuildConfig.GEMINI_API_KEY` automatically.
3. Restrict the key to your Android app (package + SHA-1) in Google Cloud → Credentials.

### P-03 · Remove the demo backdoor accounts from Firebase Auth
The web login page used to expose one-click logins for `admin@camnorte.gov.ph`, `eoc@camnorte.gov.ph`, `citizen@gmail.com` with password `password` (removed from the UI). If any account with these emails exists in Firebase Authentication, delete it or reset its password **now**, and never create accounts whose password is `password`.

### P-04 · Web: put real Firebase config in Vercel (and `.env` for local dev)
1. Copy `frontend/.env.example` → `frontend/.env` and fill in the web-app config from Firebase Console → Project Settings → Your apps → **Web app** (the same project `cnpdrrmceoc`).
2. Add the same `VITE_FIREBASE_*` variables in Vercel → Project → Settings → Environment Variables. Optionally set `VITE_GEMINI_API_KEY` (see P-06 for the secure alternative).

### P-05 · Deploy Firestore + Storage security rules and indexes *(the most important safety step)*
New files were added to the repo root: `firestore.rules`, `firestore.indexes.json`, `storage.rules`, wired into `firebase.json`. Deploy from the repo root:
```bash
firebase login            # if needed
firebase use cnpdrrmceoc  # selects the project in .firebaserc (create if missing: firebase use --add)
firebase deploy --only firestore:rules,firestore:indexes,storage
```
Until this runs, role checks are enforced only in the UI. **After deploying**, a citizen can no longer edit their own role, only staff can write alerts/facilities/units/assignments, and only admins manage users and hazard layers.

### P-06 · Deploy the free-route backend — Vercel API routes (replaces Cloud Functions)
Cloud Functions require the Blaze plan, so the backend logic lives in `frontend/api/` as Vercel serverless routes: `invite-staff`, `notify-hazard-alert`, `notify-critical-incident`, `cron-expire-alerts`, `ask-bantay`. Steps:
1. In Firebase Console → Project Settings → **Service accounts** → Generate new private key → download the JSON.
2. Vercel → Project → Settings → Environment Variables, add:
   - `FIREBASE_SERVICE_ACCOUNT_JSON` = the JSON pasted **as one line**
   - `GEMINI_API_KEY` = your rotated Gemini key (server-side only)
   - `CRON_SECRET` = any long random string
3. Redeploy on Vercel (`vercel --prod` or push). Test: `curl -X POST https://<your-app>.vercel.app/api/cron-expire-alerts -H "Authorization: Bearer <CRON_SECRET>"`.
4. Note the Vercel cron runs **daily** on Hobby (01:00 Manila per `vercel.json`); expired alerts are also hidden client-side, so this is a sweep, not a gate. (The `functions/` folder remains the Blaze-ready alternative — see `functions/README.md`.)

### P-07 · Verify the whole build
Android Studio prompt:
```
Run a Gradle sync and then assembleDebug on the :app module. If anything fails, list
every error with its file:line and propose minimal fixes. Pay special attention to
data/Models.kt, data/repository/GisRepository.kt, di/NetworkModule.kt, and
service/LocationService.kt — they were just refactored. Do not change behavior,
only resolve compile errors.
```

---

## PART 1 — Data operations prompts

### D-01 · Refresh the hazard GeoJSON datasets (web)
```
The files in frontend/public/data/hazards/ are placeholders (flood has 1 polygon,
landslide/storm_surge/active_faults have 0 features). Walk me through exporting
Flood, Rain-induced Landslide, Storm Surge, and Active Faults GeoJSON for
Camarines Norte from https://hazardhunter.georisk.gov.ph and dropping them in as
flood_camnorte.json, landslide_camnorte.json, storm_surge_camnorte.json, and
active_faults_camnorte.json. Then update frontend/public/data/hazards/manifest.json
with a feature count and a "last_refreshed" ISO date for each layer, and add a
small "Data last updated" badge in GISMapPage.jsx that reads the manifest.
```

### D-02 · Mirror datasets into the Android app
```
Copy the refreshed hazard GeoJSON files from frontend/public/data/hazards/ into
app/src/main/assets/hazards/ so GisRepository.fetchFloodData()/fetchLandslideData()
work fully offline, and extend GisRepository + GisViewModel with fetchStormSurgeData()
and fetchFaultData() loading storm_surge_camnorte.json and active_faults_camnorte.json.
Then render them as additional toggleable MapLibre layers in OperationalView
(MainScreen.kt) with distinct colors (storm surge = cyan, faults = dashed red line).
```

---

## PART 2 — Android app prompts (maintenance & hardening)

### M-01 · Compose/Gradle health check
```
Open gradle/libs.versions.toml and app/build.gradle.kts. Check for dependency
conflicts (especially MapLibre android-sdk 11.6.1 vs android-sdk-geojson/turf
6.0.1), unused dependencies we can drop, and version bumps that are safe to apply
without behavior changes. Print a table: dependency | current | suggested | risk.
```

### M-02 · ProGuard/R8 for release builds
```
Enable isMinifyEnabled = true and isShrinkResources = true for the release build
type in app/build.gradle.kts, and write the required ProGuard rules into
app/proguard-rules.pro for MapLibre, Firebase (Firestore/Auth/Messaging/Analytics),
Gson (Room entities + Firestore models in data/Models.kt and ShiftNote.kt must be
kept for reflection), and the Google AI client. Then run assembleRelease and fix
every R8 warning until the release APK builds and launches cleanly.
```

### M-03 · Modern theme + dark mode
```
Refactor MainActivity.kt and the Compose UI to use a proper Material3 theme instead
of the default MaterialTheme: create ui/theme/Theme.kt with CN-PDRRMO brand colors
(PDRRMO red #D32F2F primary, orange #EF6C00 secondary) in light and dark schemes,
dynamic color on Android 12+, and a status-bar color match. Keep every existing
screen's colors working — no visual regressions.
```

### M-04 · Real facility-exposure analytics on Android
```
ui/GisViewModel.runProvincialAnalysis() currently fabricates numbers from
population multipliers, and gis/RiskAnalytics.kt (ray-casting) + gis/GisExtensions.kt
are unused. Rewrite the analysis to (1) load flood/landslide GeoJSON via
GisRepository, (2) parse with toFeatureCollection()/extractPolygons(), (3) compute
true point-in-polygon exposure for every Facility in the facilities collection
using RiskAnalytics.countExposedFacilities (or the bundled MapLibre turf
TurfJoins.pointsWithinPolygon), and (4) keep the household exposure multipliers
only as a clearly-labeled "estimated household exposure" derived metric. Remove the
fake delay(1500) and the hardcoded infrastructureAtRisk formula.
```

### M-05 · WorkManager-driven offline sync
```
The offline incident outbox (IncidentDao + GisRepository.syncPendingReports)
currently replays only on login. Add a WorkManager OneTimeWorkRequest with
NetworkType.CONNECTED constraints that calls syncPendingReports(), schedule it
from PdrrmoApplication, and show a small "N reports pending sync" chip on the
FieldView (ui/FieldView.kt) driven by IncidentDao.getAllIncidents() with a manual
Retry action.
```

### M-06 · FCM deep links + notification channels
```
functions/index.js now sends data payloads navigate_to=alerts and
navigate_to=operations with channels hazard_alerts and dispatch_staff. Register
both NotificationChannels in PdrrmoApplication, add a FirebaseMessagingService
declared in AndroidManifest.xml, and handle the deep link in MainActivity so
tapping a notification opens MainScreen on the right tab (pass a nav route extra
through the launch intent, e.g. via LaunchedEffect keyed on intent extras).
```

---

## PART 3 — Android app prompts (features supporting the EOC mission)

### F-01 · Photo attachment for field reports ✅ IMPLEMENTED (free route)
Camera (FileProvider) + gallery (Photo Picker) attachments on `ui/FieldView.kt`;
compressed to inline base64 data URLs by `util/PhotoCompressor.kt`; stored in
`Incident.photo_urls` inside the Firestore document (no Cloud Storage needed);
offline outbox carries them to replay; thumbnails render in
`OperationsCenterView` via `ui/components/Base64Photo.kt`. Web mirrors this in
FieldReports.jsx + `sdk-shim.uploadFile`.

### F-02 · SOS confirm gate on Android
```
In ui/components/BantayFabOverlay.kt, BotAction.OpenSOS currently fires
gisViewModel.triggerSOS() immediately. Mirror the web app: show an AlertDialog
("Send emergency SOS to the EOC with your location?") with SEND SOS / Cancel, only
calling triggerSOS on confirm, and show an in-app confirmation with hotline
numbers ((054) 440-1234 / 911) after sending.
```

### F-03 · Responder turn-by-turn breadcrumbs & ETA polish
```
FieldResponderView: draw myUnit.current_location and the assigned incident's
location/GeoPoint (already on Incident) as markers + a straight line on a small
MapViewContainer in ResponderTaskUI, add a "Navigate" button that fires
google.navigation:q=lat,lng, and display last_location_update staleness
("GPS fix 4 min ago") so dispatchers can trust the breadcrumb trail.
```

### F-04 · Evacuation-center occupancy reporting for barangay staff
```
Add a role eoc_personnel capability: on EvacuationCentersView cards, a
"Report Occupancy" action that opens a dialog to update
facilities/{id}.current_occupancy (Firestore update is already allowed for staff
in firestore.rules). Show last-updated time and color-shift the badge when data
is older than 6 hours.
```

### F-05 · Migrate the chatbot to Firebase AI Logic
```
Replace com.google.ai.client.generativeai (deprecated Google AI client) in
ui/ChatViewModel.kt and Gradle with com.google.firebase:firebase-ai (Firebase AI
Logic): initialize FirebaseAppCheck first, then build a GenerativeModel
("gemini-2.0-flash") with a systemInstruction instead of prepending the prompt
each message. Preserve the [TRIGGER_SOS]/[NAVIGATE_MAP]/[NAVIGATE_ALERTS]
keyword actions and the graceful no-key fallback message.
```

### F-06 · Proper PHIVOLCS/PAGASA feed parsing
```
GisViewModel.fetchLatestAgencyAlerts() currently shows the first 200 chars of raw
RSS XML. Write an XmlPullParser-based parser in data/remote that extracts
title/link/pubDate/description per <item> from both feeds (PHIVOLCS quake feed:
include magnitude & depth from the description text), cap at the 5 newest items,
and render them as a cards section on AlertsView labeled "Agency Advisories".
```

### F-07 · Alert expiry enforcement client-side
```
HazardAlert has expires_at; functions/expireHazardAlerts marks expired alerts
hourly. In GisRepository.getActiveAlerts, also filter client-side so an alert
whose expires_at already passed is never shown even between sweeps, and display
a countdown chip ("expires in 3h") on critical alerts in AlertsView.
```

---

## PART 4 — Web app prompts (works in Android Studio, VS Code, or any AI editor)

### W-01 · Offline-first PWA hardening
```
The web app has a manifest.json but no service worker — useless during a typhoon
outage. Add vite-plugin-pwa: precache the shell + logo + the four hazard GeoJSON
files in public/data/hazards, runtime-cache OpenStreetMap tiles and GeoRisk
dynamic-layer images (CacheFirst, 7-day expiry), and show an offline banner when
navigator.onLine flips false. Ensure Firestore's built-in IndexedDB persistence
is enabled (initializeFirestore with persistentLocalCache in lib/sdk-shim.js).
```

### W-02 · Real-time incident map instead of polling
```
StrategicDashboard + GISMapPage currently fetch incidents via react-query polling.
Add entities.Incident.subscribe(onChange) to src/lib/sdk-shim.js using Firestore
onSnapshot (collection 'incidents', orderBy created_at desc, limit 200), then
replace the useQuery hooks for incidents/alerts on those two pages with the
subscription so the Ops map updates live — keep react-query keys invalidated
consistently. Reuse the existing isInitialSnapshot pattern from lib/firebase.js.
```

### W-03 · Facilities ↔ hazard auto-exposure refresh job
```
Facilities stores flood/landslide/storm_surge exposure tags computed at submit
time, but nothing recomputes when hazard layers change. Add a "Recompute exposure"
button in DataLayers.jsx (visible to admin) that streams facilities through
getSpatialExposure for every active layer in batches, updates changed rows via
createMany-style batching (add an updateMany to the SDK), and reports
"X facilities re-tagged".
```

### W-04 · Kill the fake agency panels
```
components/AgencyDataPanel.jsx shows hardcoded advisory text ("Thunderstorm
Advisory #5, 15 mins ago"). Replace it with a live fetch of the PHIVOLCS RSS
(https://www.phivolcs.dost.gov.ph/it_earthquake/earthquake_rss.xml through a
CORS proxy or a small Cloud Function that returns parsed JSON — see functions/
askBantayGateway as a template) plus the PAGASA weather bulletin RSS; render the
same AgencyAlert cards the Android app shows, with the source URL opening in a
new tab.
```

### W-05 · Route the web chatbot through the Cloud Function
```
components/BoyKalasagChat.jsx calls the Gemini REST API with a key embedded in
the bundle. Switch sendMessage to httpsCallable(getFunctions(),
'askBantayGateway') (already deployed server-side with the GEMINI_API_KEY
secret), passing { message, context }. Delete VITE_GEMINI_API_KEY usage and
document the removal in frontend/.env.example.
```

### W-06 · Shared severity vocabulary audit
```
Severity strings drift across the codebase (low/medium/moderate/high/very_high/
critical). Grep the frontend and define one canonical list in lib/constants.js;
normalize on read (getSpatialExposure already maps a few aliases). Print all
places where an unknown severity would fall back to grey/	default styling and
tighten them. Then do the same mapping in the Android AlertsView color
`when(alert.severity)` block — 'very_high' currently gets NO special color while
'critical' does.
```

### W-07 · Export/printable sitrep
```
Add a "Situational Report" export to StrategicDashboard: compose total active
alerts, open incidents by municipality, dispatch coverage, and check-in counts
into a printable view (window.print + print CSS) and a CSV download
(PapaParse-free: build rows manually). Include timestamp and the logged-in
dispatcher name in the header for accountability.
```

---

## PART 5 — Repo / process prompts

### G-01 · CI pipeline
```
Create .github/workflows/ci.yml that runs on push+PR: (1) frontend job —
npm ci, eslint, vite build in ./frontend; (2) android job — setup-android +
gradle assembleDebug with a google-services.json restored from a GitHub secret
(GOOGLE_SERVICES_JSON). Fail the PR if either breaks. Add build badges to README.md.
```

### G-02 · Secrets & history hygiene
```
Audit the full git history for secrets (a Gemini key was previously committed in
ChatViewModel.kt). Scan with gitleaks, rewrite history if any other secrets turn
up, and add .gitleaks.toml + a pre-commit hook so keys can't be committed again.
```

### G-03 · Testing baseline
```
There are only template tests. Add: (Android) unit tests for
CamNorteGeography slug logic and GisRepository.advanceAssignmentStatus using
FirestoreLocal emulator or fakes; (Web) vitest coverage for lib/spatial.js
getSpatialExposure and lib/analytics-engine.js predictHazardImpact with fixture
GeoJSON; wire both into npm/gradle test tasks and CI.
```

### G-04 · .idea cleanup
```
The .idea directory is committed. Decide: keep shareable settings only
(codeStyles, inspectionProfiles) and untrack user-specific files
(deploymentTargetSelector.xml, etc.) without breaking Android Studio's project
state — show the exact git commands.
```

---

## Suggested order of execution
1. **P-01 → P-07** (nothing works without them)
2. **M-01 → M-06** hardening, then **F-01 → F-07** features
3. **W-01 → W-07** web parity
4. **D-01/D-02** data refresh + **G-01 → G-04** process

See `CODEBASE_AUDIT.md` for the full list of what was already fixed.
