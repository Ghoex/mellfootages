// rooms.js — комнаты-чаты, упоминания, футажи в сообщениях, уведомления.
// Хранение в SQLite (та же база database.db).
// Подключение в server.js:
//   const { mountRooms, initRooms } = require('./rooms');
//   mountRooms(app, () => db);   // до app.use('/submissions', ...)
//   await initRooms(db);         // в startServer(), после ensureColumn(...)

const path = require('path');
const fs = require('fs');
const bcrypt = require('bcryptjs');
const { stripExternalLinks } = require('./rooms-links');
const { mountGames, initGames } = require('./rooms-games');

// Иерархия ролей: user < junior_moderator < moderator < senior_moderator < admin
const RANK = { user: 0, junior_moderator: 1, moderator: 2, senior_moderator: 3, admin: 4 };
const CREATE_ROOM_ROLES = ['moderator', 'senior_moderator', 'admin'];

const JUNIOR_MAX_MUTE_MIN = 24 * 60;        // мл. модератор: мут не дольше 24 ч
const DEFAULT_MAX_MUTE_MIN = 30 * 24 * 60;  // остальные модераторы: до 30 дней

// Защита от жалоб-спама
const FALSE_REPORT_LIMIT = 3;               // 3 отклонённые жалобы -> жалобы автора не попадают модерации
const REPORT_WINDOW_MS = 10 * 60 * 1000;
const REPORT_WINDOW_LIMIT = 5;              // больше 5 жалоб за 10 минут -> тоже не попадают модерации

const MESSAGE_COOLDOWN_MS = 1000;
const MESSAGE_MAX_LENGTH = 500;
const HISTORY_LIMIT = 50;
const UNLOCK_WINDOW_MS = 15 * 60 * 1000;
const UNLOCK_MAX_ATTEMPTS = 10;
const HEX_COLOR = /^#[0-9a-f]{6}$/i;

// Упоминания и футажи
const MAX_MENTIONS_PER_MSG = 5;             // больше не уведомляем, чтобы не спамили
const NOTIFY_SNIPPET_LEN = 120;
const VIDEOS_DIR = path.join(__dirname, 'videos');
const FOOTAGE_EXTS = ['.mp4', '.mkv', '.webm', '.mov'];
const MENTION_RE = /@([a-zA-Z0-9_\-]+)/g;      // ник: 3–15 символов (проверяем отдельно)
const FOOTAGE_RE = /#([^\s#@.,!?;:()]+)/g;

// Секретные коды эффектов текста: "/4602 текст" -> текст с переливом
const EFFECT_CODES = { '4602': 'shimmer' };

let getDbRef = null;
const db = () => getDbRef();
const subscribers = new Map();    // roomId -> Set(res)  (SSE-подписчики комнаты)
const userSubs = new Map();       // userId -> Set(res)  (SSE-подписчики уведомлений)
const lastMessageAt = new Map();  // userId -> timestamp
const unlockAttempts = new Map(); // `${userId}:${roomId}` -> { count, resetAt }

class HttpError extends Error {
    constructor(status, message) {
        super(message);
        this.status = status;
    }
}

const wrap = (fn) => async (req, res) => {
    try {
        await fn(req, res);
    } catch (e) {
        if (e instanceof HttpError) return res.status(e.status).json({ error: e.message });
        console.error('[rooms]', e);
        res.status(500).json({ error: 'Ошибка сервера' });
    }
};

const roleOf = (role) => String(role || 'user').trim().toLowerCase();
const rankOf = (role) => RANK[roleOf(role)] || 0;
const canModerate = (role) => rankOf(role) >= RANK.junior_moderator;
const nowIso = () => new Date().toISOString();
const sessionUserId = (req) => req.session?.user?.id || null;
const parseJson = (s) => { try { return JSON.parse(s || '[]'); } catch { return []; } };

function parseId(value) {
    const n = Number(value);
    return Number.isSafeInteger(n) && n > 0 ? n : null;
}

// Одна строка без управляющих символов, пробелы схлопываются
function cleanLine(value) {
    return String(value ?? '')
        .replace(/[\u0000-\u001F\u007F]+/g, ' ')
        .replace(/\s+/g, ' ')
        .trim();
}

function formatMinutes(min) {
    if (min % 1440 === 0) return `${min / 1440} д.`;
    if (min % 60 === 0) return `${min / 60} ч.`;
    return `${min} мин.`;
}

