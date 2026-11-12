# Вход через Google

В Google Cloud Console откройте OAuth client типа **Web application** и добавьте в **Authorized redirect URIs**:

```text
https://burmolda.ru/auth/google/callback
```

Для локального тестирования отдельно добавьте:

```text
http://localhost:3000/auth/google/callback
```

Нужен полный адрес callback с `/auth/google/callback`. Домен без этого пути не подойдёт. Для серверного redirect-flow добавлять JavaScript origin не требуется.

В `.env` задайте `GOOGLE_CLIENT_ID`, `GOOGLE_CLIENT_SECRET`, `GOOGLE_REDIRECT_URI`, `SITE_URL` и постоянный `SESSION_SECRET`; шаблон — в `.env.example`. Значения ID и секрета находятся в `web.client_id` и `web.client_secret` скачанного JSON. В локальном окружении разработки используйте локальный redirect и `NODE_ENV=development`; на сайте за HTTPS-прокси — production. После изменения конфигурации перезапустите сервер. Установите зависимости командой `npm install`.

Секреты не передаются браузеру и не включаются в Git. На хостинге задайте те же переменные отдельно: локальный `.env` не попадает в push. JSON `client_secret*.json`, `.env` и файлы SQLite исключены из Git. Если consent screen ещё в Testing, добавьте нужные Google-аккаунты в Test users.

## Поведение

- Google subject (`sub`) — постоянный идентификатор привязки; изменения email Google не переключают пользователя на другой профиль.
- Если привязки ещё нет, а единственный существующий аккаунт имеет тот же email Gmail или Google Workspace, сервер привязывает Google и входит в него. Блокировка аккаунта при этом сохраняется. Чужая существующая Google-привязка не перезаписывается.
- Для сторонней почты Google сначала нужен код из письма. Это подтверждает актуальное владение адресом перед сопоставлением по email. Код действует 5 минут, максимум 5 попыток; повторная отправка — через минуту.
- Если аккаунта нет, пользователь задаёт username, принимает условия и при желании выбирает фото Google. Пароль необязателен; без него доступен вход через Google.
- В обоих профилях (вкладка главной и `/profile`) есть блок привязки Google. Ручная привязка не изменяет контактный email существующего аккаунта.
- Для первого пароля не нужен текущий, но требуется вход или повторное подтверждение Google не старше 10 минут. Для последующих изменений нужен текущий пароль. Установить пароль также можно через существующее восстановление по email.
- Отключить Google можно только после установки пароля и подтверждения им. Для удаления аккаунта без пароля сначала установите пароль в профиле.
- Запрашиваются только `openid email profile`; access/refresh tokens не сохраняются. Используются серверный authorization-code flow, PKCE S256, одноразовый `state`, `nonce`, проверка подписи/issuer/audience/expiry ID token и обновление ID сессии после входа. Завершение регистрации и отключение привязки защищены session-bound CSRF-токенами.

## Проверка

```sh
npm run test:google-auth
```

Тесты используют локальную SQLite и подменённого провайдера Google. Финальная проверка реального Google-входа требует настроенных redirect URIs, consent screen и пользовательского входа в браузере.

Документация Google: [серверный OAuth flow](https://developers.google.com/identity/protocols/oauth2/web-server), [проверка ID token и авторитетности email](https://developers.google.com/identity/sign-in/web/backend-auth).
