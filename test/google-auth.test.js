const test = require('node:test');
const assert = require('node:assert/strict');
const crypto = require('node:crypto');
const express = require('express');
const session = require('express-session');
const sqlite3 = require('sqlite3');
const { open } = require('sqlite');
const bcrypt = require('bcryptjs');
const { mountGoogleAuth, initGoogleAuth, googleConfig, googlePicture } = require('../google-auth');

async function fixture(t, enabled = true) {
    const db = await open({ filename: ':memory:', driver: sqlite3.Database });
    await db.exec(`CREATE TABLE users (
        id INTEGER PRIMARY KEY AUTOINCREMENT, username TEXT UNIQUE NOT NULL, password TEXT NOT NULL,
        role TEXT DEFAULT 'user', email TEXT UNIQUE, email_verified INTEGER DEFAULT 0,
        is_banned INTEGER DEFAULT 0, banned_until TEXT, is_verified INTEGER DEFAULT 0,
        telegram_id TEXT, avatar_url TEXT, terms_accepted_at TEXT, terms_version TEXT
    )`);
    await initGoogleAuth(db);
    await initGoogleAuth(db); // Restart migrations must be idempotent.
    const codes = new Map(), mail = [];
    let tokenCalls = 0;
    const client = {
        generateAuthUrl(options) { return 'https://accounts.google.com/o/oauth2/v2/auth?' + new URLSearchParams({ ...options, scope: options.scope.join(' ') }); },
        async getToken(options) {
            tokenCalls++;
            const entry = codes.get(options.code);
            assert(entry, 'unknown authorization code');
            assert.equal(crypto.createHash('sha256').update(options.codeVerifier).digest('base64url'), entry.challenge);
            assert.equal(options.redirect_uri, 'https://example.com/auth/google/callback');
            return { tokens: { id_token: options.code, access_token: 'must-not-persist', refresh_token: 'must-not-persist' } };
        },
        async verifyIdToken({ idToken, audience }) {
            assert.equal(audience, 'test-client');
            const code = codes.get(idToken);
            if (code.badSignature) throw new Error('invalid signature');
            return { getPayload: () => code.claims };
        }
    };
    const app = express();
    app.use(express.json());
    app.use(session({ secret: crypto.randomBytes(32).toString('hex'), resave: false, saveUninitialized: false, cookie: { httpOnly: true, sameSite: 'lax' } }));
    app.get('/test/login/:id', async (req, res) => {
        const user = await db.get('SELECT * FROM users WHERE id = ?', [req.params.id]);
        req.session.user = { id: user.id, username: user.username, role: user.role };
        res.json({ ok: true });
    });
    app.post('/test/expire/:field', (req, res) => {
        if (req.params.field === 'flow') req.session.googleFlow.createdAt = 0;
        if (req.params.field === 'pending') req.session.pendingGoogle.authenticatedAt = 0;
        if (req.params.field === 'auth') req.session.googleAuthenticatedAt = 0;
        res.json({ ok: true });
    });
    app.get('/test/session', (req, res) => res.json({ user: req.session.user || null, keys: Object.keys(req.session) }));
    mountGoogleAuth(app, {
        getDb: () => db, bcrypt, authLimiter: (req, res, next) => next(),
        USERNAME_REGEX: /^[a-zA-Z0-9_-]{3,15}$/, RESERVED_USERNAMES: ['admin', 'root'], TERMS_VERSION: 'test-terms', client,
        env: enabled ? { GOOGLE_CLIENT_ID: 'test-client', GOOGLE_CLIENT_SECRET: 'test-secret', SITE_URL: 'https://example.com' } : {},
        sendMail: async message => mail.push(message)
    });
    const server = app.listen(0, '127.0.0.1');
    await new Promise(resolve => server.once('listening', resolve));
    const base = 'http://127.0.0.1:' + server.address().port;
    t.after(async () => { await new Promise(resolve => server.close(resolve)); await db.close(); });
    function browser() {
        let cookie = '';
        return {
            get cookie() { return cookie; },
            async request(path, method = 'GET', body, origin) {
                const response = await fetch(base + path, { method, redirect: 'manual', headers: {
                    ...(cookie ? { cookie } : {}), ...(body ? { 'Content-Type': 'application/json' } : {}), ...(origin ? { origin } : {})
                }, ...(body ? { body: JSON.stringify(body) } : {}) });
                if (response.headers.get('set-cookie')) cookie = response.headers.get('set-cookie').split(';')[0];
                return response;
            },
            async json(path, method = 'GET', body, origin) { const r = await this.request(path, method, body, origin); return { status: r.status, body: await r.json() }; }
        };
    }
    async function user(username, email, extra = {}) {
        const result = await db.run('INSERT INTO users (username,password,email,email_verified) VALUES (?,?,?,1)', [username, await bcrypt.hash('old-password', 4), email]);
        for (const [field, value] of Object.entries(extra)) await db.run(`UPDATE users SET ${field} = ? WHERE id = ?`, [value, result.lastID]);
        return result.lastID;
    }
    async function flow(browser, claims = {}, mode = 'login', badSignature = false) {
        const response = await browser.request('/auth/google?mode=' + mode);
        assert.equal(response.status, 302);
        const url = new URL(response.headers.get('location'));
        assert.equal(url.origin, 'https://accounts.google.com');
        assert.equal(url.searchParams.get('code_challenge_method'), 'S256');
        assert.equal(url.searchParams.get('scope'), 'openid email profile');
        const code = crypto.randomBytes(12).toString('hex');
        codes.set(code, { badSignature, challenge: url.searchParams.get('code_challenge'), claims: {
            iss: 'https://accounts.google.com', aud: 'test-client', exp: Date.now() / 1000 + 3600,
            nonce: url.searchParams.get('nonce'), sub: 'google-1', email: 'person@gmail.com', email_verified: true,
            picture: 'https://lh3.googleusercontent.com/photo', ...claims
        } });
        return '/auth/google/callback?' + new URLSearchParams({ state: url.searchParams.get('state'), code });
    }
    async function callback(browser, claims, mode, badSignature) {
        return browser.request(await flow(browser, claims, mode, badSignature));
    }
    async function pending(browser, claims) {
        assert.equal((await callback(browser, claims)).headers.get('location'), '/auth?google=setup');
        return (await browser.json('/api/auth/google/pending')).body;
    }
    return { db, browser, user, flow, callback, pending, mail, tokenCalls: () => tokenCalls };
}