// "30", "30m", "30мин", "2h", "2ч", "1d", "1д" -> минуты
function parseMinutes(raw) {
    const m = String(raw || '').trim().toLowerCase().match(/^(\d{1,6})\s*(мин|min|м|m|ч|h|д|d)?$/);
    if (!m) return null;
    const n = parseInt(m[1], 10);
    const unit = m[2] || 'm';
    if (unit === 'ч' || unit === 'h') return n * 60;
    if (unit === 'д' || unit === 'd') return n * 1440;
    return n;
}

// Название футажа -> слаг для #тега: пробелы заменяются на "-"
const slugOf = (name) => String(name || '').trim().replace(/\s+/g, '-');

// ---------- Пользователь и доступ ----------

async function requireUser(req) {
    const id = sessionUserId(req);
    if (!id) throw new HttpError(401, 'Нужно войти в аккаунт');
    const u = await db().get(
        `SELECT id, username, role, is_verified, is_banned, banned_until,
                chat_muted_until, report_false_count
         FROM users WHERE id = ?`,
        [id]
    );
    if (!u) throw new HttpError(401, 'Пользователь не найден');
    const banned = u.is_banned && (!u.banned_until || new Date(u.banned_until) > new Date());
    if (banned) throw new HttpError(403, 'Аккаунт заблокирован');
    return u;
}

async function requireModerator(req) {
    const u = await requireUser(req);
    if (!canModerate(u.role)) throw new HttpError(403, 'Нет прав модератора');
    return u;
}

async function roomOr404(rawId) {
    const id = parseId(rawId);
    const room = id && await db().get(
        'SELECT id, name, description, password_hash, created_by, created_at FROM rooms WHERE id = ?',
        [id]
    );
    if (!room) throw new HttpError(404, 'Комната не найдена');
    return room;
}

async function hasAccess(room, userId) {
    if (!room.password_hash) return true;
    if (!userId) return false;
    const row = await db().get(
        'SELECT 1 AS ok FROM room_members WHERE room_id = ? AND user_id = ?',
        [room.id, userId]
    );
    return !!row;
}

async function assertAccess(room, userId) {
    if (!(await hasAccess(room, userId))) throw new HttpError(403, 'Комната закрыта паролем');
}

// ---------- Футажи ----------

// Все видео из папки + подпись из заявок (если футаж был одобрен через заявку)
async function scanFootage() {
    let files = [];
    try {
        files = fs.readdirSync(VIDEOS_DIR).filter((f) => FOOTAGE_EXTS.includes(path.extname(f).toLowerCase()));
    } catch {
        return [];
    }
    const subs = await db().all(`
        SELECT s.final_filename AS file, s.display_name AS title, u.username AS uploader
        FROM submissions s
        LEFT JOIN users u ON u.id = s.user_id
        WHERE s.status = 'approved' AND s.final_filename IS NOT NULL`);
    const byFile = new Map(subs.map((s) => [s.file, s]));

    return files.map((file) => {
        const sub = byFile.get(file);
        const base = path.parse(file).name;
        const title = sub?.title || base;
        return {
            file,
            base,
            title,
            slug: slugOf(title),
            baseSlug: slugOf(base),
            uploader: sub?.uploader || null,
            url: '/footage/' + encodeURIComponent(base),
        };
    });
}

const footageDto = (f) => ({
    id: f.base,
    title: f.title,
    slug: f.slug,
    url: f.url,
    file_url: '/videos/' + encodeURIComponent(f.file),
    uploader: f.uploader,
});

// Находит упоминания #тегов и футажей в тексте. Возвращает и пользователей, и футажи.
async function resolveRefs(text) {
    const names = [...new Set([...text.matchAll(MENTION_RE)].map((m) => m[1].toLowerCase()))]
        .filter((n) => n.length >= 3 && n.length <= 15);
    const mentions = names.length
        ? await db().all(
            `SELECT id, username, COALESCE(mention_notify, 1) AS mention_notify
             FROM users WHERE LOWER(username) IN (${names.map(() => '?').join(',')})`,
            names
        )
        : [];

    const tokens = [...new Set([...text.matchAll(FOOTAGE_RE)].map((m) => m[1].toLowerCase()))];
    const footages = [];
    if (tokens.length) {
        const list = await scanFootage();
        for (const t of tokens) {
            const f = list.find((x) => x.slug.toLowerCase() === t || x.baseSlug.toLowerCase() === t);
            if (f) footages.push({ token: t, title: f.title, url: f.url });
        }
    }
    return { mentions, footages };
}

