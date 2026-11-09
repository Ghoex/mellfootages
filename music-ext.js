/**
 * music-ext.js — расширение Mell Footage: загрузка треков, роль «музыкант», сборники треков.
 *
 * Стек проекта: Express 5, `sqlite`/`sqlite3` (async), express-session, multer.
 * Модуль сам ждёт `app` и `db` и НЕ трогает ваши существующие роуты
 * (кроме POST /api/tracks — в API-доке его нет).
 *
 * ── Подключение в server.js ──────────────────────────────────────────────
 *   const { mountMusicExt, initMusicExt } = require('./music-ext');
 *
 *   // 1) сразу после остальных require()
 *   mountMusicExt(app, { getUser: req => req.session.user || null });
 *
 *   // 2) в startServer(), рядом с initRooms/initMailAuth/initFeatures
 *   await initMusicExt(db, { soundsDir: SOUNDS_DIR, coversDir: path.join(UPLOADS_DIR, 'music-covers') });
 *
 * Порядок важен: роуты регистрируются сразу (они async и берут db из замыкания),
 * а таблицы создаются в initMusicExt — так Express 5 не мешает late-mount.
 *
 * ── Роли ────────────────────────────────────────────────────────────────
 * Через API роли НЕ меняются — только напрямую в БД:
 *   UPDATE users SET is_musician = 1 WHERE username = 'ник';           -- музыкант
 *   UPDATE users SET is_musician = 0 WHERE username = 'ник';           -- снять
 *   UPDATE users SET role = 'senior_moderator' WHERE username = 'ник'; -- персонал
 * Новые аккаунты всегда role='user', is_musician=0. is_musician читается из БД на каждый запрос.
 *
 * ── Эндпоинты ───────────────────────────────────────────────────────────
 *   GET    /api/music/me                         права текущей сессии
 *   GET    /api/music/tracks                     треки + мета (сборник, автор, артист)
 *   POST   /api/tracks                           multipart(audioFile, name, artist, collectionId) — музыкант+
 *   PATCH  /api/music/tracks/:filename           { collectionId } — в сборник / null — из сборника
 *   DELETE /api/music/tracks/:filename           автор / senior_moderator / admin
 *   GET    /api/music/collections                сборники с обложками и числом треков
 *   POST   /api/music/collections                { name|title, description, cover(dataURL), is_public } — музыкант+
 *   DELETE /api/music/collections/:id            ?withTracks=1 — вместе с треками
 *
 * ── Права ───────────────────────────────────────────────────────────────
 *   загрузка и сборники — is_musician=1 или любой персонал;
 *   удаление любых треков/сборников — senior_moderator и admin;
 *   музыкант удаляет только свои.
 */
'use strict';

const fs = require('fs');
const path = require('path');
const crypto = require('crypto');
const multer = require('multer');

const AUDIO_EXT = ['.mp3', '.wav', '.ogg', '.m4a', '.flac', '.aac'];
const IMAGE_EXT = ['.png', '.jpg', '.jpeg', '.webp'];
const MAX_AUDIO_MB = Number(process.env.MUSIC_MAX_MB || 25);
const MAX_COLLECTIONS = Number(process.env.MUSIC_COLLECTIONS_PER_USER || 20);
const STAFF_ROLES = ['junior_moderator', 'moderator', 'senior_moderator', 'admin'];
const SENIOR_ROLES = ['senior_moderator', 'admin'];

/* ---------------- утилиты ---------------- */
const extOf = name => (String(name).match(/\.[^./\\]+$/) || [''])[0].toLowerCase();

