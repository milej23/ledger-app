# Ledger

A personal finance tracker built with Expo (React Native) and a Node.js/Express + PostgreSQL backend. Log expenses with plain-English input like `"lunch 45"`, split shared bills with friends, and track spending trends all synced across devices with Firebase authentication.

## Features

- **Natural language entry** — type `"lunch 45"` or `"paycheck 2000 income"` and it's parsed into an amount, category, and description automatically
- **Transaction history** with offline caching, so the app still works without a connection
- **Analytics** — spending trends and breakdowns over time
- **Calendar view** of transactions by day
- **Bill splitting** — Splitwise style shared expenses across people and groups, with running balances
- **Android home-screen widget** — a quick add popup for logging an expense without opening the app
- **Push notifications** for reminders
- **Firebase email/password authentication**, with per-user data isolation on the backend

## Tech stack

| Layer    | Tech |
|----------|------|
| Mobile   | Expo (React Native 0.81), React Navigation |
| Backend  | Node.js, Express, PostgreSQL |
| Auth     | Firebase Authentication (Admin SDK verifies tokens server-side) |
| Native   | Kotlin (Android home-screen widget + quick-add activity) |

## Project structure

```
finance app/
├── frontend/              Expo React Native app
│   ├── src/
│   │   ├── screens/       Home, Analytics, Calendar, Split, Settings, Auth
│   │   ├── hooks/         useTransactions (data + offline cache)
│   │   ├── utils/         Natural-language parser, categories
│   │   ├── api.js         HTTP client (attaches Firebase token)
│   │   └── firebase.js    Firebase config (Auth only)
│   └── android/           Native Android project (incl. home-screen widget)
│
├── backend/               Express API
│   ├── routes/            transactions.js, split.js
│   ├── middleware/auth.js Verifies Firebase ID tokens
│   ├── db/                PostgreSQL pool + migrations
│   └── server.js          Entry point
│
└── SETUP.md               Full step-by-step setup guide
```

## Quick start

See [SETUP.md](SETUP.md) for the full walkthrough (Firebase project setup, PostgreSQL, environment variables, running on a device). The short version:

```bash
# Backend
cd backend
npm install
cp .env.example .env   # fill in DATABASE_URL and FIREBASE_SERVICE_ACCOUNT_JSON
node db/migrate.js
npm run dev

# Frontend (in a new terminal)
cd frontend
npm install
npm start
```


### Running the native Android project directly

`frontend/android/` is a full, pre-generated native Android project (not just Expo config) — it includes the home-screen widget and quick-add native code, so it can't be run through Expo Go alone. To build and run it:

```bash
cd frontend
npm install
npx expo run:android   # builds and installs on a connected device/emulator
```

Or open `frontend/android/` directly in **Android Studio** and hit Run. Either way you'll need the Android SDK installed (via Android Studio's SDK Manager) and `frontend/android/local.properties` pointing at it (`sdk.dir=/path/to/Android/Sdk`) — that file is gitignored since the path is machine-specific.

## Security notes

- All API routes (except `/health`) require a valid Firebase ID token; the backend scopes every database query to the authenticated user, so one account can never read or modify another's data.
- CORS is restricted to an explicit origin allowlist (`ALLOWED_ORIGINS` in `backend/.env`) — required only if you host a web build; the native mobile app is unaffected.
- Never commit `backend/.env` or a Firebase service-account JSON file — both are gitignored by default.
