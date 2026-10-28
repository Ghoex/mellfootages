// mail-auth.js — регистрация и восстановление пароля по email (код на почту через Resend).
// Вход по логину и паролю остаётся прежним (/api/login).
//
// Подключение в server.js:
//   const { mountMailAuth, initMailAuth } = require('./mail-auth');
//   mountMailAuth(app, { getDb: () => db, bcrypt, authLimiter, USERNAME_REGEX, RESERVED_USERNAMES, TERMS_VERSION });
//   // в startServer(), после initRooms:
//   await initMailAuth(db);
//
// Все ошибки отдаются как { error, code }. Фронтенд переводит по code, а не по тексту.

const crypto = require('crypto');
const { sendMail } = require('./mailer');

const CODE_TTL_MS = 10 * 60 * 1000;     // код живёт 10 минут
const RESEND_COOLDOWN_MS = 60 * 1000;   // новый код не чаще раза в минуту
const MAX_CODE_ATTEMPTS = 5;            // после 5 неверных вводов нужен новый код
const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/;

const sixDigitCode = () => String(crypto.randomInt(0, 1000000)).padStart(6, '0');
const hashCode = (code, salt) => crypto.createHash('sha256').update(`${salt}:${code}`).digest('hex');

// В сессии хранится только хэш кода, сам код нигде не лежит
function issueCode(store) {
    const code = sixDigitCode();
    const salt = crypto.randomBytes(16).toString('hex');
    Object.assign(store, {
        codeHash: hashCode(code, salt),
        salt,
        expiresAt: Date.now() + CODE_TTL_MS,
        attempts: 0,
        lastSentAt: Date.now(),
    });
    return code;
}

// 'ok' | 'wrong' | 'expired' | 'locked'
function checkCode(store, code) {
    if (!store.codeHash || Date.now() > store.expiresAt) return 'expired';
    if (store.attempts >= MAX_CODE_ATTEMPTS) return 'locked';
    store.attempts += 1;
    const given = Buffer.from(hashCode(String(code || '').trim(), store.salt));
    const expected = Buffer.from(store.codeHash);
    return crypto.timingSafeEqual(given, expected) ? 'ok' : 'wrong';
}

async function addColumnIfMissing(database, table, column, definition) {
    const cols = await database.all(`PRAGMA table_info(${table})`);
    if (!cols.some((c) => c.name === column)) {
        await database.exec(`ALTER TABLE ${table} ADD COLUMN ${column} ${definition}`);
    }
}

async function initMailAuth(database) {
    await addColumnIfMissing(database, 'users', 'email', 'TEXT');
    await addColumnIfMissing(database, 'users', 'email_verified', 'INTEGER DEFAULT 0');
    // Частичный уникальный индекс: у старых пользователей email пустой, это допустимо
    await database.exec(
        'CREATE UNIQUE INDEX IF NOT EXISTS idx_users_email ON users(email) WHERE email IS NOT NULL'
    );
}

