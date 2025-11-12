// server.js

const express = require('express');
const sqlite3 = require('sqlite3').verbose();
const fs = require('fs');
const multer = require('multer');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const path = require('path');

// Inisialisasi aplikasi Express
const app = express();
const port = 3000;

// Middleware untuk parsing JSON dari request body
app.use(express.json());

// Siapkan folder uploads di dalam public untuk menyimpan gambar
const uploadsDir = path.join(__dirname, 'public', 'uploads');
if (!fs.existsSync(uploadsDir)) {
    fs.mkdirSync(uploadsDir, { recursive: true });
}

// Setup multer untuk upload file gambar
const storage = multer.diskStorage({
    destination: (req, file, cb) => cb(null, uploadsDir),
    filename: (req, file, cb) => {
        const safeName = Date.now() + '-' + file.originalname.replace(/\s+/g, '_');
        cb(null, safeName);
    }
});
const upload = multer({ storage, limits: { fileSize: 5 * 1024 * 1024 } }); // max 5MB

// Middleware untuk menyajikan file statis dari folder 'public'
// Sajikan file statis relatif terhadap lokasi file server.js
app.use(express.static(path.join(__dirname, 'public')));

// Fallback eksplisit untuk root agar selalu mengirim index.html
app.get('/', (req, res) => {
    res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

// Inisialisasi database SQLite
const db = new sqlite3.Database('./gudang.db', sqlite3.OPEN_READWRITE | sqlite3.OPEN_CREATE, (err) => {
    if (err) {
        console.error("Error saat membuka database", err.message);
    } else {
        console.log('Terhubung ke database SQLite.');
        // Buat tabel barang jika belum ada, termasuk kolom `gambar` untuk path gambar
        db.serialize(() => {
            db.run(`CREATE TABLE IF NOT EXISTS barang (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                nama_barang TEXT NOT NULL,
                qty INTEGER NOT NULL,
                harga_barang REAL NOT NULL,
                gambar TEXT
            )`, (err) => {
                if (err) {
                    console.error("Error membuat tabel", err.message);
                }
            });

            // Buat tabel users untuk autentikasi
            db.run(`CREATE TABLE IF NOT EXISTS users (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                username TEXT UNIQUE NOT NULL,
                password TEXT NOT NULL,
                role TEXT NOT NULL DEFAULT 'user'
            )`, (err) => {
                if (err) console.error('Error membuat tabel users', err.message);
            });

            // Pastikan ada akun admin default (jika belum ada)
            db.get("SELECT id FROM users WHERE role = 'admin' LIMIT 1", (err, row) => {
                if (err) return console.error('Error mengecek admin:', err.message);
                if (!row) {
                    const defaultAdminUser = 'admin';
                    const defaultAdminPass = 'admin123';
                    const hash = bcrypt.hashSync(defaultAdminPass, 8);
                    db.run(`INSERT OR IGNORE INTO users (username, password, role) VALUES (?, ?, 'admin')`, [defaultAdminUser, hash], (insertErr) => {
                        if (insertErr) console.error('Gagal membuat admin default:', insertErr.message);
                        else console.log('Admin default dibuat -> username: admin, password: admin123');
                    });
                }
            });

            // Jika tabel sudah ada tapi kolom gambar belum ada (DB lama), tambahkan kolom
            db.all("PRAGMA table_info(barang)", (err, rows) => {
                if (!err && Array.isArray(rows)) {
                    const hasGambar = rows.some(r => r && r.name === 'gambar');
                    if (!hasGambar) {
                        db.run("ALTER TABLE barang ADD COLUMN gambar TEXT", (alterErr) => {
                            if (alterErr) console.error('Error menambah kolom gambar:', alterErr.message);
                        });
                    }
                }
            });
        });
    }
});

// --- API ENDPOINTS ---

// JWT secret (in production keep this in env var)
const JWT_SECRET = process.env.JWT_SECRET || 'gudang_secret_change_me';

// Middleware untuk verifikasi token
function authenticateToken(req, res, next) {
    const authHeader = req.headers['authorization'];
    const token = authHeader && authHeader.split(' ')[1];
    if (!token) return res.status(401).json({ error: 'Token tidak ditemukan' });
    jwt.verify(token, JWT_SECRET, (err, user) => {
        if (err) return res.status(403).json({ error: 'Token tidak valid' });
        req.user = user; // { id, username, role }
        next();
    });
}

function requireAdmin(req, res, next) {
    if (!req.user || req.user.role !== 'admin') {
        return res.status(403).json({ error: 'Akses ditolak: admin saja' });
    }
    next();
}

// AUTH: register
app.post('/api/auth/register', express.json(), (req, res) => {
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

// AUTH: login
app.post('/api/auth/login', express.json(), (req, res) => {
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

// AUTH: get current user
app.get('/api/auth/me', authenticateToken, (req, res) => {
    res.json({ user: req.user });
});


// READ: Ambil semua data barang
app.get('/api/barang', (req, res) => {
    db.all("SELECT * FROM barang ORDER BY id DESC", [], (err, rows) => {
        if (err) {
            res.status(500).json({ error: err.message });
            return;
        }
        res.json({ data: rows });
    });
});

// CREATE: Tambah barang baru (menerima gambar)
app.post('/api/barang', authenticateToken, upload.single('gambar'), (req, res) => {
    const { nama_barang } = req.body;
    const qty = parseInt(req.body.qty, 10);
    const harga_barang = parseFloat(req.body.harga_barang);

    // Validasi input
    if (!nama_barang || nama_barang.trim() === '') {
        return res.status(400).json({ error: "Nama barang tidak boleh kosong" });
    }
    if (isNaN(qty) || qty < 0) {
        return res.status(400).json({ error: "Jumlah barang harus berupa angka bulat positif" });
    }
    if (isNaN(harga_barang) || harga_barang < 0) {
        return res.status(400).json({ error: "Harga barang harus berupa angka positif" });
    }

    const gambarPath = req.file ? `/uploads/${req.file.filename}` : null;

    db.run(`INSERT INTO barang (nama_barang, qty, harga_barang, gambar) VALUES (?, ?, ?, ?)`,
        [nama_barang.trim(), qty, harga_barang, gambarPath],
        function(err) {
            if (err) {
                console.error("Error saat menambah barang:", err);
                res.status(500).json({ error: "Gagal menambah barang ke database" });
                return;
            }
            res.json({ message: "Barang berhasil ditambahkan!", id: this.lastID });
        }
    );
});

// UPDATE: Update data barang (menerima gambar baru opsional)
app.put('/api/barang/:id', authenticateToken, requireAdmin, upload.single('gambar'), (req, res) => {
    const { id } = req.params;
    const { nama_barang } = req.body;
    const qty = parseInt(req.body.qty, 10);
    const harga_barang = parseFloat(req.body.harga_barang);

    if (!nama_barang || nama_barang.trim() === '') {
        return res.status(400).json({ error: "Nama barang tidak boleh kosong" });
    }
    if (isNaN(qty) || qty < 0) {
        return res.status(400).json({ error: "Jumlah barang harus berupa angka bulat positif" });
    }
    if (isNaN(harga_barang) || harga_barang < 0) {
        return res.status(400).json({ error: "Harga barang harus berupa angka positif" });
    }

    const gambarPath = req.file ? `/uploads/${req.file.filename}` : null;

    if (gambarPath) {
        db.run(`UPDATE barang SET nama_barang = ?, qty = ?, harga_barang = ?, gambar = ? WHERE id = ?`,
            [nama_barang.trim(), qty, harga_barang, gambarPath, id],
            function(err) {
                if (err) {
                    res.status(500).json({ error: err.message });
                    return;
                }
                res.json({ message: "Barang berhasil diperbarui!" });
            }
        );
    } else {
        db.run(`UPDATE barang SET nama_barang = ?, qty = ?, harga_barang = ? WHERE id = ?`,
            [nama_barang.trim(), qty, harga_barang, id],
            function(err) {
                if (err) {
                    res.status(500).json({ error: err.message });
                    return;
                }
                res.json({ message: "Barang berhasil diperbarui!" });
            }
        );
    }
});

// DELETE: Hapus data barang (admin only)
app.delete('/api/barang/:id', authenticateToken, requireAdmin, (req, res) => {
    const { id } = req.params;
    db.run(`DELETE FROM barang WHERE id = ?`, id, function(err) {
        if (err) {
            res.status(500).json({ error: err.message });
            return;
        }
        res.json({ message: "Barang berhasil dihapus!" });
    });
});

// Jalankan server
app.listen(port, () => {
    console.log(`Server berjalan di http://localhost:${port}`);
});