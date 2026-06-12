const db = require('../config/db');

exports.logActivity = async (req, res) => {
    try {
        const userId = req.user.id;
        const { track_id, activity_name, category, date, duration_minutes, intensity, notes } = req.body;

        if (!activity_name || !duration_minutes) {
            return res.status(400).json({ error: 'Activity name and duration are required' });
        }

        const logDate = date || new Date().toISOString().split('T')[0];

        const result = await db.query(
            `INSERT INTO activity_logs (user_id, track_id, activity_name, category, date, duration_minutes, intensity, notes)
             VALUES (?, ?, ?, ?, ?, ?, ?, ?) RETURNING *`,
            [userId, track_id || null, activity_name, category || 'other', logDate, duration_minutes, intensity || null, notes || '']
        );

        res.status(201).json(result.rows[0]);
    } catch (e) {
        res.status(500).json({ error: e.message });
    }
};

exports.getActivities = async (req, res) => {
    try {
        const userId = req.user.id;
        const { date } = req.query;

        let query = `
            SELECT al.*, lt.display_name as track_name 
            FROM activity_logs al 
            LEFT JOIN lifestyle_tracks lt ON al.track_id = lt.id 
            WHERE al.user_id = ?
        `;
        const params = [userId];

        if (date) {
            query += ' AND al.date = ?';
            params.push(date);
        }

        query += ' ORDER BY al.created_at DESC';

        const result = await db.query(query, params);
        res.json(result.rows);
    } catch (e) {
        res.status(500).json({ error: e.message });
    }
};

exports.deleteActivity = async (req, res) => {
    try {
        const userId = req.user.id;
        const { id } = req.params;

        const result = await db.query(
            'DELETE FROM activity_logs WHERE id = ? AND user_id = ? RETURNING *',
            [id, userId]
        );

        if (result.rows.length === 0) {
            return res.status(404).json({ error: 'Activity log not found' });
        }

        res.json({ message: 'Activity log deleted successfully', log: result.rows[0] });
    } catch (e) {
        res.status(500).json({ error: e.message });
    }
};
