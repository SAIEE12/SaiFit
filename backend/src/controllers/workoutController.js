const db = require('../config/db');
const notificationService = require('../services/notificationService');
const { calculateHabitStreak } = require('../utils/streaks');

exports.logWorkout = async (req, res) => {
  try {
    const { date, notes, duration_minutes, exercises } = req.body;
    const user_id = req.user.id;

    // Start transaction
    await db.query('BEGIN');

    // Create workout log
    const workoutLogRes = await db.query(
      'INSERT INTO workout_logs (user_id, date, notes, duration_minutes) VALUES ($1, $2, $3, $4) RETURNING id',
      [user_id, date, notes, duration_minutes]
    );
    const workoutLogId = workoutLogRes.rows[0].id;

    // Create sets for each exercise
    for (let ex of exercises) {
      await db.query(
        'INSERT INTO workout_sets (workout_log_id, exercise_id, sets, reps, weight) VALUES ($1, $2, $3, $4, $5)',
        [workoutLogId, ex.exercise_id, ex.sets, ex.reps, ex.weight]
      );
    }

    await db.query('COMMIT');

    // Send Workout confirmation notification
    await notificationService.createNotification(user_id, {
      category: 'WORKOUT',
      title: 'Workout Logged',
      body: `Great session! You've logged your workout: ${notes || 'Workout session'}.`,
      icon: 'activity',
      icon_type: 'feather',
      color: '#FF2D55', // theme.colors.primary
      action_type: 'navigate',
      action_payload: { screen: 'Workouts' }
    });

    // Check streak milestones
    try {
      const streak = await calculateHabitStreak(user_id);
      const milestones = [3, 5, 7, 14, 30];
      if (streak > 0 && milestones.includes(streak)) {
        // Check if we already created a notification for this streak milestone today
        const existingNotif = await db.query(
          "SELECT id FROM notifications WHERE user_id = ? AND category = ? AND date(created_at) = date('now') AND action_payload LIKE ?",
          [user_id, 'STREAK MILESTONE', `%"streak":${streak}%`]
        );

        if (existingNotif.rows.length === 0) {
          await notificationService.createNotification(user_id, {
            category: 'STREAK MILESTONE',
            title: `${streak} Days Active Streak`,
            body: `Keep pushing forward! You have logged your active targets ${streak} days in a row.`,
            icon: 'award',
            icon_type: 'feather',
            color: '#F59E0B', // theme.colors.warning
            action_payload: { streak },
            templates: {
              Supportive: {
                title: `${streak} Days Active Streak`,
                body: `Keep pushing forward! You have logged your active targets ${streak} days in a row.`
              },
              Direct: {
                title: `Logged: ${streak} Days Consecutive`,
                body: `All targets captured consecutively for ${streak} days.`
              },
              Challenger: {
                title: `${streak}-DAY STREAK: UNSTOPPABLE! 🔥`,
                body: `Consistency is power. ${streak} consecutive days of logging. Do not let this record drop!`
              }
            }
          });
        }
      }
    } catch (streakErr) {
      console.error('Streak notification error:', streakErr);
    }

    res.status(201).json({ message: 'Workout logged successfully', workoutLogId });
  } catch (error) {
    await db.query('ROLLBACK');
    res.status(500).json({ error: error.message });
  }
};

exports.getWorkouts = async (req, res) => {
  try {
    const user_id = req.user.id;
    const { date } = req.query;
    
    let query = `
      SELECT wl.*, 
             COALESCE(COUNT(DISTINCT ws.exercise_id), 0) as exercise_count,
             COALESCE(SUM(ws.sets), 0) as total_sets
      FROM workout_logs wl
      LEFT JOIN workout_sets ws ON wl.id = ws.workout_log_id
      WHERE wl.user_id = $1
    `;
    let params = [user_id];

    if (date) {
        query += ' AND wl.date = $2 GROUP BY wl.id';
        params.push(date);
    } else {
        query += ' GROUP BY wl.id ORDER BY wl.date DESC';
    }

    const workouts = await db.query(query, params);
    res.json(workouts.rows);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

exports.getExercises = async (req, res) => {
  try {
    const resData = await db.query('SELECT * FROM exercises ORDER BY category, name');
    res.json(resData.rows);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

exports.deleteWorkout = async (req, res) => {
  try {
    const { id } = req.params;
    const user_id = req.user.id;
    
    await db.query(
      'DELETE FROM workout_logs WHERE id = $1 AND user_id = $2',
      [id, user_id]
    );
    
    res.json({ message: 'Workout log deleted successfully' });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};


