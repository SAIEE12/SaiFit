const db = require('../config/db');

exports.getProfile = async (req, res) => {
    try {
        const userId = req.user.id;
        
        // Ensure profile exists
        let profileRes = await db.query('SELECT * FROM user_profiles WHERE user_id = ?', [userId]);
        if (profileRes.rows.length === 0) {
            const newProfile = await db.query(
                'INSERT INTO user_profiles (user_id, full_name, age, gender, height, weight, target_weight, activity_level, fitness_goal) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?) RETURNING *',
                [userId, 'New User', 0, 'Not Specified', 0, 0, 0, 'Sedentary', 'General Fitness']
            );
            profileRes = { rows: [newProfile.rows[0]] };
        }
        
        const userRes = await db.query('SELECT username, role, created_at FROM users WHERE id = ?', [userId]);

        res.json({
            user: userRes.rows[0],
            profile: profileRes.rows[0]
        });
    } catch(e) {
        res.status(500).json({ error: e.message });
    }
};

exports.updateProfile = async (req, res) => {
    try {
        const userId = req.user.id;
        const { full_name, age, gender, height, weight, target_weight, activity_level, fitness_goal } = req.body;

        const updated = await db.query(
            `UPDATE user_profiles 
             SET full_name = ?, age = ?, gender = ?, height = ?, weight = ?, target_weight = ?, activity_level = ?, fitness_goal = ?, updated_at = CURRENT_TIMESTAMP
             WHERE user_id = ? RETURNING *`,
            [full_name, age, gender, height, weight, target_weight, activity_level, fitness_goal, userId]
        );

        if (updated.rows.length === 0) {
            return res.status(404).json({ error: 'Profile not found' });
        }

        res.json(updated.rows[0]);
    } catch(e) {
        res.status(500).json({ error: e.message });
    }
};
