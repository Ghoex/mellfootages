// video-features.js — сортировка «Новые/Популярные», локальное избранное,
// выбор нескольких футажей для ZIP-архива, теги футажей для модераторов.
// Подключается в index.html ДО script.js. Использует функции и переменные из script.js.

const LOCAL_FAVS_KEY = 'localFavs';
const ZIP_LIMIT = 30;
const TAGGER_ROLES = ['admin', 'senior_moderator', 'junior_moderator'];

let listFilter = 'all';          // 'all' | 'local' — показывать только локальное избранное
let selectMode = false;          // режим выбора для пакетного скачивания
const selectedNames = new Set(); // выбранные файлы
const localFavs = new Set(loadLocalFavs());

function loadLocalFavs() {
    try {
        const parsed = JSON.parse(localStorage.getItem(LOCAL_FAVS_KEY) || '[]');
        return Array.isArray(parsed) ? parsed.map(String) : [];
    } catch (_) {
        return [];
    }
}

function saveLocalFavs() {
    localStorage.setItem(LOCAL_FAVS_KEY, JSON.stringify([...localFavs]));
}

function initVideoFeatures() {
    updateSortChips();
    updateSelectBar();
}

// ================= СОРТИРОВКА И ФИЛЬТРЫ =================
function setSort(type, btn) {
    currentSort = type;
    document.querySelectorAll('#sort-group [data-sort]').forEach(b => b.classList.toggle('active', b === btn));
    filterAndRenderVideos(true);
}

function updateSortChips() {
    document.querySelectorAll('#sort-group [data-sort]').forEach(b => {
        b.classList.toggle('active', b.dataset.sort === currentSort);
    });
}

function toggleLocalOnly(btn) {
    listFilter = listFilter === 'local' ? 'all' : 'local';
    btn.classList.toggle('active', listFilter === 'local');
    filterAndRenderVideos(true);
}

// ================= ЛОКАЛЬНОЕ ИЗБРАННОЕ (в браузере, без аккаунта) =================
function toggleLocalFav(name, btn) {
    if (localFavs.has(name)) localFavs.delete(name);
    else localFavs.add(name);
    saveLocalFavs();
    if (btn) btn.classList.toggle('on', localFavs.has(name));
    if (listFilter === 'local') filterAndRenderVideos(true);
}

// ================= ВЫБОР И ПАКЕТНОЕ СКАЧИВАНИЕ =================
function toggleSelectMode() {
    selectMode = !selectMode;
    document.body.classList.toggle('select-mode', selectMode);
    selectedNames.clear();
    document.querySelectorAll('.pick-box input').forEach(i => { i.checked = false; });
    const btn = document.getElementById('select-mode-btn');
    if (btn) btn.classList.toggle('active', selectMode);
    updateSelectBar();
}

function toggleSelected(name, checked) {
    if (checked) {
        if (selectedNames.size >= ZIP_LIMIT) {
            showToast(`За раз можно выбрать не больше ${ZIP_LIMIT} файлов`, 'warning');
            const box = document.querySelector(`.pick-box input[data-name="${CSS.escape(name)}"]`);
            if (box) box.checked = false;
            return;
        }
        selectedNames.add(name);
    } else {
        selectedNames.delete(name);
    }
    updateSelectBar();
}

function updateSelectBar() {
    const bar = document.getElementById('select-bar');
    if (!bar) return;
    bar.hidden = !selectMode;
    const count = document.getElementById('select-count');
    if (count) count.textContent = `Выбрано: ${selectedNames.size} из ${ZIP_LIMIT}`;
    const dl = document.getElementById('select-download-btn');
    if (dl) dl.disabled = selectedNames.size === 0;
}

async function downloadSelected() {
    const names = [...selectedNames];
    if (!names.length) return;

    const btn = document.getElementById('select-download-btn');
    if (btn) { btn.disabled = true; btn.textContent = 'Собираю архив...'; }

    try {
        const res = await fetch('/api/download-zip', {
            method: 'POST',
            credentials: 'same-origin',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ names })
        });
        if (!res.ok) {
            const data = await res.json().catch(() => ({}));
            showToast(data.error || 'Не удалось собрать архив', 'error');
            return;
        }

        const blob = await res.blob();
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `footages_${names.length}.zip`;
        document.body.appendChild(a);
        a.click();
        a.remove();
        setTimeout(() => URL.revokeObjectURL(url), 10000);

        // Учитываем скачивания (сервер сам ограничивает повторные учёты)
        names.forEach(n => fetch(`/api/downloads/${encodeURIComponent(n)}`, { method: 'POST' }).catch(() => {}));
        showToast(`Архив готов: ${names.length} файлов`, 'success');
    } catch (e) {
        showToast(t('connectionError'), 'error');
    } finally {
        if (btn) { btn.textContent = '⬇ Скачать ZIP'; }
        updateSelectBar();
    }
}

// ================= ДОБАВЛЕНИЕ ЭЛЕМЕНТОВ НА КАРТОЧКУ =================
function isTaggerUser() {
    return !!(currentUserData && currentUserData.loggedIn && currentUserData.user &&
        TAGGER_ROLES.includes(String(currentUserData.user.role || '').toLowerCase()));
}

