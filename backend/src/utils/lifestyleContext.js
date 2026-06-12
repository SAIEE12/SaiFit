const db = require('../config/db');

const getUserLifestyleContext = async (userId) => {
    try {
        const tracksRes = await db.query(
            `SELECT lt.display_name 
             FROM user_tracks ut 
             JOIN lifestyle_tracks lt ON ut.track_id = lt.id 
             WHERE ut.user_id = ?`,
            [userId]
        );
        const tracks = tracksRes.rows.map(r => r.display_name).join(', ');

        const profileRes = await db.query(
            `SELECT dietary_philosophy, dietary_notes 
             FROM user_profiles 
             WHERE user_id = ?`,
            [userId]
        );
        const profile = profileRes.rows[0] || {};

        return {
            tracks,
            dietaryPhilosophy: profile.dietary_philosophy,
            dietaryNotes: profile.dietary_notes
        };
    } catch (e) {
        console.error('Error fetching user lifestyle context:', e);
        return null;
    }
};

module.exports = {
    getUserLifestyleContext
};
