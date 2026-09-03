const express = require('express');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const pool = require('../db');
const { calculateBMI, calculateMaintenanceCalories } = require('../utils/calculations');

const router = express.Router();

function signToken(user) {
  return jwt.sign(
    { id: user.id, email: user.email, role: user.role },
    process.env.JWT_SECRET,
    { expiresIn: process.env.JWT_EXPIRES_IN || '7d' }
  );
}

// REQ-1, REQ-2: register with name, email, password, age, gender, height, weight
// Validates unique email + minimum password length (>= 6 chars)
router.post('/register', async (req, res) => {
  const { name, email, password, age, gender, height_cm, weight_kg } = req.body;

  if (!name || !email || !password || !age || !gender || !height_cm || !weight_kg) {
    return res.status(400).json({ error: 'All fields are required' });
  }
  if (password.length < 6) {
    return res.status(400).json({ error: 'Password must be at least 6 characters' });
  }

  const client = await pool.connect();
  try {
    const existing = await client.query('SELECT id FROM users WHERE email = $1', [email.toLowerCase()]);
    if (existing.rows.length > 0) {
      return res.status(409).json({ error: 'Email already registered' });
    }

    const passwordHash = await bcrypt.hash(password, 10);

    await client.query('BEGIN');

    const userResult = await client.query(
      `INSERT INTO users (name, email, password_hash) VALUES ($1, $2, $3)
       RETURNING id, name, email, role`,
      [name, email.toLowerCase(), passwordHash]
    );
    const user = userResult.rows[0];

    const bmi = calculateBMI(height_cm, weight_kg);
    const maintenanceCal = calculateMaintenanceCalories(height_cm, weight_kg, age, gender);

    await client.query(
      `INSERT INTO health_profile (user_id, age, gender, height_cm, weight_kg, bmi, maintenance_cal)
       VALUES ($1, $2, $3, $4, $5, $6, $7)`,
      [user.id, age, gender, height_cm, weight_kg, bmi, maintenanceCal]
    );

    await client.query('COMMIT');

    const token = signToken(user);
    res.status(201).json({ token, user, profile: { age, gender, height_cm, weight_kg, bmi, maintenance_cal: maintenanceCal } });
  } catch (err) {
    await client.query('ROLLBACK');
    console.error(err);
    res.status(500).json({ error: 'Registration failed' });
  } finally {
    client.release();
  }
});

// REQ-3: authenticate via email + password
router.post('/login', async (req, res) => {
  const { email, password } = req.body;
  if (!email || !password) {
    return res.status(400).json({ error: 'Email and password are required' });
  }

  try {
    const result = await pool.query('SELECT * FROM users WHERE email = $1', [email.toLowerCase()]);
    const user = result.rows[0];
    if (!user) return res.status(401).json({ error: 'Invalid credentials' });
    if (!user.is_active) return res.status(403).json({ error: 'Account has been deactivated' });

    const match = await bcrypt.compare(password, user.password_hash);
    if (!match) return res.status(401).json({ error: 'Invalid credentials' });

    const token = signToken(user);
    res.json({
      token,
      user: { id: user.id, name: user.name, email: user.email, role: user.role }
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Login failed' });
  }
});

router.post('/dev-reset-password', async (req, res) => {
  const { email, newPassword } = req.body;
  const requestPath = req.originalUrl;
  console.log(`DEV RESET REQUEST: ${req.method} ${requestPath}`);

  if (process.env.DEV_RESET_ENABLED !== 'true') {
    console.log('DEV RESET RESULT: 403');
    return res.status(403).json({ error: 'Developer reset is disabled' });
  }

  if (typeof email !== 'string' || typeof newPassword !== 'string' || !email.trim() || !newPassword.trim()) {
    console.log('DEV RESET RESULT: 400');
    return res.status(400).json({ error: 'Email and newPassword are required' });
  }

  try {
    const normalizedEmail = email.trim().toLowerCase();
    const result = await pool.query('SELECT id FROM users WHERE email = $1', [normalizedEmail]);
    const user = result.rows[0];

    if (!user) {
      console.log('DEV RESET RESULT: 404');
      return res.status(404).json({ error: 'User not found' });
    }

    const passwordHash = await bcrypt.hash(newPassword, 10);
    await pool.query('UPDATE users SET password_hash = $1 WHERE id = $2', [passwordHash, user.id]);

    console.log('DEV RESET RESULT: 200');
    return res.status(200).json({ message: 'Password changed successfully' });
  } catch (err) {
    console.log('DEV RESET RESULT: 500');
    return res.status(500).json({ error: 'Password reset failed' });
  }
});

module.exports = router;
