// rooms-games.js — игры в комнатах: крестики-нолики (только с разрешения) и «угадай слово».
// Подключение — см. инструкцию: mountGames() внутри mountRooms(), initGames() внутри initRooms().

const WORD_MAX_WRONG = 6;
const WIN_LINES = [
    [0, 1, 2], [3, 4, 5], [6, 7, 8],
    [0, 3, 6], [1, 4, 7], [2, 5, 8],
    [0, 4, 8], [2, 4, 6],
];

async function initGames(database) {
    await database.exec(`
        CREATE TABLE IF NOT EXISTS game_grants (
            owner_id INTEGER NOT NULL REFERENCES users(id),
            grantee_id INTEGER NOT NULL REFERENCES users(id),
            created_at TEXT NOT NULL,
            PRIMARY KEY (owner_id, grantee_id)
        );
        CREATE TABLE IF NOT EXISTS games (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            room_id INTEGER NOT NULL REFERENCES rooms(id),
            type TEXT NOT NULL,
            host_id INTEGER NOT NULL REFERENCES users(id),
            status TEXT NOT NULL,
            data TEXT NOT NULL,
            secret TEXT,
            created_at TEXT NOT NULL,
            updated_at TEXT NOT NULL
        );
        CREATE INDEX IF NOT EXISTS idx_games_room ON games(room_id, id);
    `);
}

