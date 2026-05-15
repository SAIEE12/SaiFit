const db = require('../config/db');

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
    
    let query = 'SELECT * FROM workout_logs WHERE user_id = $1';
    let params = [user_id];

    if (date) {
        query += ' AND date = $2';
        params.push(date);
    } else {
        query += ' ORDER BY date DESC';
    }

    const workouts = await db.query(query, params);
    res.json(workouts.rows);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};