test('configuration requires server credentials and an exact HTTPS or localhost redirect; photos only use Google hosts', () => {
    assert.equal(googleConfig({}), null);
    assert.equal(googleConfig({ GOOGLE_CLIENT_ID: 'x', GOOGLE_CLIENT_SECRET: 'y', SITE_URL: 'http://example.com' }), null);
    assert.equal(googleConfig({ GOOGLE_CLIENT_ID: 'x', GOOGLE_CLIENT_SECRET: 'y', GOOGLE_REDIRECT_URI: 'http://localhost:3000/auth/google/callback' }).redirectUri, 'http://localhost:3000/auth/google/callback');
    for (const picture of ['javascript:alert(1)', 'https://evilgoogleusercontent.com/a', 'http://lh3.googleusercontent.com/a', 'https://evil.example/a', 'https://user:pass@lh3.googleusercontent.com/a']) assert.equal(googlePicture(picture), null);
    assert.equal(googlePicture('https://lh3.googleusercontent.com/photo'), 'https://lh3.googleusercontent.com/photo');
});

test('verified Gmail matches an existing email case-insensitively, links without creating another user and regenerates the session', async t => {
    const f = await fixture(t), b = f.browser();
    const id = await f.user('person', 'Person@Gmail.com');
    const url = await f.flow(b), before = b.cookie;
    assert.equal((await b.request(url)).headers.get('location'), '/');
    assert.notEqual(b.cookie, before);
    const stored = await f.db.get('SELECT * FROM users WHERE id=?', [id]);
    assert.equal(stored.google_sub, 'google-1'); assert.equal(stored.password_set, 1);
    assert.equal((await f.db.get('SELECT count(*) AS n FROM users')).n, 1);
    const session = (await b.json('/test/session')).body;
    assert.equal(session.user.id, id);
    assert(!session.keys.some(k => /token|pending|flow/i.test(k)));
    assert.equal((await b.request(url)).headers.get('location'), '/auth?google_error=invalid_state');
});

