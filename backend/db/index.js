const { Pool } = require('pg');

// Pool reuses connections instead of opening a new one per query.
const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  // Cloud providers (Neon, Supabase, Railway) require SSL; localhost doesn't.
  ssl: process.env.DATABASE_URL && !process.env.DATABASE_URL.includes('localhost')
    ? { rejectUnauthorized: false }
    : false,
});

module.exports = {
  query: (text, params) => pool.query(text, params),

  // Runs fn(client) inside BEGIN/COMMIT on a single dedicated connection,
  // rolling back if fn throws. Use for multi-statement writes that must
  // succeed or fail together (pool.query alone may hop connections).
  withTransaction: async (fn) => {
    const client = await pool.connect();
    try {
      await client.query('BEGIN');
      const result = await fn(client);
      await client.query('COMMIT');
      return result;
    } catch (err) {
      await client.query('ROLLBACK');
      throw err;
    } finally {
      client.release();
    }
  },
};
