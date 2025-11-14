<!-- .github/copilot-instructions.md - project-specific guidance for AI coding agents -->
# GudangKu — Copilot instructions

This file contains concise, project-specific guidance for AI coding assistants working on the GudangKu repo.

- **Big picture**: A single-process Express.js app (`Gudang/server.js`) serves a small inventory web app. Data is stored in a local SQLite file `gudang.db` (created next to the repository when the server runs). Static UI assets live in `Gudang/public` and uploaded images are saved to `Gudang/public/uploads`.

- **Primary responsibilities of code:**
  - `Gudang/server.js`: HTTP API (CRUD for `barang`), auth (JWT), file upload handling (multer), DB initialization/migrations (creates tables, adds `gambar` column if missing), and static file serving.
  - `Gudang/public/*`: client UI (plain HTML/vanilla JS). `script.js` stores JWTs in `localStorage` and calls the API.

- **Key runtime behaviour & assumptions:**
  - Server listens on port `3000` by default. Run from repo root with: `node Gudang/server.js`.
  - JWT secret: `JWT_SECRET` env var. If missing, the code uses `'gudang_secret_change_me'` (change this for production).
  - Default admin account is auto-created (username: `admin`, password: `admin123`) if no admin exists.
  - Uploaded images max 5 MB; multer stores them in `public/uploads` and API returns path `/uploads/<filename>`.
  - Database file: `gudang.db` in the repo folder (server creates it automatically).

- **Important endpoints & auth rules (examples):**
  - POST `/api/auth/register` — body JSON `{username, password}` (creates regular user).
  - POST `/api/auth/login` — body JSON `{username, password}` → returns `{token, user}`. Client stores token in `localStorage` as `gudang_token` and `gudang_user`.
  - GET `/api/auth/me` — requires `Authorization: Bearer <token>`.
  - GET `/api/barang` — public read.
  - POST `/api/barang` — requires auth; multipart/form-data (fields: `nama_barang`, `qty`, `harga_barang`, optional file field `gambar`).
  - PUT `/api/barang/:id` and DELETE `/api/barang/:id` — require an authenticated user with `role === 'admin'`.

- **Common developer workflows / commands:**
  - Install dependencies: `npm install` (run in repo root where `package.json` lives).
  - Start server: `node Gudang/server.js` (or run via a debugger/IDE). There is no `npm start` script by default.
  - Open the UI at: `http://localhost:3000`.

- **Project-specific conventions & patterns to follow:**
  - Minimalist server: route handlers perform small responsibilities (validate inputs → mutate DB → return JSON). Keep controller logic small and prefer adding helper functions if logic expands.
  - DB schema changes: `server.js` runs simple, idempotent schema steps (CREATE TABLE IF NOT EXISTS, ALTER TABLE ADD COLUMN when needed). Follow the same pattern for small migrations.
  - Auth payload in JWT: `{id, username, role}`. Use `req.user` populated by `authenticateToken` middleware.
  - Client-side stores token in `localStorage` keys `gudang_token` and `gudang_user` (stringified JSON). Use these exact keys when writing code that integrates with the UI.

- **Integration points & gotchas**
  - Static assets are served from `Gudang/public` via `express.static(...)` and the root route sends `index.html`. When changing client files, refresh the browser; caching may hide changes.
  - File uploads are returned as relative paths like `/uploads/<file>`. These are served from `public` and expected by `script.js` when building image `src`.
  - If you change port or paths, update both `server.js` and client fetch calls in `Gudang/public/script.js`.
  - Tests are not present; be cautious when changing DB schema — the server will modify the live `gudang.db`.

- **Examples to copy/paste**
  - Login curl example:

    curl -X POST http://localhost:3000/api/auth/login -H "Content-Type: application/json" -d '{"username":"admin","password":"admin123"}'

  - Add item (multipart form):

    curl -X POST http://localhost:3000/api/barang -H "Authorization: Bearer <token>" -F "nama_barang=Barang 1" -F "qty=10" -F "harga_barang=10000" -F "gambar=@/path/to/pic.jpg"

- **Where to look first when debugging:**
  - Server console (where `node Gudang/server.js` runs) for DB and auth errors.
  - `Gudang/public/script.js` for client-side fetch usage and `localStorage` keys.
  - The `gudang.db` SQLite file (open with `sqlite3` or DB browser) to inspect tables `barang` and `users`.

- **What not to change without coordination**
  - The shape of the JWT payload `{id, username, role}` and the `localStorage` keys — the UI and server rely on these exact shapes.
  - The uploads folder location `public/uploads` unless you update both multer config and client image paths.

If anything in this guidance is unclear or you want me to expand with automated checks (lint, start script, or small tests), tell me which area to improve and I will update the file.
