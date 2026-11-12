const crypto = require('crypto');
const { OAuth2Client } = require('google-auth-library');
const { sendMail } = require('./mailer');

const FLOW_TTL = 10 * 60 * 1000;
const CODE_TTL = 5 * 60 * 1000;
const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/;
const random = () => crypto.randomBytes(32).toString('base64url');
const equal = (a, b) => {
    if (typeof a !== 'string' || typeof b !== 'string' || a.length !== b.length) return false;
    const left = Buffer.from(a), right = Buffer.from(b);
    return left.length === right.length && crypto.timingSafeEqual(left, right);
};
const save = req => new Promise((resolve, reject) => req.session.save(e => e ? reject(e) : resolve()));
const regenerate = req => new Promise((resolve, reject) => req.session.regenerate(e => e ? reject(e) : resolve()));
const fail = (res, status, code, error) => res.status(status).json({ code, error });
const banned = user => user.is_banned && (!user.banned_until || new Date(user.banned_until).getTime() > Date.now());
const digest = (code, salt) => crypto.createHash('sha256').update(salt + ':' + code).digest('hex');

function googleConfig(env = process.env) {
    try {
        const redirect = new URL(env.GOOGLE_REDIRECT_URI || '/auth/google/callback', env.SITE_URL);
        if (redirect.protocol !== 'https:' && !(redirect.protocol === 'http:' && ['localhost', '127.0.0.1', '[::1]'].includes(redirect.hostname))) return null;
        if (redirect.username || redirect.password || redirect.search || redirect.hash || !env.GOOGLE_CLIENT_ID || !env.GOOGLE_CLIENT_SECRET) return null;
        return { clientId: env.GOOGLE_CLIENT_ID, clientSecret: env.GOOGLE_CLIENT_SECRET, redirectUri: redirect.href, origin: redirect.origin };
    } catch { return null; }
}

function googlePicture(value) {
    try {
        const url = new URL(value);
        if (url.protocol !== 'https:' || url.username || url.password || url.port || url.href.length > 2048 ||
            !(url.hostname === 'googleusercontent.com' || url.hostname.endsWith('.googleusercontent.com'))) return null;
        url.hash = '';
        return url.href;
    } catch { return null; }
}

async function initGoogleAuth(db) {
    const columns = await db.all('PRAGMA table_info(users)');
    for (const [name, type] of [['google_sub', 'TEXT'], ['google_email', 'TEXT'], ['password_set', 'INTEGER NOT NULL DEFAULT 1']]) {
        if (!columns.some(c => c.name === name)) await db.exec(`ALTER TABLE users ADD COLUMN ${name} ${type}`);
    }
    await db.exec('CREATE UNIQUE INDEX IF NOT EXISTS idx_users_google_sub ON users(google_sub) WHERE google_sub IS NOT NULL');
}

