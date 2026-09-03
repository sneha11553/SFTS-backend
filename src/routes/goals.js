const express = require('express');
const pool = require('../db');
const { requireAuth } = require('../middleware/auth');

const router = express.Router();
router.use(requireAuth);

const VALID_GOALS = ['loss', 'gain', 'recomposition'];
const VALID_ENVS = ['gym', 'home'];

// GET active goal
router.get('/active', async (req, res) => {
  try {
    const result = await pool.query(
      'SELECT * FROM goals WHERE user_id=$1 AND is_active=TRUE ORDER BY created_at DESC LIMIT 1',
      [req.user.id]
    );
    res.json(result.rows[0] || null);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Failed to load goal' });
  }
});

// REQ-8/9/10, Business Rule 5.5: one active goal at a time; new choice replaces it
router.post('/', async (req, res) => {
  const { goal_type, environment } = req.body;
  if (!VALID_GOALS.includes(goal_type)) {
    return res.status(400).json({ error: `goal_type must be one of ${VALID_GOALS.join(', ')}` });
  }
  const env = VALID_ENVS.includes(environment) ? environment : 'gym';

  const client = await pool.connect();
  try {
    await client.query('BEGIN');
    await client.query('UPDATE goals SET is_active=FALSE WHERE user_id=$1 AND is_active=TRUE', [req.user.id]);
    const result = await client.query(
      `INSERT INTO goals (user_id, goal_type, environment, is_active) VALUES ($1,$2,$3,TRUE) RETURNING *`,
      [req.user.id, goal_type, env]
    );
    await client.query('COMMIT');
    res.status(201).json(result.rows[0]);
  } catch (err) {
    await client.query('ROLLBACK');
    console.error(err);
    res.status(500).json({ error: 'Failed to set goal' });
  } finally {
    client.release();
  }
});

module.exports = router;
