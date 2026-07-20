const express = require('express');
const db      = require('../db');
const router  = express.Router();

const MAX_AMOUNT = 10_000_000;

// Fallback id for clients that don't send one — Date.now() alone can collide
// when two inserts land in the same millisecond.
const makeId = (suffix) => `${Date.now()}-${Math.random().toString(36).slice(2, 8)}-${suffix}`;

// ── People ──────────────────────────────────────────────

// GET /split/people
router.get('/people', async (req, res) => {
  try {
    const { rows } = await db.query(
      `SELECT id, name FROM split_people WHERE user_id = $1 ORDER BY name ASC`,
      [req.user.uid]
    );
    res.json(rows);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Database error' });
  }
});

// POST /split/people   Body: { id, name }
router.post('/people', async (req, res) => {
  const name = typeof req.body.name === 'string' ? req.body.name.trim() : '';
  if (!name) return res.status(400).json({ error: 'name is required' });

  try {
    const { rows } = await db.query(
      `INSERT INTO split_people (id, user_id, name)
       VALUES ($1, $2, $3)
       RETURNING id, name`,
      [req.body.id || makeId('p'), req.user.uid, name.slice(0, 64)]
    );
    res.status(201).json(rows[0]);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Database error' });
  }
});

// DELETE /split/people/:id
// Removes the person, along with any expenses they paid for and any shares
// they hold in other expenses (so balances stay consistent afterwards).
// Also drops them from any groups they were a member of.
router.delete('/people/:id', async (req, res) => {
  const { id } = req.params;
  const { uid } = req.user;
  try {
    // Four related writes — run atomically so a failure can't leave, say,
    // a deleted person still holding shares in other expenses.
    await db.withTransaction(async (client) => {
      await client.query(
        `DELETE FROM split_expenses WHERE paid_by = $1 AND user_id = $2`,
        [id, uid]
      );
      await client.query(
        `DELETE FROM split_shares
         WHERE person_id = $1
           AND expense_id IN (SELECT id FROM split_expenses WHERE user_id = $2)`,
        [id, uid]
      );
      await client.query(
        `UPDATE split_groups SET member_ids = array_remove(member_ids, $1) WHERE user_id = $2`,
        [id, uid]
      );
      // A group left with fewer than 2 members can't split anything anymore —
      // delete it. Its expenses are un-tagged by the FK's ON DELETE SET NULL.
      await client.query(
        `DELETE FROM split_groups
         WHERE user_id = $1 AND COALESCE(array_length(member_ids, 1), 0) < 2`,
        [uid]
      );
      await client.query(
        `DELETE FROM split_people WHERE id = $1 AND user_id = $2`,
        [id, uid]
      );
    });
    res.json({ ok: true });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Database error' });
  }
});

// ── Groups ──────────────────────────────────────────────

// GET /split/groups
router.get('/groups', async (req, res) => {
  try {
    const { rows } = await db.query(
      `SELECT id, name, member_ids AS "memberIds" FROM split_groups WHERE user_id = $1 ORDER BY name ASC`,
      [req.user.uid]
    );
    res.json(rows);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Database error' });
  }
});

// POST /split/groups   Body: { id, name, memberIds }
router.post('/groups', async (req, res) => {
  const { uid } = req.user;
  const name = typeof req.body.name === 'string' ? req.body.name.trim() : '';
  const memberIds = Array.isArray(req.body.memberIds) ? [...new Set(req.body.memberIds)] : [];

  if (!name) return res.status(400).json({ error: 'name is required' });
  if (memberIds.length < 2) return res.status(400).json({ error: 'a group needs at least 2 people' });

  try {
    const { rows: known } = await db.query(
      `SELECT id FROM split_people WHERE user_id = $1 AND id = ANY($2::text[])`,
      [uid, memberIds]
    );
    if (known.length !== memberIds.length) {
      return res.status(400).json({ error: 'one or more people were not found' });
    }

    const { rows } = await db.query(
      `INSERT INTO split_groups (id, user_id, name, member_ids)
       VALUES ($1, $2, $3, $4)
       RETURNING id, name, member_ids AS "memberIds"`,
      [req.body.id || makeId('grp'), uid, name.slice(0, 64), memberIds]
    );
    res.status(201).json(rows[0]);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Database error' });
  }
});

// DELETE /split/groups/:id
// The group's expenses are kept, just un-tagged (see the group_id FK's ON DELETE SET NULL).
router.delete('/groups/:id', async (req, res) => {
  try {
    await db.query(
      'DELETE FROM split_groups WHERE id = $1 AND user_id = $2',
      [req.params.id, req.user.uid]
    );
    res.json({ ok: true });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Database error' });
  }
});

// ── Expenses ────────────────────────────────────────────

// GET /split/expenses
router.get('/expenses', async (req, res) => {
  try {
    const { rows } = await db.query(
      `SELECT e.id, e.description, e.amount::float8 AS amount,
              e.paid_by AS "paidBy", e.group_id AS "groupId", e.ts::float8 AS ts,
              COALESCE(
                json_agg(json_build_object('personId', s.person_id, 'amount', s.amount::float8))
                  FILTER (WHERE s.id IS NOT NULL),
                '[]'
              ) AS shares
       FROM split_expenses e
       LEFT JOIN split_shares s ON s.expense_id = e.id
       WHERE e.user_id = $1
       GROUP BY e.id
       ORDER BY e.ts DESC
       LIMIT 500`,
      [req.user.uid]
    );
    res.json(rows);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Database error' });
  }
});

