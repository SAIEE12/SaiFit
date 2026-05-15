const express = require('express');
const cors = require('cors');
require('dotenv').config();
const fs = require('fs');
const path = require('path');

const db = require('./config/db');
const authRoutes = require('./routes/authRoutes');
const nutritionRoutes = require('./routes/nutritionRoutes');
const workoutRoutes = require('./routes/workoutRoutes');
const recommendationRoutes = require('./routes/recommendationRoutes');
const adminRoutes = require('./routes/adminRoutes');
const profileRoutes = require('./routes/profileRoutes');
const hydrationRoutes = require('./routes/hydrationRoutes');

// Initialize SQLite database schema automatically for local dev
const schema = fs.readFileSync(path.join(__dirname, 'models/schema.sql'), 'utf8');
db.exec(schema);

const app = express();

app.use(cors());
app.use(express.json());

// Serve uploads statically
app.use('/uploads', express.static(path.join(__dirname, '../uploads')));

// Routes
app.use('/api/auth', authRoutes);
app.use('/api/nutrition', nutritionRoutes);
app.use('/api/workouts', workoutRoutes);
app.use('/api/recommendations', recommendationRoutes);
app.use('/api/admin', adminRoutes);
app.use('/api/profile', profileRoutes);
app.use('/api/hydration', hydrationRoutes);

app.get('/health', (req, res) => {
  res.status(200).json({ status: 'OK', message: 'SaiFit API is running' });
});

// Error handling middleware
app.use((err, req, res, next) => {
  console.error(err.stack);
  res.status(500).json({ error: 'Something went wrong!', details: err.message });
});

const PORT = process.env.PORT || 5000;
app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});
