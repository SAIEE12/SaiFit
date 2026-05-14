const db = require('../config/db');

const checkAiUsageLimit = async (req, res, next) => {
    try {
        if (req.user.role === 'admin') return next();

        let userRes = await db.query('SELECT * FROM users WHERE id = ?', [req.user.id]);
        if(userRes.rows.length === 0) return res.status(401).json({error: "User not found"});
        const user = userRes.rows[0];

        // Reset if it's a new day
        const today = new Date().toISOString().split('T')[0];
        if (user.last_usage_reset !== today) {
            await db.query('UPDATE users SET daily_usage_count = 0, last_usage_reset = ? WHERE id = ?', [today, user.id]);
            user.daily_usage_count = 0;
        }

        const inviteRes = await db.query('SELECT max_daily_requests FROM invite_codes WHERE id = ?', [user.invite_code_id]);
        const maxLimit = inviteRes.rows.length > 0 ? inviteRes.rows[0].max_daily_requests : 10;

        if (user.daily_usage_count >= maxLimit) {
            return res.status(429).json({ error: 'Daily AI request limit exceeded. Try again tomorrow or contact admin.' });
        }

        next();
    } catch(err) {
        res.status(500).json({ error: err.message });
    }
};

const logAiUsage = async (userId, requestType) => {
    try {
        await db.query('UPDATE users SET daily_usage_count = daily_usage_count + 1 WHERE id = ?', [userId]);
        await db.query('INSERT INTO ai_usage_logs (user_id, request_type) VALUES (?, ?)', [userId, requestType]);
    } catch(e) {
        console.error("Failed to log AI usage", e);
    }
};

module.exports = { checkAiUsageLimit, logAiUsage };