function mountGoogleAuth(app, deps) {
    const { getDb, bcrypt, authLimiter, USERNAME_REGEX, RESERVED_USERNAMES, TERMS_VERSION } = deps;
    const config = googleConfig(deps.env);
    const client = config && (deps.client || new OAuth2Client(config.clientId, config.clientSecret, config.redirectUri));
    const mail = deps.sendMail || sendMail;
    const db = { get: (...a) => getDb().get(...a), all: (...a) => getDb().all(...a), run: (...a) => getDb().run(...a) };
    const now = () => Date.now();
    const fresh = pending => pending && now() - pending.authenticatedAt < FLOW_TTL;
    function trusted(req) {
        const origin = req.get('origin');
        // Browsers send Origin for these JSON writes. Non-browser clients may omit it.
        return !origin || origin === config?.origin || origin === `${req.protocol}://${req.get('host')}`;
    }
    const emailUsers = email => db.all('SELECT * FROM users WHERE lower(email) = ? LIMIT 2', [email]);
    async function signIn(req, user, sub, authenticatedAt = now()) {
        if (banned(user)) throw Object.assign(new Error('banned'), { code: 'banned' });
        await regenerate(req);
        req.session.user = {
            id: user.id, username: user.username, role: user.role,
            is_verified: !!user.is_verified, telegram_linked: !!user.telegram_id
        };
        req.session.googleAuthenticatedSub = sub;
        req.session.googleAuthenticatedAt = authenticatedAt;
        await save(req);
    }
    async function link(user, identity) {
        if (banned(user)) throw Object.assign(new Error('banned'), { code: 'banned' });
        if (user.google_sub && user.google_sub !== identity.sub) throw Object.assign(new Error('already_linked'), { code: 'already_linked' });
        const result = await db.run(
            `UPDATE users SET google_sub = ?, google_email = ?
             WHERE id = ? AND (google_sub IS NULL OR google_sub = ?)`,
            [identity.sub, identity.email, user.id, identity.sub]
        );
        if (!result.changes) throw Object.assign(new Error('already_linked'), { code: 'already_linked' });
    }
    function pendingFor(req, res, checkCsrf = false) {
        const pending = req.session.pendingGoogle;
        if (!fresh(pending)) {
            delete req.session.pendingGoogle;
            fail(res, 400, 'expired', 'Вход Google истёк. Начните заново.');
            return null;
        }
        if (checkCsrf && (!trusted(req) || !equal(req.body?.csrf, pending.csrf))) {
            fail(res, 403, 'csrf', 'Обновите страницу и повторите попытку.');
            return null;
        }
        if (req.session.user) {
            fail(res, 409, 'session_changed', 'Вы уже вошли. Привяжите Google в профиле.');
            return null;
        }
        return pending;
    }
    async function finishEmailLink(req, pending) {
        const matches = await emailUsers(pending.email);
        if (matches.length !== 1 || matches[0].id !== pending.userId) throw new Error('account_changed');
        await link(matches[0], pending);
        await db.run('UPDATE users SET email_verified = 1 WHERE id = ?', [pending.userId]);
        await signIn(req, matches[0], pending.sub, pending.authenticatedAt);
    }

    app.get('/api/auth/google/config', (req, res) => {
        res.set('Cache-Control', 'no-store').json({ enabled: !!client });
    });

    app.get('/auth/google', authLimiter, async (req, res) => {
        res.set('Cache-Control', 'no-store');
        if (!client) return res.redirect('/auth?google_error=not_configured');
        const mode = req.query.mode || 'login';
        if (!['login', 'link', 'reauth'].includes(mode)) return res.redirect('/auth?google_error=invalid_request');
        if (mode !== 'login' && !req.session.user) return res.redirect('/auth?google_error=login_required');
        if (mode === 'login' && req.session.user) return res.redirect('/profile');
        try {
            const verifier = random();
            const flow = { state: random(), nonce: random(), verifier, mode, userId: req.session.user?.id || null, createdAt: now() };
            delete req.session.pendingGoogle;
            req.session.googleFlow = flow;
            await save(req);
            const url = client.generateAuthUrl({
                scope: ['openid', 'email', 'profile'], response_type: 'code',
                access_type: 'online', prompt: 'select_account', state: flow.state, nonce: flow.nonce,
                code_challenge_method: 'S256', code_challenge: crypto.createHash('sha256').update(verifier).digest('base64url')
            });
            res.redirect(url);
        } catch { res.redirect('/auth?google_error=failed'); }
    });

    app.get('/auth/google/callback', authLimiter, async (req, res) => {
        res.set({ 'Cache-Control': 'no-store', 'Referrer-Policy': 'no-referrer' });
        const flow = req.session.googleFlow;
        if (!client || !flow || now() - flow.createdAt > FLOW_TTL || !equal(req.query.state, flow.state)) {
            return res.redirect('/auth?google_error=invalid_state');
        }
        const target = flow.mode === 'login' ? '/auth' : '/profile';
        delete req.session.googleFlow;
        try {
            await save(req); // State is one-use, including denial and failed token exchanges.
            if (req.query.error) return res.redirect(target + '?google_error=cancelled');
            if (typeof req.query.code !== 'string' || req.query.code.length > 4096) throw new Error('invalid_code');
            if ((flow.userId || null) !== (req.session.user?.id || null)) throw new Error('session_changed');
            const { tokens } = await client.getToken({ code: req.query.code, codeVerifier: flow.verifier, redirect_uri: config.redirectUri });
            if (!tokens.id_token) throw new Error('missing_id_token');
            const ticket = await client.verifyIdToken({ idToken: tokens.id_token, audience: config.clientId });
            const claims = ticket.getPayload();
            if (!claims || !equal(claims.nonce, flow.nonce) || !['accounts.google.com', 'https://accounts.google.com'].includes(claims.iss) ||
                claims.aud !== config.clientId || !Number.isFinite(claims.exp) || claims.exp * 1000 <= now() ||
                typeof claims.sub !== 'string' || !claims.sub || claims.sub.length > 255 || claims.email_verified !== true ||
                typeof claims.email !== 'string' || claims.email.length > 254 || !EMAIL_RE.test(claims.email)) throw new Error('invalid_identity');
            const identity = { sub: claims.sub, email: claims.email.trim().toLowerCase(), picture: googlePicture(claims.picture) };
            const authoritative = identity.email.endsWith('@gmail.com') || (typeof claims.hd === 'string' && !!claims.hd);
            const bySub = await db.get('SELECT * FROM users WHERE google_sub = ?', [identity.sub]);
            if (flow.mode !== 'login') {
                const user = await db.get('SELECT * FROM users WHERE id = ?', [flow.userId]);
                if (!user || banned(user)) throw Object.assign(new Error('banned'), { code: 'banned' });
                if (bySub && bySub.id !== user.id) throw Object.assign(new Error('already_linked'), { code: 'already_linked' });
                if (flow.mode === 'reauth' && user.google_sub !== identity.sub) throw Object.assign(new Error('wrong_google_account'), { code: 'wrong_google_account' });
                await link(user, identity);
                req.session.googleAuthenticatedSub = identity.sub;
                req.session.googleAuthenticatedAt = now();
                await save(req);
                return res.redirect('/profile?google=linked');
            }
            if (bySub) {
                await db.run('UPDATE users SET google_email = ? WHERE id = ?', [identity.email, bySub.id]);
                await signIn(req, bySub, identity.sub);
                return res.redirect('/');
            }
            const matches = await emailUsers(identity.email);
            if (matches.length > 1) throw Object.assign(new Error('email_conflict'), { code: 'email_conflict' });
            const existing = matches[0];
            if (existing?.google_sub) throw Object.assign(new Error('already_linked'), { code: 'already_linked' });
            if (existing && banned(existing)) throw Object.assign(new Error('banned'), { code: 'banned' });
            if (existing && authoritative) {
                await link(existing, identity);
                await db.run('UPDATE users SET email_verified = 1 WHERE id = ?', [existing.id]);
                await signIn(req, existing, identity.sub);
                return res.redirect('/');
            }
            await regenerate(req);
            req.session.pendingGoogle = {
                ...identity, kind: existing ? 'link' : 'register', userId: existing?.id || null,
                emailProven: authoritative, csrf: random(), authenticatedAt: now()
            };
            await save(req);
            res.redirect('/auth?google=setup');
        } catch (error) {
            const code = ['banned', 'already_linked', 'email_conflict', 'wrong_google_account'].includes(error.code) ? error.code : 'failed';
            res.redirect(target + '?google_error=' + code);
        }
    });

    app.get('/api/auth/google/pending', async (req, res) => {
        res.set('Cache-Control', 'no-store');
        const pending = pendingFor(req, res);
        if (!pending) return;
        res.json({ kind: pending.kind, email: pending.email, avatar_url: pending.picture, csrf: pending.csrf, requires_email_verification: !pending.emailProven });
    });

    app.post('/api/auth/google/email/start', authLimiter, async (req, res) => {
        const pending = pendingFor(req, res, true);
        if (!pending) return;
        if (pending.emailProven) return res.json({ success: true });
        if (pending.code && now() - pending.code.sentAt < 60000) return fail(res, 429, 'cooldown', 'Код уже отправлен. Подождите минуту.');
        try {
            const code = String(crypto.randomInt(100000, 1000000));
            const salt = random();
            await mail({ to: pending.email, subject: 'Подтверждение входа Google', text: `Код подтверждения: ${code}\nКод действует 5 минут. Если вы не входили на сайт, проигнорируйте письмо.` });
            pending.code = { hash: digest(code, salt), salt, sentAt: now(), attempts: 0 };
            await save(req);
            res.json({ success: true });
        } catch { fail(res, 500, 'send_failed', 'Не удалось отправить код. Попробуйте позже.'); }
    });

    app.post('/api/auth/google/email/confirm', authLimiter, async (req, res) => {
        const pending = pendingFor(req, res, true);
        if (!pending) return;
        const code = pending.code;
        if (!code || now() - code.sentAt > CODE_TTL) return fail(res, 400, 'expired', 'Запросите новый код подтверждения.');
        if (code.attempts >= 5) return fail(res, 429, 'locked', 'Слишком много попыток. Запросите новый код.');
        code.attempts++;
        if (!equal(digest(String(req.body.code || ''), code.salt), code.hash)) {
            await save(req);
            return fail(res, 400, 'wrong_code', 'Неверный код.');
        }
        pending.emailProven = true;
        delete pending.code;
        try {
            if (pending.kind === 'link') {
                await finishEmailLink(req, pending);
                return res.json({ success: true, redirect: '/' });
            }
            await save(req);
            res.json({ success: true });
        } catch { fail(res, 409, 'account_changed', 'Аккаунт изменился. Начните вход Google заново.'); }
    });

    app.post('/api/auth/google/complete', authLimiter, async (req, res) => {
        const pending = pendingFor(req, res, true);
        if (!pending) return;
        if (pending.kind !== 'register' || !pending.emailProven) return fail(res, 403, 'verify_email', 'Сначала подтвердите email.');
        const username = typeof req.body.username === 'string' ? req.body.username.trim() : '';
        const password = typeof req.body.password === 'string' ? req.body.password : '';
        if (!USERNAME_REGEX.test(username) || RESERVED_USERNAMES.includes(username.toLowerCase())) return fail(res, 400, 'username', 'Логин: 3–15 символов, латиница, цифры, _ и -. Зарезервированные имена недоступны.');
        if (password && (password.length < 6 || Buffer.byteLength(password) > 72)) return fail(res, 400, 'password', 'Пароль: минимум 6 символов и не более 72 байт.');
        if (req.body.accept_terms !== true) return fail(res, 400, 'terms', 'Примите условия использования и политику конфиденциальности.');
        try {
            if (await db.get('SELECT id FROM users WHERE username = ?', [username])) return fail(res, 409, 'username_taken', 'Этот логин уже занят.');
            if ((await emailUsers(pending.email)).length) return fail(res, 409, 'email_conflict', 'Этот email уже зарегистрирован. Начните вход Google заново.');
            const hash = password ? await bcrypt.hash(password, 10) : '';
            const result = await db.run(
                `INSERT INTO users (username, password, password_set, role, email, email_verified, google_sub, google_email, avatar_url, terms_accepted_at, terms_version)
                 VALUES (?, ?, ?, 'user', ?, 1, ?, ?, ?, ?, ?)`,
                [username, hash, password ? 1 : 0, pending.email, pending.sub, pending.email,
                    req.body.use_google_avatar === true ? pending.picture : null, new Date().toISOString(), TERMS_VERSION]
            );
            const user = await db.get('SELECT * FROM users WHERE id = ?', [result.lastID]);
            await signIn(req, user, pending.sub, pending.authenticatedAt);
            res.json({ success: true, redirect: '/' });
        } catch (error) {
            if (String(error.code).startsWith('SQLITE_CONSTRAINT')) return fail(res, 409, 'taken', 'Логин, email или Google-аккаунт уже заняты. Начните заново.');
            fail(res, 500, 'server', 'Не удалось завершить регистрацию. Попробуйте войти через Google заново.');
        }
    });

    app.get('/api/profile/google', async (req, res) => {
        res.set('Cache-Control', 'no-store');
        if (!req.session.user) return fail(res, 401, 'login_required', 'Нужно войти.');
        const user = await db.get('SELECT google_sub, google_email, password_set FROM users WHERE id = ?', [req.session.user.id]);
        if (!user) return fail(res, 401, 'login_required', 'Нужно войти.');
        req.session.googleProfileCsrf ||= random();
        await save(req);
        res.json({ enabled: !!client, linked: !!user.google_sub, email: user.google_email || null, has_password: user.password_set !== 0,
            csrf: req.session.googleProfileCsrf,
            recent_google_auth: !!user.google_sub && req.session.googleAuthenticatedSub === user.google_sub && now() - (req.session.googleAuthenticatedAt || 0) < FLOW_TTL });
    });

    app.delete('/api/profile/google', authLimiter, async (req, res) => {
        if (!req.session.user) return fail(res, 401, 'login_required', 'Нужно войти.');
        if (!trusted(req) || !equal(req.body?.csrf, req.session.googleProfileCsrf)) return fail(res, 403, 'csrf', 'Обновите страницу.');
        const user = await db.get('SELECT * FROM users WHERE id = ?', [req.session.user.id]);
        if (!user || user.password_set === 0) return fail(res, 400, 'password_required', 'Сначала установите пароль, чтобы сохранить доступ к аккаунту.');
        if (typeof req.body.current_password !== 'string' || !(await bcrypt.compare(req.body.current_password, user.password))) return fail(res, 403, 'password', 'Неверный пароль.');
        await db.run('UPDATE users SET google_sub = NULL, google_email = NULL WHERE id = ?', [user.id]);
        delete req.session.googleAuthenticatedSub;
        delete req.session.googleAuthenticatedAt;
        await save(req);
        res.json({ success: true });
    });

    app.patch('/api/profile/password', authLimiter, async (req, res) => {
        if (!req.session.user) return fail(res, 401, 'login_required', 'Нужно войти.');
        if (!trusted(req)) return fail(res, 403, 'csrf', 'Обновите страницу.');
        const password = req.body?.new_password;
        if (typeof password !== 'string' || password.length < 6 || Buffer.byteLength(password) > 72) return fail(res, 400, 'password', 'Пароль: минимум 6 символов и не более 72 байт.');
        const user = await db.get('SELECT * FROM users WHERE id = ?', [req.session.user.id]);
        if (!user || banned(user)) return fail(res, 403, 'login_required', 'Войдите заново.');
        if (user.password_set === 0) {
            if (!user.google_sub || req.session.googleAuthenticatedSub !== user.google_sub || now() - (req.session.googleAuthenticatedAt || 0) >= FLOW_TTL) {
                return fail(res, 403, 'google_reauth_required', 'Сначала подтвердите вход через Google в блоке привязки аккаунта.');
            }
        } else if (typeof req.body.current_password !== 'string' || !(await bcrypt.compare(req.body.current_password, user.password))) {
            return fail(res, 403, 'current_password', 'Неверный текущий пароль.');
        }
        const hash = await bcrypt.hash(password, 10);
        await db.run('UPDATE users SET password = ?, password_set = 1 WHERE id = ?', [hash, user.id]);
        res.json({ ok: true });
    });
}

module.exports = { initGoogleAuth, mountGoogleAuth, googleConfig, googlePicture };