// Shared by POST/PUT: parses and validates an expense body, checking that
// every referenced person (and group, if any) belongs to this user.
// Returns { error } or { clean: { description, amount, paidBy, groupId, shares } }.
async function validateExpenseBody(uid, body) {
  const description = typeof body.description === 'string' ? body.description.trim() : '';
  const amount = Number(body.amount);
  const paidBy = typeof body.paidBy === 'string' ? body.paidBy : '';
  const groupId = typeof body.groupId === 'string' && body.groupId ? body.groupId : null;
  const shares = Array.isArray(body.shares) ? body.shares : [];

  if (!description) return { error: 'description is required' };
  if (!Number.isFinite(amount) || amount <= 0 || amount >= MAX_AMOUNT) {
    return { error: 'amount must be a number greater than 0 and less than 10,000,000' };
  }
  if (!paidBy) return { error: 'paidBy is required' };
  if (shares.length === 0) return { error: 'shares must be a non-empty array' };

  const cleanShares = [];
  for (const s of shares) {
    const personId = typeof s.personId === 'string' ? s.personId : '';
    const shareAmount = Number(s.amount);
    if (!personId || !Number.isFinite(shareAmount) || shareAmount <= 0) {
      return { error: 'each share needs a personId and a positive amount' };
    }
    cleanShares.push({ personId, amount: shareAmount });
  }

  const total = cleanShares.reduce((a, s) => a + s.amount, 0);
  if (Math.abs(total - amount) > 0.01) {
    return { error: 'shares must add up to the total amount' };
  }

  const personIds = [...new Set([paidBy, ...cleanShares.map(s => s.personId)])];
  const { rows: known } = await db.query(
    `SELECT id FROM split_people WHERE user_id = $1 AND id = ANY($2::text[])`,
    [uid, personIds]
  );
  if (known.length !== personIds.length) {
    return { error: 'one or more people were not found' };
  }

  if (groupId) {
    const { rows: grp } = await db.query(
      `SELECT id FROM split_groups WHERE id = $1 AND user_id = $2`,
      [groupId, uid]
    );
    if (grp.length === 0) return { error: 'group not found' };
  }

  return { clean: { description: description.slice(0, 300), amount, paidBy, groupId, shares: cleanShares } };
}

// POST /split/expenses
// Body: { id, description, amount, paidBy, groupId, shares: [{ personId, amount }], ts }
router.post('/expenses', async (req, res) => {
  const { uid } = req.user;
  try {
    const { error, clean } = await validateExpenseBody(uid, req.body);
    if (error) return res.status(400).json({ error });

    const expenseId = req.body.id || makeId('exp');
    const ts = Number.isFinite(req.body.ts) ? req.body.ts : Date.now();

    // Expense and shares must land together — a failure partway through
    // would otherwise leave an expense whose shares don't sum to its total.
    await db.withTransaction(async (client) => {
      await client.query(
        `INSERT INTO split_expenses (id, user_id, description, amount, paid_by, group_id, ts)
         VALUES ($1, $2, $3, $4, $5, $6, $7)`,
        [expenseId, uid, clean.description, clean.amount, clean.paidBy, clean.groupId, ts]
      );

      for (let i = 0; i < clean.shares.length; i++) {
        const s = clean.shares[i];
        await client.query(
          `INSERT INTO split_shares (id, expense_id, person_id, amount)
           VALUES ($1, $2, $3, $4)`,
          [`${expenseId}-s${i}`, expenseId, s.personId, s.amount]
        );
      }
    });

    res.status(201).json({ id: expenseId, ...clean, ts });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Database error' });
  }
});

// PUT /split/expenses/:id
// Body: { description, amount, paidBy, groupId, shares: [{ personId, amount }] }
// Replaces the expense's fields and its full set of shares; the original ts is kept.
router.put('/expenses/:id', async (req, res) => {
  const { uid } = req.user;
  const { id } = req.params;
  try {
    const { rows: existing } = await db.query(
      `SELECT id FROM split_expenses WHERE id = $1 AND user_id = $2`,
      [id, uid]
    );
    if (existing.length === 0) return res.status(404).json({ error: 'expense not found' });

    const { error, clean } = await validateExpenseBody(uid, req.body);
    if (error) return res.status(400).json({ error });

    // Same all-or-nothing requirement as POST: the shares are deleted and
    // re-inserted, so a failure partway through must roll everything back.
    await db.withTransaction(async (client) => {
      await client.query(
        `UPDATE split_expenses
         SET description = $1, amount = $2, paid_by = $3, group_id = $4
         WHERE id = $5 AND user_id = $6`,
        [clean.description, clean.amount, clean.paidBy, clean.groupId, id, uid]
      );

      await client.query(`DELETE FROM split_shares WHERE expense_id = $1`, [id]);
      for (let i = 0; i < clean.shares.length; i++) {
        const s = clean.shares[i];
        await client.query(
          `INSERT INTO split_shares (id, expense_id, person_id, amount)
           VALUES ($1, $2, $3, $4)`,
          [`${id}-s${i}`, id, s.personId, s.amount]
        );
      }
    });

    const { rows } = await db.query(
      `SELECT ts FROM split_expenses WHERE id = $1`,
      [id]
    );
    res.json({ id, ...clean, ts: Number(rows[0].ts) });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Database error' });
  }
});

// DELETE /split/expenses/:id
router.delete('/expenses/:id', async (req, res) => {
  try {
    await db.query(
      'DELETE FROM split_expenses WHERE id = $1 AND user_id = $2',
      [req.params.id, req.user.uid]
    );
    res.json({ ok: true });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Database error' });
  }
});

module.exports = router;