test('Workspace email is authoritative, and linked subject remains stable when Google email changes', async t => {
    const f = await fixture(t), id = await f.user('member', 'member@company.test');
    const b = f.browser();
    assert.equal((await f.callback(b, { email: 'member@company.test', hd: 'company.test' })).headers.get('location'), '/');
    const next = f.browser();
    assert.equal((await f.callback(next, { email: 'new@gmail.com' })).headers.get('location'), '/');
    assert.equal((await next.json('/test/session')).body.user.id, id);
    assert.equal((await f.db.get('SELECT email FROM users WHERE id=?', [id])).email, 'member@company.test');
});

test('invalid state (including unicode), expired state and provider denial do not exchange tokens or log in', async t => {
    const f = await fixture(t), b = f.browser();
    const url = await f.flow(b);
    assert.equal((await b.request(url.replace(/state=[^&]+/, 'state=' + encodeURIComponent('я'.repeat(43))))).headers.get('location'), '/auth?google_error=invalid_state');
    await b.json('/test/expire/flow', 'POST', {});
    assert.equal((await b.request(url)).headers.get('location'), '/auth?google_error=invalid_state');
    const denied = await f.flow(b);
    assert.equal((await b.request(denied + '&error=access_denied')).headers.get('location'), '/auth?google_error=cancelled');
    assert.equal(f.tokenCalls(), 0);
    assert.equal((await b.json('/test/session')).body.user, null);
});

test('invalid signature, nonce, audience, issuer, expiry or unverified email cannot create or link accounts', async t => {
    const f = await fixture(t); await f.user('person', 'person@gmail.com');
    for (const claims of [{ nonce: 'wrong' }, { aud: 'another-client' }, { iss: 'https://evil.test' }, { exp: 1 }, { email_verified: false }, { sub: '' }]) {
        const b = f.browser(); assert.equal((await f.callback(b, claims)).headers.get('location'), '/auth?google_error=failed');
        assert.equal((await b.json('/test/session')).body.user, null);
    }
    assert.equal((await f.callback(f.browser(), {}, 'login', true)).headers.get('location'), '/auth?google_error=failed');
    assert.equal((await f.db.get('SELECT google_sub FROM users')).google_sub, null);
});

test('banned accounts cannot use Google sign-in and conflicting Google links cannot be overwritten', async t => {
    const f = await fixture(t); const id = await f.user('person', 'person@gmail.com', { is_banned: 1 });
    assert.equal((await f.callback(f.browser())).headers.get('location'), '/auth?google_error=banned');
    await f.db.run('UPDATE users SET is_banned=0,google_sub=? WHERE id=?', ['different-google', id]);
    assert.equal((await f.callback(f.browser())).headers.get('location'), '/auth?google_error=already_linked');
    assert.equal((await f.db.get('SELECT google_sub FROM users WHERE id=?', [id])).google_sub, 'different-google');
});

test('new Google account requires username and terms, allows optional password and opt-in Google avatar', async t => {
    const f = await fixture(t), b = f.browser(), info = await f.pending(b);
    const payload = { csrf: info.csrf, username: 'newuser', accept_terms: true, use_google_avatar: true };
    assert.equal((await b.json('/api/auth/google/complete', 'POST', { ...payload, csrf: 'bad' })).status, 403);
    assert.equal((await b.json('/api/auth/google/complete', 'POST', payload, 'https://evil.example')).status, 403);
    assert.equal((await b.json('/api/auth/google/complete', 'POST', { ...payload, accept_terms: false })).status, 400);
    assert.equal((await b.json('/api/auth/google/complete', 'POST', { ...payload, username: 'root' })).status, 400);
    assert.equal((await b.json('/api/auth/google/complete', 'POST', { ...payload, password: 'short' })).status, 400);
    assert.equal((await b.json('/api/auth/google/complete', 'POST', payload)).status, 200);
    const user = await f.db.get('SELECT * FROM users');
    assert.equal(user.password_set, 0); assert.equal(user.password, '');
    assert.equal(user.email_verified, 1); assert.equal(user.avatar_url, info.avatar_url); assert.equal(user.terms_version, 'test-terms');
    assert.equal((await b.json('/api/auth/google/complete', 'POST', payload)).status, 400);
});

