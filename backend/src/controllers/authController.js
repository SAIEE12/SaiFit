const db = require('../config/db');
const jwt = require('jsonwebtoken');

exports.login = async (req, res) => {
    try {
        const { username, inviteCode } = req.body;
        if (!username || !inviteCode) {
            return res.status(400).json({ error: 'Username and invite code are required' });
        }

        // Admin override login (hardcoded for initial setup)
        if (username.toLowerCase() === 'sai manish' && inviteCode === 'SAI05') {
            let adminRes = await db.query('SELECT * FROM users WHERE username = ?', ['sai manish']);
            let adminUser;
            if (adminRes.rows.length === 0) {
                const newAdmin = await db.query('INSERT INTO users (username, role) VALUES (?, ?) RETURNING *', ['sai manish', 'admin']);
                adminUser = newAdmin.rows[0];
            } else {
                adminUser = adminRes.rows[0];
            }
            const token = jwt.sign({ id: adminUser.id, role: 'admin' }, process.env.JWT_SECRET, { expiresIn: '30d' });
            return res.json({ token, user: adminUser });
        }

        // Check invite code
        const codeRes = await db.query('SELECT * FROM invite_codes WHERE code = ?', [inviteCode]);
        if (codeRes.rows.length === 0) return res.status(401).json({ error: 'Invalid invite code' });
        
        const codeData = codeRes.rows[0];
        if (codeData.is_active === 0) return res.status(401).json({ error: 'Invite code is inactive' });
        
        // Check if used by someone else
        if (codeData.is_used === 1 && codeData.assigned_username !== username) {
            return res.status(401).json({ error: 'Invite code already used by another user' });
        }

        // Check if user exists
        let userRes = await db.query('SELECT * FROM users WHERE username = ?', [username]);
        let user;

        if (userRes.rows.length === 0) {
            const newUser = await db.query(
                'INSERT INTO users (username, role, invite_code_id) VALUES (?, ?, ?) RETURNING *',
                [username, 'user', codeData.id]
            );
            user = newUser.rows[0];
            await db.query('UPDATE invite_codes SET is_used = 1, assigned_username = ? WHERE id = ?', [username, codeData.id]);
        } else {
            user = userRes.rows[0];
            if (user.invite_code_id !== codeData.id) {
                 return res.status(401).json({ error: 'Username mismatch with invite code' });
            }
        }

        const token = jwt.sign({ id: user.id, role: user.role }, process.env.JWT_SECRET, { expiresIn: '30d' });
        res.json({ token, user });

    } catch (error) {
        res.status(500).json({ error: error.message });
    }
};

exports.me = async (req, res) => {
    try {
        const userRes = await db.query('SELECT * FROM users WHERE id = ?', [req.user.id]);
        if(userRes.rows.length === 0) return res.status(404).json({error: "User not found"});
        res.json({ user: userRes.rows[0] });
    } catch(err) {
        res.status(500).json({error: err.message});
    }
};
