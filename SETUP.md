# Ledger — Full Stack Setup Guide

## What you're building

```
┌─────────────────────────────────────┐
│  React Native app (Expo)            │  ← your mobile app
│  • Shows transactions               │
│  • Natural language input           │
│  • Firebase Auth (login/signup)     │
└────────────────┬────────────────────┘
                 │ HTTPS (Bearer token)
┌────────────────▼────────────────────┐
│  Node.js + Express backend          │  ← your server
│  • Verifies Firebase token          │
│  • Reads/writes to PostgreSQL       │
└────────────────┬────────────────────┘
                 │ SQL
┌────────────────▼────────────────────┐
│  PostgreSQL database                │  ← your data store
│  • transactions table               │
│  • one row per transaction          │
└─────────────────────────────────────┘

Firebase handles ONLY authentication.
PostgreSQL stores ALL data.
```

---

## Step 1 — Install tools (do this once)

```bash
# Node.js (get from nodejs.org, pick the LTS version)
node --version   # should print v20 or higher

# Expo CLI
npm install -g expo-cli

# PostgreSQL  (get from postgresql.org or use a cloud DB — see Step 3)
psql --version
```

---

## Step 2 — Set up Firebase

Firebase gives you free email/password login. Here's how:

1. Go to https://console.firebase.google.com
2. Click **"Create a project"** → name it "ledger" → disable Google Analytics → Create
3. On the left sidebar click **"Authentication"** → **"Get started"** → enable **Email/Password**
4. On the left sidebar click the gear ⚙️ → **"Project settings"**
5. Scroll to **"Your apps"** → click the `</>` web icon → register an app → copy the config object
6. Open `frontend/src/firebase.js` and paste your values into `firebaseConfig`

**For the backend (Admin SDK):**
1. Still in Project settings → **"Service accounts"** tab
2. Click **"Generate new private key"** → download the JSON file
3. Open that JSON file and copy its entire contents
4. Paste it as a single line into `backend/.env` as `FIREBASE_SERVICE_ACCOUNT_JSON='{"type":...}'`

---

## Step 3 — Set up PostgreSQL

### Option A: Local (free, for development)

1. Install PostgreSQL from postgresql.org
2. Open the `psql` terminal:
   ```bash
   psql -U postgres
   ```
3. Create a database:
   ```sql
   CREATE DATABASE ledger;
   \q
   ```
4. Your connection string: `postgresql://postgres:yourpassword@localhost:5432/ledger`

### Option B: Cloud (recommended for production)

Free tiers on these services — all give you a PostgreSQL connection string:
- **Supabase** (supabase.com) — free 500 MB
- **Neon** (neon.tech) — free 0.5 GB
- **Railway** (railway.app) — free $5 credit/month

Just create a project, copy the connection string, and paste it as `DATABASE_URL` in your `.env`.

If using a cloud DB, uncomment `ssl: { rejectUnauthorized: false }` in `backend/db/index.js`.

---

## Step 4 — Configure and run the backend

```bash
cd backend

# Install dependencies
npm install

# Create your .env file
cp .env.example .env
# Now open .env and fill in DATABASE_URL and FIREBASE_SERVICE_ACCOUNT_JSON

# Create the database table
node db/migrate.js
# You should see: "Migration complete."

# Start the server
npm run dev
# You should see: "Ledger API running on port 3001"

# Test it works (in another terminal)
curl http://localhost:3001/health
# Should return: {"status":"ok"}
```

---

## Step 5 — Configure and run the frontend

```bash
cd frontend

# Install dependencies
npm install

# If your phone and laptop are on the same WiFi,
# edit src/api.js and change BASE_URL to your laptop's local IP:
# const BASE_URL = 'http://192.168.1.XX:3001';
# Find your IP with: ipconfig (Windows) or ifconfig (Mac/Linux)

# Start Expo
npm start
```

Expo will show a QR code. Install the **Expo Go** app on your phone and scan it.

---

## How the code works (what to learn)

### Frontend concepts

