const express = require('express');
const pool = require('../db');
const { requireAuth } = require('../middleware/auth');

const router = express.Router();
router.use(requireAuth);

// REQ-19/20: log daily sleep + activity (upsert per date)
router.post('/', async (req, res) => {
  const { log_date, sleep_hours, activity_type, activity_minutes } = req.body;
  if (!log_date) return res.status(400).json({ error: 'log_date is required (YYYY-MM-DD)' });

  try {
    const result = await pool.query(
      `INSERT INTO sleep_activity_log (user_id, log_date, sleep_hours, activity_type, activity_minutes)
       VALUES ($1,$2,$3,$4,$5)
       ON CONFLICT (user_id, log_date)
       DO UPDATE SET sleep_hours=$3, activity_type=$4, activity_minutes=$5
       RETURNING *`,
      [req.user.id, log_date, sleep_hours || null, activity_type || null, activity_minutes || null]
    );
    res.status(201).json(result.rows[0]);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Failed to log activity' });
  }
});

// last N days of logs, for trend display (REQ-22)
router.get('/', async (req, res) => {
  const days = parseInt(req.query.days) || 14;
  try {
    const result = await pool.query(
      `SELECT * FROM sleep_activity_log WHERE user_id=$1
       ORDER BY log_date DESC LIMIT $2`,
      [req.user.id, days]
    );
    res.json(result.rows.reverse());
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Failed to load logs' });
  }
});

module.exports = router;
