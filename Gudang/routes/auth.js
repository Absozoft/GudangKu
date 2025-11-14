const express = require('express');

module.exports = function deps(opts) {
    const router = express.Router();
    const db = opts.db;
    const jwt = opts.jwt;
    const bcrypt = opts.bcrypt;
    const JWT_SECRET = opts.JWT_SECRET;

    function authenticateToken(req, res, next) {
        const authHeader = req.headers['authorization'];
        const token = authHeader && authHeader.split(' ')[1];
        if (!token) return res.status(401).json({ error: 'Token tidak ditemukan' });
        jwt.verify(token, JWT_SECRET, (err, user) => {
            if (err) return res.status(403).json({ error: 'Token tidak valid' });
            req.user = user;
            next();
        });
    }

    function requireAdmin(req, res, next) {
        if (!req.user || req.user.role !== 'admin') {
            return res.status(403).json({ error: 'Akses ditolak: admin saja' });
        }
        next();
    }

    // Register - only admin may create new users
    router.post('/register', authenticateToken, requireAdmin, (req, res) => {
        const { username, password } = req.body || {};
        if (!username || !password) return res.status(400).json({ error: 'Username dan password diperlukan' });
        const hashed = bcrypt.hashSync(password, 8);
        db.run(`INSERT INTO users (username, password, role) VALUES (?, ?, 'user')`, [username, hashed], function(err) {
            if (err) {
                if (err.message && err.message.includes('UNIQUE')) {
                    return res.status(409).json({ error: 'Username sudah terdaftar' });
                }
                return res.status(500).json({ error: 'Gagal membuat user' });
            }
            res.json({ message: 'Registrasi berhasil', id: this.lastID });
        });
    });

    // Login
    router.post('/login', (req, res) => {
        const { username, password } = req.body || {};
        if (!username || !password) return res.status(400).json({ error: 'Username dan password diperlukan' });
        db.get(`SELECT id, username, password, role FROM users WHERE username = ?`, [username], (err, row) => {
            if (err) return res.status(500).json({ error: 'Terjadi kesalahan' });
            if (!row) return res.status(401).json({ error: 'Username atau password salah' });
            const match = bcrypt.compareSync(password, row.password);
            if (!match) return res.status(401).json({ error: 'Username atau password salah' });
            const payload = { id: row.id, username: row.username, role: row.role };
            const token = jwt.sign(payload, JWT_SECRET, { expiresIn: '8h' });
            res.json({ message: 'Login berhasil', token, user: payload });
        });
    });

    // Me
    router.get('/me', authenticateToken, (req, res) => {
        res.json({ user: req.user });
    });

    return router;
};
