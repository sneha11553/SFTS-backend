const express = require('express');
const pool = require('../db');
const { requireAuth } = require('../middleware/auth');
const { calculateBMI, calculateMaintenanceCalories } = require('../utils/calculations');

const router = express.Router();
router.use(requireAuth);

// GET current user's health profile (REQ-5, REQ-6)
router.get('/', async (req, res) => {
  try {
    const result = await pool.query('SELECT * FROM health_profile WHERE user_id = $1', [req.user.id]);
    if (result.rows.length === 0) return res.status(404).json({ error: 'Profile not found' });
    res.json(result.rows[0]);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Failed to load profile' });
  }
});

// REQ-4, REQ-7, REQ-11: update profile -> recalculates BMI/calories automatically
router.put('/', async (req, res) => {
  const { age, gender, height_cm, weight_kg, health_issues } = req.body;
  try {
    const existing = await pool.query('SELECT * FROM health_profile WHERE user_id = $1', [req.user.id]);
    if (existing.rows.length === 0) return res.status(404).json({ error: 'Profile not found' });

    const current = existing.rows[0];
    const newAge = age ?? current.age;
    const newGender = gender ?? current.gender;
    const newHeight = height_cm ?? current.height_cm;
    const newWeight = weight_kg ?? current.weight_kg;
    const newIssues = health_issues !== undefined ? health_issues : current.health_issues;

    const bmi = calculateBMI(newHeight, newWeight);
    const maintenanceCal = calculateMaintenanceCalories(newHeight, newWeight, newAge, newGender);

    const result = await pool.query(
      `UPDATE health_profile
       SET age=$1, gender=$2, height_cm=$3, weight_kg=$4, health_issues=$5,
           bmi=$6, maintenance_cal=$7, updated_at=NOW()
       WHERE user_id=$8 RETURNING *`,
      [newAge, newGender, newHeight, newWeight, newIssues, bmi, maintenanceCal, req.user.id]
    );

    res.json(result.rows[0]);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Failed to update profile' });
  }
});

module.exports = router;
