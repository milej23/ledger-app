const express = require('express');
const db      = require('../db');
const router  = express.Router();

// GET /transactions
// Returns all transactions for the signed-in user, newest first.
router.get('/', async (req, res) => {
  try {
    const { rows } = await db.query(
      `SELECT id, amount::float8 AS amount, cat, description AS desc,
              is_income AS "isIncome", ts::float8 AS ts
       FROM transactions
       WHERE user_id = $1
       ORDER BY ts DESC
       LIMIT 500`,
      [req.user.uid]
    );
    res.json(rows);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Database error' });
  }
});

// Matches the client-side cap in frontend/src/utils/parser.js — kept in sync
// so a direct API call can't insert amounts the app itself would never send.
const MAX_AMOUNT = 10_000_000;

// Fallback id for clients that don't send one — Date.now() alone can collide
// when two inserts land in the same millisecond.
const makeId = (suffix) => `${Date.now()}-${Math.random().toString(36).slice(2, 8)}-${suffix}`;

// POST /transactions
// Creates a new transaction. Body: { id, amount, cat, desc, isIncome, ts }
router.post('/', async (req, res) => {
  const { id, cat, isIncome, ts } = req.body;
  const amount = Number(req.body.amount);
  const desc = typeof req.body.desc === 'string' ? req.body.desc.trim() : '';

  if (!Number.isFinite(amount) || amount <= 0 || amount >= MAX_AMOUNT) {
    return res.status(400).json({ error: 'amount must be a number greater than 0 and less than 10,000,000' });
  }
  if (!desc) return res.status(400).json({ error: 'desc is required' });

  try {
    const { rows } = await db.query(
      `INSERT INTO transactions (id, user_id, amount, cat, description, is_income, ts)
       VALUES ($1, $2, $3, $4, $5, $6, $7)
       RETURNING id, amount::float8 AS amount, cat, description AS desc,
                 is_income AS "isIncome", ts::float8 AS ts`,
      [
        id || makeId('tx'),
        req.user.uid,
        amount,
        typeof cat === 'string' && cat.trim() ? cat.trim().slice(0, 32) : 'other',
        desc.slice(0, 300),
        isIncome === true,
        Number.isFinite(ts) ? ts : Date.now(),
      ]
    );
    res.status(201).json(rows[0]);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Database error' });
  }
});

// DELETE /transactions/:id
// Deletes a single transaction (only if it belongs to the signed-in user).
router.delete('/:id', async (req, res) => {
  try {
    await db.query(
      'DELETE FROM transactions WHERE id = $1 AND user_id = $2',
      [req.params.id, req.user.uid]
    );
    res.json({ ok: true });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Database error' });
  }
});

// DELETE /transactions
// Clears all transactions for the signed-in user.
router.delete('/', async (req, res) => {
  try {
    await db.query('DELETE FROM transactions WHERE user_id = $1', [req.user.uid]);
    res.json({ ok: true });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Database error' });
  }
});

module.exports = router;
