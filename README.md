# Gudang (Inventory)

Perubahan cepat yang ditambahkan:

- Fitur registrasi dan login berbasis JWT.
- Tabel `users` pada SQLite dengan role (`user`/`admin`).
- Endpoint baru:
  - POST /api/auth/register — registrasi user
  - POST /api/auth/login — login, mengembalikan token JWT
  - GET /api/auth/me — ambil data user dari token
- Proteksi endpoint:
  - POST /api/barang — hanya untuk user terautentikasi
  - PUT /api/barang/:id dan DELETE /api/barang/:id — hanya untuk admin
- UI login/register sederhana di `public/index.html` dan penyimpanan token di `localStorage`.

Cara menjalankan:

1. Install dependencies:

```powershell
cd "c:\Users\hi\Documents\Gudang"
npm.cmd install
```

2. Jalankan server:

```powershell
node "c:\Users\hi\Documents\Gudang\Gudang\server.js"
```

3. Buka http://localhost:3000 di browser.

Akun admin default dibuat otomatis jika belum ada:

- username: `admin`
- password: `admin123`

Silakan ubah password admin segera.

Catatan keamanan & next steps:

- Simpan `JWT_SECRET` di environment variable.
- Aktifkan HTTPS saat produksi.
- Tambahkan validasi password (strength), rate limiting, dan logout server-side jika perlu.
- Pertimbangkan CSRF protections jika menggunakan cookie-based auth.

