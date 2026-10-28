// Уведомления о упоминаниях (@ник) — подключается на всех страницах сайта.
// Пока пользователь на сайте, уведомление приходит сразу: звук + всплывашка.
// Если сайта нет — уведомление сохраняется и видно в разделе «Упоминания» в комнатах.
(() => {
  'use strict';
  if (window.__notifierLoaded) return;
  window.__notifierLoaded = true;

  let es = null;
  let audioCtx = null;

  function beep() {
    try {
      audioCtx = audioCtx || new (window.AudioContext || window.webkitAudioContext)();
      const t = audioCtx.currentTime;
      const osc = audioCtx.createOscillator();
      const gain = audioCtx.createGain();
      osc.type = 'sine';
      osc.frequency.setValueAtTime(880, t);
      osc.frequency.setValueAtTime(1320, t + 0.12);
      gain.gain.setValueAtTime(0.0001, t);
      gain.gain.exponentialRampToValueAtTime(0.18, t + 0.02);
      gain.gain.exponentialRampToValueAtTime(0.0001, t + 0.4);
      osc.connect(gain);
      gain.connect(audioCtx.destination);
      osc.start(t);
      osc.stop(t + 0.42);
    } catch (_) { /* браузер может блокировать звук до первого клика */ }
  }

  function toast(n) {
    let box = document.getElementById('notify-stack');
    if (!box) {
      box = document.createElement('div');
      box.id = 'notify-stack';
      document.body.appendChild(box);
    }
    const el = document.createElement('a');
    el.className = 'notify-toast';
    el.href = n.room_id ? '/room/' + n.room_id : '/rooms';

    const who = document.createElement('strong');
    who.textContent = '@' + n.from;
    el.append(who, document.createTextNode(' отметил тебя в «' + (n.room_name || 'комнате') + '»'));

    if (n.text) {
      const snippet = document.createElement('small');
      snippet.textContent = n.text;
      el.appendChild(snippet);
    }

    box.appendChild(el);
    setTimeout(() => el.remove(), 8000);
  }

  function connect() {
    if (es) return;
    es = new EventSource('/api/notifications/stream');
    es.addEventListener('notification', (e) => {
      let n;
      try { n = JSON.parse(e.data); } catch (_) { return; }
      beep();
      toast(n);
    });
    es.onerror = () => {
      if (es.readyState === EventSource.CLOSED) {
        es.close();
        es = null;
      }
    };
  }

  async function initToggle() {
    const row = document.getElementById('mention-notify-row');
    const cb = document.getElementById('mention-notify-toggle');
    if (!row || !cb) return;
    row.style.display = '';
    try {
      const res = await fetch('/api/notifications/settings', { credentials: 'same-origin' });
      const data = await res.json();
      cb.checked = !!data.mention_notify;
    } catch (_) { /* оставляем значение по умолчанию */ }

    cb.addEventListener('change', async () => {
      try {
        const res = await fetch('/api/notifications/settings', {
          method: 'PATCH',
          credentials: 'same-origin',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ mention_notify: cb.checked }),
        });
        if (!res.ok) throw new Error('fail');
      } catch (_) {
        cb.checked = !cb.checked;
      }
    });
  }

  async function boot() {
    try {
      const me = await fetch('/api/me', { credentials: 'same-origin' }).then((r) => r.json());
      if (!me.loggedIn) return;
      connect();
      initToggle();
    } catch (_) { /* нет сети — молча */ }
  }

  boot();
})();