function sanitizeName(input, max = 100) {
  let s = String(input == null ? '' : input)
    .replace(/[<>]/g, '')
    .replace(/javascript:/gi, '')
    .replace(/[/\\?%*:|"']/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
  if (!s) s = 'track';
  return s.slice(0, max).trim();
}

function isPathInside(base, target) {
  const b = path.resolve(base), t = path.resolve(target);
  return t === b || t.startsWith(b + path.sep);
}

function uniqueFilename(dir, wanted) {
  const ext = extOf(wanted) || '.mp3';
  const base = (path.basename(String(wanted), ext).replace(/\s+/g, ' ').trim() || 'track').slice(0, 80);
  let name = base + ext, i = 1;
  while (fs.existsSync(path.join(dir, name))) name = `${base}-${i++}${ext}`;
  return name;
}

/* ---------------- состояние модуля ---------------- */
const state = {
  db: null,
  soundsDir: null,
  coversDir: null,
  getUser: null,
  ready: false,
  express: null,
};

const rankOf = role => ({ user: 0, musician: 1, junior_moderator: 2, moderator: 3, senior_moderator: 4, admin: 5 }[role] || 0);
const isStaff = u => !!u && STAFF_ROLES.includes(u.role);
const isAdmin = u => !!u && u.role === 'admin';
const isSenior = u => !!u && SENIOR_ROLES.includes(u.role);
const isMusician = u => !!u && (u.is_musician === 1 || u.is_musician === true || isStaff(u));

function currentUser(req) {
  const raw = state.getUser ? state.getUser(req) : (req.session && req.session.user);
  if (!raw) return null;
  // в сессии может лежать урезанный объект — свежие роль/флаг берём из БД
  return raw;
}

async function freshUser(req) {
  const raw = currentUser(req);
  if (!raw || !state.db) return null;
  try {
    const row = await state.db.get('SELECT id, username, role, is_musician, is_banned FROM users WHERE id = ?', [raw.id]);
    return row || null;
  } catch {
    return raw;
  }
}

function guard(need) {
  return async (req, res, next) => {
    try {
      const u = await freshUser(req);
      if (!u) return res.status(401).json({ error: 'Нужно войти' });
      if (u.is_banned) return res.status(403).json({ error: 'Аккаунт заблокирован' });
      if (need === 'musician' && !isMusician(u)) {
        return res.status(403).json({ error: 'Загружать песни и создавать сборники может музыкант (роль выдаётся только в базе данных)' });
      }
      if (need === 'senior' && !isSenior(u)) return res.status(403).json({ error: 'Недостаточно прав' });
      if (need === 'admin' && !isAdmin(u)) return res.status(403).json({ error: 'Только админ' });
      req.musicUser = u;
      next();
    } catch (e) {
      console.error('[music] guard:', e.message);
      res.status(500).json({ error: 'Ошибка сервера' });
    }
  };
}

/* ---------------- данные ---------------- */
async function trackMeta(filename) {
  const db = state.db;
  const row = (await db.get('SELECT * FROM music_tracks WHERE filename = ?', [filename])) || {};
  let size = row.size || 0;
  if (!size) { try { size = fs.statSync(path.join(state.soundsDir, filename)).size; } catch {} }
  return {
    id: filename,
    name: row.display_name || path.basename(filename, extOf(filename)),
    filename,
    url: '/api/stream/' + encodeURIComponent(filename),
    ext: extOf(filename),
    size,
    artist: row.artist || null,
    collectionId: row.collection_id == null ? null : row.collection_id,
    uploadedBy: row.uploaded_by || null,
    createdAt: row.created_at || null,
  };
}

function listSoundFiles() {
  try {
    return fs.readdirSync(state.soundsDir)
      .filter(f => !f.startsWith('.') && AUDIO_EXT.includes(extOf(f)));
  } catch { return []; }
}

async function collectionRow(id) {
  const db = state.db;
  const c = await db.get('SELECT * FROM music_collections WHERE id = ?', [id]);
  if (!c) return null;
  const author = c.user_id ? await db.get('SELECT username FROM users WHERE id = ?', [c.user_id]) : null;
  const cnt = await db.get('SELECT COUNT(*) AS n FROM music_tracks WHERE collection_id = ?', [c.id]);
  return {
    id: c.id,
    title: c.name,
    name: c.name,
    description: c.description || '',
    cover: c.cover || null,
    is_public: c.is_public,
    createdBy: c.user_id,
    authorName: author ? author.username : null,
    createdAt: c.created_at,
    trackCount: cnt ? cnt.n : 0,
  };
}

async function resolveFilename(param) {
  const raw = String(param || '');
  const direct = path.join(state.soundsDir, raw);
  if (isPathInside(state.soundsDir, direct) && fs.existsSync(direct)) return raw;
  const byName = await state.db.get('SELECT filename FROM music_tracks WHERE display_name = ? OR filename = ?', [raw, raw]);
  if (byName && fs.existsSync(path.join(state.soundsDir, byName.filename))) return byName.filename;
  const guess = listSoundFiles().find(f => path.basename(f, extOf(f)).toLowerCase() === raw.toLowerCase());
  return guess || null;
}

async function saveCover(dataUrl) {
  if (!dataUrl || typeof dataUrl !== 'string') return null;
  if (/^https?:\/\//i.test(dataUrl) || dataUrl.startsWith('/')) return dataUrl.slice(0, 500);
  const m = dataUrl.match(/^data:image\/(png|jpe?g|webp);base64,([A-Za-z0-9+/=]+)$/i);
  if (!m) return null;
  const buf = Buffer.from(m[2], 'base64');
  if (buf.length > 2 * 1024 * 1024) return null;
  const ext = m[1].toLowerCase() === 'jpeg' ? '.jpg' : '.' + m[1].toLowerCase();
  const name = 'cover-' + Date.now().toString(36) + '-' + crypto.randomBytes(4).toString('hex') + ext;
  fs.mkdirSync(state.coversDir, { recursive: true });
  fs.writeFileSync(path.join(state.coversDir, name), buf);
  return '/uploads/music-covers/' + name;
}

/* ---------------- multer: аудио в sounds/ ---------------- */
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    try { fs.mkdirSync(state.soundsDir, { recursive: true }); } catch {}
    cb(null, state.soundsDir);
  },
  filename: (req, file, cb) => {
    const wanted = req.body && req.body.name ? req.body.name + extOf(file.originalname) : file.originalname;
    cb(null, uniqueFilename(state.soundsDir, wanted));
  },
});

