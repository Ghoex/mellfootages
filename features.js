// features.js — теги футажей, даты загрузки, сортировка, пакетное скачивание (ZIP).
// Подключение в server.js:
//   const { mountFeatures, initFeatures, getVideoExtras, renameVideoExtras, deleteVideoExtras } = require('./features');

const path = require('path');
const fs = require('fs');
const archiver = require('archiver');

const VIDEO_TAGGER_ROLES = ['admin', 'senior_moderator', 'junior_moderator'];
const ZIP_MAX_FILES = 30;
const ZIP_MAX_BYTES = 1024 * 1024 * 1024; // 1 ГБ на один архив
const DOWNLOAD_COUNT_WINDOW_MS = 60 * 60 * 1000; // один учёт скачивания на сессию в час

let _db = null;
let _videosDir = null;
let _allowedExt = [];

// ------------------------------------------------------------
// ИНИЦИАЛИЗАЦИЯ
// ------------------------------------------------------------
async function initFeatures(db, { videosDir, allowedExtensions }) {
    _db = db;
    _videosDir = videosDir;
    _allowedExt = allowedExtensions;

    await db.exec(`
        CREATE TABLE IF NOT EXISTS video_tags (
            video_name TEXT NOT NULL,
            tag_id INTEGER NOT NULL,
            added_by INTEGER,
            added_at TEXT NOT NULL,
            PRIMARY KEY (video_name, tag_id)
        );
        CREATE TABLE IF NOT EXISTS video_meta (
            video_name TEXT PRIMARY KEY,
            uploaded_at TEXT NOT NULL
        );
        CREATE INDEX IF NOT EXISTS idx_video_likes_name ON video_likes(video_name);
    `);

    // Дата загрузки для файлов, которые появились до этой версии:
    // берём время создания файла, дальше дата хранится в БД
    const files = fs.existsSync(videosDir) ? fs.readdirSync(videosDir) : [];
    for (const file of files) {
        if (!allowedExtensions.includes(path.extname(file).toLowerCase())) continue;
        const existing = await db.get('SELECT video_name FROM video_meta WHERE video_name = ?', [file]);
        if (existing) continue;
        const stat = fs.statSync(path.join(videosDir, file));
        await db.run('INSERT INTO video_meta (video_name, uploaded_at) VALUES (?, ?)',
            [file, new Date(stat.birthtimeMs || stat.mtimeMs).toISOString()]);
    }
}

// Вызывать при одобрении заявки: фиксируем дату, когда футаж появился на сайте
async function markUploaded(filename) {
    await _db.run(
        'INSERT OR REPLACE INTO video_meta (video_name, uploaded_at) VALUES (?, ?)',
        [filename, new Date().toISOString()]
    );
}

// ------------------------------------------------------------
// ДАННЫЕ ДЛЯ /api/videos
// Возвращает Map: имя файла -> { tags, likes, downloads, uploaded_at }
// ------------------------------------------------------------
async function getVideoExtras(names) {
    const result = new Map();
    if (!names.length) return result;

    const placeholders = names.map(() => '?').join(',');

    const tagRows = await _db.all(`
        SELECT vt.video_name, t.id, t.name, t.color, t.icon
        FROM video_tags vt
        JOIN tags t ON t.id = vt.tag_id
        WHERE vt.video_name IN (${placeholders})
        ORDER BY t.name
    `, names);

    const likeRows = await _db.all(`
        SELECT video_name, COUNT(*) AS n FROM video_likes
        WHERE video_name IN (${placeholders}) GROUP BY video_name
    `, names);

    const dlRows = await _db.all(`
        SELECT video_name, count FROM video_downloads
        WHERE video_name IN (${placeholders})
    `, names);

    const metaRows = await _db.all(`
        SELECT video_name, uploaded_at FROM video_meta
        WHERE video_name IN (${placeholders})
    `, names);

    for (const name of names) {
        result.set(name, { tags: [], likes: 0, downloads: 0, uploaded_at: null });
    }
    tagRows.forEach(r => result.get(r.video_name)?.tags.push({ id: r.id, name: r.name, color: r.color, icon: r.icon }));
    likeRows.forEach(r => { const e = result.get(r.video_name); if (e) e.likes = r.n; });
    dlRows.forEach(r => { const e = result.get(r.video_name); if (e) e.downloads = r.count; });
    metaRows.forEach(r => { const e = result.get(r.video_name); if (e) e.uploaded_at = r.uploaded_at; });

    return result;
}

// При переименовании файла переносим всё, что к нему привязано
async function renameVideoExtras(oldName, newName) {
    await _db.run('UPDATE video_tags SET video_name = ? WHERE video_name = ?', [newName, oldName]);
    await _db.run('UPDATE video_meta SET video_name = ? WHERE video_name = ?', [newName, oldName]);
}

async function deleteVideoExtras(name) {
    await _db.run('DELETE FROM video_tags WHERE video_name = ?', [name]);
    await _db.run('DELETE FROM video_meta WHERE video_name = ?', [name]);
}