test('registration hashes an optional password, leaves avatar unset when declined and rejects duplicate username', async t => {
    const f = await fixture(t), b = f.browser(); await f.user('taken', 'other@example.com');
    const info = await f.pending(b);
    const payload = { csrf: info.csrf, username: 'taken', password: 'new-password', accept_terms: true };
    assert.equal((await b.json('/api/auth/google/complete', 'POST', payload)).status, 409);
    payload.username = 'newuser';
    assert.equal((await b.json('/api/auth/google/complete', 'POST', payload)).status, 200);
    const user = await f.db.get('SELECT * FROM users WHERE username=?', ['newuser']);
    assert.equal(user.password_set, 1); assert(await bcrypt.compare(payload.password, user.password)); assert.equal(user.avatar_url, null);
});

test('expired pending registration cannot be completed', async t => {
    const f = await fixture(t), b = f.browser(), info = await f.pending(b);
    await b.json('/test/expire/pending', 'POST', {});
    assert.equal((await b.json('/api/auth/google/complete', 'POST', { csrf: info.csrf, username: 'testuser', accept_terms: true })).status, 400);
    assert.equal((await f.db.get('SELECT count(*) AS n FROM users')).n, 0);
});

test('third-party email is not auto-linked until an emailed code proves ownership', async t => {
    const f = await fixture(t), b = f.browser(); const id = await f.user('external', 'person@external.test');
    const info = await f.pending(b, { email: 'person@external.test' });
    assert.equal(info.kind, 'link'); assert.equal(info.requires_email_verification, true);
    assert.equal((await b.json('/test/session')).body.user, null);
    assert.equal((await b.json('/api/auth/google/email/start', 'POST', { csrf: info.csrf })).status, 200);
    assert.equal((await b.json('/api/auth/google/email/start', 'POST', { csrf: info.csrf })).status, 429);
    assert.equal((await b.json('/api/auth/google/email/confirm', 'POST', { csrf: info.csrf, code: 'wrong' })).status, 400);
    const code = f.mail[0].text.match(/\d{6}/)[0];
    assert.equal((await b.json('/api/auth/google/email/confirm', 'POST', { csrf: info.csrf, code })).status, 200);
    assert.equal((await b.json('/test/session')).body.user.id, id);
});

test('new third-party email registration requires its email code, with a five-attempt limit', async t => {
    const f = await fixture(t), b = f.browser(), info = await f.pending(b, { email: 'person@external.test' });
    assert.equal((await b.json('/api/auth/google/complete', 'POST', { csrf: info.csrf, username: 'testuser', accept_terms: true })).status, 403);
    await b.json('/api/auth/google/email/start', 'POST', { csrf: info.csrf });
    for (let i = 0; i < 5; i++) assert.equal((await b.json('/api/auth/google/email/confirm', 'POST', { csrf: info.csrf, code: 'bad' })).status, 400);
    assert.equal((await b.json('/api/auth/google/email/confirm', 'POST', { csrf: info.csrf, code: f.mail[0].text.match(/\d{6}/)[0] })).status, 429);
});

test('manual profile linking retains site email, refuses a Google identity owned by another profile, and requires matching session', async t => {
    const f = await fixture(t), b = f.browser(), id = await f.user('olduser', 'site@example.com');
    const otherId = await f.user('other', 'other@example.com', { google_sub: 'already-owned' });
    await b.request('/test/login/' + id);
    assert.equal((await f.callback(b, { sub: 'already-owned' }, 'link')).headers.get('location'), '/profile?google_error=already_linked');
    assert.equal((await f.callback(b, { sub: 'new-sub', email: 'another@gmail.com' }, 'link')).headers.get('location'), '/profile?google=linked');
    assert.equal((await f.db.get('SELECT email FROM users WHERE id=?', [id])).email, 'site@example.com');
    const next = f.browser(); await next.request('/test/login/' + otherId);
    const url = await f.flow(next, {}, 'link'); await next.request('/test/login/' + id);
    assert.equal((await next.request(url)).headers.get('location'), '/profile?google_error=failed');
});

