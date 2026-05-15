const db = require('../config/db');

exports.logHydration = async (req, res) => {
    try {
        const userId = req.user.id;
        const { amount_ml, date } = req.body;
        const targetDate = date || new Date().toISOString().split('T')[0];

        // Check if log exists for this day
        const existing = await db.query('SELECT * FROM hydration_logs WHERE user_id = ? AND date = ?', [userId, targetDate]);

        if (existing.rows.length > 0) {
            await db.query('UPDATE hydration_logs SET amount_ml = amount_ml + ?, created_at = CURRENT_TIMESTAMP WHERE id = ?', [amount_ml, existing.rows[0].id]);
        } else {
            await db.query('INSERT INTO hydration_logs (user_id, amount_ml, date) VALUES (?, ?, ?)', [userId, amount_ml, targetDate]);
        }

        res.json({ message: 'Hydration updated' });
    } catch (e) {
        res.status(500).json({ error: e.message });
    }
};

exports.getHydration = async (req, res) => {
    try {
        const userId = req.user.id;
        const { date } = req.query;
        const targetDate = date || new Date().toISOString().split('T')[0];

        const resData = await db.query('SELECT * FROM hydration_logs WHERE user_id = ? AND date = ?', [userId, targetDate]);
        res.json(resData.rows[0] || { amount_ml: 0, date: targetDate });
    } catch (e) {
        res.status(500).json({ error: e.message });
    }
};
