/* Presentation only: native fields remain the source of values and form data. */
(() => {
    'use strict';
    const root = document.documentElement;
    function readPreference(key) {
        try { return localStorage.getItem(key); } catch { return null; }
    }
    function preferredTheme() {
        const saved = readPreference('theme');
        if (saved === 'light' || saved === 'dark') return saved;
        return readPreference('darkTheme') === 'false' ? 'light' : 'dark';
    }
    const appearanceKeys = new Set(['theme', 'darkTheme', 'accentColor', 'accent_color', 'glassMode', 'bgStyle', 'cornerRadius', 'fontFamily', 'animMode', 'animSpeed']);
    function applyAppearance() {
        root.dataset.uiTheme = preferredTheme();
        const savedAccent = readPreference('accentColor') || readPreference('accent_color');
        const accent = /^#[0-9a-f]{6}$/i.test(savedAccent || '') ? savedAccent : '#7ec384';
        root.style.setProperty('--primary', accent);
        const darker = '#' + [1, 3, 5].map(i => Math.round(parseInt(accent.slice(i, i + 2), 16) * .8).toString(16).padStart(2, '0')).join('');
        root.style.setProperty('--primary-dark', darker);
        const shape = readPreference('cornerRadius');
        root.style.setProperty('--card-radius', shape === 'sharp' ? '0px' : shape === 'round' ? '20px' : '12px');
        root.style.setProperty('--btn-radius', shape === 'sharp' ? '0px' : shape === 'round' ? '14px' : '8px');
        const font = readPreference('fontFamily');
        root.style.setProperty('--font-family', font === 'serif' ? 'Georgia, serif' : font === 'modern' ? '"Inter", "Segoe UI", sans-serif' : '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif');
        const speed = readPreference('animSpeed');
        root.style.setProperty('--anim-speed', speed === 'fast' ? '0.15s' : speed === 'slow' ? '0.5s' : '0.3s');
        if (!document.body) return;
        document.body.classList.toggle('dark-theme', root.dataset.uiTheme === 'dark');
        document.body.classList.toggle('glass-mode', readPreference('glassMode') !== '0');
        const background = readPreference('bgStyle');
        document.body.classList.toggle('bg-flat', background === 'flat');
        document.body.classList.toggle('bg-oled', background === 'oled');
        document.body.classList.toggle('anim-none', readPreference('animMode') === 'none');
        document.body.classList.toggle('anim-expressive', readPreference('animMode') === 'expressive');
    }
    applyAppearance();

    let bodyReady = false;
    function prepareBody() {
        if (!document.body || bodyReady) return;
        bodyReady = true;
        applyAppearance();
        new MutationObserver(() => {
            root.dataset.uiTheme = document.body.classList.contains('dark-theme') ? 'dark' : 'light';
        }).observe(document.body, { attributes: true, attributeFilter: ['class'] });
    }
    const bodyObserver = new MutationObserver(() => {
        prepareBody();
        if (bodyReady) bodyObserver.disconnect();
    });
    bodyObserver.observe(root, { childList: true });
    prepareBody();
    window.addEventListener('storage', event => {
        if (appearanceKeys.has(event.key) || event.key === null) applyAppearance();
    });
    window.addEventListener('pageshow', applyAppearance);

    const transitions = new Map();
    window.uiSwitchView = (selector, next, update) => {
        const previous = transitions.get(selector);
        if (previous) {
            previous.cancelled = true;
            previous.animation?.cancel();
            transitions.delete(selector);
        }
        const current = document.querySelector(selector + '.active');
        const reduced = matchMedia('(prefers-reduced-motion: reduce)').matches || document.body.classList.contains('anim-none');
        if (!current || current === next || reduced || !current.animate) {
            update();
            return;
        }
        const state = { cancelled: false, animation: null };
        transitions.set(selector, state);
        const speed = parseFloat(getComputedStyle(document.body).getPropertyValue('--anim-speed')) || .3;
        const duration = Math.min(400, Math.max(100, speed * 1000));
        state.animation = current.animate([{ opacity: 1 }, { opacity: 0 }], { duration: duration * .4, easing: 'ease-out' });
        state.animation.finished.then(() => {
            if (state.cancelled) return;
            const hadFocus = current.contains(document.activeElement);
            update();
            if (hadFocus) {
                next.setAttribute('tabindex', '-1');
                next.focus({ preventScroll: true });
            }
            state.animation = next.animate([{ opacity: 0 }, { opacity: 1 }], { duration: duration * .6, easing: 'ease-in' });
            return state.animation.finished;
        }).catch(() => { /* A newer navigation cancels the previous animation. */ }).finally(() => {
            if (transitions.get(selector) === state) transitions.delete(selector);
        });
    };

    const copy = {
        en: { choose: 'Choose file', empty: 'No file selected', files: 'files selected', select: 'Select an option' },
        ru: { choose: 'Выбрать файл', empty: 'Файл не выбран', files: 'файлов выбрано', select: 'Выберите вариант' },
        uk: { choose: 'Вибрати файл', empty: 'Файл не вибрано', files: 'файлів вибрано', select: 'Виберіть варіант' }
    };
    function strings() {
        return copy[readPreference('app_lang') || root.lang] || copy.en;
    }
    const fileFields = new Map();
    function enhanceFile(input) {
        if (fileFields.has(input) || input.hidden || input.id === 'avatar-file-input') return;
        const existingLabel = [...(input.labels || [])].find(label => label.classList.contains('file-input-label'));
        if (getComputedStyle(input).display === 'none' && !existingLabel) return;
        const field = document.createElement('div');
        field.className = 'ui-file-field';
        const action = document.createElement('span');
        action.className = 'ui-file-action';
        const name = document.createElement('span');
        name.className = 'ui-file-name';
        name.setAttribute('aria-live', 'polite');
        name.id = (input.id || 'file') + '-ui-filename';
        const describedBy = input.getAttribute('aria-describedby');
        input.setAttribute('aria-describedby', [describedBy, name.id].filter(Boolean).join(' '));
        const update = () => {
            const text = strings();
            action.textContent = text.choose;
            if (!input.labels?.length) {
                const label = field.closest('.form-group')?.querySelector('label');
                input.setAttribute('aria-label', label?.textContent.trim() || text.choose);
            }
            name.textContent = input.files.length > 1 ? input.files.length + ' ' + text.files : input.files[0]?.name || text.empty;
            name.title = name.textContent;
            field.classList.toggle('has-file', input.files.length > 0);
        };
        input.before(field);
        field.append(action, name, input);
        if (existingLabel) existingLabel.hidden = true;
        input.classList.add('ui-file-input');
        input.addEventListener('change', update);
        input.form?.addEventListener('reset', () => setTimeout(update, 0));
        fileFields.set(input, update);
        update();
    }

    const selectFields = new Map();
    let openSelect = null;
    let nextId = 0;
    function enhanceSelect(select) {
        if (selectFields.has(select) || select.multiple || select.size > 1) return;
        const wrapper = document.createElement('div');
        wrapper.className = 'ui-select';
        const trigger = document.createElement('button');
        trigger.type = 'button';
        trigger.className = 'ui-select-trigger';
        trigger.setAttribute('role', 'combobox');
        trigger.setAttribute('aria-haspopup', 'listbox');
        trigger.setAttribute('aria-expanded', 'false');
        const panel = document.createElement('div');
        panel.className = 'ui-select-options';
        panel.id = 'ui-select-options-' + ++nextId;
        panel.setAttribute('role', 'listbox');
        panel.hidden = true;
        trigger.setAttribute('aria-controls', panel.id);
        const label = select.getAttribute('aria-label') || [...(select.labels || [])].map(l => l.textContent.trim()).join(' ') ||
            (select.previousElementSibling?.tagName === 'LABEL' ? select.previousElementSibling.textContent.trim() : '') ||
            (select.id.includes('language') ? 'Language' : strings().select);
        trigger.setAttribute('aria-label', label);
        panel.setAttribute('aria-label', label);
        select.before(wrapper);
        wrapper.append(select, trigger, panel);
        select.classList.add('ui-native-select');
        select.tabIndex = -1;
        select.setAttribute('aria-hidden', 'true');
        let active = -1;
        const buttons = () => [...panel.children];
        const close = () => {
            panel.hidden = true;
            trigger.setAttribute('aria-expanded', 'false');
            trigger.removeAttribute('aria-activedescendant');
            if (openSelect?.wrapper === wrapper) openSelect = null;
        };
        function highlight(index) {
            active = index;
            buttons().forEach((b, i) => b.classList.toggle('is-highlighted', i === index));
            if (panel.children[index]) {
                trigger.setAttribute('aria-activedescendant', panel.children[index].id);
                panel.children[index].scrollIntoView({ block: 'nearest' });
            }
        }
        function sync() {
            trigger.textContent = select.selectedOptions[0]?.textContent || strings().select;
            trigger.disabled = select.disabled;
            panel.replaceChildren();
            [...select.options].forEach((option, index) => {
                const item = document.createElement('button');
                item.type = 'button';
                item.tabIndex = -1;
                item.id = panel.id + '-' + index;
                item.setAttribute('role', 'option');
                item.setAttribute('aria-selected', String(option.selected));
                item.disabled = option.disabled || !!option.closest('optgroup:disabled');
                item.hidden = option.hidden;
                item.textContent = option.textContent;
                item.addEventListener('mousedown', event => event.preventDefault());
                item.addEventListener('click', () => choose(index));
                panel.append(item);
            });
            active = select.selectedIndex;
            if (!panel.hidden) highlight(active);
        }
        function choose(index) {
            if (!select.options[index] || buttons()[index].disabled) return;
            select.selectedIndex = index;
            select.dispatchEvent(new Event('input', { bubbles: true }));
            select.dispatchEvent(new Event('change', { bubbles: true }));
            sync();
            close();
            trigger.focus();
        }
        function open() {
            openSelect?.close();
            sync();
            panel.hidden = false;
            trigger.setAttribute('aria-expanded', 'true');
            openSelect = { wrapper, close };
            wrapper.classList.toggle('opens-up', wrapper.getBoundingClientRect().bottom + Math.min(panel.scrollHeight, 240) > innerHeight);
            highlight(select.selectedIndex);
        }
        trigger.addEventListener('click', () => panel.hidden ? open() : close());
        trigger.addEventListener('keydown', event => {
            const options = buttons();
            if (['ArrowDown', 'ArrowUp', 'Home', 'End'].includes(event.key)) {
                event.preventDefault();
                if (panel.hidden) open();
                const available = options.map((b, i) => !b.disabled && !b.hidden ? i : -1).filter(i => i >= 0);
                if (!available.length) return;
                const step = event.key === 'ArrowUp' ? -1 : 1;
                const position = available.indexOf(active);
                highlight(event.key === 'Home' ? available[0] : event.key === 'End' ? available.at(-1) : available[(position + step + available.length) % available.length]);
            } else if (event.key === 'Escape') {
                if (!panel.hidden) { event.preventDefault(); event.stopPropagation(); close(); }
            } else if (event.key === 'Enter' || event.key === ' ') {
                event.preventDefault();
                if (panel.hidden) open(); else choose(active);
            } else if (event.key === 'Tab') close();
            else if (event.key.length === 1 && !event.ctrlKey && !event.metaKey && !event.altKey) {
                const index = options.findIndex(b => !b.disabled && !b.hidden && b.textContent.trim().toLocaleLowerCase().startsWith(event.key.toLocaleLowerCase()));
                if (index >= 0) { event.preventDefault(); if (panel.hidden) open(); highlight(index); }
            }
        });
        wrapper.addEventListener('focusout', event => {
            if (!wrapper.contains(event.relatedTarget)) close();
        });
        select.addEventListener('focus', () => trigger.focus());
        select.addEventListener('change', sync);
        select.form?.addEventListener('reset', () => setTimeout(sync, 0));
        new MutationObserver(sync).observe(select, { childList: true, subtree: true, characterData: true, attributes: true, attributeFilter: ['disabled', 'selected', 'label', 'hidden'] });
        selectFields.set(select, sync);
        sync();
    }
    document.addEventListener('pointerdown', event => {
        if (openSelect && !openSelect.wrapper.contains(event.target)) openSelect.close();
    });
    document.addEventListener('change', () => {
        fileFields.forEach(update => update());
    });
    function enhance(container) {
        if (!(container instanceof Element)) return;
        if (container.matches('input[type="file"]')) enhanceFile(container);
        if (container.matches('select')) enhanceSelect(container);
        container.querySelectorAll('input[type="file"]').forEach(enhanceFile);
        container.querySelectorAll('select').forEach(enhanceSelect);
    }
    document.addEventListener('DOMContentLoaded', () => {
        prepareBody();
        const header = document.querySelector('body[data-ui="catalog"] > .top-bar');
        if (header) {
            const updateHeaderHeight = () => root.style.setProperty('--ui-header-height', Math.ceil(header.getBoundingClientRect().height) + 'px');
            updateHeaderHeight();
            if ('ResizeObserver' in window) new ResizeObserver(updateHeaderHeight).observe(header);
            else window.addEventListener('resize', updateHeaderHeight);
        }
        enhance(document.body);
        new MutationObserver(records => {
            for (const record of records) for (const added of record.addedNodes) enhance(added);
            for (const input of fileFields.keys()) if (!input.isConnected) fileFields.delete(input);
            for (const select of selectFields.keys()) if (!select.isConnected) selectFields.delete(select);
        }).observe(document.body, { childList: true, subtree: true });
        new MutationObserver(() => {
            fileFields.forEach(update => update());
        }).observe(root, { attributes: true, attributeFilter: ['lang'] });
    });
})();
