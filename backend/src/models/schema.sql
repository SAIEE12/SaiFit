CREATE TABLE IF NOT EXISTS invite_codes (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    code TEXT UNIQUE NOT NULL,
    assigned_username TEXT,
    max_daily_requests INTEGER DEFAULT 10,
    is_active INTEGER DEFAULT 1,
    is_used INTEGER DEFAULT 0,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS users (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    username TEXT UNIQUE NOT NULL,
    role TEXT DEFAULT 'user',
    invite_code_id INTEGER REFERENCES invite_codes(id),
    daily_usage_count INTEGER DEFAULT 0,
    last_usage_reset DATE DEFAULT CURRENT_DATE,
    last_login_at DATETIME,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS ai_usage_logs (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    user_id INTEGER REFERENCES users(id) ON DELETE CASCADE,
    request_type TEXT NOT NULL,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS user_profiles (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    user_id INTEGER UNIQUE REFERENCES users(id) ON DELETE CASCADE,
    full_name TEXT,
    age INTEGER,
    gender TEXT,
    height REAL,
    weight REAL,
    target_weight REAL,
    activity_level TEXT,
    fitness_goal TEXT,
    dietary_philosophy TEXT,
    dietary_notes TEXT,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS user_goals (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    user_id INTEGER REFERENCES users(id) ON DELETE CASCADE,
    goal_type TEXT NOT NULL, 
    current_weight REAL,
    target_weight REAL,
    target_calories INTEGER,
    target_protein INTEGER,
    target_carbs INTEGER,
    target_fats INTEGER,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS meals (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    user_id INTEGER REFERENCES users(id) ON DELETE CASCADE,
    date DATE NOT NULL DEFAULT CURRENT_DATE,
    meal_type TEXT, 
    total_calories INTEGER DEFAULT 0,
    total_protein INTEGER DEFAULT 0,
    total_carbs INTEGER DEFAULT 0,
    total_fats INTEGER DEFAULT 0,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS food_logs (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    meal_id INTEGER REFERENCES meals(id) ON DELETE CASCADE,
    food_name TEXT NOT NULL,
    calories INTEGER NOT NULL,
    protein INTEGER NOT NULL,
    carbs INTEGER NOT NULL,
    fats INTEGER NOT NULL,
    image_url TEXT,
    input_type TEXT DEFAULT 'scan',
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS exercises (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    name TEXT NOT NULL,
    category TEXT,
    description TEXT
);

CREATE TABLE IF NOT EXISTS workout_logs (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    user_id INTEGER REFERENCES users(id) ON DELETE CASCADE,
    date DATE NOT NULL DEFAULT CURRENT_DATE,
    notes TEXT,
    duration_minutes INTEGER,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS workout_sets (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    workout_log_id INTEGER REFERENCES workout_logs(id) ON DELETE CASCADE,
    exercise_id INTEGER REFERENCES exercises(id) ON DELETE SET NULL,
    sets INTEGER NOT NULL,
    reps INTEGER NOT NULL,
    weight REAL,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS recommendations (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    user_id INTEGER REFERENCES users(id) ON DELETE CASCADE,
    type TEXT,
    content TEXT NOT NULL,
    date DATE NOT NULL DEFAULT CURRENT_DATE,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP
);


CREATE TABLE IF NOT EXISTS hydration_logs (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    user_id INTEGER REFERENCES users(id) ON DELETE CASCADE,
    amount_ml INTEGER DEFAULT 0,
    date DATE DEFAULT CURRENT_DATE,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS ai_cache (
    cache_key TEXT PRIMARY KEY,
    result TEXT NOT NULL,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

DROP TABLE IF EXISTS system_settings;

-- Seed default exercises
INSERT OR IGNORE INTO exercises (id, name, category, description) VALUES 
(1, 'Bench Press', 'Chest', 'Barbell bench press for chest hypertrophy and power.'),
(2, 'Incline Dumbbell Press', 'Chest', 'Incline press for upper chest development.'),
(3, 'Pull-ups', 'Back', 'Bodyweight pull-ups for lat and upper back width.'),
(4, 'Barbell Row', 'Back', 'Bent over rows for mid-back thickness.'),
(5, 'Barbell Squat', 'Legs', 'Back squats for quad, glute, and hamstring strength.'),
(6, 'Romanian Deadlift', 'Legs', 'Hip-hinge movement targeting hamstrings and glutes.'),
(7, 'Dumbbell Shoulder Press', 'Shoulders', 'Seated dumbbell press for front and lateral deltoids.'),
(8, 'Lateral Raise', 'Shoulders', 'Dumbbell side raises for shoulders width.'),
(9, 'Bicep Curl', 'Arms', 'Dumbbell alternating bicep curls.'),
(10, 'Tricep Pushdown', 'Arms', 'Cable pushdowns for tricep lateral and medial heads.'),
(11, 'Running', 'Cardio', 'Treadmill or outdoor distance running.'),
(12, 'Cycling', 'Cardio', 'Stationary or outdoor cycling.');

CREATE TABLE IF NOT EXISTS lifestyle_tracks (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    key TEXT UNIQUE NOT NULL,
    display_name TEXT NOT NULL,
    description TEXT,
    icon_name TEXT
);

CREATE TABLE IF NOT EXISTS user_tracks (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    user_id INTEGER REFERENCES users(id) ON DELETE CASCADE,
    track_id INTEGER REFERENCES lifestyle_tracks(id) ON DELETE CASCADE,
    is_primary INTEGER DEFAULT 0,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(user_id, track_id)
);

CREATE TABLE IF NOT EXISTS activity_logs (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    user_id INTEGER REFERENCES users(id) ON DELETE CASCADE,
    track_id INTEGER REFERENCES lifestyle_tracks(id) ON DELETE SET NULL,
    activity_name TEXT NOT NULL,
    category TEXT,
    date DATE NOT NULL DEFAULT CURRENT_DATE,
    duration_minutes INTEGER NOT NULL,
    intensity TEXT,
    notes TEXT,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

-- Seed default lifestyle tracks
INSERT OR IGNORE INTO lifestyle_tracks (id, key, display_name, description, icon_name) VALUES 
(1, 'gym', 'Gym Training', 'Structured strength training with equipment', 'dumbbell'),
(2, 'home_workout', 'Home Workout', 'Bodyweight and minimal-equipment routines at home', 'home'),
(3, 'yoga_meditation', 'Yoga & Meditation', 'Yoga asanas, breathing practices, and meditation for holistic wellbeing', 'spa'),
(4, 'dance', 'Dance', 'Dance-based cardio and movement practice', 'music');

CREATE TABLE IF NOT EXISTS system_settings (
    key TEXT PRIMARY KEY,
    value TEXT,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS notifications (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    category TEXT NOT NULL,
    title TEXT NOT NULL,
    body TEXT NOT NULL,
    icon TEXT DEFAULT 'bell',
    icon_type TEXT DEFAULT 'feather',
    color TEXT,
    priority TEXT DEFAULT 'normal',
    action_type TEXT,
    action_payload TEXT,
    is_read INTEGER DEFAULT 0,
    is_pinned INTEGER DEFAULT 0,
    is_archived INTEGER DEFAULT 0,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    read_at DATETIME,
    expires_at DATETIME
);

CREATE TABLE IF NOT EXISTS notification_preferences (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    user_id INTEGER UNIQUE REFERENCES users(id) ON DELETE CASCADE,
    muted_categories TEXT DEFAULT '[]',
    coach_tone TEXT DEFAULT 'Supportive',
    quiet_hours_start TEXT,
    quiet_hours_end TEXT,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
);