// ---------- Уведомления ----------

const notifDto = (r) => ({
    id: r.id,
    type: r.type,
    room_id: r.room_id,
    room_name: r.room_name || null,
    message_id: r.message_id,
    from: r.from_username,
    text: r.text,
    created_at: r.created_at,
});

function pushToUser(userId, event, payload) {
    const set = userSubs.get(userId);
    if (!set) return;
    const data = `event: ${event}\ndata: ${JSON.stringify(payload)}\n\n`;
    for (const res of set) res.write(data);
}

async function notifyMentions(room, author, msg, mentions) {
    const targets = mentions
        .filter((m) => m.id !== author.id && m.mention_notify !== 0)
        .slice(0, MAX_MENTIONS_PER_MSG);

    for (const t of targets) {
        // Не сообщаем о комнате тому, кто в неё не может войти (закрыта паролем)
        if (!(await hasAccess(room, t.id))) continue;

        const created = nowIso();
        const snippet = msg.text.slice(0, NOTIFY_SNIPPET_LEN);
        const r = await db().run(
            `INSERT INTO notifications (user_id, type, room_id, message_id, from_username, text, created_at)
             VALUES (?, 'mention', ?, ?, ?, ?, ?)`,
            [t.id, room.id, msg.id, author.username, snippet, created]
        );
        pushToUser(t.id, 'notification', {
            id: r.lastID,
            type: 'mention',
            room_id: room.id,
            room_name: room.name,
            message_id: msg.id,
            from: author.username,
            text: snippet,
            created_at: created,
        });
    }
}

async function listNotifications(req, res) {
    const me = await requireUser(req);
    const rows = await db().all(`
        SELECT n.id, n.type, n.room_id, n.message_id, n.from_username, n.text, n.created_at, r.name AS room_name
        FROM notifications n
        LEFT JOIN rooms r ON r.id = n.room_id
        WHERE n.user_id = ? AND n.read_at IS NULL
        ORDER BY n.id DESC
        LIMIT 50`, [me.id]);
    res.json(rows.map(notifDto));
}

async function markNotificationsRead(req, res) {
    const me = await requireUser(req);
    await db().run('UPDATE notifications SET read_at = ? WHERE user_id = ? AND read_at IS NULL', [nowIso(), me.id]);
    res.json({ ok: true });
}

async function getNotifSettings(req, res) {
    const me = await requireUser(req);
    const row = await db().get('SELECT COALESCE(mention_notify, 1) AS v FROM users WHERE id = ?', [me.id]);
    res.json({ mention_notify: !!(row && row.v) });
}

async function patchNotifSettings(req, res) {
    const me = await requireUser(req);
    const value = (req.body || {}).mention_notify;
    if (typeof value !== 'boolean') throw new HttpError(400, 'Ожидается mention_notify: true или false');
    await db().run('UPDATE users SET mention_notify = ? WHERE id = ?', [value ? 1 : 0, me.id]);
    res.json({ ok: true, mention_notify: value });
}

// SSE: уведомления приходят сразу, если пользователь сейчас на сайте
async function notifStream(req, res) {
    const me = await requireUser(req);

    res.set({
        'Content-Type': 'text/event-stream',
        'Cache-Control': 'no-cache',
        Connection: 'keep-alive',
        'X-Accel-Buffering': 'no',
    });
    res.flushHeaders();
    res.write('retry: 3000\n\n');

    if (!userSubs.has(me.id)) userSubs.set(me.id, new Set());
    userSubs.get(me.id).add(res);
    const ping = setInterval(() => res.write(': ping\n\n'), 25000);

    req.on('close', () => {
        clearInterval(ping);
        const set = userSubs.get(me.id);
        if (set) {
            set.delete(res);
            if (!set.size) userSubs.delete(me.id);
        }
    });
}

// ---------- Мут ----------