| File | What it does |
|------|-------------|
| `App.js` | Sets up navigation between screens |
| `src/firebase.js` | Connects to Firebase (Auth only) |
| `src/api.js` | Sends HTTP requests to your backend, auto-attaches the Firebase token |
| `src/hooks/useTransactions.js` | React hook — loads, adds, deletes transactions; falls back to local storage offline |
| `src/screens/HomeScreen.js` | Main screen: hero amount, period slider, transaction list |
| `src/screens/AuthScreen.js` | Email/password sign-in form using Firebase Auth |
| `src/utils/parser.js` | Converts natural language like "lunch 45" into `{ amount: 45, cat: 'food', desc: 'Lunch' }` |

### Backend concepts

| File | What it does |
|------|-------------|
| `server.js` | Creates the Express app, wires up middleware and routes |
| `middleware/auth.js` | Verifies the Firebase token on every request — this is how you know WHO is making the request |
| `routes/transactions.js` | The 4 API endpoints (GET, POST, DELETE one, DELETE all) |
| `db/index.js` | PostgreSQL connection pool — reuses connections efficiently |
| `db/migrate.js` | Creates the `transactions` table if it doesn't exist |

### The auth flow (most important concept)

```
1. User opens app → taps "Sign in" → enters email + password
2. Firebase returns an "ID token" (a JWT string, expires in 1 hour)
3. Your app sends this token in every API request:
      Authorization: Bearer eyJhbGci...
4. Your backend calls Firebase Admin SDK: verifyIdToken(token)
5. Firebase confirms the token is real → returns { uid: "abc123", email: "user@..." }
6. Your backend uses uid as the user identifier in PostgreSQL queries
```

This means: you never store passwords. Firebase handles that. You only store user data.

### PostgreSQL basics

```sql
-- See all your transactions:
SELECT * FROM transactions LIMIT 10;

-- Count per user:
SELECT user_id, COUNT(*) FROM transactions GROUP BY user_id;

-- Total spent this month:
SELECT SUM(amount) FROM transactions
WHERE is_income = false
AND ts > EXTRACT(EPOCH FROM date_trunc('month', NOW())) * 1000;
```

---

## Deploying to production

### Backend (pick one)

- **Railway** — connect your GitHub repo, set environment variables, done. Auto-deploys.
- **Render** — similar, free tier available.
- **Fly.io** — free 3 machines, great for Node.js.

### Frontend (publishing the app)

```bash
# Build for Android (APK for testing)
eas build --platform android --profile preview

# Submit to Google Play Store
eas submit --platform android

# Submit to Apple App Store
eas build --platform ios
eas submit --platform ios
```

You need an Expo account (`npm install -g eas-cli && eas login`) and developer accounts for the stores.

---

## Folder structure

```
finance app/
├── frontend/                 ← React Native (Expo)
│   ├── App.js                ← navigation root
│   ├── app.json              ← Expo config (app name, icons)
│   ├── babel.config.js
│   ├── package.json
│   └── src/
│       ├── firebase.js       ← Firebase config
│       ├── api.js            ← HTTP client
│       ├── theme.js          ← colors
│       ├── hooks/
│       │   └── useTransactions.js
│       ├── screens/
│       │   ├── HomeScreen.js
│       │   ├── AnalyticsScreen.js
│       │   ├── SettingsScreen.js
│       │   └── AuthScreen.js
│       ├── components/
│       │   ├── TransactionRow.js
│       │   └── InputBar.js
│       └── utils/
│           ├── parser.js
│           └── categories.js
│
├── backend/                  ← Node.js + Express
│   ├── server.js             ← entry point
│   ├── .env.example          ← copy to .env and fill in
│   ├── package.json
│   ├── db/
│   │   ├── index.js          ← PostgreSQL pool
│   │   └── migrate.js        ← creates tables
│   ├── middleware/
│   │   └── auth.js           ← Firebase token verification
│   └── routes/
│       └── transactions.js   ← API endpoints
│
└── SETUP.md                  ← this file
```
