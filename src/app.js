const express = require('express');
const cors = require('./worker-cors');

const authRoutes = require('./routes/auth');
const profileRoutes = require('./routes/profile');
const goalRoutes = require('./routes/goals');
const recommendationRoutes = require('./routes/recommendations');
const activityRoutes = require('./routes/activity');
const reportRoutes = require('./routes/reports');
const adminRoutes = require('./routes/admin');

const app = express();
app.use(cors);
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

module.exports = app;