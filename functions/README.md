# Cloud Functions — status

**As of 2026-08, Cloud Functions deployment requires the Blaze (pay-as-you-go) billing plan.**
The project currently runs the **free route**: all behavior previously implemented here is
served by Vercel serverless API routes in [`../frontend/api/`](../frontend/api/):

| Cloud Function | Free-route equivalent |
|---|---|
| `inviteStaff` | `POST /api/invite-staff` |
| `onHazardAlertCreated` (FCM) | `POST /api/notify-hazard-alert` (called by clients after creating the alert) |
| `onCriticalIncident` (FCM) | `POST /api/notify-critical-incident` (called by clients after creating a critical incident) |
| `expireHazardAlerts` (hourly scheduler) | `GET /api/cron-expire-alerts` (Vercel Cron, hourly: premium / daily: hobby) |
| `askBantayGateway` (Gemini proxy) | `POST /api/ask-bantay` |

Required Vercel env vars: `FIREBASE_SERVICE_ACCOUNT_JSON`, `GEMINI_API_KEY`, `CRON_SECRET`
(see `frontend/.env.example`).

Keep this directory as the ready-to-deploy alternative if the project upgrades to Blaze:
`firebase deploy --only functions` plus `firebase functions:secrets:set GEMINI_API_KEY`.
