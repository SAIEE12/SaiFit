const db = require('../config/db');
const { calculateHabitStreak } = require('../utils/streaks');

// 1. AI Usage Dashboard
exports.getAiUsage = async (req, res) => {
    try {
        const period = req.query.period || 'today';
        
        let dateFilter = "date(l.created_at) = date('now')";
        if (period === 'week') {
            dateFilter = "l.created_at >= datetime('now', '-7 days')";
        } else if (period === 'month') {
            dateFilter = "l.created_at >= datetime('now', '-30 days')";
        }

        const logsRes = await db.query(`
            SELECT 
                u.id as user_id, 
                u.username, 
                ic.max_daily_requests,
                l.request_type
            FROM users u
            LEFT JOIN invite_codes ic ON u.invite_code_id = ic.id
            LEFT JOIN ai_usage_logs l ON u.id = l.user_id AND ${dateFilter}
            WHERE u.role != 'admin'
        `);

        const userMap = {};
        let appWideTotal = 0;

        for (const row of logsRes.rows) {
            if (!userMap[row.user_id]) {
                userMap[row.user_id] = {
                    username: row.username,
                    total: 0,
                    breakdown: {},
                    max_daily_requests: row.max_daily_requests || 10
                };
            }
            
            if (row.request_type) {
                userMap[row.user_id].total++;
                appWideTotal++;
                userMap[row.user_id].breakdown[row.request_type] = 
                    (userMap[row.user_id].breakdown[row.request_type] || 0) + 1;
            }
        }

        const usersUsage = Object.values(userMap).sort((a, b) => b.total - a.total);

        res.json({
            users: usersUsage,
            appWideTotal
        });
    } catch (e) {
        console.error('getAiUsage failed:', e);
        res.status(500).json({ error: e.message });
    }
};

// 2. User Activity Overview
const getLastActivity = async (userId) => {
    const res = await db.query(`
        SELECT date, type FROM (
            SELECT date, 'meal' as type FROM meals WHERE user_id = ?
            UNION ALL
            SELECT date, 'workout' as type FROM workout_logs WHERE user_id = ?
            UNION ALL
            SELECT date, 'hydration' as type FROM hydration_logs WHERE user_id = ?
            UNION ALL
            SELECT date, 'custom_activity' as type FROM activity_logs WHERE user_id = ?
        ) ORDER BY date DESC LIMIT 1
    `, [userId, userId, userId, userId]);
    
    return res.rows[0] || null;
};

exports.getUserActivity = async (req, res) => {
    try {
        const usersRes = await db.query("SELECT id, username, last_login_at FROM users WHERE role != 'admin'");
        const users = usersRes.rows;

        const userActivities = [];
        for (const user of users) {
            const streak = await calculateHabitStreak(user.id);
            const lastActivity = await getLastActivity(user.id);
            
            userActivities.push({
                id: user.id,
                username: user.username,
                last_login_at: user.last_login_at,
                streak,
                last_activity: lastActivity
            });
        }

        // Sort by last login or last activity date (most recent first)
        userActivities.sort((a, b) => {
            const timeA = Math.max(
                a.last_login_at ? new Date(a.last_login_at).getTime() : 0,
                a.last_activity?.date ? new Date(a.last_activity.date).getTime() : 0
            );
            const timeB = Math.max(
                b.last_login_at ? new Date(b.last_login_at).getTime() : 0,
                b.last_activity?.date ? new Date(b.last_activity.date).getTime() : 0
            );
            return timeB - timeA;
        });

        res.json(userActivities);
    } catch (e) {
        console.error('getUserActivity failed:', e);
        res.status(500).json({ error: e.message });
    }
};