// minutes: > 0 — замутить, 0 — размутить. Возвращает текст для системного сообщения.
async function setMute(actor, targetName, minutes) {
    if (!canModerate(actor.role)) throw new HttpError(403, 'Мут доступен модераторам');
    const name = cleanLine(targetName);
    const target = name && await db().get(
        'SELECT id, username, role FROM users WHERE username = ? COLLATE NOCASE',
        [name]
    );
    if (!target) throw new HttpError(404, 'Пользователь не найден');
    if (target.id === actor.id) throw new HttpError(400, 'Нельзя мутить себя');
    if (rankOf(target.role) >= rankOf(actor.role)) {
        throw new HttpError(403, 'Нельзя мутить участника с равной или более высокой ролью');
    }
    if (!Number.isInteger(minutes) || minutes < 0) throw new HttpError(400, 'Некорректное время');

    if (minutes === 0) {
        await db().run('UPDATE users SET chat_muted_until = NULL WHERE id = ?', [target.id]);
        return `${target.username} размучен (${actor.username})`;
    }

    const max = roleOf(actor.role) === 'junior_moderator' ? JUNIOR_MAX_MUTE_MIN : DEFAULT_MAX_MUTE_MIN;
    if (minutes > max) throw new HttpError(400, `Максимум для твоей роли: ${formatMinutes(max)}`);

    const until = new Date(Date.now() + minutes * 60000).toISOString();
    await db().run('UPDATE users SET chat_muted_until = ? WHERE id = ?', [until, target.id]);
    return `${target.username} замучен на ${formatMinutes(minutes)} (${actor.username})`;
}

// Команды в чате: /mute ник время  и  /unmute ник
async function runCommand(me, room, text) {
    const parts = text.split(' ').filter(Boolean);
    const cmd = parts[0].toLowerCase();
    if (cmd !== '/mute' && cmd !== '/unmute') {
        throw new HttpError(400, 'Неизвестная команда. Доступно: /mute ник 30m, /unmute ник');
    }
    if (!canModerate(me.role)) throw new HttpError(403, 'Команды доступны модераторам');
    if (!parts[1]) throw new HttpError(400, 'Укажи ник');

    if (cmd === '/unmute') {
        return postSystem(room.id, await setMute(me, parts[1], 0));
    }
    const minutes = parseMinutes(parts[2]);
    if (!minutes) throw new HttpError(400, 'Укажи время: 30m, 2h, 1d или просто минуты');
    return postSystem(room.id, await setMute(me, parts[1], minutes));
}

// ---------- Сообщения (общие) ----------

const MSG_SELECT = `
    SELECT m.id, m.room_id, m.user_id, m.text, m.kind, m.created_at, m.mentions, m.footages, m.effect,
           u.username, u.role, u.is_verified,
           (SELECT t.name FROM user_tags ut JOIN tags t ON t.id = ut.tag_id
             WHERE ut.user_id = u.id ORDER BY ut.assigned_at LIMIT 1) AS tag_name,
           (SELECT t.color FROM user_tags ut JOIN tags t ON t.id = ut.tag_id
             WHERE ut.user_id = u.id ORDER BY ut.assigned_at LIMIT 1) AS tag_color
    FROM room_messages m
    LEFT JOIN users u ON u.id = m.user_id
    WHERE m.deleted_at IS NULL`;

function serializeMessage(r) {
    const system = r.kind === 'system';
    if (system) {
        return { id: r.id, room_id: r.room_id, kind: 'system', text: r.text, created_at: r.created_at };
    }
    return {
        id: r.id,
        room_id: r.room_id,
        kind: 'user',
        text: r.text,
        created_at: r.created_at,
        username: r.username || null,
        role: roleOf(r.role),
        is_staff: rankOf(r.role) >= 1,
        is_verified: !!r.is_verified,
        tag: r.tag_name
            ? { name: r.tag_name, color: HEX_COLOR.test(r.tag_color || '') ? r.tag_color : '#7ec384' }
            : null,
        mentions: parseJson(r.mentions),   // ники, которых отметили
        footages: parseJson(r.footages),   // [{token, title, url}] — футажи, на которые сослались
        effect: r.effect || null,          // эффект текста, например 'shimmer'
    };
}

async function fetchMessage(id) {
    return db().get(MSG_SELECT + ' AND m.id = ?', [id]);
}

function broadcast(roomId, event, payload) {
    const set = subscribers.get(roomId);
    if (!set) return;
    const data = `event: ${event}\ndata: ${JSON.stringify(payload)}\n\n`;
    for (const res of set) res.write(data);
}

async function postSystem(roomId, text) {
    const id = (await db().run(
        `INSERT INTO room_messages (room_id, user_id, text, kind, created_at) VALUES (?, NULL, ?, 'system', ?)`,
        [roomId, text, nowIso()]
    )).lastID;
    const msg = serializeMessage(await fetchMessage(id));
    broadcast(roomId, 'message', msg);
    return msg;
}

