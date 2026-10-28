require('dotenv').config();

const path = require('path');
const multer = require('multer');
const express = require('express');
const sqlite3 = require('sqlite3');
const { open } = require('sqlite');
const bcrypt = require('bcryptjs');
const fs = require('fs');
const cors = require('cors');
const helmet = require('helmet');
const rateLimit = require('express-rate-limit');
const crypto = require('crypto');
const session = require('express-session');
const SQLiteStore = require('connect-sqlite3')(session);
const { spawn } = require('child_process');
const { mountRooms, initRooms } = require('./rooms');
const { mountMailAuth, initMailAuth } = require('./mail-auth');

let ffmpegPath = null;
try {
    ffmpegPath = require('ffmpeg-static');
} catch {
    console.warn('ffmpeg-static не установлен: превью футажей отключены. Выполните: npm i ffmpeg-static');
}

const app = express();
const PORT = process.env.PORT || 80;

const SOUNDS_DIR = path.join(__dirname, 'sounds');
const VIDEOS_DIR = path.join(__dirname, 'videos');
const UPLOADS_DIR = path.join(__dirname, 'public', 'uploads');
const THUMB_DIR = path.join(UPLOADS_DIR, 'thumbs');
const AVATAR_DIR = path.join(UPLOADS_DIR, 'avatars');
const SUBMISSIONS_DIR = path.join(__dirname, 'submissions');

const ALLOWED_VIDEO_EXTENSIONS = ['.mp4', '.mkv', '.webm', '.mov'];
const ALLOWED_IMAGE_EXTENSIONS = ['.png', '.jpg', '.jpeg', '.webp'];
const ALLOWED_UPLOAD_EXTENSIONS = [...ALLOWED_VIDEO_EXTENSIONS, ...ALLOWED_IMAGE_EXTENSIONS];
const AUDIO_EXTENSIONS = ['.mp3', '.wav', '.ogg', '.m4a', '.flac', '.aac'];

const MAX_COLLECTIONS_PER_USER = 6;

const STAFF_ROLES = ['admin', 'moderator', 'junior_moderator', 'senior_moderator'];
const TAG_GRANTER_ROLES = ['admin', 'senior_moderator', 'junior_moderator'];
const VERIFIER_ROLES = ['admin', 'senior_moderator'];

const TERMS_VERSION = '2026-10';
const REGISTER_CODE_TTL_MS = 10 * 60 * 1000;
const USERNAME_REGEX = /^[a-zA-Z0-9_\-]{3,15}$/;
const TELEGRAM_ID_REGEX = /^\d{5,15}$/;
const RESERVED_USERNAMES = ['admin', 'moder', 'moderator', 'root', 'system', 'support'];

const SITE_URL = (process.env.SITE_URL || '').replace(/\/+$/, '');

let db;

// ============================================================
// ВСПОМОГАТЕЛЬНОЕ
// ============================================================
function isPathInside(base, target) {
    const resolvedBase = path.resolve(base);
    const resolvedTarget = path.resolve(target);
    return resolvedTarget === resolvedBase || resolvedTarget.startsWith(resolvedBase + path.sep);
}

function sanitizeInput(str) {
    if (typeof str !== 'string') return str;
    return str
        .replace(/[<>]/g, '')
        .replace(/javascript:/gi, '')
        .trim();
}

function generateSixDigitCode() {
    return Math.floor(100000 + Math.random() * 900000).toString();
}

async function addColumnIfNotExists(table, column, definition) {
    const columns = await db.all(`PRAGMA table_info(${table})`);
    if (!columns.some(c => c.name === column)) {
        await db.exec(`ALTER TABLE ${table} ADD COLUMN ${column} ${definition}`);
        console.log(`[миграция] добавлена колонка ${table}.${column}`);
    }
}

async function queueNotification({ type, targetUserId = null, targetChatId = null, title = '', message = '', imagePath = null, link = null }) {
    try {
        await db.run(
            `INSERT INTO bot_notifications
                (type, target_user_id, target_chat_id, title, message, image_path, link, created_at, processed)
             VALUES (?, ?, ?, ?, ?, ?, ?, ?, 0)`,
            [type, targetUserId, targetChatId, title, message, imagePath, link, new Date().toISOString()]
        );
    } catch (error) {
        // Уведомление не должно ломать основной флоу (одобрение, новость и т.д.)
        console.error('Не удалось добавить уведомление для бота:', error);
    }
}

app.use(helmet({
    contentSecurityPolicy: {
        directives: {
            defaultSrc: ["'self'"],
            scriptSrc: ["'self'", "'unsafe-inline'", "https://cdnjs.cloudflare.com"],
            scriptSrcAttr: ["'self'", "'unsafe-inline'"],
            styleSrc: ["'self'", "'unsafe-inline'"],
            imgSrc: ["'self'", "data:", "https:"],
            mediaSrc: ["'self'", "http:", "https:"],
            fontSrc: ["'self'"],
            connectSrc: ["'self'"],
            frameSrc: ["'none'"],
            objectSrc: ["'none'"]
        }
    },
    crossOriginResourcePolicy: { policy: "cross-origin" },
    crossOriginOpenerPolicy: { policy: "same-origin" },
    referrerPolicy: { policy: "strict-origin-when-cross-origin" },
    hsts: { maxAge: 31536000, includeSubDomains: true, preload: true },
    noSniff: true,
    xssFilter: true,
    frameguard: { action: 'deny' }
}));

// ============================================================
// CORS
// ============================================================
const allowedOrigins = [
"*"
    
];

const corsOptions = {
    origin: function (origin, callback) {
        if (!origin) return callback(null, true);

        const isAllowed = allowedOrigins.some(allowed =>
            typeof allowed === 'string' ? allowed === origin : allowed.test(origin)
        );

        if (isAllowed) return callback(null, true);

        console.warn(`CORS blocked: ${origin}`);
        callback(new Error(`CORS not allowed for ${origin}`));
    },
    credentials: false,
    methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization', 'Range', 'User-Agent'],
    exposedHeaders: ['Content-Length', 'Content-Range', 'Accept-Ranges'],
    maxAge: 86400
};
app.use(cors(corsOptions));
app.options('*path', cors(corsOptions));

// ============================================================
// ЛИМИТЕРЫ
// Общий — только на /api. Стрим аудио исключён (много range-запросов).
// Статика не считается.
// ============================================================
const limiter = rateLimit({
    windowMs: 3 * 60 * 1000,
    max: 40,
    message: 'Слишком много запросов, попробуйте позже',
    standardHeaders: true,
    legacyHeaders: false,
    skip: (req) => req.path.startsWith('/stream')
});

// Строгий лимит на вход/регистрацию.
// ВНИМАНИЕ: в исходниках было max: 5 и max: 20 — выбрано 5 (см. примечания).
const authLimiter = rateLimit({
    windowMs: 15 * 60 * 1000,
    max: 30,                       // было 5: слишком мало, блокировало обычных пользователей
    skipSuccessfulRequests: true,  // успешные входы и регистрации не считаем
    message: 'Слишком много попыток, попробуйте позже',
    standardHeaders: true
});

app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

// ============================================================
// СЕССИИ
// ============================================================
if (!process.env.SESSION_SECRET) {
    console.warn(
        '⚠️  SESSION_SECRET не задан в .env! Генерирую временный секрет — ' +
        'все сессии слетят при перезапуске. Добавьте постоянный SESSION_SECRET в .env.'
    );
}
const SESSION_SECRET = process.env.SESSION_SECRET || crypto.randomBytes(32).toString('hex');

// Сайт работает за HTTPS-прокси: доверяем одному уровню прокси,
// иначе Express считает соединение HTTP и не отдаёт secure-cookie сессии
if (process.env.NODE_ENV === 'production') app.set('trust proxy', 1);

app.use(session({
    store: new SQLiteStore({
        db: 'sessions.db',
        dir: __dirname
    }),
    secret: SESSION_SECRET,
    resave: false,
    saveUninitialized: false,
    cookie: {
        httpOnly: true,
        sameSite: 'lax',
        secure: process.env.NODE_ENV === 'production',
        maxAge: 7 * 24 * 60 * 60 * 1000
    }
}));

// ============================================================
// СТАТИКА (до лимитера и роутов)
// ПРИМЕЧАНИЕ: /submissions больше НЕ отдаётся статически — там лежат
// заявки на модерации, и они были доступны любому по прямой ссылке.
// ============================================================
app.use(express.static(path.join(__dirname, 'public')));
app.use('/uploads', express.static(UPLOADS_DIR));

for (const dir of [VIDEOS_DIR, SOUNDS_DIR, UPLOADS_DIR, THUMB_DIR, AVATAR_DIR, SUBMISSIONS_DIR]) {
    if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
}