const audioUpload = multer({
  storage,
  limits: { fileSize: MAX_AUDIO_MB * 1024 * 1024 },
  fileFilter: (req, file, cb) => {
    if (!AUDIO_EXT.includes(extOf(file.originalname))) return cb(new Error('Только аудио: ' + AUDIO_EXT.join(', ')));
    cb(null, true);
  },
}).single('audioFile');

const audioUploadSafe = (req, res, next) => audioUpload(req, res, err => {
  if (err) {
    const msg = err.code === 'LIMIT_FILE_SIZE' ? `Файл больше ${MAX_AUDIO_MB} МБ` : (err.message || 'Ошибка загрузки файла');
    return res.status(400).json({ error: msg });
  }
  next();
});

/* ---------------- регистрация роутов (синхронно, при старте) ---------------- */
function mountMusicExt(app, options) {
  const opts = options || {};
  state.express = app;
  if (opts.getUser) state.getUser = opts.getUser;
  if (opts.soundsDir) state.soundsDir = opts.soundsDir;
  if (opts.coversDir) state.coversDir = opts.coversDir;

  // Права текущей сессии — клиент по этому ответу включает/выключает загрузку
  app.get('/api/music/me', async (req, res) => {
    try {
      const u = await freshUser(req);
      if (!u) return res.json({ success: true, loggedIn: false, is_musician: false, can_upload: false, can_moderate: false, can_manage_roles: false });
      res.json({
        success: true,
        loggedIn: true,
        user: { id: u.id, username: u.username, role: u.role },
        is_musician: isMusician(u),
        can_upload: isMusician(u),
        can_moderate: isSenior(u),
        can_manage_roles: isAdmin(u),
      });
    } catch (e) {
      console.error('[music] me:', e.message);
      res.status(500).json({ error: 'Ошибка сервера' });
    }
  });

  // Публичный список треков + мета
  app.get('/api/music/tracks', async (req, res) => {
    try {
      const files = listSoundFiles();
      const tracks = await Promise.all(files.map(trackMeta));
      tracks.sort((a, b) => String(a.name).localeCompare(String(b.name), 'ru'));
      res.json({ success: true, count: tracks.length, tracks });
    } catch (e) {
      console.error('[music] tracks:', e.message);
      res.status(500).json({ error: 'Не удалось получить треки' });
    }
  });

  // Загрузка трека
  app.post('/api/tracks', guard('musician'), audioUploadSafe, async (req, res) => {
    try {
      if (!req.file) return res.status(400).json({ error: 'Файл не получен (поле audioFile)' });
      const filename = req.file.filename;
      const name = sanitizeName(req.body.name || path.basename(filename, extOf(filename)), 100);
      const artist = sanitizeName(req.body.artist || req.musicUser.username, 60);

      let collectionId = null;
      if (req.body.collectionId) {
        const col = await state.db.get('SELECT * FROM music_collections WHERE id = ?', [Number(req.body.collectionId)]);
        if (col && (col.user_id === req.musicUser.id || isSenior(req.musicUser))) collectionId = col.id;
      }

      await state.db.run(
        `INSERT INTO music_tracks (filename, display_name, artist, ext, size, collection_id, uploaded_by, created_at)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?)
         ON CONFLICT(filename) DO UPDATE SET display_name = excluded.display_name, artist = excluded.artist,
           size = excluded.size, collection_id = excluded.collection_id, uploaded_by = excluded.uploaded_by`,
        [filename, name, artist, extOf(filename), req.file.size || 0, collectionId, req.musicUser.id, new Date().toISOString()]
      );
      res.json({ success: true, track: await trackMeta(filename) });
    } catch (e) {
      console.error('[music] upload:', e.message);
      try { if (req.file) fs.unlinkSync(req.file.path); } catch {}
      res.status(500).json({ error: 'Не удалось сохранить трек' });
    }
  });

  // В сборник / из сборника
  const patchTrack = async (req, res) => {
    try {
      const u = await freshUser(req);
      if (!u) return res.status(401).json({ error: 'Нужно войти' });
      if (!isMusician(u)) return res.status(403).json({ error: 'Нужна роль музыканта' });

      const filename = await resolveFilename(req.params.filename);
      if (!filename) return res.status(404).json({ error: 'Трек не найден' });

      const meta = await state.db.get('SELECT * FROM music_tracks WHERE filename = ?', [filename]);
      const isAuthor = meta && meta.uploaded_by === u.id;
      if (!isAuthor && !isSenior(u)) return res.status(403).json({ error: 'Можно менять только свои треки' });

      let collectionId = null;
      const raw = req.body ? req.body.collectionId : null;
      if (raw !== null && raw !== undefined && raw !== '' && raw !== 0 && raw !== '0') {
        const col = await state.db.get('SELECT * FROM music_collections WHERE id = ?', [Number(raw)]);
        if (!col) return res.status(404).json({ error: 'Сборник не найден' });
        if (col.user_id !== u.id && !isSenior(u)) return res.status(403).json({ error: 'Чужой сборник' });
        collectionId = col.id;
      }

      const size = (() => { try { return fs.statSync(path.join(state.soundsDir, filename)).size; } catch { return 0; } })();
      const name = meta ? meta.display_name : path.basename(filename, extOf(filename));
      const artist = meta ? meta.artist : u.username;
      await state.db.run(
        `INSERT INTO music_tracks (filename, display_name, artist, ext, size, collection_id, uploaded_by, created_at)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?)
         ON CONFLICT(filename) DO UPDATE SET collection_id = excluded.collection_id`,
        [filename, name, artist, extOf(filename), size, collectionId, meta ? meta.uploaded_by : u.id, new Date().toISOString()]
      );
      res.json({ success: true, track: await trackMeta(filename) });
    } catch (e) {
      console.error('[music] patch:', e.message);
      res.status(500).json({ error: 'Не удалось обновить трек' });
    }
  };
  app.patch('/api/music/tracks/:filename', patchTrack);
  app.patch('/api/tracks/:filename', patchTrack);

  // Удаление трека
  const deleteTrack = async (req, res) => {
    try {
      const u = await freshUser(req);
      if (!u) return res.status(401).json({ error: 'Нужно войти' });
      const filename = await resolveFilename(req.params.filename);
      if (!filename) return res.status(404).json({ error: 'Трек не найден' });

      const meta = await state.db.get('SELECT * FROM music_tracks WHERE filename = ?', [filename]);
      const isAuthor = meta && meta.uploaded_by === u.id;
      if (!isSenior(u) && !isAuthor) return res.status(403).json({ error: 'Удалять треки может автор, старший модератор или админ' });
      if (isAuthor && !isMusician(u) && !isSenior(u)) return res.status(403).json({ error: 'Нужна роль музыканта' });

      await state.db.run('DELETE FROM music_tracks WHERE filename = ?', [filename]);
      try { fs.unlinkSync(path.join(state.soundsDir, filename)); } catch {}
      res.json({ success: true });
    } catch (e) {
      console.error('[music] delete:', e.message);
      res.status(500).json({ error: 'Не удалось удалить трек' });
    }
  };
  app.delete('/api/music/tracks/:filename', deleteTrack);
  app.delete('/api/tracks/:filename', deleteTrack);

  // Сборники
  app.get('/api/music/collections', async (req, res) => {
    try {
      const rows = await state.db.all('SELECT id FROM music_collections WHERE is_public = 1 ORDER BY id DESC');
      const out = [];
      for (const r of rows) { const c = await collectionRow(r.id); if (c) out.push(c); }
      res.json({ success: true, count: out.length, collections: out });
    } catch (e) {
      console.error('[music] collections:', e.message);
      res.status(500).json({ error: 'Не удалось получить сборники' });
    }
  });

  app.post('/api/music/collections', guard('musician'), async (req, res) => {
    try {
      const body = req.body || {};
      const name = sanitizeName(body.name || body.title || '', 60);
      if (!name) return res.status(400).json({ error: 'Нужно название сборника' });
      const description = sanitizeName(body.description || '', 300);

      const mine = await state.db.get('SELECT COUNT(*) AS n FROM music_collections WHERE user_id = ?', [req.musicUser.id]);
      if (mine && mine.n >= MAX_COLLECTIONS) {
        return res.status(400).json({ error: `Достигнут лимит сборников (${MAX_COLLECTIONS}). Удалите старый сборник.` });
      }
      const cover = await saveCover(body.cover);
      const isPublic = body.is_public === 0 || body.is_public === '0' ? 0 : 1;
      const info = await state.db.run(
        'INSERT INTO music_collections (user_id, name, description, cover, is_public, created_at) VALUES (?, ?, ?, ?, ?, ?)',
        [req.musicUser.id, name, description || null, cover, isPublic, new Date().toISOString()]
      );
      res.json({ success: true, id: info.lastID, collection: await collectionRow(info.lastID) });
    } catch (e) {
      console.error('[music] create collection:', e.message);
      res.status(500).json({ error: 'Не удалось создать сборник' });
    }
  });

  app.delete('/api/music/collections/:id', async (req, res) => {
    try {
      const u = await freshUser(req);
      if (!u) return res.status(401).json({ error: 'Нужно войти' });
      const col = await state.db.get('SELECT * FROM music_collections WHERE id = ?', [Number(req.params.id)]);
      if (!col) return res.status(404).json({ error: 'Сборник не найден' });
      const isOwner = col.user_id === u.id;
      if (!isOwner && !isSenior(u)) return res.status(403).json({ error: 'Удалять сборник может автор, старший модератор или админ' });
      if (isOwner && !isSenior(u) && !isMusician(u)) return res.status(403).json({ error: 'Нужна роль музыканта' });

      const withTracks = String(req.query.withTracks || '') === '1';
      const items = await state.db.all('SELECT filename FROM music_tracks WHERE collection_id = ?', [col.id]);
      if (withTracks) {
        for (const it of items) {
          await state.db.run('DELETE FROM music_tracks WHERE filename = ?', [it.filename]);
          try { fs.unlinkSync(path.join(state.soundsDir, it.filename)); } catch {}
        }
      } else {
        await state.db.run('UPDATE music_tracks SET collection_id = NULL WHERE collection_id = ?', [col.id]);
      }
      if (col.cover && col.cover.startsWith('/uploads/music-covers/')) {
        try { fs.unlinkSync(path.join(path.dirname(state.coversDir), '..', col.cover.replace(/^\//, '').replace('uploads/', 'uploads/'))); } catch {}
      }
      await state.db.run('DELETE FROM music_collections WHERE id = ?', [col.id]);
      res.json({ success: true });
    } catch (e) {
      console.error('[music] delete collection:', e.message);
      res.status(500).json({ error: 'Не удалось удалить сборник' });
    }
  });

  // Роль через API не меняется — только SQL по базе
  app.all(['/api/admin/users/:id/musician', '/api/music/musicians'], (req, res) => {
    res.status(403).json({ error: 'Роли меняются только в базе данных' });
  });

  console.log('[music] роуты музыки смонтированы (initMusicExt ещё не вызывался)');
  return state;
}

/* ---------------- инициализация БД (после open) ---------------- */
async function initMusicExt(db, options) {
  const opts = options || {};
  state.db = db;
  if (opts.soundsDir) state.soundsDir = opts.soundsDir;
  if (opts.coversDir) state.coversDir = opts.coversDir;
  if (!state.soundsDir) state.soundsDir = path.join(__dirname, 'sounds');
  if (!state.coversDir) state.coversDir = path.join(__dirname, 'public', 'uploads', 'music-covers');

  fs.mkdirSync(state.soundsDir, { recursive: true });
  fs.mkdirSync(state.coversDir, { recursive: true });

  // флаг «музыкант» (аналог addColumnIfNotExists из server.js)
  const cols = await db.all('PRAGMA table_info(users)');
  if (!cols.some(c => c.name === 'is_musician')) {
    await db.exec("ALTER TABLE users ADD COLUMN is_musician INTEGER NOT NULL DEFAULT 0");
    console.log('[миграция] добавлена колонка users.is_musician');
  }

  await db.exec(`
    CREATE TABLE IF NOT EXISTS music_tracks (
      filename      TEXT PRIMARY KEY,
      display_name  TEXT,
      artist        TEXT,
      ext           TEXT,
      size          INTEGER DEFAULT 0,
      collection_id INTEGER,
      uploaded_by   INTEGER,
      created_at    TEXT
    );
    CREATE TABLE IF NOT EXISTS music_collections (
      id          INTEGER PRIMARY KEY AUTOINCREMENT,
      user_id     INTEGER NOT NULL,
      name        TEXT NOT NULL,
      description TEXT,
      cover       TEXT,
      is_public   INTEGER NOT NULL DEFAULT 1,
      created_at  TEXT
    );
    CREATE INDEX IF NOT EXISTS idx_music_tracks_col ON music_tracks(collection_id);
  `);

  state.ready = true;
  console.log('[music] БД музыки готова:', state.soundsDir);
  return state;
}

module.exports = { mountMusicExt, initMusicExt, AUDIO_EXT, MAX_AUDIO_MB, isMusician, isSenior, isStaff, rankOf };