// c — зависимости из rooms.js: getDb, HttpError, wrap, requireUser, roomOr404,
// assertAccess, sessionUserId, parseId, cleanLine, nowIso, broadcast, postSystem
function mountGames(app, c) {
    const { HttpError, wrap } = c;
    const db = () => c.getDb();
    const pl = (u) => ({ id: u.id, username: u.username });

    const findUser = (name) => db().get(
        'SELECT id, username FROM users WHERE username = ? COLLATE NOCASE',
        [c.cleanLine(name)]
    );

    const isGranted = async (ownerId, granteeId) => !!(await db().get(
        'SELECT 1 AS ok FROM game_grants WHERE owner_id = ? AND grantee_id = ?',
        [ownerId, granteeId]
    ));

    const loadGame = async (rawId) => {
        const id = c.parseId(rawId);
        const g = id && await db().get('SELECT * FROM games WHERE id = ?', [id]);
        if (!g) throw new HttpError(404, 'Игра не найдена');
        return g;
    };

    const canGuess = (uid, d) => uid !== d.host.id && (d.open || d.allowed.some((a) => a.id === uid));

    // Секретное слово уходит клиенту только после окончания игры
    function toDto(g) {
        const d = JSON.parse(g.data);
        const base = { id: g.id, room_id: g.room_id, type: g.type, status: g.status, host: d.host };
        if (g.type === 'ttt') {
            return { ...base, x: d.x, o: d.o, board: d.board, turn: d.turn, winner: d.winner, line: d.line };
        }
        return {
            ...base,
            open: d.open,
            allowed: d.allowed,
            letters: d.letters,
            wrong_letters: d.wrong_letters,
            wrong: d.wrong,
            max_wrong: WORD_MAX_WRONG,
            solved_by: d.solved_by,
            mask: [...g.secret].map((ch) => (d.letters.includes(ch) ? ch : '_')).join(' '),
            word: g.status === 'finished' ? g.secret : null,
        };
    }

    async function emitById(id) {
        const row = await db().get('SELECT * FROM games WHERE id = ?', [id]);
        const dto = toDto(row);
        c.broadcast(row.room_id, 'game', dto);
        return dto;
    }

    async function save(g, d, status) {
        await db().run(
            'UPDATE games SET data = ?, status = ?, updated_at = ? WHERE id = ?',
            [JSON.stringify(d), status, c.nowIso(), g.id]
        );
        return emitById(g.id);
    }

    // ---------- Обработчики ----------

    async function listGames(req, res) {
        const room = await c.roomOr404(req.params.id);
        await c.assertAccess(room, c.sessionUserId(req));
        const rows = await db().all(
            'SELECT * FROM games WHERE room_id = ? ORDER BY id DESC LIMIT 5',
            [room.id]
        );
        res.json(rows.map(toDto).reverse());
    }

    async function createGame(req, res) {
        const me = await c.requireUser(req);
        const room = await c.roomOr404(req.params.id);
        await c.assertAccess(room, me.id);
        const body = req.body || {};

        const busy = await db().get(
            "SELECT id FROM games WHERE room_id = ? AND status IN ('pending','active')",
            [room.id]
        );
        if (busy) throw new HttpError(400, 'В комнате уже идёт игра. Дождитесь её окончания или отмените её.');

        const now = c.nowIso();

        // Крестики-нолики: только если соперник разрешил тебе играть с ним
        if (body.type === 'ttt') {
            const opp = await findUser(body.opponent);
            if (!opp) throw new HttpError(404, 'Игрок не найден');
            if (opp.id === me.id) throw new HttpError(400, 'Нельзя играть с самим собой');
            await c.assertAccess(room, opp.id);
            if (!(await isGranted(opp.id, me.id))) {
                throw new HttpError(403, `@${opp.username} не разрешил тебе играть с ним`);
            }

            const data = {
                host: pl(me), x: pl(me), o: pl(opp),
                board: Array(9).fill(null), turn: 'x', winner: null, line: null,
            };
            const id = (await db().run(
                `INSERT INTO games (room_id, type, host_id, status, data, secret, created_at, updated_at)
                 VALUES (?, 'ttt', ?, 'pending', ?, NULL, ?, ?)`,
                [room.id, me.id, JSON.stringify(data), now, now]
            )).lastID;
            await c.postSystem(room.id, `${me.username} предложил @${opp.username} сыграть в крестики-нолики`);
            return res.status(201).json(await emitById(id));
        }

        // Угадай слово: ведущий сам выбирает, кто угадывает (приглашённые или все)
        if (body.type === 'word') {
            const word = String(body.word || '').trim().toLowerCase();
            if (!/^\p{L}{2,20}$/u.test(word)) throw new HttpError(400, 'Слово: от 2 до 20 букв, без пробелов');

            const raw = Array.isArray(body.invited) ? body.invited : String(body.invited || '').split(',');
            const names = [...new Set(raw.map((s) => String(s).trim()).filter(Boolean))].slice(0, 10);

            const allowed = [];
            for (const name of names) {
                const u = await findUser(name);
                if (!u) throw new HttpError(404, `Нет игрока ${name}`);
                if (u.id === me.id) continue;
                await c.assertAccess(room, u.id);
                allowed.push(pl(u));
            }
            const open = !!body.open;
            if (!open && !allowed.length) {
                throw new HttpError(400, 'Пригласи хотя бы одного игрока или открой игру для всех');
            }

            const data = { host: pl(me), open, allowed, letters: [], wrong_letters: [], wrong: 0, solved_by: null };
            const id = (await db().run(
                `INSERT INTO games (room_id, type, host_id, status, data, secret, created_at, updated_at)
                 VALUES (?, 'word', ?, 'active', ?, ?, ?, ?)`,
                [room.id, me.id, JSON.stringify(data), word, now, now]
            )).lastID;
            await c.postSystem(room.id, `${me.username} загадал слово — угадывайте в игре «Угадай слово»`);
            return res.status(201).json(await emitById(id));
        }

        throw new HttpError(400, 'Неизвестный тип игры');
    }

    // Разрешение: owner разрешает grantee вызывать себя на крестики-нолики
    async function setGrant(req, res) {
        const me = await c.requireUser(req);
        const body = req.body || {};
        const u = await findUser(body.username);
        if (!u) throw new HttpError(404, 'Пользователь не найден');
        if (u.id === me.id) throw new HttpError(400, 'Нельзя выдать разрешение себе');

        if (body.allow) {
            await db().run(
                'INSERT OR IGNORE INTO game_grants (owner_id, grantee_id, created_at) VALUES (?, ?, ?)',
                [me.id, u.id, c.nowIso()]
            );
        } else {
            await db().run('DELETE FROM game_grants WHERE owner_id = ? AND grantee_id = ?', [me.id, u.id]);
        }
        res.json({ ok: true, allowed: !!body.allow });
    }

    async function gameAccept(req, res) {
        const me = await c.requireUser(req);
        const g = await loadGame(req.params.gid);
        if (g.type !== 'ttt' || g.status !== 'pending') throw new HttpError(400, 'Нечего принимать');
        const d = JSON.parse(g.data);
        if (d.o.id !== me.id) throw new HttpError(403, 'Принять может только приглашённый');
        res.json(await save(g, d, 'active'));
    }

    async function gameMove(req, res) {
        const me = await c.requireUser(req);
        const g = await loadGame(req.params.gid);
        if (g.type !== 'ttt' || g.status !== 'active') throw new HttpError(400, 'Ход сейчас нельзя сделать');
        const d = JSON.parse(g.data);

        const mark = d.x.id === me.id ? 'x' : d.o.id === me.id ? 'o' : null;
        if (!mark) throw new HttpError(403, 'Ты не участник этой игры');
        if (d.turn !== mark) throw new HttpError(400, 'Сейчас не твой ход');

        const cell = Number((req.body || {}).cell);
        if (!Number.isInteger(cell) || cell < 0 || cell > 8 || d.board[cell]) {
            throw new HttpError(400, 'Клетка занята');
        }
        d.board[cell] = mark;

        let status = 'active';
        const line = WIN_LINES.find(([a, b, c2]) => d.board[a] && d.board[a] === d.board[b] && d.board[a] === d.board[c2]);
        if (line) {
            d.winner = mark;
            d.line = line;
            status = 'finished';
        } else if (d.board.every(Boolean)) {
            d.winner = 'draw';
            status = 'finished';
        } else {
            d.turn = mark === 'x' ? 'o' : 'x';
        }

        const dto = await save(g, d, status);
        if (status === 'finished') {
            await c.postSystem(
                g.room_id,
                d.winner === 'draw' ? 'Крестики-нолики: ничья' : `Крестики-нолики: победил @${d[d.winner].username}`
            );
        }
        res.json(dto);
    }

    async function gameGuess(req, res) {
        const me = await c.requireUser(req);
        const g = await loadGame(req.params.gid);
        const room = await c.roomOr404(g.room_id);
        await c.assertAccess(room, me.id);
        if (g.type !== 'word' || g.status !== 'active') throw new HttpError(400, 'Игра не активна');

        const d = JSON.parse(g.data);
        if (!canGuess(me.id, d)) throw new HttpError(403, 'Тебя нет в списке угадывающих');

        const text = String((req.body || {}).text || '').trim().toLowerCase();
        const chars = [...text];
        if (!chars.length || chars.length > 20) throw new HttpError(400, 'Введи букву или слово');

        if (chars.length === 1) {
            const ch = chars[0];
            if (!/^\p{L}$/u.test(ch)) throw new HttpError(400, 'Только буквы');
            if (d.letters.includes(ch) || d.wrong_letters.includes(ch)) throw new HttpError(400, 'Эта буква уже была');
            if (g.secret.includes(ch)) {
                d.letters.push(ch);
            } else {
                d.wrong_letters.push(ch);
                d.wrong++;
            }
        } else if (text === g.secret) {
            d.letters = [...new Set([...g.secret])];
        } else {
            d.wrong++;
        }

        let status = 'active';
        if ([...new Set([...g.secret])].every((ch) => d.letters.includes(ch))) {
            d.solved_by = me.username;
            status = 'finished';
        } else if (d.wrong >= WORD_MAX_WRONG) {
            status = 'finished';
        }

        const dto = await save(g, d, status);
        if (status === 'finished') {
            await c.postSystem(
                g.room_id,
                d.solved_by
                    ? `Угадай слово: @${d.solved_by} угадал «${g.secret}»`
                    : `Угадай слово: никто не угадал «${g.secret}»`
            );
        }
        res.json(dto);
    }

    // Крестики-нолики: в ожидании — отмена/отказ; в игре — сдача (побеждает соперник).
    // Угадай слово: завершить может только ведущий.
    async function gameCancel(req, res) {
        const me = await c.requireUser(req);
        const g = await loadGame(req.params.gid);
        if (g.status !== 'pending' && g.status !== 'active') throw new HttpError(400, 'Игра уже завершена');
        const d = JSON.parse(g.data);

        if (g.type === 'ttt') {
            const mark = d.x.id === me.id ? 'x' : d.o.id === me.id ? 'o' : null;
            if (!mark) throw new HttpError(403, 'Ты не участник этой игры');
            d.winner = g.status === 'pending' ? null : (mark === 'x' ? 'o' : 'x');
        } else if (d.host.id !== me.id) {
            throw new HttpError(403, 'Завершить игру может только ведущий');
        }

        res.json(await save(g, d, 'finished'));
    }

    app.get('/api/rooms/:id/games', wrap(listGames));
    app.post('/api/rooms/:id/games', wrap(createGame));
    app.post('/api/games/grants', wrap(setGrant));
    app.post('/api/games/:gid/accept', wrap(gameAccept));
    app.post('/api/games/:gid/move', wrap(gameMove));
    app.post('/api/games/:gid/guess', wrap(gameGuess));
    app.post('/api/games/:gid/cancel', wrap(gameCancel));
}

module.exports = { mountGames, initGames };