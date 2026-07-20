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

// ── Allow requests from your React Native app / Expo dev server
app.use(cors({
  origin: '*',  // Tighten this to your production domain later
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
