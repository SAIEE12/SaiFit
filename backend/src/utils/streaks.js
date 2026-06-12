const db = require('../config/db');

const calculateHabitStreak = async (userId) => {
    try {
        const res = await db.query(
            `SELECT DISTINCT date FROM (
                SELECT date FROM meals WHERE user_id = ?
                UNION
                SELECT date FROM workout_logs WHERE user_id = ?
                UNION
                SELECT date FROM hydration_logs WHERE user_id = ?
                UNION
                SELECT date FROM activity_logs WHERE user_id = ?
            ) ORDER BY date DESC LIMIT 30`,
            [userId, userId, userId, userId]
        );

        if (res.rows.length === 0) return 0;

        let streak = 0;
        let expectedDate = new Date();
        const dateStrings = res.rows.map(r => r.date);

        // Check if user logged anything today or yesterday to continue streak
        const todayStr = expectedDate.toISOString().split('T')[0];
        expectedDate.setDate(expectedDate.getDate() - 1);
        const yesterdayStr = expectedDate.toISOString().split('T')[0];

        if (!dateStrings.includes(todayStr) && !dateStrings.includes(yesterdayStr)) {
            return 0;
        }

        let checkDate = dateStrings.includes(todayStr) ? new Date() : expectedDate;
        
        while (true) {
            const checkStr = checkDate.toISOString().split('T')[0];
            if (dateStrings.includes(checkStr)) {
                streak++;
                checkDate.setDate(checkDate.getDate() - 1);
            } else {
                break;
            }
        }
        return streak;
    } catch (e) {
        console.error("Streak calculation failed:", e);
        return 0;
    }
};

module.exports = {
    calculateHabitStreak
};
