const express = require('express');

module.exports = function deps(opts) {
    const router = express.Router();
    const db = opts.db;
    const upload = opts.upload;
    const jwt = opts.jwt;
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

    // GET / (list)
    router.get('/', (req, res) => {
        db.all("SELECT * FROM barang ORDER BY id DESC", [], (err, rows) => {
            if (err) {
                res.status(500).json({ error: err.message });
                return;
            }
            res.json({ data: rows });
        });
    });

    // POST / (create) - authenticated
    router.post('/', authenticateToken, upload.single('gambar'), (req, res) => {
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

    // PUT /:id - admin
    router.put('/:id', authenticateToken, requireAdmin, upload.single('gambar'), (req, res) => {
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

    // DELETE /:id - admin
    router.delete('/:id', authenticateToken, requireAdmin, (req, res) => {
        const { id } = req.params;
        db.run(`DELETE FROM barang WHERE id = ?`, id, function(err) {
            if (err) {
                res.status(500).json({ error: err.message });
                return;
            }
            res.json({ message: "Barang berhasil dihapus!" });
        });
    });

    return router;
};