function enhanceCard(card, video) {
    const name = video.name;

    // Галочка выбора (видна только в режиме выбора)
    const pick = document.createElement('label');
    pick.className = 'pick-box';
    pick.innerHTML = `<input type="checkbox" data-name="${escapeHtml(name)}" ${selectedNames.has(name) ? 'checked' : ''}>`;
    pick.querySelector('input').addEventListener('change', (e) => toggleSelected(name, e.target.checked));
    pick.addEventListener('click', (e) => e.stopPropagation());
    card.appendChild(pick);

    // Звёздочка локального избранного
    const actions = card.querySelector('.card-actions');
    if (actions) {
        const fav = document.createElement('button');
        fav.type = 'button';
        fav.className = 'card-menu-item fav-btn' + (localFavs.has(name) ? ' on' : '');
        fav.title = 'Сохранить в этом браузере';
        fav.textContent = '★ В избранное';
        fav.addEventListener('click', (e) => { e.preventDefault(); e.stopPropagation(); toggleLocalFav(name, fav); });
        const menuEl = card.querySelector('.card-menu');
        (menuEl || actions).appendChild(fav);
    }

    // Теги для модераторов
    if (isTaggerUser()) {
        const info = card.querySelector('.card-info');
        if (info) {
            const btn = document.createElement('button');
            btn.type = 'button';
            btn.className = 'card-menu-item tag-video-btn';
            btn.textContent = '🏷 Теги';
            btn.addEventListener('click', (e) => { e.stopPropagation(); closeCardMenus(); openTagModal(name); });
            const menuEl = card.querySelector('.card-menu');
            if (menuEl) menuEl.appendChild(btn); else info.appendChild(btn);
        }
    }

    // Теги видны всем текстовыми бейджами
    const tags = Array.isArray(video.tags) ? video.tags : [];
    if (tags.length) {
        const info = card.querySelector('.card-info');
        const row = document.createElement('div');
        row.className = 'video-tag-row';
        row.innerHTML = tags.map(tg => `<span class="user-tag-badge" style="color:${escapeHtml(tg.color || '#7ec384')}">${escapeHtml(tg.icon ? tg.icon + ' ' : '')}${escapeHtml(tg.name)}</span>`).join('');
        if (info) info.insertBefore(row, info.firstChild);
    }
}

// ================= ТЕГИ ФУТАЖА (модераторы) =================
let tagModalVideo = null;

async function openTagModal(name) {
    tagModalVideo = name;
    const modal = document.getElementById('tag-modal');
    const body = document.getElementById('tag-modal-body');
    if (!modal || !body) return;

    modal.classList.add('open');
    body.innerHTML = `<p class="status-message">${t('loading')}</p>`;

    try {
        const res = await fetch('/api/video-tags/catalog', { credentials: 'same-origin' });
        const catalog = res.ok ? await res.json() : [];
        renderTagModal(catalog);
    } catch (_) {
        body.innerHTML = `<p class="status-message">${t('connectionError')}</p>`;
    }
}

function renderTagModal(catalog) {
    const body = document.getElementById('tag-modal-body');
    const video = rawVideos.find(v => v.name === tagModalVideo);
    const assigned = new Set((video?.tags || []).map(tg => tg.id));

    if (!catalog.length) {
        body.innerHTML = `<p class="status-message">Каталог тегов пуст. Администратор создаёт теги в админке.</p>`;
        return;
    }

    body.innerHTML = catalog.map(tg => `
        <button type="button" class="modal-option tag-option ${assigned.has(tg.id) ? 'on' : ''}" data-tag-id="${Number(tg.id)}">
            ${escapeHtml(tg.icon ? tg.icon + ' ' : '')}${escapeHtml(tg.name)}
            <span class="tag-state">${assigned.has(tg.id) ? '✓ добавлен' : '+ добавить'}</span>
        </button>`).join('');

    body.querySelectorAll('.tag-option').forEach(btn => {
        btn.addEventListener('click', () => toggleVideoTag(Number(btn.dataset.tagId), btn));
    });
}

async function toggleVideoTag(tagId, btn) {
    const isOn = btn.classList.contains('on');
    const url = `/api/admin/videos/${encodeURIComponent(tagModalVideo)}/tags` + (isOn ? `/${tagId}` : '');
    try {
        const res = await fetch(url, {
            method: isOn ? 'DELETE' : 'POST',
            credentials: 'same-origin',
            headers: { 'Content-Type': 'application/json' },
            body: isOn ? undefined : JSON.stringify({ tag_id: tagId })
        });
        const data = await res.json().catch(() => ({}));
        if (!res.ok) return showToast(data.error || 'Не удалось изменить теги', 'error');

        // Обновляем локальные данные, чтобы не перезагружать страницу
        const video = rawVideos.find(v => v.name === tagModalVideo);
        if (video) {
            video.tags = video.tags || [];
            if (isOn) {
                video.tags = video.tags.filter(tg => tg.id !== tagId);
            } else {
                const catalogRes = await fetch('/api/video-tags/catalog', { credentials: 'same-origin' });
                const catalog = catalogRes.ok ? await catalogRes.json() : [];
                const found = catalog.find(tg => tg.id === tagId);
                if (found) video.tags.push(found);
            }
        }

        const catalogRes = await fetch('/api/video-tags/catalog', { credentials: 'same-origin' });
        renderTagModal(catalogRes.ok ? await catalogRes.json() : []);
        buildCategoryChips();
        filterAndRenderVideos(true);
    } catch (_) {
        showToast(t('connectionError'), 'error');
    }
}

function closeTagModal() {
    const modal = document.getElementById('tag-modal');
    if (modal) modal.classList.remove('open');
    tagModalVideo = null;
}
