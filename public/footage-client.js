(() => {
  'use strict';

  const $ = (id) => document.getElementById(id);
  const id = decodeURIComponent(location.pathname.split('/').pop());

  async function load() {
    try {
      const res = await fetch('/api/footage/' + encodeURIComponent(id), { credentials: 'same-origin' });
      const data = await res.json().catch(() => null);
      if (!res.ok) throw new Error((data && data.error) || 'Ошибка сервера');

      $('f-title').textContent = data.title;
      document.title = data.title + ' · Футажи';
      $('f-meta').textContent = data.uploader ? 'Автор: ' + data.uploader : '';

      const video = $('f-video');
      video.src = data.file_url;
      video.hidden = false;

      const tag = $('f-tag');
      tag.hidden = false;
      tag.textContent = 'Тег для комнаты: #' + data.slug;

      const copy = $('f-copy');
      copy.hidden = false;
      copy.addEventListener('click', async () => {
        try {
          await navigator.clipboard.writeText('#' + data.slug);
          copy.textContent = 'Скопировано';
          setTimeout(() => { copy.textContent = 'Копировать тег'; }, 1500);
        } catch (_) {
          copy.textContent = 'Не удалось';
        }
      });
    } catch (e) {
      $('f-title').textContent = 'Футаж не найден';
      $('f-status').textContent = e.message;
      $('f-status').classList.add('error');
    }
  }

  load();
})();