// ---------- Обработчики: комнаты ----------

const roomDto = (r) => ({
    id: r.id,
    name: r.name,
    description: r.description || '',
    has_password: !!r.password_hash,
    created_by: r.created_by_name || null,
    created_at: r.created_at,
});

async function listRooms(req, res) {
    const rows = await db().all(`
        SELECT r.id, r.name, r.description, r.password_hash, r.created_at, u.username AS created_by_name
        FROM rooms r
        LEFT JOIN users u ON u.id = r.created_by
        ORDER BY r.id ASC`);
    res.json(rows.map(roomDto));
}

async function createRoom(req, res) {
    const me = await requireUser(req);
    if (!CREATE_ROOM_ROLES.includes(roleOf(me.role))) {
        throw new HttpError(403, 'Создавать комнаты могут модераторы и выше');
    }
    const body = req.body || {};
    const name = cleanLine(body.name);
    const description = cleanLine(body.description);
    const password = typeof body.password === 'string' ? body.password : '';

    if (name.length < 2 || name.length > 40) throw new HttpError(400, 'Название: от 2 до 40 символов');
    if (description.length > 200) throw new HttpError(400, 'Описание: до 200 символов');
    if (password && (password.length < 4 || password.length > 64)) {
        throw new HttpError(400, 'Пароль: от 4 до 64 символов');
    }
    if (password && Buffer.byteLength(password, 'utf8') > 72) {
        throw new HttpError(400, 'Пароль слишком длинный');
    }

    const hash = password ? await bcrypt.hash(password, 10) : null;
    const r = await db().run(
        'INSERT INTO rooms (name, description, password_hash, created_by, created_at) VALUES (?, ?, ?, ?, ?)',
        [name, description || null, hash, me.id, nowIso()]
    );
    res.status(201).json({ id: r.lastID });
}

async function getRoom(req, res) {
    const room = await roomOr404(req.params.id);
    const locked = !(await hasAccess(room, sessionUserId(req)));
    res.json({
        id: room.id,
        name: room.name,
        description: room.description || '',
        has_password: !!room.password_hash,
        locked,
    });
}

async function unlockRoom(req, res) {
    const me = await requireUser(req);
    const room = await roomOr404(req.params.id);
    if (!room.password_hash) return res.json({ ok: true });

    const key = `${me.id}:${room.id}`;
    let attempt = unlockAttempts.get(key);
    if (!attempt || attempt.resetAt <= Date.now()) {
        attempt = { count: 0, resetAt: Date.now() + UNLOCK_WINDOW_MS };
        unlockAttempts.set(key, attempt);
    }
    if (attempt.count >= UNLOCK_MAX_ATTEMPTS) {
        throw new HttpError(429, 'Слишком много попыток, подожди 15 минут');
    }

    const ok = await bcrypt.compare(String((req.body || {}).password || ''), room.password_hash);
    if (!ok) {
        attempt.count += 1;
        throw new HttpError(403, 'Неверный пароль');
    }
    unlockAttempts.delete(key);
    await db().run(
        'INSERT OR IGNORE INTO room_members (room_id, user_id, joined_at) VALUES (?, ?, ?)',
        [room.id, me.id, nowIso()]
    );
    res.json({ ok: true });
}

// ---------- Обработчики: сообщения ----------

async function getMessages(req, res) {
    const room = await roomOr404(req.params.id);
    await assertAccess(room, sessionUserId(req));
    const before = parseId(req.query.before);
    const rows = before
        ? await db().all(MSG_SELECT + ' AND m.room_id = ? AND m.id < ? ORDER BY m.id DESC LIMIT ?', [room.id, before, HISTORY_LIMIT])
        : await db().all(MSG_SELECT + ' AND m.room_id = ? ORDER BY m.id DESC LIMIT ?', [room.id, HISTORY_LIMIT]);
    res.json(rows.map(serializeMessage).reverse());
}

