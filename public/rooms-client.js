(() => {
  'use strict';

  const RANK = { user: 0, junior_moderator: 1, moderator: 2, senior_moderator: 3, admin: 4 };
  const CREATE_ROLES = ['moderator', 'senior_moderator', 'admin'];
  const HEX = /^#[0-9a-f]{6}$/i;
  const ICON_STAFF = '<svg viewBox="0 0 24 24" width="13" height="13" aria-hidden="true"><path fill="currentColor" d="M12 2 4 5v6c0 5 3.4 9.4 8 11 4.6-1.6 8-6 8-11V5z"/></svg>';
  const ICON_VERIFIED = '<svg viewBox="0 0 24 24" width="13" height="13" aria-hidden="true"><circle cx="12" cy="12" r="11" fill="currentColor"/><path d="M7 12.5l3 3 7-7" fill="none" stroke="#fff" stroke-width="2.4" stroke-linecap="round" stroke-linejoin="round"/></svg>';
  const MUTE_OPTIONS = [[5, '5 минут'], [30, '30 минут'], [60, '1 час'], [1440, '24 часа'], [10080, '7 дней'], [43200, '30 дней']];
  // Одинаково с сервером: @ник и #футаж — до пробела или знака препинания
  const TOKEN_RE = /[@#][^\s#@.,!?;:()]+/g;

  const $ = (id) => document.getElementById(id);
  const rankOf = (role) => RANK[role] || 0;

  async function api(url, method = 'GET', body) {
    const opts = { method, credentials: 'same-origin', headers: {} };
    if (body !== undefined) {
      opts.headers['Content-Type'] = 'application/json';
      opts.body = JSON.stringify(body);
    }
    const res = await fetch(url, opts);
    let data = null;
    try { data = await res.json(); } catch (_) { /* пустой ответ */ }
    if (!res.ok) {
      const err = new Error((data && data.error) || 'Ошибка сервера');
      err.status = res.status;
      throw err;
    }
    return data;
  }

  async function loadMe() {
    try {
      const r = await api('/api/me');
      if (!r.loggedIn) return null;
      const role = r.user.role || 'user';
      return { username: r.user.username, role, rank: rankOf(role) };
    } catch (_) {
      return null;
    }
  }

  function setText(el, text, isError) {
    el.textContent = text || '';
    el.classList.toggle('error', !!isError);
  }

  function setShown(id, on) { $(id).hidden = !on; }

  function mkButton(label, onClick, ghost) {
    const b = document.createElement('button');
    b.type = 'button';
    b.className = ghost ? 'btn ghost' : 'btn';
    b.textContent = label;
    b.addEventListener('click', onClick);
    return b;
  }

  function fmtTime(iso) {
    const d = new Date(iso);
    return isNaN(d) ? '' : d.toLocaleTimeString('ru-RU', { hour: '2-digit', minute: '2-digit' });
  }

  function fmtDate(iso) {
    const d = new Date(iso);
    return isNaN(d) ? '' : d.toLocaleString('ru-RU', { day: '2-digit', month: '2-digit', hour: '2-digit', minute: '2-digit' });
  }

  // ---------- Список комнат ----------

  async function initList(me) {
    if (me && CREATE_ROLES.includes(me.role)) {
      $('create-btn').hidden = false;
    }
    if (me && me.rank >= RANK.junior_moderator) {
      setShown('reports-section', true);
      loadReports();
    }
    if (me) {
      setShown('mentions-section', true);
      loadMentions();
      $('mentions-read').addEventListener('click', async () => {
        try {
          await api('/api/notifications/read', 'POST');
          loadMentions();
        } catch (e) {
          alert(e.message);
        }
      });
    }
    loadRooms();

    $('create-btn').addEventListener('click', () => $('create-dialog').showModal());
    $('create-form').addEventListener('submit', async (e) => {
      e.preventDefault();
      const err = $('create-error');
      try {
        const r = await api('/api/rooms', 'POST', {
          name: $('create-name').value,
          description: $('create-desc').value,
          password: $('create-pass').value,
        });
        location.href = '/room/' + r.id;
      } catch (ex) {
        setText(err, ex.message, true);
      }
    });
  }

  async function loadMentions() {
    const list = $('mentions-list');
    list.textContent = '';
    try {
      const items = await api('/api/notifications');
      $('mentions-read').hidden = !items.length;
      if (!items.length) {
        const empty = document.createElement('li');
        empty.className = 'muted';
        empty.textContent = 'Новых упоминаний нет';
        list.appendChild(empty);
        return;
      }
      items.forEach((n) => {
        const li = document.createElement('li');
        const a = document.createElement('a');
        a.className = 'mention-row';
        a.href = n.room_id ? '/room/' + n.room_id : '/rooms';

        const head = document.createElement('div');
        head.className = 'small';
        head.textContent = `${n.from} отметил тебя в «${n.room_name || 'комнате'}» · ${fmtDate(n.created_at)}`;

        const body = document.createElement('div');
        body.className = 'quote';
        body.textContent = n.text;

        a.append(head, body);
        li.appendChild(a);
        list.appendChild(li);
      });
    } catch (e) {
      setText($('status'), e.message, true);
    }
  }

  async function loadRooms() {
    const list = $('room-list');
    const status = $('status');
    list.textContent = '';
    try {
      const rooms = await api('/api/rooms');
      if (!rooms.length) {
        setText(status, 'Комнат пока нет');
        return;
      }
      setText(status, '');
      rooms.forEach((r) => {
        const li = document.createElement('li');
        const a = document.createElement('a');
        a.className = 'room-row';
        a.href = '/room/' + r.id;

        const name = document.createElement('span');
        name.className = 'room-name';
        name.textContent = r.name;
        if (r.has_password) {
          const lock = document.createElement('span');
          lock.className = 'lock-mark';
          lock.textContent = 'закрыта паролем';
          name.appendChild(lock);
        }

        const desc = document.createElement('span');
        desc.className = 'room-desc';
        desc.textContent = r.description;

        a.append(name, desc);
        li.appendChild(a);
        list.appendChild(li);
      });
    } catch (e) {
      setText(status, e.message, true);
    }
  }

  async function loadReports() {
    const list = $('report-list');
    list.textContent = '';
    try {
      const items = await api('/api/rooms/reports?status=pending');
      if (!items.length) {
        const empty = document.createElement('li');
        empty.className = 'muted';
        empty.textContent = 'Новых жалоб нет';
        list.appendChild(empty);
        return;
      }
      items.forEach((r) => {
        const li = document.createElement('li');
        li.className = 'report';

        const meta = document.createElement('div');
        meta.className = 'small';
        meta.textContent = `${r.reporter || 'удалён'} → ${r.author || 'удалён'} · комната #${r.room_id}`;

        const quote = document.createElement('div');
        quote.className = 'quote';
        quote.textContent = r.text;

        const reason = document.createElement('div');
        reason.className = 'reason';
        reason.textContent = 'Причина: ' + r.reason;

        const btns = document.createElement('div');
        btns.className = 'row-btns';
        btns.append(
          mkButton('Скрыть сообщение', () => resolveReport(r.id, 'uphold')),
          mkButton('Отклонить', () => resolveReport(r.id, 'dismiss'), true),
          mkButton('Открыть комнату', () => { location.href = '/room/' + r.room_id; }, true)
        );

        li.append(meta, quote, reason, btns);
        list.appendChild(li);
      });
    } catch (e) {
      const li = document.createElement('li');
      li.className = 'error';
      li.textContent = e.message;
      list.appendChild(li);
    }
  }

  async function resolveReport(id, action) {
    try {
      await api(`/api/rooms/reports/${id}/resolve`, 'POST', { action });
      loadReports();
    } catch (e) {
      alert(e.message);
    }
  }

  // ---------- Комната ----------

  const state = { me: null, roomId: null, es: null, seen: new Set(), current: null, footageTimer: null };

  async function initRoom(me) {
    state.me = me;
    state.roomId = Number(location.pathname.split('/').pop());

    let room;
    try {
      room = await api(`/api/rooms/${state.roomId}`);
    } catch (e) {
      $('room-title').textContent = e.status === 404 ? 'Комната не найдена' : 'Ошибка';
      $('room-desc').textContent = e.message;
      return;
    }

    $('room-title').textContent = room.name;
    $('room-desc').textContent = room.description;
    document.title = room.name + ' · Комнаты';

    setShown('guest-note', !me);
    bindRoomEvents();

    if (room.locked) showLock();
    else startChat();
  }

  function showLock() {
    setShown('lock', true);
    setShown('composer', false);
  }

  function startChat() {
    setShown('lock', false);
    setShown('composer', !!state.me);
    connect();
  }

  function connect() {
    if (state.es) state.es.close();
    const es = new EventSource(`/api/rooms/${state.roomId}/stream`);
    state.es = es;
    es.onopen = () => loadHistory();
    es.addEventListener('message', (e) => addMessage(JSON.parse(e.data)));
    es.addEventListener('delete', (e) => {
      const { id } = JSON.parse(e.data);
      const el = document.querySelector(`#messages [data-id="${Number(id)}"]`);
      if (el) el.remove();
    });
    es.onerror = () => {
      // CLOSED означает отказ сервера (например, 403: комната закрыта)
      if (es.readyState === EventSource.CLOSED) {
        es.close();
        state.es = null;
        showLock();
      }
    };
  }

  async function loadHistory() {
    try {
      const items = await api(`/api/rooms/${state.roomId}/messages`);
      items.forEach(addMessage);
    } catch (e) {
      if (e.status === 403) showLock();
    }
  }

  function addMessage(m) {
    if (state.seen.has(m.id)) return;
    state.seen.add(m.id);

    const box = $('messages');
    const nearBottom = box.scrollHeight - box.scrollTop - box.clientHeight < 120;
    const node = renderMessage(m);
    // Вставляем по id, чтобы история и живые сообщения не путались местами
    const later = Array.from(box.children).find((c) => Number(c.dataset.id) > m.id);
    box.insertBefore(node, later || null);
    if (nearBottom) box.scrollTop = box.scrollHeight;
  }

  // Текст сообщения: @ник и #футаж становятся ссылками, остальное — обычный текст
  function renderBody(el, m) {
    const src = m.text || '';
    const mentions = new Set((m.mentions || []).map((n) => n.toLowerCase()));
    const footages = new Map((m.footages || []).map((f) => [f.token, f]));
    const re = new RegExp(TOKEN_RE.source, 'g');
    let last = 0;
    let match;
    while ((match = re.exec(src))) {
      if (match.index > last) el.appendChild(document.createTextNode(src.slice(last, match.index)));
      const tok = match[0];
      const key = tok.slice(1).toLowerCase();
      if (tok[0] === '@' && mentions.has(key)) {
        const a = document.createElement('a');
        a.className = 'mention';
        a.href = '/user/' + encodeURIComponent(tok.slice(1));
        a.textContent = tok;
        el.appendChild(a);
      } else if (tok[0] === '#' && footages.has(key)) {
        const a = document.createElement('a');
        a.className = 'footage-link';
        a.href = footages.get(key).url;
        a.textContent = tok;
        el.appendChild(a);
      } else {
        el.appendChild(document.createTextNode(tok));
      }
      last = re.lastIndex;
    }
    if (last < src.length) el.appendChild(document.createTextNode(src.slice(last)));
  }

  function renderMessage(m) {
    const row = document.createElement('div');
    row.dataset.id = m.id;

    if (m.kind === 'system') {
      row.className = 'msg system';
      row.textContent = m.text;
      return row;
    }

    row.className = 'msg';

    const head = document.createElement('div');
    head.className = 'msg-head';

    const nick = document.createElement('a');
    nick.className = 'nick';
    nick.href = '/user/' + encodeURIComponent(m.username || '');
    nick.textContent = m.username || 'удалён';
    head.appendChild(nick);

    if (m.is_staff) head.appendChild(makeBadge('badge staff', ICON_STAFF, 'Модератор'));
    if (m.is_verified) head.appendChild(makeBadge('badge', ICON_VERIFIED, 'Подтверждённый аккаунт'));

    if (m.tag) {
      const tag = document.createElement('span');
      tag.className = 'tag';
      tag.textContent = m.tag.name;
      if (HEX.test(m.tag.color)) tag.style.setProperty('--tag', m.tag.color);
      head.appendChild(tag);
    }

    const time = document.createElement('time');
    time.textContent = fmtTime(m.created_at);
    head.appendChild(time);

    const text = document.createElement('div');
    text.className = 'text' + (m.effect ? ' fx-' + m.effect : '');
    renderBody(text, m);

    row.append(head, text);
    row.addEventListener('click', (e) => {
      if (e.target.closest('a')) return;
      openActions(m, row);
    });
    return row;
  }

  function makeBadge(className, svg, title) {
    const span = document.createElement('span');
    span.className = className;
    span.title = title;
    span.innerHTML = svg; // только константные SVG, данные пользователя сюда не попадают
    return span;
  }

  function openActions(m, row) {
    state.current = { m, row };
    const me = state.me;
    const isSelf = !!me && m.username === me.username;
    const canMod = !!me && me.rank >= RANK.junior_moderator;

    $('actions-title').textContent = m.username || 'Сообщение';
    setShown('act-report', !!me && !isSelf);
    setShown('act-mute', canMod && !isSelf && me.rank > rankOf(m.role));
    setShown('act-delete', canMod);
    $('actions').showModal();
  }

  function fillMuteOptions() {
    const sel = $('mute-select');
    sel.textContent = '';
    const max = state.me.rank === RANK.junior_moderator ? 1440 : 43200;
    MUTE_OPTIONS.filter(([value]) => value <= max).forEach(([value, label]) => {
      const opt = document.createElement('option');
      opt.value = value;
      opt.textContent = label;
      sel.appendChild(opt);
    });
  }

  // ---------- Выбор футажа для сообщения ----------

  async function loadFootagePicker(q) {
    const list = $('footage-list');
    const status = $('footage-status');
    list.textContent = '';
    setText(status, 'Загрузка…');
    try {
      const items = await api('/api/footages?q=' + encodeURIComponent(q));
      setText(status, items.length ? '' : 'Ничего не найдено');
      items.forEach((f) => {
        const li = document.createElement('li');
        const b = document.createElement('button');
        b.type = 'button';
        b.className = 'item';
        b.textContent = f.title;
        b.addEventListener('click', () => insertFootage(f.slug));
        li.appendChild(b);
        list.appendChild(li);
      });
    } catch (e) {
      setText(status, e.message, true);
    }
  }

  function insertFootage(slug) {
    const input = $('msg-input');
    const v = input.value;
    const sep = v && !/\s$/.test(v) ? ' ' : '';
    input.value = v + sep + '#' + slug + ' ';
    $('footage-dialog').close();
    input.focus();
  }

  function bindRoomEvents() {
    if (state.bound) return;
    state.bound = true;

    document.querySelectorAll('[data-close]').forEach((btn) => {
      btn.addEventListener('click', () => $(btn.dataset.close).close());
    });

    $('composer').addEventListener('submit', async (e) => {
      e.preventDefault();
      const input = $('msg-input');
      const text = input.value.trim();
      if (!text) return;
      setText($('composer-error'), '');
      try {
        const m = await api(`/api/rooms/${state.roomId}/messages`, 'POST', { text });
        input.value = '';
        addMessage(m);
      } catch (err) {
        setText($('composer-error'), err.message, true);
      }
    });

    $('footage-btn').addEventListener('click', () => {
      $('footage-search').value = '';
      loadFootagePicker('');
      $('footage-dialog').showModal();
      $('footage-search').focus();
    });

    $('footage-search').addEventListener('input', () => {
      clearTimeout(state.footageTimer);
      state.footageTimer = setTimeout(() => loadFootagePicker($('footage-search').value.trim()), 250);
    });

    $('unlock-form').addEventListener('submit', async (e) => {
      e.preventDefault();
      const err = $('unlock-error');
      try {
        await api(`/api/rooms/${state.roomId}/unlock`, 'POST', { password: $('unlock-pass').value });
        $('unlock-pass').value = '';
        setText(err, '');
        startChat();
      } catch (ex) {
        setText(err, ex.message, true);
      }
    });

    $('act-profile').addEventListener('click', () => {
      location.href = '/user/' + encodeURIComponent(state.current.m.username || '');
    });

    $('act-report').addEventListener('click', () => {
      $('actions').close();
      $('report-reason').value = '';
      setText($('report-error'), '');
      $('report-dialog').showModal();
    });

    $('report-form').addEventListener('submit', async (e) => {
      e.preventDefault();
      try {
        await api(`/api/rooms/messages/${state.current.m.id}/report`, 'POST', { reason: $('report-reason').value });
        $('report-dialog').close();
        setText($('composer-error'), 'Жалоба отправлена');
      } catch (ex) {
        setText($('report-error'), ex.message, true);
      }
    });

    $('act-mute').addEventListener('click', () => {
      $('actions').close();
      fillMuteOptions();
      setText($('mute-error'), '');
      $('mute-dialog').showModal();
    });

    $('mute-form').addEventListener('submit', async (e) => {
      e.preventDefault();
      try {
        const r = await api(`/api/rooms/${state.roomId}/mute`, 'POST', {
          username: state.current.m.username,
          minutes: Number($('mute-select').value),
        });
        $('mute-dialog').close();
        addMessage(r.message);
      } catch (ex) {
        setText($('mute-error'), ex.message, true);
      }
    });

    $('act-delete').addEventListener('click', async () => {
      const { m, row } = state.current;
      $('actions').close();
      if (!confirm('Удалить сообщение?')) return;
      try {
        await api(`/api/rooms/messages/${m.id}`, 'DELETE');
        row.remove();
      } catch (e) {
        alert(e.message);
      }
    });
  }

  // ---------- Старт ----------

  async function boot() {
    const me = await loadMe();
    if ($('room-list')) initList(me);
    else if ($('messages')) initRoom(me);
  }

  boot();
})();
