const db = require('../config/db');
const notificationService = require('../services/notificationService');

exports.logHydration = async (req, res) => {
    try {
        const userId = req.user.id;
        const { amount_ml, date } = req.body;
        const targetDate = date || new Date().toISOString().split('T')[0];

        let newAmount = 0;

        // Check if log exists for this day
        const existing = await db.query('SELECT * FROM hydration_logs WHERE user_id = ? AND date = ?', [userId, targetDate]);

        if (existing.rows.length > 0) {
            newAmount = Math.max(0, existing.rows[0].amount_ml + amount_ml);
            await db.query('UPDATE hydration_logs SET amount_ml = ?, created_at = CURRENT_TIMESTAMP WHERE id = ?', [newAmount, existing.rows[0].id]);
        } else {
            newAmount = Math.max(0, amount_ml);
            await db.query('INSERT INTO hydration_logs (user_id, amount_ml, date) VALUES (?, ?, ?)', [userId, newAmount, targetDate]);
        }

        // Hydration milestones check (only for today)
        const todayStr = new Date().toISOString().split('T')[0];
        if (targetDate === todayStr) {
            const hydrationGoal = 3000; // default daily goal
            const milestones = [
                { percentage: 0.50, name: '50%' },
                { percentage: 0.75, name: '75%' },
                { percentage: 1.00, name: '100%' }
            ];

            for (const milestone of milestones) {
                const milestoneVal = hydrationGoal * milestone.percentage;
                // If we crossed this milestone
                if (newAmount >= milestoneVal) {
                    // Check if we already created a notification for this milestone today
                    const existingNotif = await db.query(
                        "SELECT id FROM notifications WHERE user_id = ? AND category = ? AND date(created_at) = date('now') AND action_payload LIKE ?",
                        [userId, 'HYDRATION TARGET', `%"percent":${milestone.percentage}%`]
                    );

                    if (existingNotif.rows.length === 0) {
                        // Create notification
                        await notificationService.createNotification(userId, {
                            category: 'HYDRATION TARGET',
                            title: 'Hydration Milestone Reached',
                            body: `Awesome job! You have logged more than ${milestone.name} of your daily water intake target.`,
                            icon: 'water',
                            icon_type: 'material',
                            color: '#007AFF', // theme.colors.info
                            action_type: 'hydrate',
                            action_payload: { amount: 250, percent: milestone.percentage },
                            templates: {
                                Supportive: {
                                    title: 'Hydration Milestone Reached',
                                    body: `Awesome job! You have logged more than ${milestone.name} of your daily water intake target.`
                                },
                                Direct: {
                                    title: `Hydration Target: ${milestone.name} Logged`,
                                    body: `Logged: ${Math.round(newAmount)}ml / ${hydrationGoal}ml. Keep it up!`
                                },
                                Challenger: {
                                    title: `HYDRATE OR DEFEAT! 💧`,
                                    body: `Logged ${milestone.name} of your water target. Don't slow down now—refuel your active muscles with +250ml below!`
                                }
                            }
                        });
                    }
                }
            }
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
