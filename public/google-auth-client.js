(() => {
    'use strict';
    const messages = {
        ru: {
            danger: 'Опасная зона', accept: 'Я принимаю', and: 'и', termsLink: 'Условия использования', privacyLink: 'Политику конфиденциальности', continue: 'Продолжить с Google', finish: 'Завершить регистрацию', title: 'Завершите создание аккаунта',
            username: 'Имя пользователя', password: 'Пароль (необязательно)', confirm: 'Повторите пароль',
            passwordHint: 'Можно входить только через Google. Пароль для входа по логину можно установить сейчас или позже в профиле.',
            avatar: 'Использовать фото Google', terms: 'Я принимаю условия использования и политику конфиденциальности',
            cancel: 'Другой способ входа', verifyTitle: 'Подтвердите почту', verifyHint: 'Для почты вне Gmail и Google Workspace подтвердите владение адресом кодом из письма.',
            send: 'Отправить код', sent: 'Код отправлен. Он действует 5 минут.', code: 'Код из письма', verify: 'Подтвердить', verified: 'Почта подтверждена',
            mismatch: 'Пароли не совпадают.', generic: 'Не удалось выполнить действие. Попробуйте ещё раз.',
            account: 'Вход через Google', linked: 'Google привязан', notLinked: 'Google не привязан. Подключите его для быстрого входа в этот аккаунт.',
            link: 'Привязать Google', unlink: 'Отключить Google', unlinkHint: 'Подтвердите отключение паролем сайта', current: 'Текущий пароль',
            setPassword: 'Установить пароль', changePassword: 'Сменить пароль', confirmGoogle: 'Подтвердить вход Google',
            noPassword: 'Пароль ещё не установлен. Он понадобится для входа по логину и отключения Google.',
            recent: 'Вы недавно подтвердили вход Google. Можно установить первый пароль без текущего пароля.',
            reauth: 'Перед установкой первого пароля подтвердите вход Google.', unavailable: 'Вход через Google сейчас недоступен.',
            cancelled: 'Вход Google отменён.', invalid_state: 'Сессия входа истекла или не прошла проверку. Начните вход Google заново.',
            failed: 'Не удалось выполнить вход Google. Попробуйте заново.', already_linked: 'Google уже привязан к другому аккаунту или у профиля уже есть другая привязка.',
            email_conflict: 'Этот email связан с несколькими записями. Войдите по паролю и привяжите Google в профиле.',
            banned: 'Аккаунт заблокирован.', wrong_google_account: 'Выберите Google-аккаунт, уже привязанный к этому профилю.', login_required: 'Сначала войдите в аккаунт.',
            done: 'Google успешно привязан.', passwordDone: 'Пароль установлен. Теперь доступен и вход по логину.'
        },
        en: {
            danger: 'Danger zone', accept: 'I accept the', and: 'and', termsLink: 'Terms of Use', privacyLink: 'Privacy Policy', continue: 'Continue with Google', finish: 'Complete registration', title: 'Finish creating your account', username: 'Username', password: 'Password (optional)', confirm: 'Repeat password',
            passwordHint: 'You can sign in with Google only. Add a password for username sign-in now or later in your profile.', avatar: 'Use Google profile photo', terms: 'I accept the terms of use and privacy policy', cancel: 'Use another sign-in method',
            verifyTitle: 'Verify your email', verifyHint: 'For email outside Gmail and Google Workspace, confirm ownership with an email code.', send: 'Send code', sent: 'Code sent. It expires in 5 minutes.', code: 'Email code', verify: 'Verify', verified: 'Email verified', mismatch: 'Passwords do not match.', generic: 'Could not complete the action. Please try again.',
            account: 'Google sign-in', linked: 'Google is connected', notLinked: 'Connect Google to sign in to this account more easily.', link: 'Connect Google', unlink: 'Disconnect Google', unlinkHint: 'Confirm with your site password', current: 'Current password', setPassword: 'Set password', changePassword: 'Change password', confirmGoogle: 'Confirm Google sign-in', noPassword: 'No password is set yet. Add one to sign in with your username or disconnect Google.', recent: 'You recently confirmed Google sign-in. You can set your first password without a current password.', reauth: 'Confirm Google sign-in before setting your first password.', unavailable: 'Google sign-in is currently unavailable.', cancelled: 'Google sign-in cancelled.', invalid_state: 'The sign-in session expired or could not be verified. Start again.', failed: 'Google sign-in failed. Please start again.', already_linked: 'This Google account or site profile is already connected to another account.', email_conflict: 'Multiple accounts use this email. Sign in with your password and connect Google in your profile.', banned: 'This account is blocked.', wrong_google_account: 'Choose the Google account already connected to this profile.', login_required: 'Please sign in first.', done: 'Google connected successfully.', passwordDone: 'Password set. You can now also sign in with your username.'
        },
        uk: {
            danger: 'Небезпечна зона', accept: 'Я приймаю', and: 'та', termsLink: 'Умови використання', privacyLink: 'Політику конфіденційності', continue: 'Продовжити з Google', finish: 'Завершити реєстрацію', title: 'Завершіть створення акаунта', username: 'Ім’я користувача', password: 'Пароль (необов’язково)', confirm: 'Повторіть пароль', passwordHint: 'Можна входити лише через Google. Пароль для входу за логіном можна встановити зараз або пізніше у профілі.', avatar: 'Використовувати фото Google', terms: 'Я приймаю умови використання та політику конфіденційності', cancel: 'Інший спосіб входу', verifyTitle: 'Підтвердьте пошту', verifyHint: 'Для пошти поза Gmail і Google Workspace підтвердьте адресу кодом із листа.', send: 'Надіслати код', sent: 'Код надіслано. Він діє 5 хвилин.', code: 'Код із листа', verify: 'Підтвердити', verified: 'Пошту підтверджено', mismatch: 'Паролі не збігаються.', generic: 'Не вдалося виконати дію. Спробуйте ще раз.', account: 'Вхід через Google', linked: 'Google прив’язаний', notLinked: 'Підключіть Google для швидкого входу в цей акаунт.', link: 'Прив’язати Google', unlink: 'Відключити Google', unlinkHint: 'Підтвердьте відключення паролем сайту', current: 'Поточний пароль', setPassword: 'Встановити пароль', changePassword: 'Змінити пароль', confirmGoogle: 'Підтвердити вхід Google', noPassword: 'Пароль ще не встановлений. Він потрібен для входу за логіном і відключення Google.', recent: 'Ви нещодавно підтвердили вхід Google. Можна встановити перший пароль без поточного.', reauth: 'Перед встановленням першого пароля підтвердьте вхід Google.', unavailable: 'Вхід через Google зараз недоступний.', cancelled: 'Вхід Google скасований.', invalid_state: 'Сесія входу закінчилася або не пройшла перевірку. Почніть заново.', failed: 'Не вдалося ввійти через Google. Спробуйте заново.', already_linked: 'Google або профіль уже прив’язаний до іншого акаунта.', email_conflict: 'Кілька акаунтів використовують цю пошту. Увійдіть за паролем і прив’яжіть Google у профілі.', banned: 'Акаунт заблоковано.', wrong_google_account: 'Виберіть Google-акаунт, уже прив’язаний до профілю.', login_required: 'Спочатку увійдіть в акаунт.', done: 'Google успішно прив’язаний.', passwordDone: 'Пароль встановлено. Тепер доступний і вхід за логіном.'
        }
    };
    function t(key) {
        let lang = document.documentElement.lang;
        try { lang = localStorage.getItem('app_lang') || lang; } catch {}
        return (messages[lang] || messages.en)[key] || messages.en[key] || messages.en.generic;
    }
    function translate(root = document) {
        root.querySelectorAll('[data-google-text]').forEach(el => {
            const value = t(el.dataset.googleText);
            if (el.textContent !== value) el.textContent = value;
        });
    }
    function node(tag, className, text) {
        const el = document.createElement(tag);
        if (className) el.className = className;
        if (text) el.textContent = text;
        return el;
    }
    function label(tag, key, className) {
        const el = node(tag, className, t(key));
        el.dataset.googleText = key;
        return el;
    }
    async function api(url, method = 'GET', data) {
        const response = await fetch(url, { method, credentials: 'same-origin', cache: 'no-store',
            ...(data ? { headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(data) } : {}) });
        const result = await response.json();
        if (!response.ok) throw Object.assign(new Error(result.error || t('generic')), { code: result.code });
        return result;
    }
    function googleLink(mode, key = 'continue') {
        const link = node('a', 'google-button');
        link.href = '/auth/google' + (mode ? '?mode=' + mode : '');
        const mark = node('span', 'google-mark', 'G');
        mark.setAttribute('aria-hidden', 'true');
        link.append(mark, label('span', key));
        return link;
    }
    async function busy(button, action, status) {
        button.disabled = true;
        status.textContent = '';
        try { await action(); } catch (error) { status.textContent = error.message || t('generic'); }
        finally { button.disabled = false; }
    }
    function updatePasswordControls(hasPassword, recentGoogleAuth = true) {
        const spa = document.getElementById('ps-pass-cur');
        if (spa) {
            spa.hidden = !hasPassword;
            const heading = document.querySelector('#ps-pass-form h4');
            if (heading) heading.textContent = t(hasPassword ? 'changePassword' : 'setPassword');
            document.querySelector('#ps-pass-form button[type="submit"]').disabled = !hasPassword && !recentGoogleAuth;
        }
        const profile = document.getElementById('input-pw-current');
        if (profile) profile.closest('.field-group').hidden = !hasPassword;
        for (const id of ['ms-password', 'btn-save-pw']) {
            const el = document.getElementById(id);
            if (el) {
                el.textContent = t(hasPassword ? 'changePassword' : 'setPassword');
                if (el.tagName === 'BUTTON') el.disabled = !hasPassword && !recentGoogleAuth;
            }
        }
    }
    const slots = new WeakMap();
    async function renderAccount(slot) {
        const danger = slot.closest('#profile-content')?.querySelector('.google-danger-slot') || document.querySelector('#settings-modal .google-danger-slot');
        if (danger) {
            danger.replaceChildren();
            const section = danger.closest('.google-danger-section');
            if (section) section.hidden = true;
        }
        slot.textContent = '';
        const section = node('section', 'google-account-block');
        section.append(label('h3', 'account'));
        const status = node('p', 'google-status');
        status.setAttribute('role', 'status');
        section.append(status);
        slot.append(section);
        try {
            const info = await api('/api/profile/google');
            slots.set(slot, info);
            updatePasswordControls(info.has_password !== false, info.recent_google_auth);
            section.append(label('p', info.linked ? 'linked' : 'notLinked'));
            if (info.linked && info.email) section.append(node('p', 'google-email', info.email));
            if (!info.enabled) section.append(label('p', 'unavailable', 'google-hint'));
            else if (!info.linked) section.append(googleLink('link', 'link'));
            if (info.linked && !info.has_password) {
                section.append(label('p', 'noPassword', 'google-hint'));
                section.append(label('p', info.recent_google_auth ? 'recent' : 'reauth', 'google-hint'));
                if (!info.recent_google_auth && info.enabled) section.append(googleLink('reauth', 'confirmGoogle'));
                const set = label('button', 'setPassword', 'btn btn-outline');
                set.type = 'button';
                set.disabled = !info.recent_google_auth;
                set.addEventListener('click', () => {
                    if (document.getElementById('input-pw-new')) window.openSettings?.();
                    const target = document.getElementById('ps-pass-new') || document.getElementById('input-pw-new');
                    target?.scrollIntoView({ behavior: matchMedia('(prefers-reduced-motion: reduce)').matches ? 'auto' : 'smooth', block: 'center' });
                    target?.focus({ preventScroll: true });
                });
                section.append(set);
            }
            if (info.linked && info.has_password && danger) {
                const reveal = label('button', 'unlink', 'btn btn-outline');
                reveal.type = 'button';
                const unlinkStatus = node('p', 'google-status');
                unlinkStatus.setAttribute('role', 'status');
                const form = node('form', 'google-unlink-form');
                form.hidden = true;
                const fieldLabel = label('label', 'unlinkHint');
                const password = node('input');
                password.type = 'password'; password.autocomplete = 'current-password'; password.required = true;
                password.id = 'google-unlink-password'; fieldLabel.htmlFor = password.id;
                const submit = label('button', 'unlink', 'btn');
                submit.type = 'submit';
                form.append(fieldLabel, password, submit);
                reveal.addEventListener('click', () => { form.hidden = !form.hidden; if (!form.hidden) password.focus(); });
                form.addEventListener('submit', event => {
                    event.preventDefault();
                    busy(submit, async () => {
                        await api('/api/profile/google', 'DELETE', { current_password: password.value, csrf: info.csrf });
                        await renderAccount(slot);
                    }, unlinkStatus);
                });
                danger.append(reveal, form, unlinkStatus);
                const dangerSection = danger.closest('.google-danger-section');
                if (dangerSection) { dangerSection.hidden = false; translate(dangerSection); }
            }
        } catch (error) { status.textContent = error.message; }
    }

    async function authSetup(card, pending) {
        const form = node('form', 'view');
        form.id = 'google-setup-form';
        form.innerHTML = `
            <h2 class="welcome" data-google-text="title"></h2><p class="google-email"></p>
            <section class="google-email-verify" hidden>
                <h3 data-google-text="verifyTitle"></h3><p class="google-hint" data-google-text="verifyHint"></p>
                <button type="button" class="btn btn-outline" id="google-send-code" data-google-text="send"></button>
                <label for="google-code" data-google-text="code"></label><input class="field" id="google-code" inputmode="numeric" autocomplete="one-time-code" maxlength="6">
                <button type="button" class="btn" id="google-confirm-code" data-google-text="verify"></button>
            </section>
            <fieldset class="google-register-fields">
                <label class="field-label" for="google-username" data-google-text="username"></label>
                <input class="field" id="google-username" required pattern="[A-Za-z0-9_\\-]{3,15}" minlength="3" maxlength="15" autocomplete="username">
                <label class="field-label" for="google-password" data-google-text="password"></label>
                <input class="field" id="google-password" type="password" minlength="6" autocomplete="new-password">
                <label class="field-label" for="google-password-confirm" data-google-text="confirm"></label>
                <input class="field" id="google-password-confirm" type="password" autocomplete="new-password">
                <p class="google-hint" data-google-text="passwordHint"></p>
                <label class="google-avatar-choice" hidden><img alt="Google profile photo" referrerpolicy="no-referrer"><input type="checkbox" id="google-avatar"><span data-google-text="avatar"></span></label>
                <label class="terms-check"><input type="checkbox" id="google-terms" required><span><span data-google-text="accept"></span> <a href="/terms" target="_blank" rel="noopener" data-google-text="termsLink"></a> <span data-google-text="and"></span> <a href="/privacy" target="_blank" rel="noopener" data-google-text="privacyLink"></a></span></label>
                <button class="btn-primary" type="submit" id="google-complete" data-google-text="finish"></button>
            </fieldset>
            <p class="google-status" role="status"></p><a class="google-cancel" href="/auth" data-google-text="cancel"></a>`;
        form.querySelector('.google-email').textContent = pending.email;
        const status = form.querySelector('.google-status');
        const fields = form.querySelector('fieldset');
        const submit = form.querySelector('#google-complete');
        const verification = form.querySelector('.google-email-verify');
        verification.hidden = !pending.requires_email_verification;
        if (pending.kind === 'link') {
            fields.hidden = true; fields.disabled = true;
            form.querySelector('h2').dataset.googleText = 'verifyTitle';
            verification.querySelector('h3').hidden = true;
        }
        submit.disabled = pending.requires_email_verification;
        if (pending.avatar_url) {
            form.querySelector('.google-avatar-choice').hidden = false;
            form.querySelector('img').src = pending.avatar_url;
        }
        form.querySelector('#google-send-code').addEventListener('click', event => busy(event.target, async () => {
            await api('/api/auth/google/email/start', 'POST', { csrf: pending.csrf }); status.textContent = t('sent');
        }, status));
        form.querySelector('#google-confirm-code').addEventListener('click', event => busy(event.target, async () => {
            const result = await api('/api/auth/google/email/confirm', 'POST', { csrf: pending.csrf, code: form.querySelector('#google-code').value.trim() });
            if (result.redirect) { location.assign(result.redirect); return; }
            pending.requires_email_verification = false;
            verification.hidden = true; submit.disabled = false; status.textContent = t('verified');
        }, status));
        form.addEventListener('submit', event => {
            event.preventDefault();
            if (pending.kind !== 'register' || pending.requires_email_verification) return;
            const password = form.querySelector('#google-password').value;
            if (password !== form.querySelector('#google-password-confirm').value) { status.textContent = t('mismatch'); return; }
            busy(submit, async () => {
                const result = await api('/api/auth/google/complete', 'POST', {
                    csrf: pending.csrf, username: form.querySelector('#google-username').value.trim(), password,
                    use_google_avatar: form.querySelector('#google-avatar').checked, accept_terms: form.querySelector('#google-terms').checked
                });
                location.assign(result.redirect);
            }, status);
        });
        card.querySelector('.tabs').hidden = true;
        card.querySelector(':scope > .welcome').hidden = true;
        card.insertBefore(form, card.querySelector('#auth-msg'));
        translate(form);
        window.showView('google-setup-form');
    }
    async function init() {
        translate();
        const card = document.querySelector('.auth-card');
        const params = new URLSearchParams(location.search);
        if (card) {
            const entry = node('div', 'google-auth-entry');
            entry.hidden = true;
            entry.append(googleLink());
            card.querySelector('.tabs').after(entry);
            try {
                const config = await api('/api/auth/google/config');
                entry.hidden = !config.enabled;
                if (params.get('google') === 'setup') {
                    const pending = await api('/api/auth/google/pending');
                    entry.hidden = true;
                    await authSetup(card, pending);
                }
            } catch (error) { document.getElementById('auth-msg').textContent = error.message; }
        }
        if (params.has('google_error') || params.get('google') === 'linked') {
            const raw = params.get('google_error');
            const key = raw === 'not_configured' ? 'unavailable' : raw;
            const text = raw ? t(key) : t('done');
            const target = document.getElementById('auth-msg') || node('p', 'google-notice', text);
            target.textContent = text;
            target.setAttribute('role', 'status');
            if (!target.isConnected) (document.querySelector('.page') || document.body).prepend(target);
            const clean = new URL(location.href); clean.searchParams.delete('google_error'); clean.searchParams.delete('google'); history.replaceState(null, '', clean.pathname + clean.search + clean.hash);
        }
        function discover() {
            document.querySelectorAll('.google-account-slot').forEach(slot => {
                if (!slots.has(slot)) { slots.set(slot, null); renderAccount(slot); }
            });
        }
        discover();
        const profileRoot = document.getElementById('profile-content') || document.getElementById('page-content');
        if (profileRoot) new MutationObserver(discover).observe(profileRoot, { childList: true, subtree: true });
        new MutationObserver(() => translate()).observe(document.documentElement, { attributes: true, attributeFilter: ['lang'] });
        window.addEventListener('account:google-reauth-required', () => {
            document.querySelectorAll('.google-account-slot').forEach(renderAccount);
        });
        window.addEventListener('account:password-changed', () => {
            updatePasswordControls(true);
            document.querySelectorAll('.google-account-slot').forEach(renderAccount);
        });
    }
    if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', init); else init();
})();
