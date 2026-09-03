require('dotenv').config();
const express = require('express');
const cors = require('cors');

const authRoutes = require('./routes/auth');
const profileRoutes = require('./routes/profile');
const goalRoutes = require('./routes/goals');
const recommendationRoutes = require('./routes/recommendations');
const activityRoutes = require('./routes/activity');
const reportRoutes = require('./routes/reports');
const adminRoutes = require('./routes/admin');

const app = express();
const corsOrigins = (process.env.CORS_ORIGINS || '')
  .split(',')
  .map(origin => origin.trim())
  .filter(Boolean);

app.use(cors({
  origin: (origin, callback) => {
    if (!origin || corsOrigins.includes(origin)) {
      return callback(null, true);
    }
    return callback(new Error('Origin not allowed by CORS'));
  }
}));
app.use(express.json());

app.get('/', (req, res) => res.json({ status: 'SFTS API running' }));
app.get('/health', (req, res) => res.json({ ok: true }));

app.use('/api/auth', authRoutes);
app.use('/api/profile', profileRoutes);
app.use('/api/goals', goalRoutes);
app.use('/api/recommendations', recommendationRoutes);
app.use('/api/activity', activityRoutes);
app.use('/api/reports', reportRoutes);
app.use('/api/admin', adminRoutes);

app.use((req, res) => res.status(404).json({ error: 'Not found' }));

const PORT = process.env.PORT || 5050;

if (process.env.NODE_ENV === 'production') {
  for (const variable of ['DATABASE_URL', 'JWT_SECRET']) {
    if (!process.env[variable]) {
      throw new Error(`${variable} must be set in production`);
    }
  }
}

app.listen(PORT, '0.0.0.0', () => {
  console.log(`SFTS API listening on port ${PORT}`);
});