async function postMessage(req, res) {
    const me = await requireUser(req);
    const room = await roomOr404(req.params.id);
    await assertAccess(room, me.id);

    if (me.chat_muted_until && new Date(me.chat_muted_until) > new Date()) {
        throw new HttpError(403, `Ты в муте до ${new Date(me.chat_muted_until).toLocaleString('ru-RU')}`);
    }

    let text = cleanLine((req.body || {}).text);
    if (!text) throw new HttpError(400, 'Пустое сообщение');
    if (text.length > MESSAGE_MAX_LENGTH) throw new HttpError(400, `Максимум ${MESSAGE_MAX_LENGTH} символов`);

    const last = lastMessageAt.get(me.id) || 0;
    if (Date.now() - last < MESSAGE_COOLDOWN_MS) throw new HttpError(429, 'Слишком часто, подожди секунду');
    lastMessageAt.set(me.id, Date.now());

    // Эффект текста: "/4602 привет" -> "привет" с переливом
    let effect = null;
    const fx = text.match(/^\/(\d{4})(?:\s+(.*))?$/);
    if (fx && EFFECT_CODES[fx[1]]) {
        effect = EFFECT_CODES[fx[1]];
        text = (fx[2] || '').trim();
        if (!text) throw new HttpError(400, `Напиши текст после кода /${fx[1]}`);
    } else if (text.startsWith('/')) {
        const msg = await runCommand(me, room, text);
        return res.status(201).json(msg);
    }

    text = stripExternalLinks(text);
    const refs = await resolveRefs(text);
    const id = (await db().run(
        `INSERT INTO room_messages (room_id, user_id, text, kind, created_at, mentions, footages, effect)
         VALUES (?, ?, ?, 'user', ?, ?, ?, ?)`,
        [
            room.id,
            me.id,
            text,
            nowIso(),
            JSON.stringify(refs.mentions.map((m) => m.username)),
            JSON.stringify(refs.footages),
            effect,
        ]
    )).lastID;
    const msg = serializeMessage(await fetchMessage(id));
    broadcast(room.id, 'message', msg);
    await notifyMentions(room, me, msg, refs.mentions);
    res.status(201).json(msg);
}

// Мут из меню по клику на сообщение
async function muteEndpoint(req, res) {
    const me = await requireUser(req);
    const room = await roomOr404(req.params.id);
    await assertAccess(room, me.id);
    const body = req.body || {};
    const minutes = Number(body.minutes);
    const text = await setMute(me, body.username, minutes);
    const message = await postSystem(room.id, text);
    res.json({ ok: true, message });
}

async function deleteMessage(req, res) {
    await requireModerator(req);
    const id = parseId(req.params.msgId);
    const row = id && await db().get(
        'SELECT id, room_id FROM room_messages WHERE id = ? AND deleted_at IS NULL',
        [id]
    );
    if (!row) throw new HttpError(404, 'Сообщение не найдено');
    await db().run('UPDATE room_messages SET deleted_at = ? WHERE id = ?', [nowIso(), id]);
    broadcast(row.room_id, 'delete', { id });
    res.json({ ok: true });
}

// SSE: живые сообщения без опроса сервера
async function stream(req, res) {
    const room = await roomOr404(req.params.id);
    await assertAccess(room, sessionUserId(req));

    res.set({
        'Content-Type': 'text/event-stream',
        'Cache-Control': 'no-cache',
        Connection: 'keep-alive',
        'X-Accel-Buffering': 'no',
    });
    res.flushHeaders();
    res.write('retry: 3000\n\n');

    if (!subscribers.has(room.id)) subscribers.set(room.id, new Set());
    subscribers.get(room.id).add(res);
    const ping = setInterval(() => res.write(': ping\n\n'), 25000);

    req.on('close', () => {
        clearInterval(ping);
        const set = subscribers.get(room.id);
        if (set) {
            set.delete(res);
            if (!set.size) subscribers.delete(room.id);
        }
    });
}

// ---------- Футажи: API и страница ----------

async function listFootages(req, res) {
    const q = String(req.query.q || '').trim().toLowerCase();
    const list = await scanFootage();
    const found = list
        .filter((f) => !q || f.title.toLowerCase().includes(q) || f.base.toLowerCase().includes(q))
        .slice(0, 50);
    res.json(found.map(footageDto));
}

async function getFootage(req, res) {
    const id = String(req.params.id || '');
    const t = id.toLowerCase();
    const list = await scanFootage();
    const f = list.find((x) => x.base === id)
        || list.find((x) => x.slug.toLowerCase() === t || x.baseSlug.toLowerCase() === t);
    if (!f) throw new HttpError(404, 'Футаж не найден');
    res.json(footageDto(f));
}

// ---------- Жалобы ----------

