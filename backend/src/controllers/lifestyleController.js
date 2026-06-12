const db = require('../config/db');

exports.getTracks = async (req, res) => {
    try {
        const tracksRes = await db.query('SELECT * FROM lifestyle_tracks ORDER BY id ASC');
        res.json(tracksRes.rows);
    } catch (e) {
        res.status(500).json({ error: e.message });
    }
};

exports.getMyTracks = async (req, res) => {
    try {
        const userId = req.user.id;
        const myTracksRes = await db.query(
            `SELECT t.*, ut.is_primary 
             FROM user_tracks ut 
             JOIN lifestyle_tracks t ON ut.track_id = t.id 
             WHERE ut.user_id = ?`,
            [userId]
        );
        res.json(myTracksRes.rows);
    } catch (e) {
        res.status(500).json({ error: e.message });
    }
};

exports.updateMyTracks = async (req, res) => {
    try {
        const userId = req.user.id;
        const { tracks, primaryTrackId } = req.body;

        await db.query('DELETE FROM user_tracks WHERE user_id = ?', [userId]);

        if (Array.isArray(tracks) && tracks.length > 0) {
            let primaryId = primaryTrackId;
            if (!primaryId) {
                primaryId = tracks[0];
            }
            for (const trackId of tracks) {
                const isPrimary = Number(trackId) === Number(primaryId) ? 1 : 0;
                await db.query(
                    'INSERT INTO user_tracks (user_id, track_id, is_primary) VALUES (?, ?, ?)',
                    [userId, trackId, isPrimary]
                );
            }
        }

        res.json({ message: 'Lifestyle tracks updated successfully' });
    } catch (e) {
        res.status(500).json({ error: e.message });
    }
};
