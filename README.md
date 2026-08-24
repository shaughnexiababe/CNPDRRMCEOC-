# CN-PDRRMO Emergency Operations Center (CamNorte EOC)

A comprehensive, cross-platform Decision Support System (DSS) for the **Camarines Norte Provincial Disaster Risk Reduction and Management Office (CN-PDRRMO)**. Built to help local government staff, field responders, and citizens manage disaster response with real-time analytics, hazard tracking, and resource management.

---

## 🏗️ Architecture

The system is composed of three main components:

### 1. Web Command Center (`/frontend`)
Progressive Web App (React 18 + Vite + Tailwind CSS + MapLibre GL). Provides the provincial overview, incident and hazard management, facility and unit registries, analytics dashboards (prescriptive, predictive, spatial), user administration, and the **Boy Kalasag** AI assistant.
- Direct Firebase connection via the local Firebase SDK (`src/lib/sdk-shim.js`).
- Deploys on Vercel (see `vercel.json`).

### 2. Android Mobile App (`/app`)
Native Android app (Kotlin, Jetpack Compose, Hilt, MapLibre SDK, Room, Firebase). Serves citizens and field responders on the move:
- Field incident reporting with GPS geotagging + **offline outbox** for zero-connectivity areas
- Real-time evacuation-center and unit tracking map, hazard alert feed, shift notes
- **Bantay** AI assistant for emergency guidance + background GPS tracking service for on-duty responders

### 3. Firebase Backend (`/functions`)
Cloud Functions + Firestore as the real-time store — shared backend for web and Android:
- Role-protected staff invitations, FCM hazard/dispatch notifications, alert expiry sweeps, and a secure AI gateway callable
- `firestore.rules`, `storage.rules`, and `firestore.indexes.json` are versioned at the repo root

### 4. SDK (`/sdk`)
Publishable reference copy of the Firebase-backed client library used by the web app (kept in sync with `frontend/src/lib/sdk-shim.js`).

---

## 🔥 Firebase usage

| Service | Used for |
|---|---|
| **Firestore** | All application data: users, incidents (incl. inline base64 photos), units, assignments, hazard alerts, facilities, hazard layers, shift notes, barangay assessments, checkins |
| **Firebase Auth** | Email/password sign-in (citizen self-registration; staff via admin invite) |
| **Firebase Cloud Messaging** | Hazard alerts to citizens; critical-incident pushes to EOC staff (send is server-side via the Vercel routes) |
| ~~Cloud Storage~~ / ~~Cloud Functions~~ | **Not used — free-route**: both require the Blaze plan. Photos are inline base64 in Firestore docs; backend logic runs as Vercel API routes in `frontend/api/` (staff invites, FCM sends, alert expiry, AI gateway). `functions/` + `storage.rules` are kept as the Blaze-ready alternative. |

---

## 🛠️ Technology Highlights & Features

- **Offline-First**: offline report queue (Room) on Android; MapLibre tile caching for map continuity
- **Offline Hazard Overlays**: provincial flood/landslide GeoJSON rendered client-side without a tile server
- **Real-Time Firestore listeners** for the operations map on both platforms
- **Role-based access**: citizen / eoc_personnel / admin — enforced in the UI **and** by Firestore security rules
- **AI integration**: Gemini-based assistant (Super Batang Kalasag) with keyword intents (`[TRIGGER_SOS]`, map/alert navigation)
- **Agency integrations**: PHIVOLCS & PAGASA RSS feeds; hazard datasets aligned with HazardHunter PH / GeoRisk (see `DATA_GUIDE.md`)

---

## 🛠️ Getting Started

### Web Development
```bash
cd frontend
cp .env.example .env      # fill in your Firebase web-app config
npm install
npm run dev               # local dev server
npm run build             # production build (verified ✓)
npm run lint              # eslint (verified ✓)
```

### Android Development
1. Open the project root in **Android Studio**.
2. Follow **Part 0** of [`ANDROID_STUDIO_PROMPTS.md`](ANDROID_STUDIO_PROMPTS.md) — you need a `google-services.json` matching `applicationId "com.cnpdrrmceoc"` and a `GEMINI_API_KEY` entry in `local.properties`.
3. Sync Gradle, then Run on an emulator or device.

### Deployment (both)
```bash
firebase deploy --only firestore:rules,firestore:indexes,storage,functions
```

## Roles & permissions
| Role | Android | Web |
|---|---|---|
| `citizen` | Report incidents, SOS, view alerts/facilities | Strategic + visual dashboards, field reporting |
| `eoc_personnel` | All citizen features + Shift Notes, response tracking | + Operations Center, Incidents, Alerts, Layers, Facilities, Units, Assessments, Shift Notes |
| `admin` | + User Management | + Users, all admin tooling |

---

## 📚 Project Documentation
- [`CODEBASE_AUDIT.md`](CODEBASE_AUDIT.md) — full audit: every defect found and what was fixed (2026-08-24).
- [`ANDROID_STUDIO_PROMPTS.md`](ANDROID_STUDIO_PROMPTS.md) — setup checklist + copy-paste AI prompts for continued development.
- [`DATA_GUIDE.md`](DATA_GUIDE.md) — how to refresh the hazard GeoJSON datasets.
- [`ROADMAP.md`](ROADMAP.md) — proposed future enhancements.

## Note on AI assistants
The AI features (text generation) use the Gemini API. On Android, pass `GEMINI_API_KEY` via `local.properties`; on web, `VITE_GEMINI_API_KEY` (dev) or the deployed `askBantayGateway` Cloud Function (production).

---

*Built with ❤️ for the Camarines Norte community.*