// ------------------------------------------------------------
// ГАРД: теги видео могут ставить младший/старший модератор и админ
// ------------------------------------------------------------
async function requireVideoTagger(req, res, next) {
    try {
        if (!req.session.user) return res.status(401).json({ error: 'Нужно войти' });
        const user = await _db.get('SELECT id, username, role FROM users WHERE id = ?', [req.session.user.id]);
        if (!user) return res.status(401).json({ error: 'Пользователь не найден' });
        const role = String(user.role || '').trim().toLowerCase();
        if (!VIDEO_TAGGER_ROLES.includes(role)) return res.status(403).json({ error: 'Доступ запрещён' });
        req.user = user;
        next();
    } catch (e) {
        console.error('requireVideoTagger error:', e);
        res.status(500).json({ error: 'Ошибка сервера' });
    }
}

function safeVideoName(raw) {
    const name = path.basename(decodeURIComponent(String(raw || '')));
    if (!name || !_allowedExt.includes(path.extname(name).toLowerCase())) return null;
    if (!fs.existsSync(path.join(_videosDir, name))) return null;
    return name;
}

// ------------------------------------------------------------
// МАРШРУТЫ
// ------------------------------------------------------------
function mountFeatures(app) {
    // Добавить тег футажу
    app.post('/api/admin/videos/:filename/tags', requireVideoTagger, async (req, res) => {
        try {
            const name = safeVideoName(req.params.filename);
            if (!name) return res.status(404).json({ error: 'Видео не найдено' });

            const tagId = Number(req.body.tag_id);
            if (!Number.isInteger(tagId)) return res.status(400).json({ error: 'Укажите tag_id' });

            const tag = await _db.get('SELECT id FROM tags WHERE id = ?', [tagId]);
            if (!tag) return res.status(404).json({ error: 'Тег не найден' });

            await _db.run(
                'INSERT OR IGNORE INTO video_tags (video_name, tag_id, added_by, added_at) VALUES (?, ?, ?, ?)',
                [name, tagId, req.user.id, new Date().toISOString()]
            );
            res.json({ success: true });
        } catch (e) {
            console.error(e);
            res.status(500).json({ error: 'Ошибка сервера' });
        }
    });

    // Снять тег с футажа
    app.delete('/api/admin/videos/:filename/tags/:tagId', requireVideoTagger, async (req, res) => {
        try {
            const name = safeVideoName(req.params.filename);
            if (!name) return res.status(404).json({ error: 'Видео не найдено' });
            await _db.run('DELETE FROM video_tags WHERE video_name = ? AND tag_id = ?',
                [name, Number(req.params.tagId)]);
            res.json({ success: true });
        } catch (e) {
            console.error(e);
            res.status(500).json({ error: 'Ошибка сервера' });
        }
    });

    // Пакетное скачивание: один ZIP на несколько футажей
    app.post('/api/download-zip', async (req, res) => {
        const requested = Array.isArray(req.body?.names) ? req.body.names : [];
        const unique = [...new Set(requested.map(n => String(n)))];

        if (!unique.length) return res.status(400).json({ error: 'Не выбрано ни одного файла' });
        if (unique.length > ZIP_MAX_FILES) {
            return res.status(400).json({ error: `За раз можно скачать не больше ${ZIP_MAX_FILES} файлов` });
        }

        const files = [];
        let total = 0;
        for (const raw of unique) {
            const name = safeVideoName(raw);
            if (!name) return res.status(400).json({ error: `Файл не найден: ${raw}` });
            const size = fs.statSync(path.join(_videosDir, name)).size;
            total += size;
            files.push({ name, size });
        }
        if (total > ZIP_MAX_BYTES) {
            return res.status(400).json({ error: 'Слишком большой архив. Выберите меньше файлов' });
        }

        res.setHeader('Content-Type', 'application/zip');
        res.setHeader('Content-Disposition', 'attachment; filename="footages.zip"');

        const archive = archiver('zip', { store: true }); // видео уже сжаты, store быстрее
        archive.on('error', (err) => {
            console.error('ZIP error:', err);
            res.destroy(err);
        });
        archive.pipe(res);
        for (const f of files) {
            archive.file(path.join(_videosDir, f.name), { name: f.name });
        }
        archive.finalize();
    });

    // Список тегов-каталога для выбора модератором (доступен всем)
    app.get('/api/video-tags/catalog', async (req, res) => {
        try {
            const tags = await _db.all('SELECT id, name, color, icon FROM tags ORDER BY name');
            res.json(tags);
        } catch (e) {
            res.status(500).json({ error: 'Ошибка сервера' });
        }
    });
}

module.exports = {
    mountFeatures,
    initFeatures,
    markUploaded,
    getVideoExtras,
    renameVideoExtras,
    deleteVideoExtras,
    requireVideoTagger
};