async function reportMessage(req, res) {
    const me = await requireUser(req);
    const msgId = parseId(req.params.msgId);
    const msg = msgId && await db().get(
        'SELECT id, room_id, user_id, kind FROM room_messages WHERE id = ? AND deleted_at IS NULL',
        [msgId]
    );
    if (!msg || msg.kind !== 'user') throw new HttpError(404, 'Сообщение не найдено');
    if (msg.user_id === me.id) throw new HttpError(400, 'Нельзя пожаловаться на себя');

    const room = await roomOr404(msg.room_id);
    await assertAccess(room, me.id);

    const reason = cleanLine((req.body || {}).reason);
    if (reason.length < 3 || reason.length > 200) throw new HttpError(400, 'Опиши причину: от 3 до 200 символов');

    const since = new Date(Date.now() - REPORT_WINDOW_MS).toISOString();
    const recent = await db().get(
        'SELECT COUNT(*) AS c FROM room_reports WHERE reporter_id = ? AND created_at > ?',
        [me.id, since]
    );
    // Спамеров не предупреждаем: жалоба принимается, но не попадает модерации
    const suppressed = (me.report_false_count || 0) >= FALSE_REPORT_LIMIT || recent.c >= REPORT_WINDOW_LIMIT;

    await db().run(
        `INSERT OR IGNORE INTO room_reports (message_id, reporter_id, reason, status, created_at)
         VALUES (?, ?, ?, ?, ?)`,
        [msg.id, me.id, reason, suppressed ? 'suppressed' : 'pending', nowIso()]
    );
    res.json({ ok: true });
}

async function listReports(req, res) {
    await requireModerator(req);
    const status = ['pending', 'upheld', 'dismissed'].includes(req.query.status) ? req.query.status : 'pending';
    const rows = await db().all(`
        SELECT r.id, r.reason, r.status, r.created_at,
               m.id AS message_id, m.text, m.room_id,
               mu.username AS author, ru.username AS reporter
        FROM room_reports r
        JOIN room_messages m ON m.id = r.message_id
        LEFT JOIN users mu ON mu.id = m.user_id
        LEFT JOIN users ru ON ru.id = r.reporter_id
        WHERE r.status = ?
        ORDER BY r.id DESC
        LIMIT 100`, [status]);
    res.json(rows);
}

async function resolveReport(req, res) {
    const me = await requireModerator(req);
    const id = parseId(req.params.reportId);
    const rep = id && await db().get(
        'SELECT id, message_id, reporter_id, status FROM room_reports WHERE id = ?',
        [id]
    );
    if (!rep) throw new HttpError(404, 'Жалоба не найдена');
    if (rep.status !== 'pending') throw new HttpError(400, 'Жалоба уже обработана');

    const action = (req.body || {}).action;
    if (action === 'uphold') {
        const msg = await db().get('SELECT room_id FROM room_messages WHERE id = ?', [rep.message_id]);
        await db().run(
            'UPDATE room_messages SET deleted_at = ? WHERE id = ? AND deleted_at IS NULL',
            [nowIso(), rep.message_id]
        );
        await db().run(
            `UPDATE room_reports SET status = 'upheld', reviewed_by = ?, reviewed_at = ? WHERE id = ?`,
            [me.id, nowIso(), id]
        );
        if (msg) broadcast(msg.room_id, 'delete', { id: rep.message_id });
    } else if (action === 'dismiss') {
        await db().run(
            `UPDATE room_reports SET status = 'dismissed', reviewed_by = ?, reviewed_at = ? WHERE id = ?`,
            [me.id, nowIso(), id]
        );
        if (rep.reporter_id) {
            await db().run(
                'UPDATE users SET report_false_count = COALESCE(report_false_count, 0) + 1 WHERE id = ?',
                [rep.reporter_id]
            );
        }
    } else {
        throw new HttpError(400, 'Некорректное действие');
    }
    res.json({ ok: true });
}

// ---------- Монтирование и схема ----------

