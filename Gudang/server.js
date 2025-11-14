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

// Set up EJS view engine
app.set('views', path.join(__dirname, 'views'));
app.set('view engine', 'ejs');

// Mount modular route handlers
app.use('/api/auth', require('./routes/auth')({ db, jwt, bcrypt, JWT_SECRET }));
app.use('/api/barang', require('./routes/barang')({ db, upload, jwt, JWT_SECRET }));

// Render the main page with EJS (keeps same HTML/UI)
app.get('/', (req, res) => {
    res.render('index');
});

// Jalankan server
app.listen(port, () => {
    console.log(`Server berjalan di http://localhost:${port}`);
});