// ============================================================
// ЗАГРУЗКИ (multer)
// ============================================================
const videoStorage = multer.diskStorage({
    destination: (req, file, cb) => cb(null, VIDEOS_DIR),
    filename: (req, file, cb) => {
        const rawName = req.body.nameof || file.originalname || 'file';
        const ext = path.extname(file.originalname).toLowerCase() || '.mp4';
        const baseName = path.basename(rawName, path.extname(rawName));
        let safeName = baseName
            .replace(/[\/\\?%*:|"<>;&#]/g, '')
            .replace(/^\.+/, '')
            .trim()
            .slice(0, 100);
        if (!safeName) safeName = 'video_' + Date.now();
        cb(null, `${safeName}${ext}`);
    }
});

const videoFileFilter = (req, file, cb) => {
    const ext = path.extname(file.originalname).toLowerCase();
    if (ALLOWED_VIDEO_EXTENSIONS.includes(ext)) cb(null, true);
    else cb(new Error('Недопустимый тип файла. Разрешены: mp4, mkv, webm, mov'), false);
};
const uploadVideo = multer({
    storage: videoStorage,
    fileFilter: videoFileFilter,
    limits: { fileSize: 100 * 1024 * 1024 }
});

const newsStorage = multer.diskStorage({
    destination: (req, file, cb) => cb(null, UPLOADS_DIR),
    filename: (req, file, cb) => {
        const ext = path.extname(file.originalname).toLowerCase();
        cb(null, `news_${Date.now()}${ext}`);
    }
});
const newsFileFilter = (req, file, cb) => {
    const ext = path.extname(file.originalname).toLowerCase();
    if (ALLOWED_IMAGE_EXTENSIONS.includes(ext)) cb(null, true);
    else cb(new Error('Только изображения: png, jpg, jpeg, webp'), false);
};
const uploadNews = multer({ storage: newsStorage, fileFilter: newsFileFilter });

const avatarStorage = multer.diskStorage({
    destination: (req, file, cb) => cb(null, AVATAR_DIR),
    filename: (req, file, cb) => {
        const userId = req.session?.user?.id || 'anon';
        cb(null, `${userId}_${Date.now()}${path.extname(file.originalname).toLowerCase()}`);
    }
});
const avatarFileFilter = (req, file, cb) => {
    const ext = path.extname(file.originalname).toLowerCase();
    if (ALLOWED_IMAGE_EXTENSIONS.includes(ext)) cb(null, true);
    else cb(new Error('Только изображения: png, jpg, jpeg, webp'), false);
};
const uploadAvatar = multer({
    storage: avatarStorage,
    fileFilter: avatarFileFilter,
    limits: { fileSize: 5 * 1024 * 1024 }
});

const submissionStorage = multer.diskStorage({
    destination: (req, file, cb) => cb(null, SUBMISSIONS_DIR),
    filename: (req, file, cb) => {
        // Без сессии multer не должен падать с TypeError — отклоняем файл
        if (!req.session?.user?.id) {
            return cb(new Error('Нужно войти для отправки файла'));
        }
        const ext = path.extname(file.originalname).toLowerCase();
        cb(null, `sub_${Date.now()}_${req.session.user.id}${ext}`);
    }
});
const submissionUpload = multer({
    storage: submissionStorage,
    limits: { fileSize: 7 * 1024 * 1024 },
    fileFilter: (req, file, cb) => {
        if (ALLOWED_VIDEO_EXTENSIONS.includes(path.extname(file.originalname).toLowerCase())) cb(null, true);
        else cb(new Error('Только видео файлы'), false);
    }
});

// ============================================================
// МИДЛВАРЫ АВТОРИЗАЦИИ
// ============================================================
function requireAdmin(req, res, next) {
    const user = req.session.user;
    if (!user) return res.status(401).json({ error: 'Нужно войти' });
    const role = String(user.role || '').trim().toLowerCase();
    if (role !== 'admin') return res.status(403).json({ error: 'Доступ запрещён' });
    req.user = user;
    next();
}

function makeRoleGuard(allowedRoles, loggerName) {
    return async function (req, res, next) {
        try {
            if (!req.session.user) return res.status(401).json({ error: 'Нужно войти' });
            const user = await db.get('SELECT id, username, role FROM users WHERE id = ?', [req.session.user.id]);
            if (!user) return res.status(401).json({ error: 'Пользователь не найден' });
            const role = String(user.role || '').trim().toLowerCase();
            if (!allowedRoles.includes(role)) return res.status(403).json({ error: 'Доступ запрещён' });
            req.user = user;
            next();
        } catch (error) {
            console.error(`${loggerName} error:`, error);
            res.status(500).json({ error: 'Ошибка сервера' });
        }
    };
}

const requireModerator = makeRoleGuard(STAFF_ROLES, 'requireModerator');
const requireTagGranter = makeRoleGuard(TAG_GRANTER_ROLES, 'requireTagGranter');
const requireVerifier = makeRoleGuard(VERIFIER_ROLES, 'requireVerifier');

async function checkBanned(req, res, next) {
    if (!req.user) return res.status(401).json({ error: 'Login required' });

    const user = await db.get(
        'SELECT id, username, role, is_banned, ban_reason, banned_until FROM users WHERE id = ?',
        [req.user.id]
    );
    if (!user) return res.status(401).json({ error: 'User not found' });

    if (user.is_banned) {
        if (user.banned_until && new Date(user.banned_until) <= new Date()) {
            await db.run('UPDATE users SET is_banned = 0, ban_reason = NULL, banned_until = NULL WHERE id = ?', [user.id]);
        } else {
            return res.status(403).json({ error: 'Account banned', reason: user.ban_reason, until: user.banned_until });
        }
    }

    req.user = user;
    next();
}

// Обновляем роль/верификацию из БД на каждый запрос,
// чтобы бан и смена роли применялись сразу, без повторного входа
app.use(async (req, res, next) => {
    if (req.session.user) {
        try {
            const freshUser = await db.get(
                'SELECT id, username, role, is_verified FROM users WHERE id = ?',
                [req.session.user.id]
            );
            if (freshUser) {
                req.session.user.role = freshUser.role;
                req.session.user.is_verified = !!freshUser.is_verified;
            }
            db.run('UPDATE users SET last_seen = ? WHERE id = ?',
                [new Date().toISOString(), req.session.user.id]).catch(() => {});
        } catch (e) {
            console.error('Session refresh error:', e.message);
        }
    }
    req.user = req.session.user || null;
    next();
});

app.use('/api', limiter);

mountRooms(app, () => db); // комнаты-чаты: /rooms, /room/:id, /api/rooms/*

// Регистрация и восстановление пароля по email (код через Resend)
mountMailAuth(app, { getDb: () => db, bcrypt, authLimiter, USERNAME_REGEX, RESERVED_USERNAMES, TERMS_VERSION });

// ============================================================
// СТРАНИЦЫ
// ============================================================
const pub = (file) => (req, res) => res.sendFile(path.join(__dirname, 'public', file));

app.get('/', pub('index.html'));
// ПРИМЕЧАНИЕ: в первом документе /music было закрыто (503), во втором — открыто. Оставлено открытым.
app.get('/music', pub('music.html'));
app.get('/news', pub('news.html'));
app.get('/auth', pub('auth.html'));
app.get('/admin', requireModerator, pub('admin.html'));
app.get('/profile', pub('profile.html'));
app.get('/collections', pub('collections.html'));
app.get('/collection/:id', pub('collection.html'));
app.get('/user/:username', pub('user.html'));
app.get('/submit', pub('submit.html'));
app.get('/privacy', pub('legal.html'));
app.get('/terms', pub('legal.html'));
app.get('/old', pub('olddesign.html'));
app.get('/api-docs', pub('api-docs.html'));
// ============================================================
// ВИДЕО: стрим с поддержкой Range
// ============================================================
const VIDEO_CONTENT_TYPES = {
    '.mp4': 'video/mp4', '.mkv': 'video/x-matroska', '.webm': 'video/webm', '.mov': 'video/quicktime',
    '.jpg': 'image/jpeg', '.jpeg': 'image/jpeg', '.png': 'image/png', '.webp': 'image/webp', '.gif': 'image/gif'
};

app.get('/videos/:filename', (req, res) => {
    const filename = path.basename(req.params.filename);
    const filepath = path.resolve(VIDEOS_DIR, filename);

    if (!isPathInside(VIDEOS_DIR, filepath)) {
        return res.status(403).json({ error: 'Access denied' });
    }
    if (!ALLOWED_UPLOAD_EXTENSIONS.includes(path.extname(filename).toLowerCase())) {
        return res.status(400).json({ error: 'Invalid file type' });
    }

    let stat;
    try {
        stat = fs.statSync(filepath);
    } catch {
        return res.status(404).json({ error: 'Video not found' });
    }
    if (!stat.isFile()) return res.status(404).json({ error: 'Video not found' });

    const ext = path.extname(filename).toLowerCase();
    const contentType = VIDEO_CONTENT_TYPES[ext] || 'application/octet-stream';
    const fileSize = stat.size;
    const range = req.headers.range;

    res.setHeader('Accept-Ranges', 'bytes');
    res.setHeader('Content-Type', contentType);
    res.setHeader('Cache-Control', 'public, max-age=3600');
    res.setHeader('Access-Control-Allow-Origin', '*');

    if (!range) {
        res.setHeader('Content-Length', fileSize);
        return fs.createReadStream(filepath).pipe(res);
    }

    const match = /^bytes=(\d*)-(\d*)$/.exec(range);
    if (!match) return res.status(416).set('Content-Range', `bytes */${fileSize}`).end();

    let start = match[1] === '' ? NaN : Number(match[1]);
    let end = match[2] === '' ? fileSize - 1 : Number(match[2]);

    if (Number.isNaN(start)) {
        const suffixLength = end;
        if (!Number.isInteger(suffixLength) || suffixLength <= 0) {
            return res.status(416).set('Content-Range', `bytes */${fileSize}`).end();
        }
        start = Math.max(fileSize - suffixLength, 0);
        end = fileSize - 1;
    }

    if (!Number.isInteger(start) || !Number.isInteger(end) || start < 0 || start >= fileSize || end < start) {
        return res.status(416).set('Content-Range', `bytes */${fileSize}`).end();
    }

    end = Math.min(end, fileSize - 1);
    const chunkSize = end - start + 1;

    res.status(206);
    res.setHeader('Content-Range', `bytes ${start}-${end}/${fileSize}`);
    res.setHeader('Content-Length', chunkSize);
    return fs.createReadStream(filepath, { start, end }).pipe(res);
});

// ============================================================
// ВИДЕО: загрузка, списки, удаление, переименование
// ============================================================
app.post('/admin/upload', requireVerifier, uploadVideo.single('videoFile'), (req, res) => {
    if (!req.file) return res.status(400).json({ error: 'Файл не получен' });
    res.json({ success: true, filename: req.file.filename });
});

app.get('/api/videos', (req, res) => {
    fs.readdir(VIDEOS_DIR, async (err, files) => {
        if (err) return res.status(500).json({ error: 'Не удалось прочитать папку' });

        try {
            const videoFiles = files
                .filter(file => ALLOWED_UPLOAD_EXTENSIONS.includes(path.extname(file).toLowerCase()))
                .map(file => ({ name: file, time: fs.statSync(path.join(VIDEOS_DIR, file)).birthtimeMs }))
                .sort((a, b) => b.time - a.time)
                .map(f => f.name);

            const approvedSubs = await db.all(`
                SELECT s.final_filename AS filename, u.id AS user_id, u.username,
                       u.role, u.is_verified, u.avatar_url, u.activity_visible, u.last_seen
                FROM submissions s
                JOIN users u ON u.id = s.user_id
                WHERE s.status = 'approved' AND s.final_filename IS NOT NULL
            `);

            const subByFile = new Map(approvedSubs.map(s => [s.filename, s]));
            const userIds = [...new Set(approvedSubs.map(s => s.user_id))];
            const tagsByUser = new Map();

            if (userIds.length) {
                const placeholders = userIds.map(() => '?').join(',');
                const tagRows = await db.all(`
                    SELECT ut.user_id, t.id, t.name, t.color, t.icon
                    FROM user_tags ut
                    JOIN tags t ON t.id = ut.tag_id
                    WHERE ut.user_id IN (${placeholders})
                    ORDER BY ut.assigned_at ASC
                `, userIds);

                tagRows.forEach(row => {
                    if (!tagsByUser.has(row.user_id)) tagsByUser.set(row.user_id, []);
                    tagsByUser.get(row.user_id).push({ id: row.id, name: row.name, color: row.color, icon: row.icon });
                });
            }

            const protocol = req.secure ? 'https' : 'http';
            const baseUrl = `${protocol}://${req.get('host')}`;

            const result = videoFiles.map(name => {
                const sub = subByFile.get(name);
                return {
                    id: name.replace(/\.[^/.]+$/, ''),
                    name,
                    url: `${baseUrl}/videos/${encodeURIComponent(name)}`,
                    uploader: sub ? {
                        username: sub.username,
                        role: sub.role,
                        is_verified: !!sub.is_verified,
                        avatar_url: sub.avatar_url || null,
                        activity_visible: sub.activity_visible == null ? true : !!sub.activity_visible,
                        last_seen: (sub.activity_visible == null || sub.activity_visible)
                            ? (sub.last_seen || null) : null,
                        tags: tagsByUser.get(sub.user_id) || []
                    } : null
                };
            });

            res.json(result);
        } catch (error) {
            console.error('Ошибка /api/videos:', error);
            res.status(500).json({ error: 'Ошибка сервера' });
        }
    });
});

app.get('/api/admin/videos', requireAdmin, async (req, res) => {
    try {
        if (!fs.existsSync(VIDEOS_DIR)) return res.json([]);

        const videoFiles = fs.readdirSync(VIDEOS_DIR)
            .filter(file => ALLOWED_UPLOAD_EXTENSIONS.includes(path.extname(file).toLowerCase()));

        const videoList = [];
        for (const filename of videoFiles) {
            const stat = fs.statSync(path.join(VIDEOS_DIR, filename));

            const submission = await db.get(
                `SELECT s.id, s.user_id, s.display_name, s.created_at,
                        u.username, u.role, u.is_verified
                 FROM submissions s
                 JOIN users u ON u.id = s.user_id
                 WHERE s.final_filename = ?`,
                [filename]
            );
            const likes = await db.get('SELECT COUNT(*) as count FROM video_likes WHERE video_name = ?', [filename]);
            const downloads = await db.get('SELECT count FROM video_downloads WHERE video_name = ?', [filename]);

            videoList.push({
                filename,
                display_name: submission?.display_name || filename,
                size: stat.size,
                created_at: stat.birthtimeMs,
                uploader: submission ? {
                    username: submission.username,
                    user_id: submission.user_id,
                    role: submission.role,
                    is_verified: !!submission.is_verified,
                    submission_id: submission.id,
                    submission_date: submission.created_at
                } : null,
                likes: likes?.count || 0,
                downloads: downloads?.count || 0
            });
        }

        videoList.sort((a, b) => b.created_at - a.created_at);
        res.json(videoList);
    } catch (error) {
        console.error('Error loading admin videos:', error);
        res.status(500).json({ error: 'Ошибка при загрузке видео' });
    }
});

app.delete('/api/admin/videos/:filename', requireAdmin, async (req, res) => {
    try {
        const filename = decodeURIComponent(req.params.filename);
        if (!filename || filename.includes('..') || filename.includes('/') || filename.includes('\\')) {
            return res.status(400).json({ error: 'Некорректное имя файла' });
        }
        if (!ALLOWED_UPLOAD_EXTENSIONS.includes(path.extname(filename).toLowerCase())) {
            return res.status(400).json({ error: 'Некорректный тип файла' });
        }

        const filepath = path.join(VIDEOS_DIR, filename);
        if (!isPathInside(VIDEOS_DIR, filepath)) return res.status(403).json({ error: 'Access denied' });
        if (!fs.existsSync(filepath)) return res.status(404).json({ error: 'Видео не найдено' });

        fs.unlinkSync(filepath);
        console.log(`[ADMIN] ${req.user.username} deleted video: ${filename}`);

        await db.run('UPDATE submissions SET final_filename = NULL WHERE final_filename = ?', [filename]);
        await db.run('DELETE FROM video_likes WHERE video_name = ?', [filename]);
        await db.run('DELETE FROM video_downloads WHERE video_name = ?', [filename]);
        await db.run('DELETE FROM collection_items WHERE video_name = ?', [filename]);

        res.json({ success: true, message: 'Видео удалено' });
    } catch (error) {
        console.error('Error deleting video:', error);
        res.status(500).json({ error: 'Ошибка при удалении видео' });
    }
});

app.post('/api/admin/videos/:filename/rename', requireAdmin, async (req, res) => {
    try {
        const oldFilename = decodeURIComponent(req.params.filename);
        const { new_name } = req.body;

        if (!oldFilename || oldFilename.includes('..') || oldFilename.includes('/') || oldFilename.includes('\\')) {
            return res.status(400).json({ error: 'Некорректное имя файла' });
        }
        if (!ALLOWED_UPLOAD_EXTENSIONS.includes(path.extname(oldFilename).toLowerCase())) {
            return res.status(400).json({ error: 'Некорректный тип файла' });
        }
        if (!new_name || typeof new_name !== 'string' || !new_name.trim()) {
            return res.status(400).json({ error: 'Укажите новое имя' });
        }

        const ext = path.extname(oldFilename);
        const cleanName = String(new_name).trim().replace(/[/\\?%*:|"<>;&#]/g, '').slice(0, 100);
        if (!cleanName) return res.status(400).json({ error: 'Имя файла не может быть пустым' });

        const newFilename = cleanName + ext;
        if (newFilename === oldFilename) return res.json({ success: true, message: 'Имя не изменилось' });

        const oldPath = path.join(VIDEOS_DIR, oldFilename);
        const newPath = path.join(VIDEOS_DIR, newFilename);

        if (!isPathInside(VIDEOS_DIR, oldPath) || !isPathInside(VIDEOS_DIR, newPath)) {
            return res.status(403).json({ error: 'Access denied' });
        }
        if (!fs.existsSync(oldPath)) return res.status(404).json({ error: 'Видео не найдено' });
        if (fs.existsSync(newPath)) return res.status(400).json({ error: 'Файл с таким именем уже существует' });

        fs.renameSync(oldPath, newPath);
        console.log(`[ADMIN] ${req.user.username} renamed video: ${oldFilename} -> ${newFilename}`);

        await db.run('UPDATE submissions SET final_filename = ? WHERE final_filename = ?', [newFilename, oldFilename]);
        await db.run('UPDATE video_likes SET video_name = ? WHERE video_name = ?', [newFilename, oldFilename]);
        await db.run('UPDATE video_downloads SET video_name = ? WHERE video_name = ?', [newFilename, oldFilename]);
        await db.run('UPDATE collection_items SET video_name = ? WHERE video_name = ?', [newFilename, oldFilename]);

        res.json({ success: true, message: 'Видео переименовано', new_filename: newFilename });
    } catch (error) {
        console.error('Error renaming video:', error);
        res.status(500).json({ error: 'Ошибка при переименовании видео' });
    }
});

// ============================================================
// МУЗЫКА
// ============================================================
const AUDIO_MIME_TYPES = {
    '.mp3': 'audio/mpeg', '.wav': 'audio/wav', '.ogg': 'audio/ogg',
    '.m4a': 'audio/mp4', '.flac': 'audio/flac', '.aac': 'audio/aac'
};

app.get('/api/tracks', (req, res) => {
    try {
        const audioFiles = fs.readdirSync(SOUNDS_DIR)
            .filter(file => AUDIO_EXTENSIONS.includes(path.extname(file).toLowerCase()))
            .sort();

        const tracks = audioFiles.map((file, index) => ({
            id: index,
            name: path.basename(file, path.extname(file)),
            filename: file,
            url: `/api/stream/${encodeURIComponent(file)}`,
            ext: path.extname(file).toLowerCase()
        }));

        res.json({ success: true, count: tracks.length, tracks });
    } catch (error) {
        console.error(error);
        res.status(500).json({ success: false, error: 'Failed to read tracks' });
    }
});

app.get('/api/stream/:filename', (req, res) => {
    try {
        const filename = decodeURIComponent(req.params.filename);
        const filepath = path.join(SOUNDS_DIR, filename);

        if (!isPathInside(SOUNDS_DIR, filepath)) return res.status(403).json({ error: 'Access denied' });
        if (!fs.existsSync(filepath)) return res.status(404).json({ error: 'Track not found' });

        const fileSize = fs.statSync(filepath).size;
        const range = req.headers.range;
        const contentType = AUDIO_MIME_TYPES[path.extname(filename).toLowerCase()] || 'audio/mpeg';

        if (range) {
            const match = /^bytes=(\d*)-(\d*)$/.exec(range);
            if (!match || (!match[1] && !match[2]) || fileSize === 0) {
                return res.status(416).set('Content-Range', `bytes */${fileSize}`).end();
            }

            let start, end;
            if (!match[1]) {
                const suffixLength = Number(match[2]);
                if (!Number.isSafeInteger(suffixLength) || suffixLength <= 0) {
                    return res.status(416).set('Content-Range', `bytes */${fileSize}`).end();
                }
                start = Math.max(0, fileSize - suffixLength);
                end = fileSize - 1;
            } else {
                start = Number(match[1]);
                end = match[2] ? Number(match[2]) : fileSize - 1;
            }

            if (!Number.isSafeInteger(start) || !Number.isSafeInteger(end) || start < 0 || start >= fileSize || end < start) {
                return res.status(416).set('Content-Range', `bytes */${fileSize}`).end();
            }

            end = Math.min(end, fileSize - 1);
            res.writeHead(206, {
                'Content-Range': `bytes ${start}-${end}/${fileSize}`,
                'Accept-Ranges': 'bytes',
                'Content-Length': end - start + 1,
                'Content-Type': contentType,
                'Cache-Control': 'public, max-age=3600'
            });
            fs.createReadStream(filepath, { start, end }).pipe(res);
        } else {
            res.writeHead(200, {
                'Content-Length': fileSize,
                'Content-Type': contentType,
                'Accept-Ranges': 'bytes',
                'Cache-Control': 'public, max-age=3600'
            });
            fs.createReadStream(filepath).pipe(res);
        }
    } catch (error) {
        console.error('Ошибка стрима:', error);
        res.status(500).json({ error: 'Failed to stream track' });
    }
});

// ============================================================
// ЛАЙКИ / СКАЧИВАНИЯ
// ============================================================
app.get('/api/likes/:videoName', async (req, res) => {
    const { videoName } = req.params;
    const userId = req.session.user?.id || null;

    const count = await db.get('SELECT COUNT(*) as total FROM video_likes WHERE video_name = ?', [videoName]);
    let liked = false;
    if (userId) {
        const row = await db.get('SELECT id FROM video_likes WHERE user_id = ? AND video_name = ?', [userId, videoName]);
        liked = !!row;
    }

    res.json({ likes: count.total, liked });
});

app.post('/api/likes/:videoName', async (req, res) => {
    if (!req.session.user) return res.status(401).json({ error: 'Нужно войти' });

    const { videoName } = req.params;
    const userId = req.session.user.id;

    const existing = await db.get('SELECT id FROM video_likes WHERE user_id = ? AND video_name = ?', [userId, videoName]);
    if (existing) {
        await db.run('DELETE FROM video_likes WHERE user_id = ? AND video_name = ?', [userId, videoName]);
        res.json({ liked: false });
    } else {
        await db.run('INSERT INTO video_likes (user_id, video_name) VALUES (?, ?)', [userId, videoName]);
        res.json({ liked: true });
    }
});

app.post('/api/downloads/:videoName', async (req, res) => {
    const { videoName } = req.params;
    const userId = req.session.user?.id;

    await db.run(
        'INSERT INTO video_downloads (video_name, count) VALUES (?, 1) ON CONFLICT(video_name) DO UPDATE SET count = count + 1',
        [videoName]
    );

    if (userId) {
        await db.run(
            'INSERT INTO user_points (user_id, points) VALUES (?, 1) ON CONFLICT(user_id) DO UPDATE SET points = points + 1',
            [userId]
        );
    }

    res.json({ success: true });
});

app.get('/api/downloads/:videoName', async (req, res) => {
    const { videoName } = req.params;
    const row = await db.get('SELECT count FROM video_downloads WHERE video_name = ?', [videoName]);
    res.json({ downloads: row?.count || 0 });
});

// ============================================================
// ПРЕВЬЮ ФУТАЖЕЙ (ffmpeg)
// Очередь строго по одной задаче: -skip_frame nokey декодирует только ключевые кадры.
// ============================================================
let thumbQueue = Promise.resolve();
function makeThumb(src, out) {
    const job = thumbQueue.then(() => new Promise((resolve) => {
        const ff = spawn(ffmpegPath, [
            '-y', '-threads', '1', '-skip_frame', 'nokey', '-ss', '1', '-i', src,
            '-frames:v', '1', '-vf', 'scale=480:-2', '-q:v', '5', out
        ], { stdio: 'ignore' });
        ff.on('error', () => resolve());
        ff.on('close', () => resolve());
    }));
    thumbQueue = job.catch(() => { });
    return job;
}

app.get('/api/thumb/:filename', async (req, res) => {
    if (!ffmpegPath) return res.status(404).end();

    const filename = path.basename(decodeURIComponent(req.params.filename));
    const ext = path.extname(filename).toLowerCase();
    if (!ALLOWED_VIDEO_EXTENSIONS.includes(ext)) return res.status(400).end();

    const src = path.join(VIDEOS_DIR, filename);
    if (!fs.existsSync(src)) return res.status(404).end();

    const out = path.join(THUMB_DIR, filename + '.jpg');
    if (!fs.existsSync(out)) await makeThumb(src, out);

    if (!fs.existsSync(out)) return res.status(404).end();
    res.sendFile(out);
});

// ============================================================
// ПРОФИЛИ
// ============================================================
app.get('/api/user/:username', async (req, res) => {
    const { username } = req.params;

    const user = await db.get(
        'SELECT id, username, role, is_verified, avatar_url, activity_visible, last_seen FROM users WHERE username = ?',
        [username]
    );
    if (!user) return res.status(404).json({ error: 'Пользователь не найден' });

    const points = await db.get('SELECT points FROM user_points WHERE user_id = ?', [user.id]);
    const collections = await db.all(
        'SELECT id, name, description, is_public FROM collections WHERE user_id = ? AND is_public = 1',
        [user.id]
    );
    const likesCount = await db.get('SELECT COUNT(*) as total FROM video_likes WHERE user_id = ?', [user.id]);
    const tags = await db.all(`
        SELECT t.id, t.name, t.color, t.icon
        FROM user_tags ut
        JOIN tags t ON t.id = ut.tag_id
        WHERE ut.user_id = ?
        ORDER BY ut.assigned_at ASC
    `, [user.id]);

    const visible = user.activity_visible == null ? true : !!user.activity_visible;

    res.json({
        username: user.username,
        role: user.role,
        is_verified: !!user.is_verified,
        avatar_url: user.avatar_url || null,
        activity_visible: visible,
        last_seen: visible ? (user.last_seen || null) : null,
        points: points?.points || 0,
        public_collections: collections,
        likes_count: likesCount.total,
        tags
    });
});

app.get('/api/profile', async (req, res) => {
    if (!req.session.user) return res.status(401).json({ error: 'Нужно войти' });

    const userId = req.session.user.id;
    const userRow = await db.get('SELECT avatar_url, activity_visible FROM users WHERE id = ?', [userId]);
    const points = await db.get('SELECT points FROM user_points WHERE user_id = ?', [userId]);
    const likes = await db.all('SELECT video_name FROM video_likes WHERE user_id = ?', [userId]);
    const collections = await db.all('SELECT id, name, is_public FROM collections WHERE user_id = ?', [userId]);

    res.json({
        username: req.session.user.username,
        role: req.session.user.role,
        is_verified: !!req.session.user.is_verified,
        telegram_linked: !!req.session.user.telegram_linked,
        avatar_url: userRow?.avatar_url || null,
        activity_visible: userRow?.activity_visible == null ? true : !!userRow.activity_visible,
        points: points?.points || 0,
        liked_videos: likes.map(l => l.video_name),
        collections
    });
});

// Смена аватара
function getUserId(req, res) {
    const id = req.session?.user?.id;
    if (!id) {
        res.status(401).json({ error: 'Нужно войти' });
        return null;
    }
    return id;
}

async function getActiveUserId(req, res) {
    const id = req.session?.user?.id;
    if (!id) {
        res.status(401).json({ error: 'Нужно войти' });
        return null;
    }
    const row = await db.get('SELECT is_banned, banned_until FROM users WHERE id = ?', [id]);
    if (!row) {
        res.status(401).json({ error: 'Пользователь не найден' });
        return null;
    }
    const stillBanned = row.is_banned && (!row.banned_until || new Date(row.banned_until) > new Date());
    if (stillBanned) {
        res.status(403).json({ error: 'Аккаунт заблокирован. Аватар нельзя изменить.' });
        return null;
    }
    return id;
}

app.post('/api/profile/avatar', uploadAvatar.single('avatar'), async (req, res) => {
    const userId = await getActiveUserId(req, res);
    if (!userId) {
        if (req.file) fs.unlink(req.file.path, () => {});
        return;
    }
    try {
        if (!req.file) return res.status(400).json({ error: 'Файл не получен' });
        const url = `/uploads/avatars/${req.file.filename}`;
        await db.run('UPDATE users SET avatar_url = ? WHERE id = ?', [url, userId]);
        req.session.user.avatar_url = url;
        res.json({ avatar_url: url });
    } catch (e) {
        console.error(e);
        res.status(500).json({ error: 'Ошибка сервера' });
    }
});

app.delete('/api/profile/avatar', async (req, res) => {
    const userId = await getActiveUserId(req, res);
    if (!userId) return;
    try {
        await db.run('UPDATE users SET avatar_url = NULL WHERE id = ?', [userId]);
        req.session.user.avatar_url = null;
        res.json({ ok: true });
    } catch (e) {
        console.error(e);
        res.status(500).json({ error: 'Ошибка сервера' });
    }
});

app.patch('/api/profile/activity-visibility', async (req, res) => {
    const userId = getUserId(req, res);
    if (!userId) return;
    try {
        const visible = req.body.activity_visible ? 1 : 0;
        await db.run('UPDATE users SET activity_visible = ? WHERE id = ?', [visible, userId]);
        req.session.user.activity_visible = !!visible;
        res.json({ ok: true });
    } catch (e) {
        console.error(e);
        res.status(500).json({ error: 'Ошибка сервера' });
    }
});

app.patch('/api/profile/nickname', async (req, res) => {
    const userId = getUserId(req, res);
    if (!userId) return;
    try {
        const nickname = String(req.body.nickname || '').trim();
        if (!USERNAME_REGEX.test(nickname)) {
            return res.status(400).json({ error: 'Логин: только латинские буквы, цифры, _ и -. От 3 до 15 символов.' });
        }
        if (RESERVED_USERNAMES.includes(nickname.toLowerCase())) {
            return res.status(400).json({ error: 'Этот логин зарезервирован.' });
        }

        const exists = await db.get('SELECT id FROM users WHERE username = ? AND id != ?', [nickname, userId]);
        if (exists) return res.status(409).json({ error: 'Этот логин уже занят' });

        await db.run('UPDATE users SET username = ? WHERE id = ?', [nickname, userId]);
        req.session.user.username = nickname;
        res.json({ ok: true });
    } catch (e) {
        console.error(e);
        res.status(500).json({ error: 'Ошибка сервера' });
    }
});

app.patch('/api/profile/password', async (req, res) => {
    const userId = getUserId(req, res);
    if (!userId) return;
    try {
        const { current_password, new_password } = req.body;
        if (!current_password || !new_password) return res.status(400).json({ error: 'Заполните все поля' });
        if (new_password.length < 6) return res.status(400).json({ error: 'Пароль минимум 6 символов' });

        const user = await db.get('SELECT password FROM users WHERE id = ?', [userId]);
        if (!user) return res.status(404).json({ error: 'Пользователь не найден' });

        const ok = await bcrypt.compare(current_password, user.password);
        if (!ok) return res.status(403).json({ error: 'Неверный текущий пароль' });

        const hash = await bcrypt.hash(new_password, 10);
        await db.run('UPDATE users SET password = ? WHERE id = ?', [hash, userId]);
        res.json({ ok: true });
    } catch (e) {
        console.error(e);
        res.status(500).json({ error: 'Ошибка сервера' });
    }
});

// Удаление аккаунта (необратимо). Футажи остаются, автор отвязывается.
app.delete('/api/profile/account', async (req, res) => {
    const userId = getUserId(req, res);
    if (!userId) return;
    try {
        const { password, confirm_username } = req.body || {};
        if (!password || !confirm_username) {
            return res.status(400).json({ error: 'Введите пароль и логин для подтверждения' });
        }

        const user = await db.get('SELECT id, username, password, role, avatar_url FROM users WHERE id = ?', [userId]);
        if (!user) return res.status(404).json({ error: 'Пользователь не найден' });

        if (String(confirm_username) !== user.username) {
            return res.status(400).json({ error: 'Логин введён неверно' });
        }
        if (user.role === 'admin') {
            return res.status(403).json({ error: 'Администратор не может удалить аккаунт. Сначала передайте роль другому пользователю.' });
        }

        const ok = await bcrypt.compare(String(password), user.password);
        if (!ok) return res.status(403).json({ error: 'Неверный пароль' });

        await db.exec('BEGIN');
        try {
            await db.run('DELETE FROM video_likes WHERE user_id = ?', [userId]);
            await db.run('DELETE FROM collection_items WHERE collection_id IN (SELECT id FROM collections WHERE user_id = ?)', [userId]);
            await db.run('DELETE FROM collections WHERE user_id = ?', [userId]);
            await db.run('DELETE FROM user_points WHERE user_id = ?', [userId]);
            await db.run('DELETE FROM user_cards WHERE user_id = ?', [userId]);
            await db.run('DELETE FROM card_drops WHERE user_id = ?', [userId]);
            await db.run('DELETE FROM airdrop_claims WHERE user_id = ?', [userId]);
            await db.run('DELETE FROM user_tags WHERE user_id = ?', [userId]);
            await db.run('UPDATE telegram_users SET user_id = NULL WHERE user_id = ?', [userId]);
            await db.run('UPDATE submissions SET user_id = 0 WHERE user_id = ?', [userId]);
            await db.run('UPDATE reports SET reporter_id = NULL WHERE reporter_id = ?', [userId]);
            await db.run('DELETE FROM users WHERE id = ?', [userId]);
            await db.exec('COMMIT');
        } catch (err) {
            await db.exec('ROLLBACK').catch(() => {});
            throw err;
        }

        if (user.avatar_url) {
            fs.unlink(path.join(__dirname, 'public', user.avatar_url), () => {});
        }

        req.session.destroy(() => res.json({ ok: true }));
    } catch (e) {
        console.error(e);
        res.status(500).json({ error: 'Ошибка сервера' });
    }
});

app.post('/api/report/user', async (req, res) => {
    const userId = getUserId(req, res);
    if (!userId) return;
    try {
        const { reported_username, reason } = req.body;
        if (!reported_username || !reason) return res.status(400).json({ error: 'Missing fields' });

        await db.run(
            'INSERT INTO reports (reporter_id, reported_username, reason) VALUES (?, ?, ?)',
            [userId, reported_username, reason]
        );
        res.json({ ok: true });
    } catch (e) {
        console.error(e);
        res.status(500).json({ error: 'Ошибка сервера' });
    }
});

// ============================================================
// КОЛЛЕКЦИИ
// ============================================================
app.post('/api/collections', async (req, res) => {
    if (!req.session.user) return res.status(401).json({ error: 'Нужно войти' });

    const { name, description, is_public } = req.body;
    if (!name || !String(name).trim()) return res.status(400).json({ error: 'Нужно название' });

    const cleanName = sanitizeInput(String(name).trim().slice(0, 60));
    const cleanDescription = sanitizeInput(String(description || '').slice(0, 300));

    const existingCount = await db.get('SELECT COUNT(*) as total FROM collections WHERE user_id = ?', [req.session.user.id]);
    if (existingCount.total >= MAX_COLLECTIONS_PER_USER) {
        return res.status(400).json({
            error: `Достигнут лимит коллекций (${MAX_COLLECTIONS_PER_USER}). Удалите старую коллекцию, чтобы создать новую.`
        });
    }

    const result = await db.run(
        'INSERT INTO collections (user_id, name, description, is_public, created_at) VALUES (?, ?, ?, ?, ?)',
        [req.session.user.id, cleanName, cleanDescription, is_public ? 1 : 0, new Date().toISOString()]
    );
    res.json({ success: true, id: result.lastID });
});

app.get('/api/collections/my', async (req, res) => {
    if (!req.session.user) return res.status(401).json({ error: 'Нужно войти' });

    const cols = await db.all('SELECT * FROM collections WHERE user_id = ? ORDER BY id DESC', [req.session.user.id]);
    for (const col of cols) {
        col.items = await db.all('SELECT video_name FROM collection_items WHERE collection_id = ?', [col.id]);
    }
    res.json(cols);
});

app.get('/api/collections/:id', async (req, res) => {
    const col = await db.get('SELECT * FROM collections WHERE id = ?', [req.params.id]);
    if (!col) return res.status(404).json({ error: 'Не найдено' });
    if (!col.is_public && req.session.user?.id !== col.user_id) {
        return res.status(403).json({ error: 'Приватная коллекция' });
    }

    col.items = await db.all('SELECT video_name FROM collection_items WHERE collection_id = ?', [col.id]);
    const author = await db.get('SELECT username FROM users WHERE id = ?', [col.user_id]);
    col.author = author?.username || 'unknown';
    res.json(col);
});

app.post('/api/collections/:id/items', async (req, res) => {
    if (!req.session.user) return res.status(401).json({ error: 'Нужно войти' });

    const col = await db.get('SELECT * FROM collections WHERE id = ?', [req.params.id]);
    if (!col || col.user_id !== req.session.user.id) return res.status(403).json({ error: 'Нет доступа' });

    const { video_name } = req.body;
    if (!video_name || typeof video_name !== 'string') {
        return res.status(400).json({ error: 'Некорректное имя видео' });
    }

    const safeVideoName = path.basename(video_name);
    if (safeVideoName !== video_name) return res.status(400).json({ error: 'Некорректное имя видео' });

    if (!fs.existsSync(path.join(VIDEOS_DIR, safeVideoName))) {
        return res.status(404).json({ error: 'Такого видео не существует' });
    }

    try {
        await db.run(
            'INSERT INTO collection_items (collection_id, video_name, added_at) VALUES (?, ?, ?)',
            [col.id, safeVideoName, new Date().toISOString()]
        );
        res.json({ success: true });
    } catch {
        res.status(400).json({ error: 'Уже в коллекции' });
    }
});

app.delete('/api/collections/:id/items', async (req, res) => {
    if (!req.session.user) return res.status(401).json({ error: 'Нужно войти' });

    const col = await db.get('SELECT * FROM collections WHERE id = ?', [req.params.id]);
    if (!col || col.user_id !== req.session.user.id) return res.status(403).json({ error: 'Нет доступа' });

    await db.run('DELETE FROM collection_items WHERE collection_id = ? AND video_name = ?', [req.params.id, req.body.video_name]);
    res.json({ success: true });
});

// Удалять коллекции может владелец, но только старший модератор или админ
app.delete('/api/collections/:id', async (req, res) => {
    if (!req.session.user) return res.status(401).json({ error: 'Нужно войти' });

    const col = await db.get('SELECT * FROM collections WHERE id = ?', [req.params.id]);
    if (!col) return res.status(404).json({ error: 'Коллекция не найдена' });
    if (col.user_id !== req.session.user.id) return res.status(403).json({ error: 'Нет доступа' });

    const user = await db.get('SELECT id, role FROM users WHERE id = ?', [req.session.user.id]);
    if (!user) return res.status(401).json({ error: 'Пользователь не найден' });

    const role = String(user.role || '').trim().toLowerCase();
    if (!VERIFIER_ROLES.includes(role)) {
        return res.status(403).json({ error: 'Удалять коллекции могут только старшие модераторы и администраторы' });
    }

    await db.run('DELETE FROM collection_items WHERE collection_id = ?', [req.params.id]);
    await db.run('DELETE FROM collections WHERE id = ?', [req.params.id]);
    res.json({ success: true });
});

// ============================================================
// РЕГИСТРАЦИЯ / ВХОД
//
// Вход: логин и пароль, в один шаг (2FA через Telegram отключена).
// Регистрация по email и восстановление пароля — в mail-auth.js.
// Маршруты /register/start и /register/confirm ниже (Telegram) больше не используются фронтендом.
// ============================================================
app.post('/api/register/start', authLimiter, async (req, res) => {
    const { username, password } = req.body;
    const telegramId = String(req.body.telegramId || '').trim();

    if (!username || !password || !telegramId) {
        return res.status(400).json({ error: 'Заполните все поля!' });
    }
    if (req.body.accept_terms !== true) {
        return res.status(400).json({ error: 'Необходимо принять условия использования и политику конфиденциальности.' });
    }
    if (!USERNAME_REGEX.test(username)) {
        return res.status(400).json({ error: 'Логин: только латинские буквы, цифры, _ и -. От 3 до 15 символов, без пробелов.' });
    }
    if (RESERVED_USERNAMES.includes(username.trim().toLowerCase())) {
        return res.status(400).json({ error: 'Этот логин зарезервирован и недоступен для регистрации.' });
    }
    if (password.length < 6) {
        return res.status(400).json({ error: 'Пароль минимум 6 символов' });
    }
    if (!TELEGRAM_ID_REGEX.test(telegramId)) {
        return res.status(400).json({ error: 'Некорректный Telegram ID. Получи его в боте по команде /start.' });
    }

    try {
        const existingUsername = await db.get('SELECT id FROM users WHERE username = ?', [username]);
        if (existingUsername) return res.status(400).json({ error: 'Пользователь с таким логином уже существует!' });

        const existingTelegram = await db.get('SELECT id FROM users WHERE telegram_id = ?', [telegramId]);
        if (existingTelegram) return res.status(400).json({ error: 'Этот Telegram уже привязан к другому аккаунту!' });

        const passwordHash = await bcrypt.hash(password, 10);
        const code = generateSixDigitCode();

        req.session.pendingRegister = {
            username,
            passwordHash,
            telegramId,
            code,
            termsAcceptedAt: new Date().toISOString(),
            expiresAt: Date.now() + REGISTER_CODE_TTL_MS
        };

        await queueNotification({ type: 'register_code', targetChatId: telegramId, message: code });

        req.session.save((err) => {
            if (err) {
                console.error('Session save error (register/start):', err);
                return res.status(500).json({ error: 'Ошибка сервера' });
            }
            res.json({ success: true, message: 'Код отправлен в Telegram' });
        });
    } catch (err) {
        console.error('register/start error:', err);
        res.status(500).json({ error: 'Ошибка сервера' });
    }
});

app.post('/api/register/confirm', authLimiter, async (req, res) => {
    const { code } = req.body;
    const pending = req.session.pendingRegister;

    if (!pending) return res.status(400).json({ error: 'Сначала запросите код регистрации.' });
    if (!code) return res.status(400).json({ error: 'Введите код из Telegram.' });
    if (Date.now() > pending.expiresAt) {
        delete req.session.pendingRegister;
        return res.status(400).json({ error: 'Код истёк. Начните регистрацию заново.' });
    }
    if (String(code).trim() !== pending.code) {
        return res.status(400).json({ error: 'Неверный код подтверждения.' });
    }

    try {
        // Логин или Telegram могли занять, пока ждали код
        const existingUsername = await db.get('SELECT id FROM users WHERE username = ?', [pending.username]);
        if (existingUsername) {
            delete req.session.pendingRegister;
            return res.status(400).json({ error: 'Пользователь с таким логином уже существует!' });
        }
        const existingTelegram = await db.get('SELECT id FROM users WHERE telegram_id = ?', [pending.telegramId]);
        if (existingTelegram) {
            delete req.session.pendingRegister;
            return res.status(400).json({ error: 'Этот Telegram уже привязан к другому аккаунту!' });
        }

        let telegramUsername = null;
        try {
            const tu = await db.get('SELECT telegram_username FROM telegram_users WHERE telegram_id = ?', [pending.telegramId]);
            telegramUsername = tu?.telegram_username || null;
        } catch { }

        const result = await db.run(
            `INSERT INTO users
                (username, password, role, telegram_id, telegram_username, terms_accepted_at, terms_version)
             VALUES (?, ?, ?, ?, ?, ?, ?)`,
            [pending.username, pending.passwordHash, 'user', pending.telegramId, telegramUsername, pending.termsAcceptedAt, TERMS_VERSION]
        );

        try {
            await db.run(
                `INSERT INTO telegram_users (telegram_id, telegram_username, user_id, first_seen, last_seen)
                 VALUES (?, ?, ?, datetime('now'), datetime('now'))
                 ON CONFLICT(telegram_id) DO UPDATE SET user_id = excluded.user_id, last_seen = datetime('now')`,
                [pending.telegramId, telegramUsername, result.lastID]
            );
        } catch (e) { console.error('telegram_users upsert error:', e); }

        delete req.session.pendingRegister;
        res.json({ success: true, message: 'Регистрация успешна! Аккаунт привязан к Telegram.' });
    } catch (err) {
        console.error('register/confirm error:', err);
        res.status(500).json({ error: 'Ошибка сервера' });
    }
});

app.post('/api/login', authLimiter, async (req, res) => {
    const { username, password } = req.body;

    try {
        const user = await db.get('SELECT * FROM users WHERE username = ?', [username]);
        if (!user) return res.status(400).json({ error: 'Неверный логин или пароль!' });

        const isMatch = await bcrypt.compare(password, user.password);
        if (!isMatch) return res.status(400).json({ error: 'Неверный логин или пароль!' });

        if (user.is_banned) {
            if (!user.banned_until || new Date(user.banned_until) > new Date()) {
                return res.status(403).json({ error: 'Аккаунт заблокирован', reason: user.ban_reason, until: user.banned_until });
            }
        }

        console.log('[DIAG login]', { secure: req.secure, proto: req.headers['x-forwarded-proto'], env: process.env.NODE_ENV, hasCookie: !!req.headers.cookie, sid: req.sessionID });
        // Регенерация session ID — защита от session fixation
        req.session.regenerate((err) => {
            if (err) {
                console.error('Session regenerate error:', err);
                return res.status(500).json({ error: 'Ошибка сервера при входе' });
            }
            req.session.user = {
                id: user.id,
                username: user.username,
                role: user.role,
                is_verified: !!user.is_verified,
                telegram_linked: false
            };
            res.json({ success: true, user: req.session.user });
        });
    } catch (err) {
        console.error(err);
        res.status(500).json({ error: 'Ошибка сервера при входе' });
    }
});

app.post('/api/logout', (req, res) => {
    req.session.destroy(() => res.json({ success: true }));
});

app.get('/api/me', (req, res) => {
    console.log('[DIAG me]', { secure: req.secure, hasCookie: !!req.headers.cookie, sid: req.sessionID, hasUser: !!req.session?.user });
    if (req.session.user) {
        res.json({ loggedIn: true, user: req.session.user });
    } else {
        res.json({ loggedIn: false });
    }
});

// ============================================================
// УСЛОВИЯ ИСПОЛЬЗОВАНИЯ
// Вошедший принимает версию в users, гость — в сессии.
// ============================================================
app.get('/api/terms/status', async (req, res) => {
    try {
        const user = req.session.user;
        const accepted = user
            ? (await db.get('SELECT terms_version FROM users WHERE id = ?', [user.id]))?.terms_version === TERMS_VERSION
            : req.session.termsVersion === TERMS_VERSION;
        res.json({ current: TERMS_VERSION, accepted: !!accepted });
    } catch (e) {
        console.error(e);
        res.status(500).json({ error: 'Ошибка сервера' });
    }
});

app.post('/api/terms/accept', async (req, res) => {
    try {
        const user = req.session.user;
        if (user) {
            await db.run(
                'UPDATE users SET terms_accepted_at = ?, terms_version = ? WHERE id = ?',
                [new Date().toISOString(), TERMS_VERSION, user.id]
            );
        } else {
            req.session.termsVersion = TERMS_VERSION;
        }
        res.json({ ok: true });
    } catch (e) {
        console.error(e);
        res.status(500).json({ error: 'Ошибка сервера' });
    }
});

// ============================================================
// НОВОСТИ
// ============================================================
app.get('/api/news', async (req, res) => {
    try {
        const news = await db.all('SELECT * FROM news ORDER BY id DESC');
        res.json(news);
    } catch (err) {
        res.status(500).json({ error: 'Не удалось загрузить новости' });
    }
});

app.post('/api/news', requireAdmin, uploadNews.single('image'), async (req, res) => {
    const { title, content } = req.body;
    if (!title || !content) return res.status(400).json({ error: 'Заполните все поля!' });

    const cleanTitle = sanitizeInput(String(title).slice(0, 200));
    const cleanContent = sanitizeInput(String(content).slice(0, 20000));
    const imageUrl = req.file ? `/uploads/${req.file.filename}` : null;

    try {
        const date = new Date().toLocaleDateString('ru-RU', {
            day: '2-digit', month: '2-digit', year: 'numeric',
            hour: '2-digit', minute: '2-digit'
        });

        await db.run('INSERT INTO news (title, content, image, date) VALUES (?, ?, ?, ?)', [cleanTitle, cleanContent, imageUrl, date]);

        await queueNotification({
            type: 'broadcast_news',
            title: cleanTitle,
            message: cleanContent,
            imagePath: imageUrl
        });

        res.json({ success: true });
    } catch (err) {
        console.error(err);
        res.status(500).json({ error: 'Ошибка при сохранении новости' });
    }
});

// ============================================================
// ЗАЯВКИ НА ФУТАЖИ
// ============================================================
app.post('/api/submissions',
    (req, res, next) => {
        if (!req.session?.user) return res.status(401).json({ error: 'Нужно войти' });
        next();
    },
    (req, res, next) => {
        submissionUpload.single('video')(req, res, (err) => {
            if (err) return res.status(400).json({ error: err.message || 'Ошибка загрузки файла' });
            next();
        });
    },
    async (req, res) => {
        try {
            if (!req.session?.user) return res.status(401).json({ error: 'Нужно войти' });

            const userId = req.session.user.id;
            const userDb = await db.get('SELECT is_banned, ban_reason FROM users WHERE id = ?', [userId]);

            if (userDb?.is_banned) {
                if (req.file?.path) fs.unlink(req.file.path, () => { });
                return res.status(403).json({ error: 'Твой аккаунт заблокирован' });
            }

            const displayName = sanitizeInput((req.body.display_name || '').trim()).slice(0, 100);
            if (!displayName) {
                if (req.file?.path) fs.unlink(req.file.path, () => { });
                return res.status(400).json({ error: 'Укажи название футажа' });
            }
            if (!req.file) return res.status(400).json({ error: 'Файл не получен' });

            const todayStart = new Date();
            todayStart.setHours(0, 0, 0, 0);

            const count = await db.get(
                'SELECT COUNT(*) AS total FROM submissions WHERE user_id = ? AND created_at >= ?',
                [userId, todayStart.toISOString()]
            );

            if (count.total >= 5) {
                fs.unlink(req.file.path, () => { });
                return res.status(400).json({ error: 'Макс 5 футажей в день' });
            }

            await db.run(
                `INSERT INTO submissions (user_id, filename, display_name, status, created_at)
                 VALUES (?, ?, ?, 'pending', ?)`,
                [userId, req.file.filename, displayName, new Date().toISOString()]
            );

            return res.json({ success: true });
        } catch (err) {
            console.error('SUBMISSION ERROR:', err);
            return res.status(500).json({
                error: 'Ошибка сервера',
                details: process.env.NODE_ENV !== 'production' ? err.message : undefined
            });
        }
    }
);

app.get('/api/submissions/my', async (req, res) => {
    if (!req.session.user) return res.status(401).json({ error: 'Нужно войти' });
    const subs = await db.all(
        'SELECT id, display_name, status, created_at FROM submissions WHERE user_id = ? ORDER BY id DESC',
        [req.session.user.id]
    );
    res.json(subs);
});

app.get('/api/admin/submissions', requireModerator, async (req, res) => {
    const subs = await db.all(`
        SELECT s.id, s.filename, s.display_name, s.status, s.created_at, u.username
        FROM submissions s
        JOIN users u ON u.id = s.user_id
        WHERE s.status = 'pending'
        ORDER BY s.id ASC
    `);
    res.json(subs);
});

app.post('/api/admin/submissions/:id/approve', requireModerator, async (req, res) => {
    const sub = await db.get('SELECT * FROM submissions WHERE id = ?', [req.params.id]);
    if (!sub) return res.status(404).json({ error: 'Не найдено' });

    const newName = sanitizeInput((req.body.display_name || sub.display_name).trim()).slice(0, 100);
    const ext = path.extname(sub.filename);
    const finalName = newName.replace(/[^a-zA-ZА-Яа-яЁёІіЇїЄєҐґ0-9_\-\s]/g, '').trim() + ext;

    const from = path.join(SUBMISSIONS_DIR, sub.filename);
    const to = path.join(VIDEOS_DIR, finalName);

    fs.rename(from, to, async (err) => {
        if (err) return res.status(500).json({ error: 'Ошибка перемещения файла' });

        await db.run(
            "UPDATE submissions SET status = 'approved', display_name = ?, final_filename = ? WHERE id = ?",
            [newName, finalName, sub.id]
        );

        const videoLink = `${SITE_URL}/videos/${encodeURIComponent(finalName)}`;

        await queueNotification({ type: 'broadcast_footage', title: newName, link: videoLink });
        await queueNotification({ type: 'personal_approved', targetUserId: sub.user_id, title: newName, link: videoLink });

        res.json({ success: true });
    });
});

app.post('/api/admin/submissions/:id/reject', requireModerator, async (req, res) => {
    const sub = await db.get('SELECT * FROM submissions WHERE id = ?', [req.params.id]);
    if (!sub) return res.status(404).json({ error: 'Не найдено' });

    fs.unlink(path.join(SUBMISSIONS_DIR, sub.filename), () => { });
    await db.run("UPDATE submissions SET status = 'rejected' WHERE id = ?", [sub.id]);

    await queueNotification({
        type: 'personal_rejected',
        targetUserId: sub.user_id,
        title: (sub.display_name || '').trim()
    });

    res.json({ success: true });
});

// ============================================================
// АДМИНКА: ПОЛЬЗОВАТЕЛИ И РОЛИ
// ============================================================
app.get('/api/admin/users', requireModerator, async (req, res) => {
    try {
        const users = await db.all(
            'SELECT id, username, role, is_banned, ban_reason, banned_until, is_verified FROM users ORDER BY id DESC'
        );
        res.json(users);
    } catch (error) {
        console.error(error);
        res.status(500).json({ error: 'Failed to load users' });
    }
});

app.delete('/api/admin/users/:id', requireAdmin, async (req, res) => {
    const userId = Number(req.params.id);

    const user = await db.get('SELECT id, role FROM users WHERE id = ?', [userId]);
    if (!user) return res.status(404).json({ error: 'Пользователь не найден' });
    if (user.role === 'admin') return res.status(403).json({ error: 'Нельзя удалить администратора' });

    await db.run('DELETE FROM video_likes WHERE user_id = ?', [userId]);
    await db.run('DELETE FROM user_points WHERE user_id = ?', [userId]);
    await db.run('DELETE FROM collection_items WHERE collection_id IN (SELECT id FROM collections WHERE user_id = ?)', [userId]);
    await db.run('DELETE FROM collections WHERE user_id = ?', [userId]);
    await db.run('DELETE FROM submissions WHERE user_id = ?', [userId]);
    await db.run('DELETE FROM user_tags WHERE user_id = ?', [userId]);
    await db.run('DELETE FROM users WHERE id = ?', [userId]);

    res.json({ success: true });
});

// Назначение/снятие ролей: только админ.
// Схема одинакова для moderator, junior_moderator, senior_moderator.
const ASSIGNABLE_ROLES = {
    moderator: 'moderator',
    'junior-moderator': 'junior_moderator',
    'senior-moderator': 'senior_moderator'
};

for (const [routeName, roleValue] of Object.entries(ASSIGNABLE_ROLES)) {
    app.post(`/api/admin/users/:id/${routeName}`, requireAdmin, async (req, res) => {
        try {
            const userId = Number(req.params.id);
            const user = await db.get('SELECT id, role FROM users WHERE id = ?', [userId]);
            if (!user) return res.status(404).json({ error: 'User not found' });
            if (user.role === 'admin') return res.status(400).json({ error: 'Administrator cannot be moderator' });

            await db.run('UPDATE users SET role = ? WHERE id = ?', [roleValue, userId]);
            res.json({ success: true });
        } catch (error) {
            console.error(error);
            res.status(500).json({ error: `Failed to set role ${roleValue}` });
        }
    });

    app.delete(`/api/admin/users/:id/${routeName}`, requireAdmin, async (req, res) => {
        try {
            const userId = Number(req.params.id);
            await db.run("UPDATE users SET role = 'user' WHERE id = ? AND role = ?", [userId, roleValue]);
            res.json({ success: true });
        } catch (error) {
            console.error(error);
            res.status(500).json({ error: `Failed to remove role ${roleValue}` });
        }
    });
}

// ============================================================
// ВЕРИФИКАЦИЯ (синяя галочка)
// Администраторам галочку может выдать/снять только другой админ.
// ============================================================
app.post('/api/admin/users/:id/verify', requireVerifier, async (req, res) => {
    try {
        const userId = Number(req.params.id);
        const user = await db.get('SELECT id, role FROM users WHERE id = ?', [userId]);
        if (!user) return res.status(404).json({ error: 'Пользователь не найден' });

        const granterRole = String(req.user.role || '').trim().toLowerCase();
        if (user.role === 'admin' && granterRole !== 'admin') {
            return res.status(403).json({ error: 'Выдать верификацию администратору может только другой администратор' });
        }

        await db.run(
            'UPDATE users SET is_verified = 1, verified_by = ?, verified_at = ? WHERE id = ?',
            [req.user.id, new Date().toISOString(), userId]
        );
        res.json({ success: true });
    } catch (error) {
        console.error(error);
        res.status(500).json({ error: 'Failed to verify user' });
    }
});

app.delete('/api/admin/users/:id/verify', requireVerifier, async (req, res) => {
    try {
        const userId = Number(req.params.id);
        const user = await db.get('SELECT id, role FROM users WHERE id = ?', [userId]);
        if (!user) return res.status(404).json({ error: 'Пользователь не найден' });

        const granterRole = String(req.user.role || '').trim().toLowerCase();
        if (user.role === 'admin' && granterRole !== 'admin') {
            return res.status(403).json({ error: 'Снять верификацию у администратора может только другой администратор' });
        }

        await db.run('UPDATE users SET is_verified = 0, verified_by = NULL, verified_at = NULL WHERE id = ?', [userId]);
        res.json({ success: true });
    } catch (error) {
        console.error(error);
        res.status(500).json({ error: 'Failed to unverify user' });
    }
});

// ============================================================
// БАН / РАЗБАН
// Сотрудников (STAFF_ROLES) банит и разбанивает только админ.
// ============================================================
app.post('/api/admin/users/:id/ban', requireModerator, async (req, res) => {
    try {
        const userId = Number(req.params.id);
        const { reason, banned_until } = req.body;

        const user = await db.get('SELECT id, username, role FROM users WHERE id = ?', [userId]);
        if (!user) return res.status(404).json({ error: 'User not found' });
        if (user.role === 'admin') return res.status(403).json({ error: 'Cannot ban administrator' });

        const targetRole = String(user.role || '').trim().toLowerCase();
        const granterRole = String(req.user.role || '').trim().toLowerCase();
        if (STAFF_ROLES.includes(targetRole) && granterRole !== 'admin') {
            return res.status(403).json({ error: 'Банить сотрудников (модераторов) может только администратор' });
        }

        const target = await db.get('SELECT avatar_url FROM users WHERE id = ?', [userId]);
        if (target?.avatar_url) {
            fs.unlink(path.join(__dirname, 'public', target.avatar_url), () => {});
        }

        await db.run(
            'UPDATE users SET is_banned = 1, ban_reason = ?, banned_until = ?, avatar_url = NULL WHERE id = ?',
            [sanitizeInput(String(reason || 'Нарушение правил').slice(0, 300)), banned_until || null, userId]
        );
        res.json({ success: true });
    } catch (error) {
        console.error(error);
        res.status(500).json({ error: 'Failed to ban user' });
    }
});

app.post('/api/admin/users/:id/unban', requireModerator, async (req, res) => {
    try {
        const userId = Number(req.params.id);

        const user = await db.get('SELECT id, role FROM users WHERE id = ?', [userId]);
        if (!user) return res.status(404).json({ error: 'User not found' });

        const targetRole = String(user.role || '').trim().toLowerCase();
        const granterRole = String(req.user.role || '').trim().toLowerCase();
        if (STAFF_ROLES.includes(targetRole) && granterRole !== 'admin') {
            return res.status(403).json({ error: 'Разбанить сотрудника (модератора) может только администратор' });
        }

        await db.run('UPDATE users SET is_banned = 0, ban_reason = NULL, banned_until = NULL WHERE id = ?', [userId]);
        res.json({ success: true });
    } catch (error) {
        console.error(error);
        res.status(500).json({ error: 'Failed to unban user' });
    }
});

// ============================================================
// АДМИНКА: КОЛЛЕКЦИИ / СТАТИСТИКА / ЖАЛОБЫ
// ============================================================
app.get('/api/admin/collections', requireModerator, async (req, res) => {
    try {
        const collections = await db.all(`
            SELECT c.id, c.name, c.description, c.is_public, c.user_id,
                   u.username, COUNT(ci.id) AS item_count
            FROM collections c
            LEFT JOIN users u ON u.id = c.user_id
            LEFT JOIN collection_items ci ON ci.collection_id = c.id
            GROUP BY c.id
            ORDER BY c.id DESC
        `);
        res.json(collections);
    } catch (error) {
        console.error(error);
        res.status(500).json({ error: 'Failed to load collections' });
    }
});

app.delete('/api/admin/collections/:id', requireModerator, async (req, res) => {
    try {
        const collectionId = Number(req.params.id);
        const collection = await db.get('SELECT id FROM collections WHERE id = ?', [collectionId]);
        if (!collection) return res.status(404).json({ error: 'Collection not found' });

        await db.run('DELETE FROM collection_items WHERE collection_id = ?', [collectionId]);
        await db.run('DELETE FROM collections WHERE id = ?', [collectionId]);
        res.json({ success: true });
    } catch (error) {
        console.error(error);
        res.status(500).json({ error: 'Failed to delete collection' });
    }
});

app.get('/api/admin/stats', requireModerator, async (req, res) => {
    try {
        const users = await db.get('SELECT COUNT(*) AS count FROM users');
        const moderators = await db.get("SELECT COUNT(*) AS count FROM users WHERE role IN ('moderator','junior_moderator','senior_moderator')");
        const juniorModerators = await db.get("SELECT COUNT(*) AS count FROM users WHERE role = 'junior_moderator'");
        const seniorModerators = await db.get("SELECT COUNT(*) AS count FROM users WHERE role = 'senior_moderator'");
        const banned = await db.get('SELECT COUNT(*) AS count FROM users WHERE is_banned = 1');
        const collections = await db.get('SELECT COUNT(*) AS count FROM collections');
        const verified = await db.get('SELECT COUNT(*) AS count FROM users WHERE is_verified = 1');

        res.json({
            users: users.count,
            moderators: moderators.count,
            junior_moderators: juniorModerators.count,
            senior_moderators: seniorModerators.count,
            banned: banned.count,
            collections: collections.count,
            verified: verified.count
        });
    } catch (error) {
        console.error(error);
        res.status(500).json({ error: 'Failed to load statistics' });
    }
});

app.get('/api/admin/reports', requireModerator, async (req, res) => {
    try {
        const reports = await db.all(`
            SELECT r.id, r.reported_username, r.reason, r.status, r.created_at,
                   u.username AS reporter_username
            FROM reports r
            LEFT JOIN users u ON u.id = r.reporter_id
            ORDER BY r.created_at DESC
            LIMIT 200
        `);
        res.json(reports);
    } catch (e) {
        console.error(e);
        res.status(500).json({ error: 'Ошибка сервера' });
    }
});

app.post('/api/admin/reports/:id/resolve', requireModerator, async (req, res) => {
    const { status } = req.body;
    if (!['resolved', 'dismissed'].includes(status)) {
        return res.status(400).json({ error: 'Некорректный статус' });
    }
    try {
        await db.run('UPDATE reports SET status = ? WHERE id = ?', [status, req.params.id]);
        res.json({ ok: true });
    } catch (e) {
        console.error(e);
        res.status(500).json({ error: 'Ошибка сервера' });
    }
});

// ============================================================
// ТЕГИ
// Каталог тегов — создаёт/удаляет админ. Выдают/снимают
// junior_moderator, senior_moderator и admin.
// ============================================================
app.get('/api/tags', async (req, res) => {
    try {
        const tags = await db.all('SELECT * FROM tags ORDER BY name');
        res.json(tags);
    } catch (error) {
        console.error(error);
        res.status(500).json({ error: 'Failed to load tags' });
    }
});

app.post('/api/admin/tags', requireAdmin, async (req, res) => {
    try {
        const { name, color, icon } = req.body;
        if (!name || !String(name).trim()) return res.status(400).json({ error: 'Укажите название тега' });

        const cleanName = sanitizeInput(String(name).trim().slice(0, 30));
        const cleanColor = /^#[0-9a-fA-F]{3,6}$/.test(color || '') ? color : '#7ec384';
        const cleanIcon = sanitizeInput(String(icon || '').slice(0, 10));

        const result = await db.run(
            'INSERT INTO tags (name, color, icon, created_at) VALUES (?, ?, ?, ?)',
            [cleanName, cleanColor, cleanIcon, new Date().toISOString()]
        );
        res.json({ success: true, id: result.lastID });
    } catch (error) {
        res.status(400).json({ error: 'Тег с таким названием уже существует' });
    }
});

app.delete('/api/admin/tags/:id', requireAdmin, async (req, res) => {
    try {
        const tagId = Number(req.params.id);
        await db.run('DELETE FROM user_tags WHERE tag_id = ?', [tagId]);
        await db.run('DELETE FROM tags WHERE id = ?', [tagId]);
        res.json({ success: true });
    } catch (error) {
        console.error(error);
        res.status(500).json({ error: 'Failed to delete tag' });
    }
});

app.get('/api/admin/users/:id/tags', requireModerator, async (req, res) => {
    try {
        const tags = await db.all(`
            SELECT t.id, t.name, t.color, t.icon
            FROM user_tags ut
            JOIN tags t ON t.id = ut.tag_id
            WHERE ut.user_id = ?
        `, [req.params.id]);
        res.json(tags);
    } catch (error) {
        console.error(error);
        res.status(500).json({ error: 'Failed to load user tags' });
    }
});

app.post('/api/admin/users/:id/tags', requireTagGranter, async (req, res) => {
    try {
        const userId = Number(req.params.id);
        const { tag_id } = req.body;
        if (!tag_id) return res.status(400).json({ error: 'Укажите tag_id' });

        const user = await db.get('SELECT id FROM users WHERE id = ?', [userId]);
        if (!user) return res.status(404).json({ error: 'Пользователь не найден' });

        const tag = await db.get('SELECT id FROM tags WHERE id = ?', [tag_id]);
        if (!tag) return res.status(404).json({ error: 'Тег не найден' });

        await db.run(
            'INSERT INTO user_tags (user_id, tag_id, assigned_at, assigned_by) VALUES (?, ?, ?, ?)',
            [userId, tag_id, new Date().toISOString(), req.session.user.id]
        );
        res.json({ success: true });
    } catch (error) {
        res.status(409).json({ error: 'У пользователя уже есть этот тег' });
    }
});

app.delete('/api/admin/users/:id/tags/:tagId', requireTagGranter, async (req, res) => {
    try {
        await db.run('DELETE FROM user_tags WHERE user_id = ? AND tag_id = ?', [req.params.id, req.params.tagId]);
        res.json({ success: true });
    } catch (error) {
        console.error(error);
        res.status(500).json({ error: 'Failed to remove tag' });
    }
});

// ============================================================
// ПРИВЯЗКА TELEGRAM
// ============================================================
app.post('/api/telegram/link-code', async (req, res) => {
    try {
        if (!req.session.user) return res.status(401).json({ error: 'Нужно войти в аккаунт' });

        const userId = req.session.user.id;
        const code = generateSixDigitCode();
        const expires = new Date(Date.now() + 10 * 60 * 1000).toISOString();

        await db.run(
            'UPDATE users SET telegram_link_code = ?, telegram_link_expires = ? WHERE id = ?',
            [code, expires, userId]
        );
        console.log(`Telegram link code for user ${userId}: ${code}`);

        res.json({ success: true, code });
    } catch (error) {
        console.error('Telegram link error:', error);
        res.status(500).json({ error: 'Ошибка сервера' });
    }
});

// Исправлено: раньше обращались к несуществующей таблице telegram_accounts.
// Теперь используется telegram_users, как и в остальном коде.
app.get('/api/telegram/status', async (req, res) => {
    if (!req.session.user) return res.status(401).json({ error: 'Нужно войти' });
    try {
        const account = await db.get(
            `SELECT telegram_username, telegram_id, first_seen, last_seen
             FROM telegram_users WHERE user_id = ? LIMIT 1`,
            [req.session.user.id]
        );
        res.json({ linked: !!account, account: account || null });
    } catch (error) {
        console.error('Telegram status error:', error);
        res.status(500).json({ error: 'Ошибка сервера' });
    }
});

app.post('/api/telegram/unlink', async (req, res) => {
    if (!req.session.user) return res.status(401).json({ error: 'Нужно войти' });
    try {
        await db.run('UPDATE telegram_users SET user_id = NULL WHERE user_id = ?', [req.session.user.id]);
        await db.run(`
            UPDATE users
            SET telegram_id = NULL,
                telegram_username = NULL,
                telegram_link_code = NULL,
                telegram_link_expires = NULL
            WHERE id = ?
        `, [req.session.user.id]);
        res.json({ success: true });
    } catch (error) {
        console.error('Telegram unlink error:', error);
        res.status(500).json({ error: 'Ошибка сервера' });
    }
});

// ============================================================
// ГЛОБАЛЬНЫЙ ОБРАБОТЧИК ОШИБОК — всегда JSON
// ============================================================
app.use((err, req, res, next) => {
    if (res.headersSent) return next(err);
    if (err && /CORS/i.test(err.message)) {
        return res.status(403).json({ error: 'Домен не разрешён (CORS)' });
    }
    if (err && err.name === 'MulterError') {
        return res.status(400).json({ error: 'Ошибка загрузки файла: ' + err.code });
    }
    if (err && err.message && err.message.startsWith('Нужно войти')) {
        return res.status(401).json({ error: err.message });
    }
    console.error('Unhandled error:', err);
    res.status(500).json({ error: 'Ошибка сервера' });
});

// ============================================================
// ЗАПУСК
// ============================================================
async function startServer() {
    try {
        db = await open({ filename: path.join(__dirname, 'database.db'), driver: sqlite3.Database });

        // WAL + busy_timeout: сервер и бот пишут в одну базу
        await db.exec('PRAGMA journal_mode = WAL;');
        await db.exec('PRAGMA busy_timeout = 5000;');

        await db.exec(`
            CREATE TABLE IF NOT EXISTS users (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                username TEXT UNIQUE NOT NULL,
                password TEXT NOT NULL,
                role TEXT DEFAULT 'user'
            );
            CREATE TABLE IF NOT EXISTS news (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                title TEXT NOT NULL,
                content TEXT NOT NULL,
                image TEXT,
                date TEXT NOT NULL
            );
            CREATE TABLE IF NOT EXISTS video_likes (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                user_id INTEGER NOT NULL,
                video_name TEXT NOT NULL,
                UNIQUE(user_id, video_name)
            );
            CREATE TABLE IF NOT EXISTS video_downloads (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                video_name TEXT NOT NULL,
                count INTEGER DEFAULT 0,
                UNIQUE(video_name)
            );
            CREATE TABLE IF NOT EXISTS collections (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                user_id INTEGER NOT NULL,
                name TEXT NOT NULL,
                description TEXT,
                is_public INTEGER DEFAULT 1,
                created_at TEXT NOT NULL
            );
            CREATE TABLE IF NOT EXISTS submissions (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                user_id INTEGER NOT NULL,
                filename TEXT NOT NULL,
                display_name TEXT NOT NULL,
                status TEXT DEFAULT 'pending',
                created_at TEXT NOT NULL
            );
            CREATE TABLE IF NOT EXISTS collection_items (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                collection_id INTEGER NOT NULL,
                video_name TEXT NOT NULL,
                added_at TEXT NOT NULL,
                UNIQUE(collection_id, video_name)
            );
            CREATE TABLE IF NOT EXISTS user_points (
                user_id INTEGER PRIMARY KEY,
                points INTEGER DEFAULT 0
            );
            CREATE TABLE IF NOT EXISTS cards (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                name TEXT NOT NULL,
                description TEXT,
                image TEXT,
                rarity TEXT NOT NULL,
                drop_weight INTEGER DEFAULT 100,
                created_at TEXT NOT NULL
            );
            CREATE TABLE IF NOT EXISTS user_cards (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                user_id INTEGER NOT NULL,
                card_id INTEGER NOT NULL,
                amount INTEGER DEFAULT 1,
                obtained_at TEXT NOT NULL,
                UNIQUE(user_id, card_id)
            );
            CREATE TABLE IF NOT EXISTS card_drops (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                user_id INTEGER NOT NULL,
                card_id INTEGER NOT NULL,
                created_at TEXT NOT NULL
            );
            CREATE TABLE IF NOT EXISTS telegram_users (
                telegram_id TEXT PRIMARY KEY,
                telegram_username TEXT,
                user_id INTEGER,
                first_seen TEXT NOT NULL,
                last_seen TEXT NOT NULL
            );
            CREATE TABLE IF NOT EXISTS airdrops (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                coins INTEGER NOT NULL,
                max_claims INTEGER,
                claims INTEGER DEFAULT 0,
                created_at DATETIME DEFAULT CURRENT_TIMESTAMP
            );
            CREATE TABLE IF NOT EXISTS airdrop_claims (
                airdrop_id INTEGER,
                user_id INTEGER,
                PRIMARY KEY (airdrop_id, user_id)
            );
            CREATE TABLE IF NOT EXISTS tags (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                name TEXT NOT NULL UNIQUE,
                color TEXT DEFAULT '#7ec384',
                icon TEXT,
                created_at TEXT NOT NULL
            );
            CREATE TABLE IF NOT EXISTS user_tags (
                user_id INTEGER NOT NULL,
                tag_id INTEGER NOT NULL,
                assigned_at TEXT NOT NULL,
                assigned_by INTEGER,
                PRIMARY KEY (user_id, tag_id)
            );
            CREATE TABLE IF NOT EXISTS reports (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                reporter_id INTEGER REFERENCES users(id),
                reported_username TEXT,
                reason TEXT,
                created_at TEXT DEFAULT CURRENT_TIMESTAMP,
                status TEXT DEFAULT 'pending'
            );
            CREATE TABLE IF NOT EXISTS bot_notifications (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                type TEXT NOT NULL,
                target_user_id INTEGER,
                target_chat_id TEXT,
                title TEXT,
                message TEXT,
                image_path TEXT,
                link TEXT,
                created_at TEXT NOT NULL,
                processed INTEGER DEFAULT 0
            );
        `);

        // Миграции колонок для уже существующих баз
        await addColumnIfNotExists('users', 'is_banned', 'INTEGER DEFAULT 0');
        await addColumnIfNotExists('users', 'ban_reason', 'TEXT');
        await addColumnIfNotExists('users', 'banned_until', 'TEXT');
        await addColumnIfNotExists('users', 'telegram_id', 'TEXT');
        await addColumnIfNotExists('users', 'telegram_username', 'TEXT');
        await addColumnIfNotExists('users', 'telegram_link_code', 'TEXT');
        await addColumnIfNotExists('users', 'telegram_link_expires', 'TEXT');
        await addColumnIfNotExists('users', 'is_verified', 'INTEGER DEFAULT 0');
        await addColumnIfNotExists('users', 'verified_by', 'INTEGER');
        await addColumnIfNotExists('users', 'verified_at', 'TEXT');
        await addColumnIfNotExists('users', 'avatar_url', 'TEXT');
        await addColumnIfNotExists('users', 'activity_visible', 'INTEGER DEFAULT 1');
        await addColumnIfNotExists('users', 'last_seen', 'TEXT');
        await addColumnIfNotExists('users', 'terms_accepted_at', 'TEXT');
        await addColumnIfNotExists('users', 'terms_version', 'TEXT');
        await addColumnIfNotExists('bot_notifications', 'target_chat_id', 'TEXT');
        await addColumnIfNotExists('submissions', 'final_filename', 'TEXT');

        await initRooms(db); // таблицы комнат, жалоб и мута
        await initMailAuth(db); // колонки email и уникальный индекс

        console.log('✅ БД подключена!');

        app.listen(PORT, () => {
            console.log(`✅ Сервер запущен на порту ${PORT}`);
        });
    } catch (err) {
        console.error('❌ Ошибка БД:', err);
        process.exit(1);
    }
}

startServer();