test('Google-only users can set a first password after fresh Google auth; later changes require the current password', async t => {
    const f = await fixture(t), b = f.browser(), info = await f.pending(b);
    await b.json('/api/auth/google/complete', 'POST', { csrf: info.csrf, username: 'testuser', accept_terms: true });
    let status = (await b.json('/api/profile/google')).body;
    assert.equal(status.has_password, false); assert.equal(status.recent_google_auth, true);
    assert.equal((await b.json('/api/profile/google', 'DELETE', { csrf: status.csrf, current_password: 'anything' })).status, 400);
    await b.json('/test/expire/auth', 'POST', {});
    assert.equal((await b.json('/api/profile/password', 'PATCH', { new_password: 'new-password' })).body.code, 'google_reauth_required');
    assert.equal((await f.callback(b, { sub: 'wrong-google' }, 'reauth')).headers.get('location'), '/profile?google_error=wrong_google_account');
    assert.equal((await f.callback(b, {}, 'reauth')).headers.get('location'), '/profile?google=linked');
    assert.equal((await b.json('/api/profile/password', 'PATCH', { new_password: 'new-password' })).status, 200);
    assert.equal((await b.json('/api/profile/password', 'PATCH', { new_password: 'another-password' })).status, 403);
    assert.equal((await b.json('/api/profile/password', 'PATCH', { current_password: 'new-password', new_password: 'another-password' })).status, 200);
    status = (await b.json('/api/profile/google')).body;
    assert.equal(status.has_password, true);
    assert.equal((await b.json('/api/profile/google', 'DELETE', { csrf: 'bad', current_password: 'another-password' })).status, 403);
    assert.equal((await b.json('/api/profile/google', 'DELETE', { csrf: status.csrf, current_password: 'wrong' })).status, 403);
    assert.equal((await b.json('/api/profile/google', 'DELETE', { csrf: status.csrf, current_password: 'another-password' })).status, 200);
    assert.equal((await b.json('/api/profile/google')).body.linked, false);
});

test('normal password changes remain available with Google disabled, but require current password', async t => {
    const f = await fixture(t, false), b = f.browser(), id = await f.user('normal', 'person@example.com');
    assert.equal((await b.json('/api/auth/google/config')).body.enabled, false);
    assert.equal((await b.request('/auth/google')).headers.get('location'), '/auth?google_error=not_configured');
    await b.request('/test/login/' + id);
    assert.equal((await b.json('/api/profile/password', 'PATCH', { current_password: 'bad', new_password: 'new-password' })).status, 403);
    assert.equal((await b.json('/api/profile/password', 'PATCH', { current_password: 'old-password', new_password: 'new-password' })).status, 200);
});

test('verified third-party signup completes after its code, and untrusted photo URLs are not stored', async t => {
    const f = await fixture(t), b = f.browser();
    const info = await f.pending(b, { email: 'new@external.test', picture: 'https://evil.example/photo.jpg' });
    assert.equal(info.avatar_url, null);
    await b.json('/api/auth/google/email/start', 'POST', { csrf: info.csrf });
    const code = f.mail[0].text.match(/\d{6}/)[0];
    assert.equal((await b.json('/api/auth/google/email/confirm', 'POST', { csrf: info.csrf, code })).status, 200);
    assert.equal((await b.json('/api/auth/google/pending')).body.requires_email_verification, false);
    assert.equal((await b.json('/api/auth/google/complete', 'POST', { csrf: info.csrf, username: 'newverified', accept_terms: true, use_google_avatar: true })).status, 200);
    const user = await f.db.get('SELECT * FROM users');
    assert.equal(user.email_verified, 1); assert.equal(user.avatar_url, null);
});

test('ambiguous legacy email matches and a Google identity claimed during signup do not merge users', async t => {
    const f = await fixture(t);
    await f.user('first', 'person@gmail.com'); await f.user('second', 'Person@Gmail.com');
    assert.equal((await f.callback(f.browser())).headers.get('location'), '/auth?google_error=email_conflict');
    const b = f.browser(), info = await f.pending(b, { email: 'new@gmail.com' });
    await f.user('claimed', 'other@gmail.com', { google_sub: 'google-1' });
    assert.equal((await b.json('/api/auth/google/complete', 'POST', { csrf: info.csrf, username: 'newperson', accept_terms: true })).status, 409);
    assert.equal((await f.db.get('SELECT count(*) AS n FROM users WHERE username=?', ['newperson'])).n, 0);
});
