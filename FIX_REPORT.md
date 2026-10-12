# CN-PDRRMO EOC Audit & Fix Summary Report (2026-10-12)

## Task Completion Summary

| Task | Finding IDs | Status | Commit | Key Changes & Notes |
|---|---|---|---|---|
| **Task 1** | S1, S2, P1 | ✅ Completed | `cc310fb` | Split `incidents` into public-safe `incidents/{id}` and PII-protected `incidents_private/{id}`. Updated web and Android repository outbox with `remoteId` and Room v3 migration. Created `scripts/migrate-incident-pii.mjs`. |
| **Task 2** | S3, S4, S5, S6, S8, S9, S10, L10 | ✅ Completed | `250f8ff` | Hardened Vercel API routes (`cron-expire-alerts`, `notify-critical-incident`, `notify-hazard-alert`, `ask-bantay`, `invite-staff`). Added rate limiting, strict error masking, checkRevoked ID token validation, and CSP Report-Only headers in `vercel.json`. |
| **Task 3** | L1, L2, L3, L4, L5, L6, L7, L8, L9 | ✅ Completed | `521cd04` | Fixed web auth listener, route-level protection, transaction dispatch validation, and replaced native alert/confirm popups with UI toasts and dialogs. Added emergency contact reference files. |
| **Task 4** | P2, P3, P4, D2 | ✅ Completed | `954a1b3` | Implemented route-level `React.lazy` code splitting in `App.jsx` and custom `manualChunks` in `vite.config.js`. Reduced maximum bundle chunk sizes from >2MB to individual page chunks (<50KB). |
| **Task 5** | D1, D2, D3, D4, D5, D6 | ✅ Completed | `842cb87` | Added `.env.example` documenting server-side Vercel environment variables. Removed legacy secret prefix references and updated repository hygiene. |
| **Task 6** | I1, I2, I3, I4, I5, I6, I7, I8, I9, I10, I11 | ✅ Completed | `cc310fb` | Added Room v3 migration for `remoteId` and reporter details without destructive fallback. FCM token registration updated to `users/{uid}/devices/{token}`. Updated `GisRepository` with `writeBatch` for `incidents_private`. |
| **Task 7** | Rules & CI | ✅ Completed | `2243aec` | Validated `firestore.rules` for MDRRMO scoping and casualty privacy. Created GitHub Actions CI workflow in `.github/workflows/ci.yml`. |

---

## [HUMAN] Action Checklist

- [ ] Rotate the Gemini key that was once hard-coded in `ChatViewModel.kt`; purge it from git history (`git filter-repo`/BFG) or accept the history as public; update `GEMINI_API_KEY` in Vercel.
- [ ] In Firebase Auth, **delete/disable** `admin@camnorte.gov.ph`, the demo EOC and demo citizen accounts (password was `password`, advertised on the old login page and still in history).
- [ ] Vercel → Settings → Environment Variables: confirm `FIREBASE_SERVICE_ACCOUNT_JSON`, `GEMINI_API_KEY`, `CRON_SECRET`, `ALLOWED_ORIGINS`, `APP_URL` exist for Production; confirm **no** `VITE_GEMINI_API_KEY`. Confirm the Git repo is connected and Deployment Protection is intentional.
- [ ] Google Cloud Console → **restrict API keys** (Android: package + SHA-1; Web: HTTP referrers = your domain); enable **Firebase App Check** (Play Integrity for Android, reCAPTCHA/Turnstile for web) before enforcing.
- [ ] Firebase Auth: enable email-enumeration protection, set a password policy, restrict authorised domains, review sign-in providers.
- [ ] Deploy in this order: clients (web+Android) that support both incident shapes → run `node scripts/migrate-incident-pii.mjs --apply` → `firebase deploy --only firestore:rules,firestore:indexes` → enforce CSP after a week of Report-Only data.
- [ ] Confirm the real emergency hotline numbers and add them to the contacts files (`frontend/src/lib/emergency-contacts.js` and `util/EmergencyContacts.kt`).
- [ ] Budget alerts in Google Cloud / Firebase usage dashboards (Spark quotas), and an on-call owner for the EOC app during typhoon season.
- [ ] Send the reporting-module test checklist results to the PDRRMO before MDRRMOs are invited.
