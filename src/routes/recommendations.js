const express = require('express');
const pool = require('../db');
const { requireAuth } = require('../middleware/auth');
const {
  generateWorkoutSplit,
  calculateTargetCalories,
  calculateMacros,
  dietHealthNotes
} = require('../utils/calculations');

const router = express.Router();
router.use(requireAuth);

// REQ-13/14/15: workout split for the user's active goal + environment + health issues
router.get('/workout', async (req, res) => {
  try {
    const goalResult = await pool.query(
      'SELECT * FROM goals WHERE user_id=$1 AND is_active=TRUE ORDER BY created_at DESC LIMIT 1',
      [req.user.id]
    );
    const goal = goalResult.rows[0];
    if (!goal) return res.status(404).json({ error: 'Set a goal first' });

    const profileResult = await pool.query('SELECT health_issues FROM health_profile WHERE user_id=$1', [req.user.id]);
    const healthIssues = profileResult.rows[0]?.health_issues || null;

    // Regenerate fresh each call so edits to profile/goal are always reflected
    const split = generateWorkoutSplit(goal.goal_type, goal.environment, healthIssues);

    await pool.query('DELETE FROM workout_plans WHERE goal_id=$1', [goal.id]);
    for (const day of split) {
      await pool.query(
        'INSERT INTO workout_plans (goal_id, day_name, exercises, day_order) VALUES ($1,$2,$3,$4)',
        [goal.id, day.day_name, day.exercises, day.day_order]
      );
    }

    res.json({
      goal_type: goal.goal_type,
      environment: goal.environment,
      days: split.map(d => ({ day_name: d.day_name, exercises: JSON.parse(d.exercises) }))
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Failed to generate workout split' });
  }
});

// REQ-16/17/18: diet plan for the user's active goal
router.get('/diet', async (req, res) => {
  try {
    const goalResult = await pool.query(
      'SELECT * FROM goals WHERE user_id=$1 AND is_active=TRUE ORDER BY created_at DESC LIMIT 1',
      [req.user.id]
    );
    const goal = goalResult.rows[0];
    if (!goal) return res.status(404).json({ error: 'Set a goal first' });

    const profileResult = await pool.query('SELECT * FROM health_profile WHERE user_id=$1', [req.user.id]);
    const profile = profileResult.rows[0];
    if (!profile) return res.status(404).json({ error: 'Profile not found' });

    const targetCalories = calculateTargetCalories(profile.maintenance_cal, goal.goal_type);
    const macros = calculateMacros(targetCalories, goal.goal_type);
    const notes = dietHealthNotes(profile.health_issues);

    await pool.query('DELETE FROM diet_plans WHERE goal_id=$1', [goal.id]);
    const insert = await pool.query(
      `INSERT INTO diet_plans (goal_id, target_calories, protein_g, carbs_g, fat_g, notes)
       VALUES ($1,$2,$3,$4,$5,$6) RETURNING *`,
      [goal.id, targetCalories, macros.protein_g, macros.carbs_g, macros.fat_g, notes]
    );

    res.json(insert.rows[0]);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Failed to generate diet plan' });
  }
});

module.exports = router;
