const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs/promises');
const path = require('node:path');
const os = require('node:os');
const net = require('node:net');
const { spawn } = require('node:child_process');
const crypto = require('node:crypto');
const sqlite3 = require('sqlite3');
const { open } = require('sqlite');
const bcrypt = require('bcryptjs');

test('real server migrations, password login, Google-only login guard and email password recovery work together', { timeout: 30000 }, async t => {
    const root = path.resolve(__dirname, '..'), temp = await fs.mkdtemp(path.join(os.tmpdir(), 'mell-google-auth-'));
    const probe = net.createServer();
    await new Promise(resolve => probe.listen(0, '127.0.0.1', resolve));
    const port = probe.address().port;
    await new Promise(resolve => probe.close(resolve));
    for (const file of await fs.readdir(root)) if (file.endsWith('.js')) await fs.copyFile(path.join(root, file), path.join(temp, file));
    await fs.symlink(path.join(root, 'public'), path.join(temp, 'public'), 'dir');
    await fs.mkdir(path.join(temp, 'sounds'));
    let logs = '';
    const server = spawn(process.execPath, ['server.js'], { cwd: temp, env: { ...process.env, NODE_PATH: [path.join(root, 'node_modules'), process.env.NODE_PATH].filter(Boolean).join(path.delimiter), NODE_ENV: 'development', PORT: String(port), SESSION_SECRET: crypto.randomBytes(32).toString('hex'), SITE_URL: `http://127.0.0.1:${port}`, GOOGLE_CLIENT_ID: 'test-client', GOOGLE_CLIENT_SECRET: 'test-secret', GOOGLE_REDIRECT_URI: `http://127.0.0.1:${port}/auth/google/callback` }, stdio: ['ignore', 'pipe', 'pipe'] });
    server.stdout.on('data', chunk => { logs += chunk; }); server.stderr.on('data', chunk => { logs += chunk; });
    let db, sessions;
    t.after(async () => {
        if (server.exitCode === null) { server.kill('SIGTERM'); await new Promise(resolve => server.once('exit', resolve)); }
        await db?.close(); await sessions?.close(); await fs.rm(temp, { recursive: true, force: true });
    });
    let ready = false;
    for (let i = 0; i < 120; i++) {
        if (server.exitCode !== null) break;
        try { if ((await fetch(`http://127.0.0.1:${port}/api/auth/google/config`)).ok) { ready = true; break; } } catch {}
        await new Promise(resolve => setTimeout(resolve, 100));
    }
    assert(ready, logs);
    db = await open({ filename: path.join(temp, 'database.db'), driver: sqlite3.Database });
    const hash = await bcrypt.hash('ordinary-password', 4);
    await db.run('INSERT INTO users (username,password,email,email_verified) VALUES (?,?,?,1)', ['ordinary', hash, 'ordinary@gmail.com']);
    await db.run("INSERT INTO users (username,password,password_set,email,email_verified,google_sub) VALUES (?, '',0,?,1,?)", ['googleonly', 'googleonly@gmail.com', 'google-sub']);
    let cookie = '';
    async function request(url, method = 'GET', data) {
        const response = await fetch(`http://127.0.0.1:${port}` + url, { method, redirect: 'manual', headers: { ...(cookie ? { cookie } : {}), ...(data ? { 'Content-Type': 'application/json' } : {}) }, ...(data ? { body: JSON.stringify(data) } : {}) });
        if (response.headers.get('set-cookie')) cookie = response.headers.get('set-cookie').split(';')[0];
        return response;
    }
    for (const url of ['/', '/index.html', '/auth', '/auth.html', '/profile']) {
        const html = await request(url);
        assert.match(html.headers.get('cache-control'), /no-cache/);
        assert.equal(html.headers.get('cloudflare-cdn-cache-control'), 'no-store');
        const body = await html.text();
        assert.match(body, /ui\.css\?v=[0-9a-f]{12}/);
    }
    const player = await request('/music/');
    assert.equal(player.headers.get('cloudflare-cdn-cache-control'), null);
    await player.arrayBuffer();
    assert.equal((await request('/api/login', 'POST', { username: 'googleonly', password: '' })).status, 400);
    assert.equal((await request('/api/login', 'POST', { username: 'googleonly', password: 'anything' })).status, 400);
    assert.equal((await request('/api/login', 'POST', { username: 'ordinary', password: 'ordinary-password' })).status, 200);
    assert.equal((await (await request('/api/profile')).json()).has_password, true);
    assert.equal((await request('/api/profile/password', 'PATCH', { current_password: 'ordinary-password', new_password: 'changed-password' })).status, 200);
    await request('/api/logout', 'POST', {}); cookie = '';
    // Inject the server-side mail challenge instead of sending a real email in this integration test.
    assert.equal((await request('/auth/google')).status, 302);
    const signed = decodeURIComponent(cookie.slice(cookie.indexOf('=') + 1));
    const sid = signed.slice(2, signed.lastIndexOf('.'));
    sessions = await open({ filename: path.join(temp, 'sessions.db'), driver: sqlite3.Database });
    const row = await sessions.get('SELECT sess FROM sessions WHERE sid=?', [sid]);
    const state = JSON.parse(row.sess), user = await db.get('SELECT id FROM users WHERE username=?', ['googleonly']);
    const code = '123456', salt = 'test-mail-salt';
    state.pendingReset = { userId: user.id, email: 'googleonly@gmail.com', salt, codeHash: crypto.createHash('sha256').update(salt + ':' + code).digest('hex'), expiresAt: Date.now() + 60000, attempts: 0 };
    await sessions.run('UPDATE sessions SET sess=? WHERE sid=?', [JSON.stringify(state), sid]);
    const recovered = await request('/api/password/reset/confirm', 'POST', { email: 'googleonly@gmail.com', code, password: 'recovered-password' });
    assert.equal(recovered.status, 200, await recovered.text());
    assert.equal((await db.get('SELECT password_set FROM users WHERE id=?', [user.id])).password_set, 1);
    assert.equal((await request('/api/login', 'POST', { username: 'googleonly', password: 'recovered-password' })).status, 200);
    const profile = await (await request('/api/profile')).json();
    assert.equal(profile.has_password, true); assert.equal(profile.google_linked, true);
});