function mountMailAuth(app, deps) {
    const { getDb, bcrypt, authLimiter, USERNAME_REGEX, RESERVED_USERNAMES, TERMS_VERSION } = deps;

    // db в server.js появляется только в startServer(), поэтому обращаемся к нему лениво
    const db = {
        get: (...a) => getDb().get(...a),
        run: (...a) => getDb().run(...a),
        all: (...a) => getDb().all(...a),
        exec: (...a) => getDb().exec(...a),
    };

    const normEmail = (v) => String(v || '').trim().toLowerCase();
    const fail = (res, status, code, error) => res.status(status).json({ error, code });
    const saveSession = (req) => new Promise((resolve, reject) =>
        req.session.save((err) => (err ? reject(err) : resolve()))
    );

    // ---------- Регистрация ----------

    app.post('/api/register/email/start', authLimiter, async (req, res) => {
        const username = String(req.body.username || '').trim();
        const email = normEmail(req.body.email);
        const password = String(req.body.password || '');

        if (!username || !email || !password) return fail(res, 400, 'fields', 'Заполните все поля!');
        if (req.body.accept_terms !== true) {
            return fail(res, 400, 'terms', 'Необходимо принять условия использования и политику конфиденциальности.');
        }
        if (!USERNAME_REGEX.test(username)) {
            return fail(res, 400, 'username', 'Логин: только латинские буквы, цифры, _ и -. От 3 до 15 символов, без пробелов.');
        }
        if (RESERVED_USERNAMES.includes(username.toLowerCase())) {
            return fail(res, 400, 'reserved', 'Этот логин зарезервирован и недоступен для регистрации.');
        }
        if (!EMAIL_RE.test(email) || email.length > 254) return fail(res, 400, 'email', 'Некорректный email.');
        if (password.length < 6) return fail(res, 400, 'password', 'Пароль минимум 6 символов');

        const prev = req.session.pendingEmailRegister;
        if (prev && prev.email === email && Date.now() - prev.lastSentAt < RESEND_COOLDOWN_MS) {
            return fail(res, 429, 'cooldown', 'Код уже отправлен. Подожди минуту.');
        }

        try {
            const takenLogin = await db.get('SELECT id FROM users WHERE username = ?', [username]);
            if (takenLogin) return fail(res, 400, 'username_taken', 'Пользователь с таким логином уже существует!');

            // Email занят: код не шлём, отвечаем так же, как при свободном адресе.
            // Владельцу адреса уходит предупреждение.
            const takenEmail = await db.get('SELECT id FROM users WHERE email = ?', [email]);
            if (takenEmail) {
                sendMail({
                    to: email,
                    subject: 'Попытка регистрации на сайте',
                    text: 'На этот адрес пытались создать аккаунт. Если это были не вы, ничего делать не нужно.',
                }).catch((e) => console.error('mail (email taken) error:', e.message));
                return res.json({ success: true, message: 'Код отправлен на почту', code: 'sent' });
            }

            const pending = {
                username,
                email,
                passwordHash: await bcrypt.hash(password, 10),
                termsAcceptedAt: new Date().toISOString(),
                lastSentAt: 0,
            };
            const code = issueCode(pending);

            await sendMail({
                to: email,
                subject: 'Код подтверждения регистрации',
                text: `Твой код подтверждения: ${code}\n\nКод действует 10 минут. Если это был не ты, просто проигнорируй письмо.`,
            });

            req.session.pendingEmailRegister = pending;
            await saveSession(req);
            res.json({ success: true, message: 'Код отправлен на почту', code: 'sent' });
        } catch (err) {
            console.error('register/email/start error:', err.message);
            fail(res, 500, 'send_failed', 'Не удалось отправить письмо. Попробуй позже.');
        }
    });

    app.post('/api/register/email/confirm', authLimiter, async (req, res) => {
        const pending = req.session.pendingEmailRegister;
        if (!pending) return fail(res, 400, 'need_start', 'Сначала запросите код регистрации.');

        const result = checkCode(pending, req.body.code);
        if (result === 'expired') {
            delete req.session.pendingEmailRegister;
            await saveSession(req);
            return fail(res, 400, 'expired', 'Код истёк. Начните регистрацию заново.');
        }
        if (result === 'locked') {
            delete req.session.pendingEmailRegister;
            await saveSession(req);
            return fail(res, 429, 'locked', 'Слишком много попыток. Начните регистрацию заново.');
        }
        if (result === 'wrong') {
            await saveSession(req);
            return fail(res, 400, 'wrong_code', 'Неверный код подтверждения.');
        }

        try {
            const takenLogin = await db.get('SELECT id FROM users WHERE username = ?', [pending.username]);
            const takenEmail = await db.get('SELECT id FROM users WHERE email = ?', [pending.email]);
            if (takenLogin || takenEmail) {
                delete req.session.pendingEmailRegister;
                await saveSession(req);
                return fail(res, 400, 'taken', 'Логин или email уже заняты. Начните регистрацию заново.');
            }

            await db.run(
                `INSERT INTO users
                    (username, password, role, email, email_verified, terms_accepted_at, terms_version)
                 VALUES (?, ?, 'user', ?, 1, ?, ?)`,
                [pending.username, pending.passwordHash, pending.email, pending.termsAcceptedAt, TERMS_VERSION]
            );

            delete req.session.pendingEmailRegister;
            await saveSession(req);
            res.json({ success: true, message: 'Регистрация успешна! Теперь войдите по логину и паролю.' });
        } catch (err) {
            console.error('register/email/confirm error:', err.message);
            fail(res, 500, 'server', 'Ошибка сервера');
        }
    });

    // ---------- Восстановление пароля ----------

    app.post('/api/password/reset/start', authLimiter, async (req, res) => {
        const email = normEmail(req.body.email);
        if (!EMAIL_RE.test(email)) return fail(res, 400, 'email', 'Некорректный email.');

        try {
            const prev = req.session.pendingReset;
            if (prev && prev.email === email && Date.now() - prev.lastSentAt < RESEND_COOLDOWN_MS) {
                return fail(res, 429, 'cooldown', 'Код уже отправлен. Подожди минуту.');
            }

            const user = await db.get('SELECT id FROM users WHERE email = ?', [email]);
            if (user) {
                const pending = { userId: user.id, email, lastSentAt: 0 };
                const code = issueCode(pending);
                await sendMail({
                    to: email,
                    subject: 'Код для сброса пароля',
                    text: `Код для сброса пароля: ${code}\n\nКод действует 10 минут. Если это был не ты, проигнорируй письмо: пароль не изменится.`,
                });
                req.session.pendingReset = pending;
                await saveSession(req);
            }
            // Ответ одинаковый, есть ли такой адрес в базе или нет
            res.json({ success: true, message: 'Если такой адрес зарегистрирован, код отправлен на почту.', code: 'sent' });
        } catch (err) {
            console.error('password/reset/start error:', err.message);
            fail(res, 500, 'send_failed', 'Не удалось отправить письмо. Попробуй позже.');
        }
    });

    app.post('/api/password/reset/confirm', authLimiter, async (req, res) => {
        const email = normEmail(req.body.email);
        const password = String(req.body.password || '');
        const pending = req.session.pendingReset;

        if (!pending || pending.email !== email) {
            return fail(res, 400, 'need_start', 'Сначала запросите код сброса.');
        }
        if (password.length < 6) return fail(res, 400, 'password', 'Пароль минимум 6 символов');

        const result = checkCode(pending, req.body.code);
        if (result === 'expired' || result === 'locked') {
            delete req.session.pendingReset;
            await saveSession(req);
            return fail(res, 400, 'expired', 'Код истёк или попытки закончились. Запросите новый код.');
        }
        if (result === 'wrong') {
            await saveSession(req);
            return fail(res, 400, 'wrong_code', 'Неверный код.');
        }

        try {
            const hash = await bcrypt.hash(password, 10);
            await db.run('UPDATE users SET password = ? WHERE id = ?', [hash, pending.userId]);
            delete req.session.pendingReset;
            await saveSession(req);
            res.json({ success: true, message: 'Пароль изменён. Теперь войдите с новым паролем.' });
        } catch (err) {
            console.error('password/reset/confirm error:', err.message);
            fail(res, 500, 'server', 'Ошибка сервера');
        }
    });
}

module.exports = { mountMailAuth, initMailAuth };