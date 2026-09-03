const express = require('express');
const pool = require('../db');
const { requireAuth } = require('../middleware/auth');

const router = express.Router();
router.use(requireAuth);

// REQ-21/22: consolidated report -> BMI, maintenance calories, goal, plan summary, sleep/activity trend
router.get('/', async (req, res) => {
  try {
    const profileResult = await pool.query('SELECT * FROM health_profile WHERE user_id=$1', [req.user.id]);
    const profile = profileResult.rows[0];

    const goalResult = await pool.query(
      'SELECT * FROM goals WHERE user_id=$1 AND is_active=TRUE ORDER BY created_at DESC LIMIT 1',
      [req.user.id]
    );
    const goal = goalResult.rows[0] || null;

    let dietPlan = null;
    let workoutDayCount = 0;
    if (goal) {
      const dietResult = await pool.query('SELECT * FROM diet_plans WHERE goal_id=$1 ORDER BY id DESC LIMIT 1', [goal.id]);
      dietPlan = dietResult.rows[0] || null;
      const workoutResult = await pool.query('SELECT COUNT(*) FROM workout_plans WHERE goal_id=$1', [goal.id]);
      workoutDayCount = parseInt(workoutResult.rows[0].count);
    }

    const trendResult = await pool.query(
      `SELECT log_date, sleep_hours, activity_type, activity_minutes
       FROM sleep_activity_log WHERE user_id=$1 ORDER BY log_date DESC LIMIT 14`,
      [req.user.id]
    );

    res.json({
      profile,
      goal,
      diet_plan: dietPlan,
      workout_days: workoutDayCount,
      recent_trend: trendResult.rows.reverse()
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Failed to build report' });
  }
});

module.exports = router;