function mountRooms(app, getDb) {
    getDbRef = getDb;
    const pub = path.join(__dirname, 'public');

    // Страницы. Комнату нельзя создать через адрес: /room/N только открывает существующую.
    app.get('/rooms', (req, res) => res.sendFile(path.join(pub, 'rooms.html')));
    app.get('/room/:id', (req, res) => {
        if (!parseId(req.params.id)) return res.status(404).send('Комната не найдена');
        res.sendFile(path.join(pub, 'room.html'));
    });
    app.get('/footage/:id', (req, res) => res.sendFile(path.join(pub, 'footage.html')));

    // Порядок важен: /api/rooms/reports должен быть раньше /api/rooms/:id
    app.get('/api/rooms/reports', wrap(listReports));
    app.post('/api/rooms/reports/:reportId/resolve', wrap(resolveReport));

    app.get('/api/rooms', wrap(listRooms));
    app.post('/api/rooms', wrap(createRoom));
    app.get('/api/rooms/:id', wrap(getRoom));
    app.post('/api/rooms/:id/unlock', wrap(unlockRoom));
    app.get('/api/rooms/:id/messages', wrap(getMessages));
    app.post('/api/rooms/:id/messages', wrap(postMessage));
    app.post('/api/rooms/:id/mute', wrap(muteEndpoint));
    app.get('/api/rooms/:id/stream', wrap(stream));
    app.post('/api/rooms/messages/:msgId/report', wrap(reportMessage));
    app.delete('/api/rooms/messages/:msgId', wrap(deleteMessage));

    app.get('/api/footages', wrap(listFootages));
    app.get('/api/footage/:id', wrap(getFootage));

    app.get('/api/notifications', wrap(listNotifications));
    app.post('/api/notifications/read', wrap(markNotificationsRead));
    app.get('/api/notifications/settings', wrap(getNotifSettings));
    app.patch('/api/notifications/settings', wrap(patchNotifSettings));
    app.get('/api/notifications/stream', wrap(notifStream));

    mountGames(app, {
        getDb, HttpError, wrap, requireUser, roomOr404, assertAccess,
        sessionUserId, parseId, cleanLine, nowIso, broadcast, postSystem,
    });
}

async function addColumnIfMissing(database, table, column, definition) {
    const cols = await database.all(`PRAGMA table_info(${table})`);
    if (!cols.some((c) => c.name === column)) {
        await database.exec(`ALTER TABLE ${table} ADD COLUMN ${column} ${definition}`);
    }
}

async function initRooms(database) {
    await database.exec(`
        CREATE TABLE IF NOT EXISTS rooms (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            name TEXT NOT NULL,
            description TEXT,
            password_hash TEXT,
            created_by INTEGER REFERENCES users(id),
            created_at TEXT NOT NULL
        );
        CREATE TABLE IF NOT EXISTS room_members (
            room_id INTEGER NOT NULL REFERENCES rooms(id),
            user_id INTEGER NOT NULL REFERENCES users(id),
            joined_at TEXT NOT NULL,
            PRIMARY KEY (room_id, user_id)
        );
        CREATE TABLE IF NOT EXISTS room_messages (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            room_id INTEGER NOT NULL REFERENCES rooms(id),
            user_id INTEGER REFERENCES users(id),
            text TEXT NOT NULL,
            kind TEXT NOT NULL DEFAULT 'user',
            created_at TEXT NOT NULL,
            deleted_at TEXT
        );
        CREATE INDEX IF NOT EXISTS idx_room_messages_room ON room_messages(room_id, id);
        CREATE TABLE IF NOT EXISTS room_reports (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            message_id INTEGER NOT NULL REFERENCES room_messages(id),
            reporter_id INTEGER REFERENCES users(id),
            reason TEXT NOT NULL,
            status TEXT NOT NULL DEFAULT 'pending',
            created_at TEXT NOT NULL,
            reviewed_by INTEGER,
            reviewed_at TEXT,
            UNIQUE (message_id, reporter_id)
        );
        CREATE INDEX IF NOT EXISTS idx_room_reports_status ON room_reports(status, id);
        CREATE TABLE IF NOT EXISTS notifications (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            user_id INTEGER NOT NULL REFERENCES users(id),
            type TEXT NOT NULL,
            room_id INTEGER,
            message_id INTEGER,
            from_username TEXT,
            text TEXT,
            created_at TEXT NOT NULL,
            read_at TEXT
        );
        CREATE INDEX IF NOT EXISTS idx_notifications_user ON notifications(user_id, read_at, id);
    `);
    await addColumnIfMissing(database, 'users', 'chat_muted_until', 'TEXT');
    await addColumnIfMissing(database, 'users', 'report_false_count', 'INTEGER DEFAULT 0');
    await addColumnIfMissing(database, 'users', 'mention_notify', 'INTEGER DEFAULT 1');
    await addColumnIfMissing(database, 'room_messages', 'mentions', 'TEXT');
    await addColumnIfMissing(database, 'room_messages', 'footages', 'TEXT');
    await addColumnIfMissing(database, 'room_messages', 'effect', 'TEXT');
    await initGames(database);
}

module.exports = { mountRooms, initRooms };