require('dotenv').config();

const express    = require('express');
const cors       = require('cors');
const helmet     = require('helmet');
const rateLimit  = require('express-rate-limit');
const requireAuth = require('./middleware/auth');
const transactions = require('./routes/transactions');
const split = require('./routes/split');

const app  = express();
const PORT = process.env.PORT || 3001;

// ── Security headers
app.use(helmet());

// ── CORS
// Native apps (iOS/Android) don't send an Origin header, so this only
// matters for browser-based clients (e.g. the web/PWA build). Set
// ALLOWED_ORIGINS in .env to a comma-separated list of exact origins
// (e.g. https://yourapp.com) that are allowed to call this API from a browser.
const allowedOrigins = (process.env.ALLOWED_ORIGINS || '')
  .split(',')
  .map((o) => o.trim())
  .filter(Boolean);

app.use(cors({
  origin(origin, callback) {
    if (!origin || allowedOrigins.includes(origin)) return callback(null, true);
    callback(new Error('Not allowed by CORS'));
  },
}));

// ── Parse JSON bodies
app.use(express.json());

// ── Rate limiting: 100 requests per minute per IP
app.use(rateLimit({ windowMs: 60_000, max: 100 }));

// ── Health check (no auth needed)
app.get('/health', (req, res) => res.json({ status: 'ok' }));

// ── All transaction routes require a valid Firebase token
app.use('/transactions', requireAuth, transactions);

// ── Splitwise-style expense sharing routes also require auth
app.use('/split', requireAuth, split);

// ── 404 handler
app.use((req, res) => res.status(404).json({ error: 'Not found' }));

// ── Global error handler
app.use((err, req, res, next) => {
  console.error(err);
  res.status(500).json({ error: 'Internal server error' });
});

// Create tables if they don't exist, then start serving.
const migrate = require('./db/migrate');
migrate()
  .then(() => app.listen(PORT, () => console.log(`Ledger API running on port ${PORT}`)))
  .catch(err => {
    console.error('Database migration failed — not starting server.', err);
    process.exit(1);
  });
