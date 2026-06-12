const express = require('express');
const router = express.Router();
const db = require('../config/db');
const authenticateToken = require('../middlewares/authMiddleware');
const adminController = require('../controllers/adminController');

const requireAdmin = (req, res, next) => {
    if (req.user.role !== 'admin') return res.status(403).json({ error: 'Forbidden: Admins only' });
    next();
};

router.use(authenticateToken, requireAdmin);

router.get('/ai-usage', adminController.getAiUsage);
router.get('/user-activity', adminController.getUserActivity);

router.post('/invite', async (req, res) => {
    try {
        const { code, max_daily_requests } = req.body;
        const newCode = code || Math.random().toString(36).substring(2, 8).toUpperCase();
        await db.query(
            'INSERT INTO invite_codes (code, max_daily_requests) VALUES (?, ?)',
            [newCode, max_daily_requests || 10]
        );
        res.json({ message: 'Invite code created', code: newCode });
    } catch (e) {
        res.status(500).json({ error: e.message });
    }
});

router.get('/users', async (req, res) => {
    try {
        const users = await db.query(`
            SELECT 
                u.id, 
                u.username, 
                u.role, 
                u.daily_usage_count, 
                u.created_at,
                ic.max_daily_requests as quota_limit
            FROM users u
            LEFT JOIN invite_codes ic ON u.invite_code_id = ic.id
            ORDER BY u.created_at DESC
        `);
        res.json(users.rows);
    } catch(e) {
        res.status(500).json({ error: e.message });
    }
});

router.put('/users/:id/quota', async (req, res) => {
    try {
        const userId = req.params.id;
        const { max_daily_requests } = req.body;
        const limitNum = parseInt(max_daily_requests);
        if (isNaN(limitNum) || limitNum < 0) {
            return res.status(400).json({ error: 'Valid max daily requests value is required' });
        }

        const userRes = await db.query('SELECT invite_code_id, username FROM users WHERE id = ?', [userId]);
        if (userRes.rows.length === 0) return res.status(404).json({ error: 'User not found' });
        const user = userRes.rows[0];

        let inviteCodeId = user.invite_code_id;
        if (!inviteCodeId) {
            const dummyCode = `LIMIT-${user.username.toUpperCase()}-${Math.random().toString(36).substring(2, 6).toUpperCase()}`;
            const newInvite = await db.query(
                'INSERT INTO invite_codes (code, max_daily_requests, is_used, assigned_username) VALUES (?, ?, 1, ?) RETURNING id',
                [dummyCode, limitNum, user.username]
            );
            inviteCodeId = newInvite.rows[0].id;
            await db.query('UPDATE users SET invite_code_id = ? WHERE id = ?', [inviteCodeId, userId]);
        } else {
            await db.query('UPDATE invite_codes SET max_daily_requests = ? WHERE id = ?', [limitNum, inviteCodeId]);
        }

        res.json({ message: 'Quota limit updated successfully', quota_limit: limitNum });
    } catch (e) {
        res.status(500).json({ error: e.message });
    }
});

router.get('/invites', async (req, res) => {
    try {
        const invites = await db.query('SELECT * FROM invite_codes ORDER BY created_at DESC');
        res.json(invites.rows);
    } catch(e) {
        res.status(500).json({ error: e.message });
    }
});

router.delete('/users/:id', async (req, res) => {
    try {
        const userId = req.params.id;
        
        const userRes = await db.query('SELECT role FROM users WHERE id = ?', [userId]);
        if (userRes.rows.length === 0) return res.status(404).json({ error: 'User not found' });
        if (userRes.rows[0].role === 'admin') return res.status(403).json({ error: 'Cannot delete admin users' });

        await db.query('DELETE FROM users WHERE id = ?', [userId]);
        res.json({ message: 'User deleted successfully' });
    } catch(e) {
        res.status(500).json({ error: e.message });
    }
});

router.delete('/invites/:id', async (req, res) => {
    try {
        const inviteId = req.params.id;
        
        const inviteRes = await db.query('SELECT * FROM invite_codes WHERE id = ?', [inviteId]);
        if (inviteRes.rows.length === 0) return res.status(404).json({ error: 'Invite not found' });

        // Set referencing users' invite_code_id to NULL to satisfy foreign key constraint
        await db.query('UPDATE users SET invite_code_id = NULL WHERE invite_code_id = ?', [inviteId]);
        await db.query('DELETE FROM invite_codes WHERE id = ?', [inviteId]);
        res.json({ message: 'Invite code deleted successfully' });
    } catch(e) {
        res.status(500).json({ error: e.message });
    }
});


module.exports = router;
