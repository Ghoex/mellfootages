
const DB_NAME = 'musicflow';
const STORE = 'tracks';

function idbOpen() {
  return new Promise((res, rej) => {
    const r = indexedDB.open(DB_NAME, 1);
    r.onupgradeneeded = () => {
      if (!r.result.objectStoreNames.contains(STORE)) r.result.createObjectStore(STORE);
    };
    r.onsuccess = () => res(r.result);
    r.onerror = () => rej(r.error);
  });
}

async function idbGet(key) {
  const db = await idbOpen();
  return new Promise(res => {
    const q = db.transaction(STORE).objectStore(STORE).get(key);
    q.onsuccess = () => res(q.result || null);
    q.onerror = () => res(null);
  });
}

self.addEventListener('install', () => self.skipWaiting());
self.addEventListener('activate', e => e.waitUntil(self.clients.claim()));

self.addEventListener('fetch', e => {
  const req = e.request;
  if (req.method !== 'GET') return;
  const url = new URL(req.url);
  if (!url.pathname.startsWith('/api/stream/')) return; // остальные запросы — как обычно

  e.respondWith((async () => {
    const key = decodeURIComponent(url.pathname.split('/').pop() || '');
    try {
      const blob = await idbGet(key);
      if (blob && blob.size) {
        const type = blob.type || 'audio/mpeg';
        const range = req.headers.get('range');
        if (range) {
          // Поддержка перемотки: отвечаем 206 частичным содержимым
          const m = /bytes=(\d*)-(\d*)/.exec(range) || [];
          let start = m[1] === '' ? null : +m[1];
          let end = m[2] === '' ? null : +m[2];
          if (start === null && end !== null) { start = blob.size - end; end = blob.size - 1; }
          if (start === null) start = 0;
          if (end === null || end >= blob.size) end = blob.size - 1;
          if (start >= blob.size) {
            return new Response(null, { status: 416, headers: { 'Content-Range': `bytes */${blob.size}` } });
          }
          return new Response(blob.slice(start, end + 1), {
            status: 206,
            headers: {
              'Content-Type': type,
              'Content-Length': String(end - start + 1),
              'Content-Range': `bytes ${start}-${end}/${blob.size}`,
              'Accept-Ranges': 'bytes',
            },
          });
        }
        return new Response(blob, {
          status: 200,
          headers: { 'Content-Type': type, 'Content-Length': String(blob.size), 'Accept-Ranges': 'bytes' },
        });
      }
    } catch (err) { /* нет доступа к кешу — уходим в сеть */ }
    return fetch(req); // трека нет в кеше — обычный сетевой запрос
  })());
});
