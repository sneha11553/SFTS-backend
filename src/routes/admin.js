const express = require('express');
const pool = require('../db');
const { requireAuth, requireAdmin } = require('../middleware/auth');

const router = express.Router();
router.use(requireAuth, requireAdmin);

// REQ-23: admin dashboard of users and stats
router.get('/users', async (req, res) => {
  try {
    const result = await pool.query(
      `SELECT u.id, u.name, u.email, u.role, u.is_active, u.created_at,
              hp.bmi, hp.maintenance_cal
       FROM users u
       LEFT JOIN health_profile hp ON hp.user_id = u.id
       ORDER BY u.created_at DESC`
    );
    res.json(result.rows);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Failed to load users' });
  }
});

router.get('/stats', async (req, res) => {
  try {
    const totalUsers = await pool.query('SELECT COUNT(*) FROM users');
    const activeUsers = await pool.query('SELECT COUNT(*) FROM users WHERE is_active=TRUE');
    const goalBreakdown = await pool.query(
      `SELECT goal_type, COUNT(*) FROM goals WHERE is_active=TRUE GROUP BY goal_type`
    );
    res.json({
      total_users: parseInt(totalUsers.rows[0].count),
      active_users: parseInt(activeUsers.rows[0].count),
      goal_breakdown: goalBreakdown.rows
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Failed to load stats' });
  }
});

// REQ-24: deactivate/remove a user account
router.put('/users/:id/deactivate', async (req, res) => {
  try {
    const result = await pool.query(
      'UPDATE users SET is_active=FALSE WHERE id=$1 RETURNING id, name, email, is_active',
      [req.params.id]
    );
    if (result.rows.length === 0) return res.status(404).json({ error: 'User not found' });
    res.json(result.rows[0]);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Failed to deactivate user' });
  }
});

module.exports = router;
