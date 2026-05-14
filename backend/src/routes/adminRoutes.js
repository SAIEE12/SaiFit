const express = require('express');
const router = express.Router();
const db = require('../config/db');
const authenticateToken = require('../middlewares/authMiddleware');

const requireAdmin = (req, res, next) => {
    if (req.user.role !== 'admin') return res.status(403).json({ error: 'Forbidden: Admins only' });
    next();
};

router.use(authenticateToken, requireAdmin);

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
        const users = await db.query('SELECT id, username, role, daily_usage_count, created_at FROM users ORDER BY created_at DESC');
        res.json(users.rows);
    } catch(e) {
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
        if (inviteRes.rows[0].is_used) return res.status(400).json({ error: 'Cannot delete an invite code that has already been used' });

        await db.query('DELETE FROM invite_codes WHERE id = ?', [inviteId]);
        res.json({ message: 'Invite code deleted successfully' });
    } catch(e) {
        res.status(500).json({ error: e.message });
    }
});

module.exports = router;
