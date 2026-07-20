// Run with:  node db/migrate.js
// This creates the tables if they don't exist yet.

require('dotenv').config();
const db = require('./index');

async function migrate() {
  await db.query(`
    CREATE TABLE IF NOT EXISTS transactions (
      id          TEXT        PRIMARY KEY,       -- e.g. "1721234567890-tx"
      user_id     TEXT        NOT NULL,          -- Firebase UID
      amount      NUMERIC(12,2) NOT NULL,
      cat         TEXT        NOT NULL DEFAULT 'other',
      description TEXT        NOT NULL,
      is_income   BOOLEAN     NOT NULL DEFAULT FALSE,
      ts          BIGINT      NOT NULL,          -- Unix ms timestamp
      created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
    );
  `);

  // Index so per-user queries are fast even with millions of rows
  await db.query(`
    CREATE INDEX IF NOT EXISTS idx_tx_user_ts ON transactions (user_id, ts DESC);
  `);

  // ── Splitwise-style expense sharing ────────────────────
  await db.query(`
    CREATE TABLE IF NOT EXISTS split_people (
      id          TEXT        PRIMARY KEY,
      user_id     TEXT        NOT NULL,          -- Firebase UID (owner of this contact list)
      name        TEXT        NOT NULL,
      created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
    );
  `);

  await db.query(`
    CREATE INDEX IF NOT EXISTS idx_split_people_user ON split_people (user_id);
  `);

  await db.query(`
    CREATE TABLE IF NOT EXISTS split_expenses (
      id          TEXT        PRIMARY KEY,
      user_id     TEXT        NOT NULL,
      description TEXT        NOT NULL,
      amount      NUMERIC(12,2) NOT NULL,
      paid_by     TEXT        NOT NULL,          -- split_people.id of whoever paid
      ts          BIGINT      NOT NULL,
      created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
    );
  `);

  await db.query(`
    CREATE INDEX IF NOT EXISTS idx_split_expenses_user_ts ON split_expenses (user_id, ts DESC);
  `);

  // One row per person involved in an expense, holding how much of the
  // total that person owes the payer. The payer themself is only listed
  // here if they also owe part of their own expense (e.g. an equal split
  // that includes them) — omitting them means they don't owe anyone.
  await db.query(`
    CREATE TABLE IF NOT EXISTS split_shares (
      id          TEXT        PRIMARY KEY,
      expense_id  TEXT        NOT NULL REFERENCES split_expenses(id) ON DELETE CASCADE,
      person_id   TEXT        NOT NULL,
      amount      NUMERIC(12,2) NOT NULL
    );
  `);

  await db.query(`
    CREATE INDEX IF NOT EXISTS idx_split_shares_expense ON split_shares (expense_id);
  `);

  // Named groups of people (e.g. "Roommates", "Japan trip"), listed on the
  // Split screen. Membership is a simple array since a person can belong to
  // several groups and groups are only ever queried by their owner.
  await db.query(`
    CREATE TABLE IF NOT EXISTS split_groups (
      id          TEXT        PRIMARY KEY,
      user_id     TEXT        NOT NULL,
      name        TEXT        NOT NULL,
      member_ids  TEXT[]      NOT NULL DEFAULT '{}',
      created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
    );
  `);

  await db.query(`
    CREATE INDEX IF NOT EXISTS idx_split_groups_user ON split_groups (user_id);
  `);

  // Expenses can optionally belong to a group. Deleting a group un-tags its
  // expenses rather than deleting them, so expense history is preserved.
  await db.query(`
    ALTER TABLE split_expenses
    ADD COLUMN IF NOT EXISTS group_id TEXT REFERENCES split_groups(id) ON DELETE SET NULL;
  `);

  console.log('Migration complete.');
}

module.exports = migrate;

// Still runnable standalone: node db/migrate.js
if (require.main === module) {
  migrate()
    .then(() => process.exit(0))
    .catch(err => { console.error(err); process.exit(1); });
}
