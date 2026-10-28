require('dotenv').config();
const PROXY_URL = process.env.TG_PROXY_URL || 'https://api.telegram.org';

const { TelegramBot } = require('node-telegram-bot-api');
const sqlite3 = require('sqlite3');
const { open } = require('sqlite');
const bcrypt = require('bcrypt');
const fs = require('fs');
const path = require('path');

const BOT_TOKEN = process.env.BOT_TOKEN;
if (!BOT_TOKEN) { console.error('❌ BOT_TOKEN не найден в .env'); process.exit(1); }

const bot = new TelegramBot(BOT_TOKEN, {
    polling: { params: { dropPendingUpdates: true } },
    baseApiUrl: PROXY_URL,
});
let db;
const CARD_DIR = path.join(__dirname, 'cards');
if (!fs.existsSync(CARD_DIR)) fs.mkdirSync(CARD_DIR, { recursive: true });

// =====================================================
// РОЛИ
// =====================================================
const MOD_ROLES = ['admin', 'moderator', 'senior_moderator'];
function isMod(user) { return MOD_ROLES.includes(user?.role); }
function isAdmin(user) { return user?.role === 'admin'; }

// =====================================================
// КОНСТАНТЫ
// =====================================================
const COINS_PER_DIAMOND = 3000;
const OFFLINE_CLICK_COST = 3500;
const OFFLINE_CLICK_POWER = 5;
const OFFLINE_MAX_MINUTES = 480;
const NOTIFICATION_POLL_MS = 5000;

// --- Мини-игры ---
const BATTLE_EXPIRE_MS = 5 * 60 * 1000;      // 5 минут на принятие боя
const BATTLE_CLEANUP_MS = 60 * 1000;          // чистим истёкшие бои раз в минуту

const GAME_LIMITS = {
    coins: { min: 50, max: 50000 },
    diamonds: { min: 1, max: 500 },
};

// Слоты — символы и веса
const SLOTS_SYMS = ['🍒', '🍋', '🍊', '🍇', '🔔', '💎', '👑'];
const SLOTS_W = [30, 25, 20, 12, 7, 4, 2];
// Выплаты: 3 одинаковых → коэффициент
const SLOTS_PAY = { '🍒': 2, '🍋': 2.5, '🍊': 3, '🍇': 3.5, '🔔': 5, '💎': 8, '👑': 15 };

// Рулетка
const ROULETTE_RED = new Set([1, 3, 5, 7, 9, 12, 14, 16, 18, 19, 21, 23, 25, 27, 30, 32, 34, 36]);

const CASES = {
    basic: { id: 'basic', name: '📦 Базовый кейс', price: 5, currency: 'diamonds', rarities: ['common', 'uncommon', 'rare', 'epic', 'mythic', 'legendary', 'unique'], weights: [40, 30, 20, 8, 1, 0.8, 0.2] },
    epic: { id: 'epic', name: '💜 Эпик кейс', price: 10, currency: 'diamonds', rarities: ['epic', 'mythic', 'legendary', 'unique'], weights: [60, 25, 12, 3] },
    legendary: { id: 'legendary', name: '🏆 Легендарный кейс', price: 20, currency: 'diamonds', rarities: ['legendary', 'unique'], weights: [80, 20] },
};

const SELL_PRICES = {
    common: { coins: 200, diamonds: 0 },
    uncommon: { coins: 500, diamonds: 0 },
    rare: { coins: 300, diamonds: 0 },
    epic: { coins: 0, diamonds: 1 },
    mythic: { coins: 0, diamonds: 3 },
    legendary: { coins: 0, diamonds: 6 },
    unique: { coins: 0, diamonds: 12 },
};

const SHOP_UPGRADES = [
    { label: '⚡ +1 сила → 300 💰', power: 1, cost: 300, cb: 'buy_cp_1' },
    { label: '⚡ +5 сила → 1499 💰', power: 5, cost: 1499, cb: 'buy_cp_5' },
    { label: '⚡ +10 сила → 3000 💰', power: 10, cost: 3000, cb: 'buy_cp_10' },
];

const MOD_AIRDROP_LIMITS = { maxPerDay: 5, maxCoins: 2000, maxDiamonds: 10 };

// =====================================================
// ПЕРЕВОДЫ
// =====================================================
const BASE = {
    welcome: (name) => `🎴 Добро пожаловать, ${name}!\n\nВыбери действие ниже 👇`,
    linkFirst: '❌ Сначала привяжи аккаунт через /link КОД\n\nКод получи в профиле на сайте.',
    showIdMsg: (tid) => `🆔 Твой Telegram ID:\n<code>${tid}</code>\n\nЧто дальше:\n1️⃣ Скопируй этот ID\n2️⃣ Вставь его в поле «Telegram ID» на странице регистрации сайта\n3️⃣ Нажми «Далее» — сюда придёт код подтверждения\n4️⃣ Введи код на сайте — аккаунт создан и сразу привязан к Telegram\n\nУже есть аккаунт на сайте? Просто привяжи его: /link КОД (код возьми в профиле на сайте).`,
    registerCodeMsg: (code) => `🔐 Код подтверждения регистрации: <b>${code}</b>\n\nВведи его на сайте, чтобы завершить регистрацию.\n⏳ Код действует 10 минут.`,
    loginCodeMsg: (code) => `🔐 Код входа: <b>${code}</b>\n\nВведи его на сайте, чтобы войти в аккаунт.\n⏳ Код действует 5 минут.\n\nЕсли это были не вы — просто проигнорируйте сообщение.`,
    banned: '🚫 Аккаунт заблокирован.',
    profile: (u, w, cards) => `👤 ПРОФИЛЬ\n\n🆔 ID: ${u.id}\n👤 Ник: ${u.username}\n👑 Роль: ${u.role}\n\n💰 Монеты: ${w.coins}\n💎 Алмазы: ${w.diamonds}\n⭐ Очки: ${w.points}\n🃏 Карточек: ${cards}`,
    noCards: '🃏 У тебя пока нет карточек.',
    myCards: '🃏 МОИ КАРТОЧКИ\n\n',
    cardLine: (c) => `#${c.card_id} ${c.name} [${c.rarity}]${c.amount > 1 ? ` ×${c.amount}` : ''} ${c.media_type === 'video' ? '🎬' : '🖼'}\n`,
    clicker: (w, cl, rem) => `👆 КЛИКЕР\n\n💰 ${w.coins} | 💎 ${w.diamonds}\n⚡ Сила: +${cl.click_power}\n⏱ КД: ${cl.cooldown}с\n🏅 Алмаз каждые ${COINS_PER_DIAMOND} монет\n\n${rem > 0 ? `⏳ Следующий через ${rem}с` : '🟢 Готово!'}`,
    clicked: (n, d) => d ? `+${n}💰 +1💎` : `+${n}💰`,
    wait: (n) => `⏳ Подожди ${n}с`,
    notEnoughCoins: '❌ Недостаточно монет',
    notEnoughDiamonds: '❌ Недостаточно алмазов',
    shopText: (n, hasOffline) => `🛒 МАГАЗИН\n\n⚡ Сила клика: +${n}\n💤 Оффлайн клик: ${hasOffline ? '✅ Активен (+5/мин)' : '❌ Не куплен'}\n\nКупи улучшение:`,
    upgraded: (n) => `⚡ +${n} к силе клика!`,
    offlineBought: '✅ Оффлайн клик куплен! Теперь ты зарабатываешь +5 монет в минуту пока офлайн.',
    offlineAlready: '⚠️ Оффлайн клик уже куплен.',
    offlineCollected: (n) => `💤 Пока ты отсутствовал, накопилось +${n} 💰`,
    referrals: (c, e, l) => `👥 РЕФЕРАЛЫ\n\nПриглашено: ${c}\nЗаработано: ${e}💰\n\n🔗 ${l}`,
    settings: '⚙️ НАСТРОЙКИ',
    mainMenu: 'Главное меню 👇',
    noDrops: '🎁 Нет доступных дропов.',
    dropsTitle: '🎁 ДОСТУПНЫЕ ДРОПЫ',
    dropSold: '❌ Дроп закончился!',
    dropNoCards: '❌ В дропе нет карточек',
    notEnough: '❌ Недостаточно валюты',
    gotCard: (n) => `🎉 Получено: ${n}!`,
    adminPanel: '⚙️ АДМИН-ПАНЕЛЬ',
    adminCoinsPrompt: '💰 Введи: ID количество\nПример: 6 500',
    adminDiamondsPrompt: '💎 Введи: ID количество',
    adminPointsPrompt: '⭐ Введи: ID количество',
    adminGaveCoins: (n, id) => `✅ Выдано ${n}💰 пользователю #${id}`,
    adminGaveDiamonds: (n, id) => `✅ Выдано ${n}💎 пользователю #${id}`,
    adminGavePoints: (n, id) => `✅ Выдано ${n}⭐ пользователю #${id}`,
    wrongFormat: '❌ Формат: ID количество',
    enterCardName: '🃏 Введи название карточки:',
    chooseRarity: (n) => `🃏 Карточка: ${n}\n\nВыбери редкость:`,
    sendPhoto: (r) => `Редкость: ${r}\n\n📸 Отправь фото или 🎬 видео.`,
    cardCreated: (n, r, id) => `✅ Карточка создана!\n🃏 ${n} | ${r} | ID: ${id}`,
    cardSaveError: '❌ Не удалось сохранить карточку.',
    chooseLanguage: '🌐 Выбери язык:',
    languageSaved: '✅ Язык сохранён!',
    enterNewPassword: '🔐 Введи новый пароль:',
    passwordTooShort: '❌ Пароль минимум 6 символов.',
    passwordChanged: '✅ Пароль изменён!',
    enterNewUsername: '👤 Введи новый ник (3-15, a-z0-9_-):',
    usernameTooShort: '❌ Ник: 3-15 символов, только латиница/цифры.',
    usernameChanged: (n) => `✅ Ник: ${n}`,
    usernameTaken: '❌ Ник уже занят.',
    linkHelp: '🔗 Открой профиль на сайте → «Привязать Telegram» → введи /link КОД',
    linkNotFound: '❌ Код не найден.',
    linkExpired: '⌛ Код истёк.',
    linkAlreadyUsed: '❌ Telegram уже привязан.',
    linkSuccess: (n, id) => `✅ Привязан!\n👤 ${n} | ID: ${id}`,
    errorGeneral: '❌ Ошибка.',
    noAccess: '❌ Нет доступа',
    dropName: '🎁 Название дропа:',
    dropCurrency: (n) => `Дроп: ${n}\nВалюта:`,
    currencyChosen: (c) => `Валюта: ${c}\nЦена:`,
    dropMaxOpens: 'Лимит (0 = без лимита):',
    dropCreated: (n) => `✅ Дроп "${n}" создан! Добавь карточки:`,
    dropNoCardsYet: (n) => `✅ Дроп "${n}" создан!\n⚠️ Нет карточек.`,
    dropCardWeight: '⚖️ Вес выпадения (100=обычный, 10=редкий):',
    dropCardAdded: '✅ Карточка добавлена в дроп!',
    airdropCoins: '💰 Кол-во монет на получателя:',
    airdropDiamondsAmt: '💎 Кол-во алмазов на получателя:',
    airdropMaxClaims: (n) => `Подарок: ${n}\nЛимит (0 = без лимита):`,
    airdropSending: '⏳ Начинаю рассылку...',
    airdropDone: (ok, t) => `✅ Готово! ${ok}/${t}`,
    airdropText: (c, l) => `🎉 ЭЙРДРОП!\n💰 ${c} монет\nЛимит: ${l ?? 'Без лимита'}`,
    airdropDiamText: (d, l) => `💎 ЭЙРДРОП АЛМАЗОВ!\n💎 ${d} алмазов\nЛимит: ${l ?? 'Без лимита'}`,
    airdropBtn: (n) => `🎁 Забрать ${n}💰`,
    airdropDiamBtn: (n) => `💎 Забрать ${n}💎`,
    airdropNotFound: '❌ Эйрдроп не найден.',
    airdropEmpty: '❌ Все забрали!',
    airdropAlready: '⚠️ Уже забирал!',
    airdropClaimed: (n) => `🎉 Получено ${n}💰!`,
    airdropDiamClaim: (n) => `💎 Получено ${n}💎!`,
    modAirdropLimit: (left) => `❌ Лимит эйрдропов! Осталось сегодня: ${left}`,
    modAirdropTooMuch: (max, cur) => `❌ Превышен лимит! Максимум: ${max}, ты ввёл: ${cur}`,
    casesMenu: '📦 КЕЙСЫ\n\nВыбери кейс:',
    caseOpened: (n, r) => `🎉 Из кейса:\n🃏 ${n}\n✨ ${r}`,
    caseNoCards: '❌ Нет карточек нужной редкости',
    sellMenu: '💸 ПРОДАЖА\n\nВыбери карточку:',
    sellConfirm: (n, r, c, d) => { let rw = c > 0 ? `${c}💰` : ''; if (d > 0) rw += (rw ? '+' : '') + `${d}💎`; return `Продать?\n🃏 ${n} [${r}]\nНаграда: ${rw}`; },
    cardSold: (n, c, d) => { let rw = c > 0 ? `${c}💰` : ''; if (d > 0) rw += (rw ? '+' : '') + `${d}💎`; return `✅ "${n}" продана!\nПолучено: ${rw}`; },
    cardNotFound: '❌ Карточка не найдена.',
    boxesMenu: '📫 БОКСЫ\n\nВыбери бокс:',
    boxOpened: '🎁 ИЗ БОКСА ВЫПАЛО:',
    boxNoRewards: '❌ В боксе нет наград.',
    boxEmpty: '❌ Бокс закончился!',
    rewardCoins: (n) => `💰 ${n} монет`,
    rewardDiamonds: (n) => `💎 ${n} алмазов`,
    rewardCard: (n, r) => `🃏 ${n} [${r}]`,
    rewardUpgrade: (n) => `⚡ +${n} к силе клика`,
    adminBoxName: '📫 Название бокса:',
    adminBoxCurrency: (n) => `Бокс: ${n}\nВалюта оплаты:`,
    adminBoxPrice: '💰 Цена бокса:',
    adminBoxLimit: 'Лимит открытий (0 = без лимита):',
    adminBoxCreated: (n) => `✅ Бокс "${n}" создан!\nДобавь награды:`,
    adminBoxAddReward: 'Выбери тип награды для бокса:',
    adminBoxCoinsAmt: '💰 Кол-во монет в награде:',
    adminBoxDiamAmt: '💎 Кол-во алмазов в награде:',
    adminBoxUpgrAmt: '⚡ +Сколько к силе клика:',
    adminBoxWeight: '⚖️ Вес этой награды (100=часто, 1=редко):',
    adminBoxRewardAdded: '✅ Награда добавлена!',
    newFootageNotify: (name, link) => `🎬 Новый футаж на сайте!\n\n📌 ${name}\n🔗 <a href="${link}">Видео</a>`,
    submissionApproved: (name, link) => `✅ Твой футаж «${name}» одобрен и уже на сайте!\n🔗 <a href="${link}">Видео</a>`,
    newNewsNotify: (title, content) => `📰 Новая новость на сайте!\n\n📌 ${title}${content ? `\n\n${content}` : ''}`,
    submissionRejected: (name) => `❌ Твой футаж «${name}» отклонили модератором.`,

    // ── Мини-игры ──
    gamesMenu: '🎮 МИНИ-ИГРЫ\n\nДоступные игры:\n\n⚔️ /battle <валюта> <ставка> — ПвП-бой\n🎲 /dice <валюта> <ставка> — Кости\n🎰 /slots <валюта> <ставка> — Слоты\n🪙 /flip <валюта> <ставка> <heads|tails> — Монетка\n🎡 /roulette <red|black|green> <валюта> <ставка> — Рулетка\n\nВалюта: coins / diamonds',
    gameInvalidCurrency: '❌ Валюта: coins или diamonds',
    gameInvalidBet: (min, max, cur) => `❌ Ставка для ${cur}: от ${min} до ${max}`,
    gameNotEnough: (cur, need) => `❌ Недостаточно ${cur === 'coins' ? '💰 монет' : '💎 алмазов'}! Нужно: ${need}`,
    gameUsageBattle: '⚔️ Использование: /battle <coins|diamonds> <ставка>',
    gameUsageDice: '🎲 Использование: /dice <coins|diamonds> <ставка>',
    gameUsageSlots: '🎰 Использование: /slots <coins|diamonds> <ставка>',
    gameUsageFlip: '🪙 Использование: /flip <coins|diamonds> <ставка> <heads|tails>',
    gameUsageRoulette: '🎡 Использование: /roulette <red|black|green> <coins|diamonds> <ставка>',
    battleCreated: (name, cur, amt) => `⚔️ ${name} вызывает на бой!\n\n💰 Ставка: ${amt} ${cur === 'coins' ? '💰 монет' : '💎 алмазов'}\n⏱ Ожидание: 5 минут\n\nПрими вызов!`,
    battleAcceptBtn: '⚔️ Принять бой!',
    battleAlreadyHas: '⚠️ У тебя уже есть активный вызов. Дождись принятия или истечения.',
    battleNotFound: '❌ Вызов не найден или истёк.',
    battleSelf: '❌ Нельзя принять свой собственный вызов.',
    battleResult: (winner, loser, cur, amt) => `⚔️ БОЙ ЗАВЕРШЁН!\n\n🏆 Победитель: ${winner}\n💀 Проигравший: ${loser}\n\n+${amt * 2} ${cur === 'coins' ? '💰' : '💎'} → ${winner}`,
    battleExpired: '⌛ Вызов истёк — ставка возвращена.',
    diceResult: (myRoll, botRoll, won, cur, amt) => `🎲 Ты: ${myRoll} | Бот: ${botRoll}\n\n${won === 'win' ? `🎉 Ты выиграл! +${amt}${cur === 'coins' ? '💰' : '💎'}` : won === 'lose' ? `💀 Ты проиграл! -${amt}${cur === 'coins' ? '💰' : '💎'}` : `🤝 Ничья! Ставка возвращена.`}`,
    slotsResult: (s1, s2, s3, mult, cur, bet) => {
        let line = `🎰 [ ${s1} | ${s2} | ${s3} ]\n\n`;
        if (mult === 0) return line + `💀 Не повезло! -${bet}${cur === 'coins' ? '💰' : '💎'}`;
        if (mult === 1) return line + `🤝 Два совпадения! Ставка возвращена.`;
        return line + `🎉 ДЖЕКПОТ ×${mult}! +${Math.floor(bet * mult)}${cur === 'coins' ? '💰' : '💎'}`;
    },
    flipResult: (side, won, cur, amt) => `🪙 Выпало: ${side === 'heads' ? 'Орёл 🦅' : 'Решка 🔵'}\n\n${won ? `🎉 Ты выиграл! +${amt}${cur === 'coins' ? '💰' : '💎'}` : `💀 Ты проиграл! -${amt}${cur === 'coins' ? '💰' : '💎'}`}`,
    rouletteResult: (num, color, bet, won, mult, cur, amt) => {
        const clr = color === 'red' ? '🔴' : color === 'black' ? '⚫' : '🟢';
        let line = `🎡 Выпало: ${clr} ${num}\n\n`;
        if (won) return line + `🎉 Выиграл! +${Math.floor(amt * mult)}${cur === 'coins' ? '💰' : '💎'}`;
        return line + `💀 Не твоя! -${amt}${cur === 'coins' ? '💰' : '💎'}`;
    },
    rouletteInvalidBet: '❌ Выбери: red, black или green',

    btnProfile: '👤 Профиль', btnCards: '🃏 Карточки',
    btnDrops: '🎁 Дропы', btnClicker: '👆 Кликер',
    btnShop: '🛒 Магазин', btnReferrals: '👥 Рефералы',
    btnCases: '📦 Кейсы', btnSell: '💸 Продать',
    btnBoxes: '📫 Боксы', btnRating: '🏆 Рейтинг',
    btnSettings: '⚙️ Настройки', btnAdmin: '⚙️ Админ',
    btnGames: '🎮 Игры', btnBack: '⬅️ Назад',
    rarities: {
        common: '⚪ Обычная', uncommon: '🟢 Необычная', rare: '🔵 Редкая',
        epic: '🟣 Эпическая', legendary: '🟡 Легендарная', mythic: '🔴 Мифическая', unique: '🌟 Уникальная'
    }
};

const i18n = {
    ru: { ...BASE },
    uk: {
        ...BASE,
        welcome: (n) => `🎴 Ласкаво просимо, ${n}!\n\nОбери дію 👇`,
        linkFirst: '❌ Спочатку прив\'яжи акаунт через /link КОД',
        showIdMsg: (tid) => `🆔 Твій Telegram ID:\n<code>${tid}</code>\n\nЩо далі:\n1️⃣ Скопіюй цей ID\n2️⃣ Встав його у поле «Telegram ID» на сторінці реєстрації сайту\n3️⃣ Натисни «Далі» — сюди прийде код підтвердження\n4️⃣ Введи код на сайті — акаунт створено і одразу прив'язано до Telegram\n\nВже є акаунт на сайті? Просто прив'яжи його: /link КОД (код візьми у профілі на сайті).`,
        registerCodeMsg: (code) => `🔐 Код підтвердження реєстрації: <b>${code}</b>\n\nВведи його на сайті, щоб завершити реєстрацію.\n⏳ Код діє 10 хвилин.`,
        loginCodeMsg: (code) => `🔐 Код входу: <b>${code}</b>\n\nВведи його на сайті, щоб увійти в акаунт.\n⏳ Код діє 5 хвилин.\n\nЯкщо це були не ви — просто ігноруй повідомлення.`,
        banned: '🚫 Акаунт заблоковано.',
        profile: (u, w, c) => `👤 ПРОФІЛЬ\n\n🆔 ID: ${u.id}\n👤 Нік: ${u.username}\n👑 Роль: ${u.role}\n\n💰 Монети: ${w.coins}\n💎 Алмази: ${w.diamonds}\n⭐ Очки: ${w.points}\n🃏 Карток: ${c}`,
        noCards: '🃏 У тебе поки немає карток.',
        myCards: '🃏 МОЇ КАРТКИ\n\n',
        clicker: (w, cl, rem) => `👆 КЛІКЕР\n\n💰 ${w.coins} | 💎 ${w.diamonds}\n⚡ Сила: +${cl.click_power}\n⏱ КД: ${cl.cooldown}с\n\n${rem > 0 ? `⏳ Через ${rem}с` : '🟢 Готово!'}`,
        offlineBought: '✅ Офлайн клік куплено!',
        offlineAlready: '⚠️ Офлайн клік вже куплено.',
        offlineCollected: (n) => `💤 Поки ти був офлайн, накопичилось +${n} 💰`,
        languageSaved: '✅ Мову збережено!',
        shopText: (n, hasOffline) => `🛒 МАГАЗИН\n\n⚡ Сила кліку: +${n}\n💤 Офлайн клік: ${hasOffline ? '✅ Активний (+5/хв)' : '❌ Не куплений'}\n\nКупи покращення:`,
        gamesMenu: '🎮 МІНІ-ІГРИ\n\nДоступні ігри:\n\n⚔️ /battle <валюта> <ставка>\n🎲 /dice <валюта> <ставка>\n🎰 /slots <валюта> <ставка>\n🪙 /flip <валюта> <ставка> <heads|tails>\n🎡 /roulette <red|black|green> <валюта> <ставка>',
        newFootageNotify: (name, link) => `🎬 Новий футаж на сайті!\n\n📌 ${name}\n🔗 <a href="${link}">Відео</a>`,
        submissionApproved: (name, link) => `✅ Твій футаж «${name}» схвалено!\n🔗 <a href="${link}">Відео</a>`,
        newNewsNotify: (title, content) => `📰 Нова новина!\n\n📌 ${title}${content ? `\n\n${content}` : ''}`,
        submissionRejected: (name) => `❌ Твій футаж «${name}» відхилив модератор.`,
        btnProfile: '👤 Профіль', btnCards: '🃏 Картки', btnDrops: '🎁 Дропи',
        btnClicker: '👆 Клікер', btnShop: '🛒 Магазин', btnReferrals: '👥 Реферали',
        btnCases: '📦 Кейси', btnSell: '💸 Продати', btnBoxes: '📫 Бокси',
        btnRating: '🏆 Рейтинг', btnSettings: '⚙️ Налаштування',
        btnAdmin: '⚙️ Адмін', btnGames: '🎮 Ігри', btnBack: '⬅️ Назад',
        rarities: { common: '⚪ Звичайна', uncommon: '🟢 Незвичайна', rare: '🔵 Рідкісна', epic: '🟣 Епічна', legendary: '🟡 Легендарна', mythic: '🔴 Міфічна', unique: '🌟 Унікальна' }
    },
    en: {
        ...BASE,
        welcome: (n) => `🎴 Welcome, ${n}!\n\nChoose an action 👇`,
        linkFirst: '❌ First link your account: /link CODE',
        showIdMsg: (tid) => `🆔 Your Telegram ID:\n<code>${tid}</code>\n\nWhat's next:\n1️⃣ Copy this ID\n2️⃣ Paste it into the "Telegram ID" field on the site's registration page\n3️⃣ Tap "Next" — a confirmation code will be sent here\n4️⃣ Enter the code on the site — your account is created and linked right away\n\nAlready have an account on the site? Just link it: /link CODE (get the code from your profile on the site).`,
        registerCodeMsg: (code) => `🔐 Registration confirmation code: <b>${code}</b>\n\nEnter it on the site to finish registering.\n⏳ Valid for 10 minutes.`,
        loginCodeMsg: (code) => `🔐 Login code: <b>${code}</b>\n\nEnter it on the site to log in.\n⏳ Valid for 5 minutes.\n\nIf this wasn't you, just ignore this message.`,
        banned: '🚫 Account is banned.',
        profile: (u, w, c) => `👤 PROFILE\n\n🆔 ID: ${u.id}\n👤 Username: ${u.username}\n👑 Role: ${u.role}\n\n💰 Coins: ${w.coins}\n💎 Diamonds: ${w.diamonds}\n⭐ Points: ${w.points}\n🃏 Cards: ${c}`,
        noCards: '🃏 You have no cards yet.',
        myCards: '🃏 MY CARDS\n\n',
        clicker: (w, cl, rem) => `👆 CLICKER\n\n💰 ${w.coins} | 💎 ${w.diamonds}\n⚡ Power: +${cl.click_power}\n⏱ CD: ${cl.cooldown}s\n\n${rem > 0 ? `⏳ Next in ${rem}s` : '🟢 Ready!'}`,
        offlineBought: '✅ Offline click purchased!',
        offlineAlready: '⚠️ Offline click already purchased.',
        offlineCollected: (n) => `💤 While offline you earned +${n} 💰`,
        shopText: (n, hasOffline) => `🛒 SHOP\n\n⚡ Click power: +${n}\n💤 Offline click: ${hasOffline ? '✅ Active (+5/min)' : '❌ Not purchased'}\n\nBuy upgrade:`,
        languageSaved: '✅ Language saved!',
        gamesMenu: '🎮 MINI-GAMES\n\nAvailable:\n\n⚔️ /battle <currency> <bet>\n🎲 /dice <currency> <bet>\n🎰 /slots <currency> <bet>\n🪙 /flip <currency> <bet> <heads|tails>\n🎡 /roulette <red|black|green> <currency> <bet>',
        newFootageNotify: (name, link) => `🎬 New footage!\n\n📌 ${name}\n🔗 <a href="${link}">Video</a>`,
        submissionApproved: (name, link) => `✅ Your footage "${name}" was approved!\n🔗 <a href="${link}">Video</a>`,
        newNewsNotify: (title, content) => `📰 New news!\n\n📌 ${title}${content ? `\n\n${content}` : ''}`,
        submissionRejected: (name) => `❌ Your footage "${name}" was rejected.`,
        btnProfile: '👤 Profile', btnCards: '🃏 Cards', btnDrops: '🎁 Drops',
        btnClicker: '👆 Clicker', btnShop: '🛒 Shop', btnReferrals: '👥 Referrals',
        btnCases: '📦 Cases', btnSell: '💸 Sell', btnBoxes: '📫 Boxes',
        btnRating: '🏆 Rating', btnSettings: '⚙️ Settings',
        btnAdmin: '⚙️ Admin', btnGames: '🎮 Games', btnBack: '⬅️ Back',
        rarities: { common: '⚪ Common', uncommon: '🟢 Uncommon', rare: '🔵 Rare', epic: '🟣 Epic', legendary: '🟡 Legendary', mythic: '🔴 Mythic', unique: '🌟 Unique' }
    }
};

function t(lang, key, ...args) {
    const tr = i18n[lang] || i18n.ru;
    const val = tr[key] !== undefined ? tr[key] : (i18n.ru[key] || key);
    if (typeof val === 'function') return val(...args);
    return val;
}

// =====================================================
// БАЗА ДАННЫХ
// =====================================================
async function startDatabase() {
    db = await open({ filename: path.join(__dirname, 'database.db'), driver: sqlite3.Database });

    await db.exec(`
        CREATE TABLE IF NOT EXISTS users (
            id INTEGER PRIMARY KEY AUTOINCREMENT, username TEXT UNIQUE NOT NULL,
            password TEXT NOT NULL, role TEXT DEFAULT 'user',
            telegram_id TEXT UNIQUE, telegram_username TEXT,
            telegram_link_code TEXT, telegram_link_expires TEXT,
            telegram_lang TEXT DEFAULT 'ru', is_banned INTEGER DEFAULT 0,
            created_at TEXT NOT NULL DEFAULT (datetime('now'))
        );
        CREATE TABLE IF NOT EXISTS telegram_users (
            telegram_id TEXT PRIMARY KEY, telegram_username TEXT,
            user_id INTEGER, lang TEXT DEFAULT 'ru', first_seen TEXT, last_seen TEXT
        );
        CREATE TABLE IF NOT EXISTS game_wallets (
            user_id INTEGER PRIMARY KEY, coins INTEGER DEFAULT 0,
            diamonds INTEGER DEFAULT 0, points INTEGER DEFAULT 0,
            total_coins_earned INTEGER DEFAULT 0,
            offline_click INTEGER DEFAULT 0, last_seen TEXT
        );
        CREATE TABLE IF NOT EXISTS clicker_stats (
            user_id INTEGER PRIMARY KEY, click_power INTEGER DEFAULT 1,
            cooldown INTEGER DEFAULT 5, last_click TEXT
        );
        CREATE TABLE IF NOT EXISTS referrals (
            id INTEGER PRIMARY KEY AUTOINCREMENT, referrer_id INTEGER NOT NULL,
            referred_id INTEGER UNIQUE NOT NULL, reward INTEGER DEFAULT 100, created_at TEXT NOT NULL
        );
        CREATE TABLE IF NOT EXISTS cards (
            id INTEGER PRIMARY KEY AUTOINCREMENT, name TEXT NOT NULL, rarity TEXT NOT NULL,
            image TEXT, media_type TEXT DEFAULT 'photo', drop_weight INTEGER DEFAULT 100,
            created_at TEXT DEFAULT CURRENT_TIMESTAMP
        );
        CREATE TABLE IF NOT EXISTS user_cards (
            id INTEGER PRIMARY KEY AUTOINCREMENT, user_id INTEGER NOT NULL,
            card_id INTEGER NOT NULL, amount INTEGER DEFAULT 1,
            obtained_at TEXT DEFAULT CURRENT_TIMESTAMP,
            UNIQUE(user_id, card_id)
        );
        CREATE TABLE IF NOT EXISTS drops (
            id INTEGER PRIMARY KEY AUTOINCREMENT, name TEXT NOT NULL, currency TEXT NOT NULL,
            price INTEGER NOT NULL, max_opens INTEGER, opens INTEGER DEFAULT 0, created_at TEXT NOT NULL
        );
        CREATE TABLE IF NOT EXISTS drop_cards (
            id INTEGER PRIMARY KEY AUTOINCREMENT, drop_id INTEGER NOT NULL,
            card_id INTEGER NOT NULL, weight INTEGER DEFAULT 100
        );
        CREATE TABLE IF NOT EXISTS airdrops (
            id INTEGER PRIMARY KEY AUTOINCREMENT, coins INTEGER DEFAULT 0,
            diamonds INTEGER DEFAULT 0, max_claims INTEGER, claims INTEGER DEFAULT 0
        );
        CREATE TABLE IF NOT EXISTS airdrop_claims (
            airdrop_id INTEGER NOT NULL, user_id INTEGER NOT NULL,
            PRIMARY KEY (airdrop_id, user_id)
        );
        CREATE TABLE IF NOT EXISTS moderator_airdrop_log (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            moderator_id INTEGER NOT NULL,
            created_at TEXT DEFAULT CURRENT_TIMESTAMP
        );
        CREATE TABLE IF NOT EXISTS boxes (
            id INTEGER PRIMARY KEY AUTOINCREMENT, name TEXT NOT NULL,
            currency TEXT NOT NULL, price INTEGER NOT NULL,
            max_opens INTEGER, opens INTEGER DEFAULT 0, created_at TEXT DEFAULT CURRENT_TIMESTAMP
        );
        CREATE TABLE IF NOT EXISTS box_rewards (
            id INTEGER PRIMARY KEY AUTOINCREMENT, box_id INTEGER NOT NULL,
            type TEXT NOT NULL, value INTEGER DEFAULT 0,
            card_id INTEGER, weight INTEGER DEFAULT 100
        );
        CREATE TABLE IF NOT EXISTS bot_notifications (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            type TEXT NOT NULL, target_user_id INTEGER,
            title TEXT, message TEXT, image_path TEXT, link TEXT,
            created_at TEXT NOT NULL, processed INTEGER DEFAULT 0
        );

        -- ===================== МИНИ-ИГРЫ =====================
        CREATE TABLE IF NOT EXISTS battles (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            creator_id INTEGER NOT NULL,
            currency TEXT NOT NULL,
            amount INTEGER NOT NULL,
            status TEXT DEFAULT 'waiting',
            winner_id INTEGER,
            opponent_id INTEGER,
            chat_id INTEGER,
            message_id INTEGER,
            created_at TEXT NOT NULL,
            expires_at TEXT NOT NULL
        );
        CREATE TABLE IF NOT EXISTS game_history (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            user_id INTEGER NOT NULL,
            game TEXT NOT NULL,
            currency TEXT NOT NULL,
            bet INTEGER NOT NULL,
            result TEXT NOT NULL,
            profit INTEGER NOT NULL,
            created_at TEXT DEFAULT CURRENT_TIMESTAMP
        );
    `);

    const tryAdd = async (tbl, col, def) => {
        try {
            const cols = await db.all(`PRAGMA table_info(${tbl})`);
            if (!cols.find(c => c.name === col)) await db.exec(`ALTER TABLE ${tbl} ADD COLUMN ${col} ${def}`);
        } catch { }
    };
    await tryAdd('cards', 'media_type', "TEXT DEFAULT 'photo'");
    await tryAdd('users', 'telegram_lang', "TEXT DEFAULT 'ru'");
    await tryAdd('game_wallets', 'total_coins_earned', 'INTEGER DEFAULT 0');
    await tryAdd('game_wallets', 'offline_click', 'INTEGER DEFAULT 0');
    await tryAdd('game_wallets', 'last_seen', 'TEXT');
    await tryAdd('airdrops', 'diamonds', 'INTEGER DEFAULT 0');
    await tryAdd('user_cards', 'amount', 'INTEGER DEFAULT 1');
    await tryAdd('bot_notifications', 'target_chat_id', 'TEXT');

    console.log('✅ База подключена');
}

// =====================================================
// HELPERS
// =====================================================
async function getUser(tid) {
    return db.get('SELECT id,username,role,telegram_id,telegram_username,is_banned,telegram_lang FROM users WHERE telegram_id=? LIMIT 1', [String(tid)]);
}
async function getUserLang(tid) { return (await getUser(tid))?.telegram_lang || 'ru'; }

async function ensureWallet(uid) {
    await db.run('INSERT INTO game_wallets (user_id,coins,diamonds,points,total_coins_earned,offline_click,last_seen) VALUES (?,0,0,0,0,0,NULL) ON CONFLICT(user_id) DO NOTHING', [uid]);
    await db.run('INSERT INTO clicker_stats (user_id,click_power,cooldown,last_click) VALUES (?,1,5,NULL) ON CONFLICT(user_id) DO NOTHING', [uid]);
}
async function getWallet(uid) { await ensureWallet(uid); return db.get('SELECT * FROM game_wallets WHERE user_id=?', [uid]); }
async function getClicker(uid) { await ensureWallet(uid); return db.get('SELECT * FROM clicker_stats WHERE user_id=?', [uid]); }

async function addCoins(uid, amount) {
    await ensureWallet(uid);
    const before = await db.get('SELECT total_coins_earned FROM game_wallets WHERE user_id=?', [uid]);
    const tot = (before?.total_coins_earned || 0) + amount;
    const newDiamonds = Math.floor(tot / COINS_PER_DIAMOND) - Math.floor((tot - amount) / COINS_PER_DIAMOND);
    await db.run('UPDATE game_wallets SET coins=coins+?,points=points+1,total_coins_earned=total_coins_earned+?,diamonds=diamonds+? WHERE user_id=?', [amount, amount, newDiamonds, uid]);
    return { diamondsAdded: newDiamonds };
}

async function collectOfflineCoins(uid) {
    const w = await db.get('SELECT offline_click, last_seen FROM game_wallets WHERE user_id=?', [uid]);
    if (!w || !w.offline_click || !w.last_seen) return 0;
    const minutes = Math.floor((Date.now() - new Date(w.last_seen).getTime()) / 60000);
    if (minutes < 1) return 0;
    const capped = Math.min(minutes, OFFLINE_MAX_MINUTES);
    const earned = capped * OFFLINE_CLICK_POWER;
    await addCoins(uid, earned);
    return earned;
}

async function updateLastSeen(uid) {
    await db.run('UPDATE game_wallets SET last_seen=? WHERE user_id=?', [new Date().toISOString(), uid]);
}

async function checkModAirdropLimit(modId) {
    const today = new Date().toISOString().split('T')[0];
    const row = await db.get(`SELECT COUNT(*) as cnt FROM moderator_airdrop_log WHERE moderator_id=? AND date(created_at)=?`, [modId, today]);
    const cnt = row?.cnt || 0;
    return { cnt, left: MOD_AIRDROP_LIMITS.maxPerDay - cnt, ok: cnt < MOD_AIRDROP_LIMITS.maxPerDay };
}
async function logModAirdrop(modId) {
    await db.run('INSERT INTO moderator_airdrop_log (moderator_id) VALUES (?)', [modId]);
}

async function giveCard(uid, cardId) {
    await db.run(`INSERT INTO user_cards (user_id,card_id,amount,obtained_at) VALUES (?,?,1,datetime('now'))
        ON CONFLICT(user_id,card_id) DO UPDATE SET amount=amount+1, obtained_at=datetime('now')`, [uid, cardId]);
}

// ── Списание / начисление для игр ──
async function deductCurrency(uid, currency, amount) {
    const col = currency === 'coins' ? 'coins' : 'diamonds';
    await db.run(`UPDATE game_wallets SET ${col}=${col}-? WHERE user_id=?`, [amount, uid]);
}
async function addCurrency(uid, currency, amount) {
    if (currency === 'coins') { await addCoins(uid, amount); }
    else { await db.run('UPDATE game_wallets SET diamonds=diamonds+? WHERE user_id=?', [amount, uid]); }
}

// ── Валидация ставки ──
function validateBet(currency, amount) {
    if (!['coins', 'diamonds'].includes(currency)) return 'currency';
    const lim = GAME_LIMITS[currency];
    if (isNaN(amount) || amount < lim.min || amount > lim.max) return 'amount';
    return 'ok';
}

async function checkBalance(uid, currency, amount) {
    const w = await getWallet(uid);
    return (w[currency] || 0) >= amount;
}

// ── Лог игры ──
async function logGame(uid, game, currency, bet, result, profit) {
    await db.run('INSERT INTO game_history (user_id,game,currency,bet,result,profit) VALUES (?,?,?,?,?,?)',
        [uid, game, currency, bet, result, profit]);
}

// =====================================================
// СЛОТ-МАШИНА — вспомогательные функции
// =====================================================
function slotSpin() {
    const total = SLOTS_W.reduce((a, b) => a + b, 0);
    function pick() {
        let r = Math.random() * total;
        for (let i = 0; i < SLOTS_SYMS.length; i++) { r -= SLOTS_W[i]; if (r <= 0) return SLOTS_SYMS[i]; }
        return SLOTS_SYMS[SLOTS_SYMS.length - 1];
    }
    return [pick(), pick(), pick()];
}

function calcSlotsMultiplier(reels) {
    const [a, b, c] = reels;
    if (a === b && b === c) return SLOTS_PAY[a] || 2; // 3 одинаковых
    if (a === b || b === c || a === c) return 1;       // 2 одинаковых — возврат
    return 0;                                           // ничего
}

// =====================================================
// МИНИ-ИГРЫ
// =====================================================

// ─── BATTLE ───
async function handleBattleCommand(msg, args) {
    const tid = msg.from.id;
    const chatId = msg.chat.id;
    const user = await getUser(tid);
    const lang = user?.telegram_lang || 'ru';
    if (!user) return bot.sendMessage(chatId, t(lang, 'linkFirst'));

    const [rawCurrency, rawAmount] = args;
    const currency = rawCurrency?.toLowerCase();
    const amount = parseInt(rawAmount);
    const valid = validateBet(currency, amount);

    if (!rawCurrency || !rawAmount || valid === 'currency') return bot.sendMessage(chatId, t(lang, 'gameUsageBattle'));
    if (valid === 'amount') return bot.sendMessage(chatId, t(lang, 'gameInvalidBet', GAME_LIMITS[currency].min, GAME_LIMITS[currency].max, currency));

    const hasFunds = await checkBalance(user.id, currency, amount);
    if (!hasFunds) return bot.sendMessage(chatId, t(lang, 'gameNotEnough', currency, amount));

    // Проверяем, нет ли уже активного вызова от этого игрока
    const existing = await db.get(`SELECT id FROM battles WHERE creator_id=? AND status='waiting' AND expires_at > datetime('now')`, [user.id]);
    if (existing) return bot.sendMessage(chatId, t(lang, 'battleAlreadyHas'));

    // Списываем ставку
    await deductCurrency(user.id, currency, amount);

    const expiresAt = new Date(Date.now() + BATTLE_EXPIRE_MS).toISOString();
    const res = await db.run(
        `INSERT INTO battles (creator_id, currency, amount, status, chat_id, created_at, expires_at) VALUES (?,?,?,'waiting',?,datetime('now'),?)`,
        [user.id, currency, amount, msg.chat.id, expiresAt]
    );
    const battleId = res.lastID;

    const text = t(lang, 'battleCreated', user.username, currency, amount);
    const sent = await bot.sendMessage(msg.chat.id, text, {
        reply_markup: {
            inline_keyboard: [[{ text: t(lang, 'battleAcceptBtn'), callback_data: `accept_battle_${battleId}` }]]
        }
    });

    // Сохраняем message_id для последующего редактирования
    await db.run('UPDATE battles SET message_id=? WHERE id=?', [sent.message_id, battleId]);
}

// Принятие боя (callback)
async function handleBattleAccept(query, battleId) {
    const tid = query.from.id;
    const user = await getUser(tid);
    const lang = user?.telegram_lang || 'ru';
    if (!user) return bot.answerCallbackQuery(query.id, { text: t(lang, 'linkFirst') });

    const battle = await db.get(`SELECT * FROM battles WHERE id=? AND status='waiting'`, [battleId]);
    if (!battle) return bot.answerCallbackQuery(query.id, { text: t(lang, 'battleNotFound'), show_alert: true });
    if (new Date(battle.expires_at) < new Date()) {
        return bot.answerCallbackQuery(query.id, { text: t(lang, 'battleNotFound'), show_alert: true });
    }
    if (battle.creator_id === user.id) {
        return bot.answerCallbackQuery(query.id, { text: t(lang, 'battleSelf'), show_alert: true });
    }

    // Проверяем баланс противника
    const hasFunds = await checkBalance(user.id, battle.currency, battle.amount);
    if (!hasFunds) return bot.answerCallbackQuery(query.id, { text: t(lang, 'gameNotEnough', battle.currency, battle.amount), show_alert: true });

    // Списываем ставку у принимающего
    await deductCurrency(user.id, battle.currency, battle.amount);

    // Определяем победителя
    const creatorWins = Math.random() < 0.5;
    const winnerId = creatorWins ? battle.creator_id : user.id;
    const loserId = creatorWins ? user.id : battle.creator_id;

    // Начисляем двойную ставку победителю
    await addCurrency(winnerId, battle.currency, battle.amount * 2);

    await db.run(`UPDATE battles SET status='finished', winner_id=?, opponent_id=? WHERE id=?`,
        [winnerId, user.id, battleId]);

    // Получаем ники
    const winnerUser = await db.get('SELECT username FROM users WHERE id=?', [winnerId]);
    const loserUser = await db.get('SELECT username FROM users WHERE id=?', [loserId]);

    const resultText = t(lang, 'battleResult',
        winnerUser.username, loserUser.username, battle.currency, battle.amount);

    // Редактируем исходное сообщение
    try {
        await bot.editMessageText(resultText, {
            chat_id: battle.chat_id,
            message_id: battle.message_id,
            reply_markup: { inline_keyboard: [] }
        });
    } catch { }

    await bot.answerCallbackQuery(query.id, { text: '⚔️ Бой начат!', show_alert: false });

    await logGame(user.id, 'battle', battle.currency, battle.amount,
        winnerId === user.id ? 'win' : 'lose',
        winnerId === user.id ? battle.amount : -battle.amount);
    await logGame(battle.creator_id, 'battle', battle.currency, battle.amount,
        winnerId === battle.creator_id ? 'win' : 'lose',
        winnerId === battle.creator_id ? battle.amount : -battle.amount);
}

// Возврат ставок по истёкшим боям
async function cleanupExpiredBattles() {
    const expired = await db.all(`SELECT * FROM battles WHERE status='waiting' AND expires_at <= datetime('now')`);
    for (const b of expired) {
        await addCurrency(b.creator_id, b.currency, b.amount);
        await db.run(`UPDATE battles SET status='expired' WHERE id=?`, [b.id]);
        const u = await db.get('SELECT telegram_id, telegram_lang FROM users WHERE id=?', [b.creator_id]);
        if (u?.telegram_id) {
            const lang = u.telegram_lang || 'ru';
            try { await bot.sendMessage(u.telegram_id, t(lang, 'battleExpired')); } catch { }
        }
        // Убираем кнопку из сообщения
        if (b.chat_id && b.message_id) {
            try { await bot.editMessageReplyMarkup({ inline_keyboard: [] }, { chat_id: b.chat_id, message_id: b.message_id }); } catch { }
        }
    }
}

// ─── DICE ───
async function handleDiceCommand(msg, args) {
    const tid = msg.from.id;
    const chatId = msg.chat.id;
    const user = await getUser(tid);
    const lang = user?.telegram_lang || 'ru';
    if (!user) return bot.sendMessage(chatId, t(lang, 'linkFirst'));

    const [rawCurrency, rawAmount] = args;
    const currency = rawCurrency?.toLowerCase();
    const amount = parseInt(rawAmount);
    const valid = validateBet(currency, amount);

    if (!rawCurrency || !rawAmount || valid === 'currency') return bot.sendMessage(chatId, t(lang, 'gameUsageDice'));
    if (valid === 'amount') return bot.sendMessage(chatId, t(lang, 'gameInvalidBet', GAME_LIMITS[currency].min, GAME_LIMITS[currency].max, currency));

    const hasFunds = await checkBalance(user.id, currency, amount);
    if (!hasFunds) return bot.sendMessage(chatId, t(lang, 'gameNotEnough', currency, amount));

    await deductCurrency(user.id, currency, amount);

    const myRoll = Math.ceil(Math.random() * 6);
    const botRoll = Math.ceil(Math.random() * 6);
    let result, profit;

    if (myRoll > botRoll) {
        result = 'win';
        profit = amount;
        await addCurrency(user.id, currency, amount * 2);
    } else if (myRoll < botRoll) {
        result = 'lose';
        profit = -amount;
    } else {
        result = 'draw';
        profit = 0;
        await addCurrency(user.id, currency, amount); // возврат
    }

    await logGame(user.id, 'dice', currency, amount, result, profit);
    return bot.sendMessage(chatId, t(lang, 'diceResult', myRoll, botRoll, result, currency, amount));
}

// ─── SLOTS ───
async function handleSlotsCommand(msg, args) {
    const tid = msg.from.id;
    const chatId = msg.chat.id;
    const user = await getUser(tid);
    const lang = user?.telegram_lang || 'ru';
    if (!user) return bot.sendMessage(chatId, t(lang, 'linkFirst'));

    const [rawCurrency, rawAmount] = args;
    const currency = rawCurrency?.toLowerCase();
    const amount = parseInt(rawAmount);
    const valid = validateBet(currency, amount);

    if (!rawCurrency || !rawAmount || valid === 'currency') return bot.sendMessage(chatId, t(lang, 'gameUsageSlots'));
    if (valid === 'amount') return bot.sendMessage(chatId, t(lang, 'gameInvalidBet', GAME_LIMITS[currency].min, GAME_LIMITS[currency].max, currency));

    const hasFunds = await checkBalance(user.id, currency, amount);
    if (!hasFunds) return bot.sendMessage(chatId, t(lang, 'gameNotEnough', currency, amount));

    await deductCurrency(user.id, currency, amount);

    const reels = slotSpin();
    const mult = calcSlotsMultiplier(reels);
    let result, profit;

    if (mult === 0) {
        result = 'lose';
        profit = -amount;
    } else if (mult === 1) {
        result = 'draw';
        profit = 0;
        await addCurrency(user.id, currency, amount);
    } else {
        result = 'win';
        profit = Math.floor(amount * mult) - amount;
        await addCurrency(user.id, currency, Math.floor(amount * mult));
    }

    await logGame(user.id, 'slots', currency, amount, result, profit);
    return bot.sendMessage(chatId, t(lang, 'slotsResult', reels[0], reels[1], reels[2], mult, currency, amount));
}

// ─── COINFLIP ───
async function handleFlipCommand(msg, args) {
    const tid = msg.from.id;
    const chatId = msg.chat.id;
    const user = await getUser(tid);
    const lang = user?.telegram_lang || 'ru';
    if (!user) return bot.sendMessage(chatId, t(lang, 'linkFirst'));

    const [rawCurrency, rawAmount, rawSide] = args;
    const currency = rawCurrency?.toLowerCase();
    const amount = parseInt(rawAmount);
    const side = rawSide?.toLowerCase();
    const valid = validateBet(currency, amount);

    if (!rawCurrency || !rawAmount || !rawSide || valid === 'currency' || !['heads', 'tails'].includes(side))
        return bot.sendMessage(chatId, t(lang, 'gameUsageFlip'));
    if (valid === 'amount')
        return bot.sendMessage(chatId, t(lang, 'gameInvalidBet', GAME_LIMITS[currency].min, GAME_LIMITS[currency].max, currency));

    const hasFunds = await checkBalance(user.id, currency, amount);
    if (!hasFunds) return bot.sendMessage(chatId, t(lang, 'gameNotEnough', currency, amount));

    await deductCurrency(user.id, currency, amount);

    const landed = Math.random() < 0.5 ? 'heads' : 'tails';
    const won = landed === side;

    if (won) await addCurrency(user.id, currency, amount * 2);

    await logGame(user.id, 'flip', currency, amount, won ? 'win' : 'lose', won ? amount : -amount);
    return bot.sendMessage(chatId, t(lang, 'flipResult', landed, won, currency, amount));
}

// ─── ROULETTE ───
async function handleRouletteCommand(msg, args) {
    const tid = msg.from.id;
    const chatId = msg.chat.id;
    const user = await getUser(tid);
    const lang = user?.telegram_lang || 'ru';
    if (!user) return bot.sendMessage(chatId, t(lang, 'linkFirst'));

    const [rawBetColor, rawCurrency, rawAmount] = args;
    const betColor = rawBetColor?.toLowerCase();
    const currency = rawCurrency?.toLowerCase();
    const amount = parseInt(rawAmount);
    const valid = validateBet(currency, amount);

    if (!rawBetColor || !rawCurrency || !rawAmount || !['red', 'black', 'green'].includes(betColor) || valid === 'currency')
        return bot.sendMessage(chatId, t(lang, 'gameUsageRoulette'));
    if (valid === 'amount')
        return bot.sendMessage(chatId, t(lang, 'gameInvalidBet', GAME_LIMITS[currency].min, GAME_LIMITS[currency].max, currency));

    const hasFunds = await checkBalance(user.id, currency, amount);
    if (!hasFunds) return bot.sendMessage(chatId, t(lang, 'gameNotEnough', currency, amount));

    await deductCurrency(user.id, currency, amount);

    const num = Math.floor(Math.random() * 37); // 0..36
    let color;
    if (num === 0) color = 'green';
    else if (ROULETTE_RED.has(num)) color = 'red';
    else color = 'black';

    const won = color === betColor;
    // Коэффициенты: red/black = 2x, green = 14x
    const mult = betColor === 'green' ? 14 : 2;
    let profit;

    if (won) {
        profit = Math.floor(amount * mult) - amount;
        await addCurrency(user.id, currency, Math.floor(amount * mult));
    } else {
        profit = -amount;
    }

    await logGame(user.id, 'roulette', currency, amount, won ? 'win' : 'lose', profit);
    return bot.sendMessage(chatId, t(lang, 'rouletteResult', num, color, betColor, won, mult, currency, amount));
}

// =====================================================
// УВЕДОМЛЕНИЯ С САЙТА
// =====================================================
async function broadcastToLinkedUsers(sendOne) {
    const users = await db.all('SELECT telegram_id, telegram_lang FROM users WHERE telegram_id IS NOT NULL');
    for (const u of users) {
        try { await sendOne(u.telegram_id, u.telegram_lang || 'ru'); } catch { }
        await new Promise(r => setTimeout(r, 35));
    }
}

async function processNotificationQueue() {
    let rows;
    try { rows = await db.all('SELECT * FROM bot_notifications WHERE processed = 0 ORDER BY id ASC LIMIT 20'); }
    catch { return; }
    if (!rows || !rows.length) return;

    for (const row of rows) {
        // ✅ Помечаем СРАЗУ, до рассылки — предотвращает дубли при долгой рассылке
        try { await db.run('UPDATE bot_notifications SET processed = 1 WHERE id = ?', [row.id]); } catch { }

        try {
            if (row.type === 'broadcast_footage') {
                await broadcastToLinkedUsers(async (chatId, lang) => {
                    await bot.sendMessage(chatId, t(lang, 'newFootageNotify', row.title, row.link), { parse_mode: 'HTML' });
                });
            } else if (row.type === 'broadcast_news') {
                await broadcastToLinkedUsers(async (chatId, lang) => {
                    const caption = t(lang, 'newNewsNotify', row.title, row.message || '');
                    let sentAsPhoto = false;
                    if (row.image_path) {
                        const fp = path.join(__dirname, 'public', String(row.image_path).replace(/^\/+/, ''));
                        if (fs.existsSync(fp)) { await bot.sendPhoto(chatId, fp, { caption }); sentAsPhoto = true; }
                    }
                    if (!sentAsPhoto) await bot.sendMessage(chatId, caption);
                });
            } else if (row.type === 'register_code' || row.type === 'login_code') {
                if (row.target_chat_id) {
                    let lang = 'ru';
                    try {
                        const tu = await db.get('SELECT lang FROM telegram_users WHERE telegram_id=?', [String(row.target_chat_id)]);
                        if (tu?.lang) lang = tu.lang;
                        else {
                            const u = await db.get('SELECT telegram_lang FROM users WHERE telegram_id=?', [String(row.target_chat_id)]);
                            if (u?.telegram_lang) lang = u.telegram_lang;
                        }
                    } catch { }
                    const key = row.type === 'register_code' ? 'registerCodeMsg' : 'loginCodeMsg';
                    await bot.sendMessage(row.target_chat_id, t(lang, key, row.message), { parse_mode: 'HTML' });
                }
            } else if (row.type === 'personal_approved' || row.type === 'personal_rejected') {
                if (row.target_user_id) {
                    const u = await db.get('SELECT telegram_id, telegram_lang FROM users WHERE id = ?', [row.target_user_id]);
                    if (u?.telegram_id) {
                        const lang = u.telegram_lang || 'ru';
                        const text = row.type === 'personal_approved'
                            ? t(lang, 'submissionApproved', row.title, row.link)
                            : t(lang, 'submissionRejected', row.title);
                        await bot.sendMessage(u.telegram_id, text);
                    }
                }
            }
        } catch (e) {
            console.error('Notification error #' + row.id + ':', e.message);
        }
    }
}

// =====================================================
// КЛАВИАТУРЫ
// =====================================================
function mainMenu(user, lang) {
    const kb = [
        [{ text: t(lang, 'btnProfile') }, { text: t(lang, 'btnCards') }],
        [{ text: t(lang, 'btnDrops') }, { text: t(lang, 'btnClicker') }],
        [{ text: t(lang, 'btnShop') }, { text: t(lang, 'btnReferrals') }],
        [{ text: t(lang, 'btnCases') }, { text: t(lang, 'btnSell') }],
        [{ text: t(lang, 'btnBoxes') }, { text: t(lang, 'btnRating') }],
        [{ text: t(lang, 'btnGames') }, { text: t(lang, 'btnSettings') }],
    ];
    if (isMod(user)) kb.push([{ text: t(lang, 'btnAdmin') }]);
    return { reply_markup: { keyboard: kb, resize_keyboard: true } };
}
function backBtn(lang) {
    return { reply_markup: { keyboard: [[{ text: t(lang, 'btnBack') }]], resize_keyboard: true } };
}

function weightedRandom(items) {
    const total = items.reduce((s, i) => s + Number(i.weight || 0), 0);
    let r = Math.random() * total;
    for (const item of items) { r -= Number(item.weight || 0); if (r <= 0) return item; }
    return items[items.length - 1];
}

async function downloadFile(fp, dest) {
    const https = require('https');
    const http = require('http');
    const base = process.env.TG_PROXY_URL || 'https://api.telegram.org';
    const url = `${base}/file/bot${BOT_TOKEN}/${fp}`;
    const client = url.startsWith('https') ? https : http;
    return new Promise((res, rej) => {
        const f = fs.createWriteStream(dest);
        client.get(url, r => {
            r.pipe(f);
            f.on('finish', () => f.close(res));
        }).on('error', e => { fs.unlink(dest, () => {}); rej(e); });
    });
}
async function sendCard(chatId, card, caption) {
    try {
        const fp = path.join(__dirname, (card.image || '').replace(/^\//, ''));
        if (fs.existsSync(fp)) {
            if (card.media_type === 'video') { await bot.sendVideo(chatId, fp, { caption }); return; }
            await bot.sendPhoto(chatId, fp, { caption }); return;
        }
    } catch { }
    await bot.sendMessage(chatId, caption);
}

// =====================================================
// КОМАНДЫ
// =====================================================
bot.onText(/^\/start(?:\s+(.+))?$/, async (msg, match) => {
    try {
        const tid = msg.from.id;
        const chatId = msg.chat.id;
        // Запоминаем telegram-пользователя сразу — это нужно, чтобы потом
        // отправить ему код регистрации/входа, даже если аккаунта на
        // сайте у него ещё нет.
        try {
            await db.run(
                `INSERT INTO telegram_users (telegram_id,telegram_username,first_seen,last_seen) VALUES (?,?,datetime('now'),datetime('now'))
                 ON CONFLICT(telegram_id) DO UPDATE SET telegram_username=excluded.telegram_username,last_seen=datetime('now')`,
                [String(tid), msg.from.username || null]
            );
        } catch (e) { console.error('START telegram_users upsert:', e.message); }

        const user = await getUser(tid);
        const fallbackLang = ['uk', 'en'].includes(msg.from.language_code) ? msg.from.language_code : 'ru';
        const lang = user?.telegram_lang || fallbackLang;
        if (!user) return bot.sendMessage(chatId, t(lang, 'showIdMsg', tid), { parse_mode: 'HTML' });
        const earned = await collectOfflineCoins(user.id);
        await updateLastSeen(user.id);
        const ref = match?.[1];
        if (ref?.startsWith('ref_')) {
            const rid = Number(ref.replace('ref_', ''));
            if (Number.isInteger(rid) && rid !== tid) {
                const referrer = await db.get('SELECT * FROM users WHERE telegram_id=?', [String(rid)]);
                if (referrer) {
                    const already = await db.get('SELECT id FROM referrals WHERE referred_id=?', [user.id]);
                    if (!already) { await ensureWallet(referrer.id); await db.run('INSERT OR IGNORE INTO referrals (referrer_id,referred_id,reward,created_at) VALUES (?,?,?,?)', [referrer.id, user.id, 100, new Date().toISOString()]); await addCoins(referrer.id, 100); }
                }
            }
        }
        await ensureWallet(user.id);
        let welcomeMsg = t(lang, 'welcome', user.username);
        if (earned > 0) welcomeMsg += '\n\n' + t(lang, 'offlineCollected', earned);
        await bot.sendMessage(chatId, welcomeMsg, mainMenu(user, lang));
    } catch (e) { console.error('START:', e); }
});

bot.onText(/^\/link(?:\s+(\d{6}))?$/i, async (msg, match) => {
    const chatId = msg.chat.id, tid = String(msg.from.id), lang = await getUserLang(msg.from.id);
    try {
        const code = match?.[1];
        if (!code) return bot.sendMessage(chatId, t(lang, 'linkHelp'));
        const user = await db.get('SELECT id,username,telegram_link_code,telegram_link_expires FROM users WHERE telegram_link_code=? LIMIT 1', [code]);
        if (!user) return bot.sendMessage(chatId, t(lang, 'linkNotFound'));
        if (!user.telegram_link_expires || new Date(user.telegram_link_expires).getTime() < Date.now()) return bot.sendMessage(chatId, t(lang, 'linkExpired'));
        const already = await db.get('SELECT id FROM users WHERE telegram_id=? AND id!=?', [tid, user.id]);
        if (already) return bot.sendMessage(chatId, t(lang, 'linkAlreadyUsed'));
        await db.run('UPDATE users SET telegram_id=?,telegram_username=?,telegram_link_code=NULL,telegram_link_expires=NULL WHERE id=?', [tid, msg.from.username || null, user.id]);
        await db.run(`INSERT INTO telegram_users (telegram_id,telegram_username,user_id,first_seen,last_seen) VALUES (?,?,?,datetime('now'),datetime('now')) ON CONFLICT(telegram_id) DO UPDATE SET telegram_username=excluded.telegram_username,user_id=excluded.user_id,last_seen=datetime('now')`, [tid, msg.from.username || null, user.id]);
        await bot.sendMessage(chatId, t(lang, 'linkSuccess', user.username, user.id));
    } catch (e) { console.error('LINK:', e); await bot.sendMessage(chatId, t(lang, 'errorGeneral')); }
});

bot.onText(/^\/airdrop$/, async (msg) => {
    const tid = msg.from.id;
    const chatId = msg.chat.id;
    const user = await getUser(tid);
    const lang = user?.telegram_lang || 'ru';
    if (!user || !isMod(user)) return bot.sendMessage(chatId, t(lang, 'noAccess'));
    if (!bot.userState) bot.userState = {};
    bot.userState[tid] = { action: 'admin_airdrop_type' };
    return bot.sendMessage(chatId, '🎁 Тип эйрдропа:', {
        reply_markup: { inline_keyboard: [[{ text: '💰 Монеты', callback_data: 'airdrop_type_coins' }], [{ text: '💎 Алмазы', callback_data: 'airdrop_type_diamonds' }]] }
    });
});

// ─── Мини-игры ───
bot.onText(/^\/battle(?:\s+(.+))?$/, async (msg, match) => {
    const args = (match?.[1] || '').trim().split(/\s+/);
    await handleBattleCommand(msg, args);
});

bot.onText(/^\/dice(?:\s+(.+))?$/, async (msg, match) => {
    const args = (match?.[1] || '').trim().split(/\s+/);
    await handleDiceCommand(msg, args);
});

bot.onText(/^\/slots(?:\s+(.+))?$/, async (msg, match) => {
    const args = (match?.[1] || '').trim().split(/\s+/);
    await handleSlotsCommand(msg, args);
});

bot.onText(/^\/flip(?:\s+(.+))?$/, async (msg, match) => {
    const args = (match?.[1] || '').trim().split(/\s+/);
    await handleFlipCommand(msg, args);
});

bot.onText(/^\/roulette(?:\s+(.+))?$/, async (msg, match) => {
    const args = (match?.[1] || '').trim().split(/\s+/);
    await handleRouletteCommand(msg, args);
});

bot.onText(/^\/games$/, async (msg) => {
    const tid = msg.from.id; const chatId = msg.chat.id;
    const user = await getUser(tid);
    const lang = user?.telegram_lang || 'ru';
    if (!user) return bot.sendMessage(chatId, t(lang, 'linkFirst'));
    return bot.sendMessage(chatId, t(lang, 'gamesMenu'), backBtn(lang));
});

// История игр
bot.onText(/^\/gamestats$/, async (msg) => {
    const tid = msg.from.id; const chatId = msg.chat.id;
    const user = await getUser(tid);
    const lang = user?.telegram_lang || 'ru';
    if (!user) return bot.sendMessage(chatId, t(lang, 'linkFirst'));

    const rows = await db.all(
        `SELECT game, COUNT(*) as total,
         SUM(CASE WHEN result='win' THEN 1 ELSE 0 END) as wins,
         SUM(profit) as net
         FROM game_history WHERE user_id=? GROUP BY game`,
        [user.id]
    );

    if (!rows.length) return bot.sendMessage(chatId, '📊 У тебя пока нет игровой статистики.');

    let text = '📊 ТВОЯ СТАТИСТИКА ИГР\n\n';
    for (const r of rows) {
        const icon = { battle: '⚔️', dice: '🎲', slots: '🎰', flip: '🪙', roulette: '🎡' }[r.game] || '🎮';
        const netStr = r.net >= 0 ? `+${r.net}` : `${r.net}`;
        text += `${icon} ${r.game}: ${r.wins}/${r.total} побед | итого: ${netStr}\n`;
    }
    return bot.sendMessage(chatId, text, backBtn(lang));
});

// =====================================================
// ОСНОВНОЙ ОБРАБОТЧИК СООБЩЕНИЙ
// =====================================================
bot.on('message', async (msg) => {
    if (!msg.text) return;
    const text = msg.text.trim();
    const tid = msg.from.id;
    const chatId = msg.chat.id;
    const isGroup = msg.chat.type === 'group' || msg.chat.type === 'supergroup' || msg.chat.type === 'channel';
    const isCommand = text.startsWith('/');

    const user = await getUser(tid);
    const lang = user?.telegram_lang || 'ru';

    // В группах реагируем ТОЛЬКО на команды
    if (isGroup && !isCommand) return;

    if (!user) {
        // В личке без команды — показываем инструкцию привязки
        if (!isCommand || text.startsWith('/link') || text.startsWith('/start')) return;
        // В группах "привяжи аккаунт" — только если явно вызвали команду
        return bot.sendMessage(chatId, t(lang, 'linkFirst'));
    }

    if (isCommand) {
        const cmd = text.split(' ')[0].toLowerCase().split('@')[0]; // убираем @botname в группах
        const cmdActions = {
            '/profile': 'showProfile', '/cards': 'showCards', '/shop': 'showShop',
            '/clicker': 'showClicker', '/drops': 'showDrops', '/cases': 'showCases',
            '/sell': 'showSell', '/boxes': 'showBoxes', '/rating': 'showRating',
            '/referrals': 'showReferrals', '/settings': 'showSettings'
        };
        const action = cmdActions[cmd];
        if (action) return handleAction(action, chatId, tid, user, lang, msg);
        return;
    }

    // Кнопки меню (только в личке)
    if (!isGroup) {
        const btnMap = {
            [t(lang, 'btnProfile')]: 'showProfile', [t(lang, 'btnCards')]: 'showCards',
            [t(lang, 'btnClicker')]: 'showClicker', [t(lang, 'btnDrops')]: 'showDrops',
            [t(lang, 'btnShop')]: 'showShop', [t(lang, 'btnReferrals')]: 'showReferrals',
            [t(lang, 'btnCases')]: 'showCases', [t(lang, 'btnSell')]: 'showSell',
            [t(lang, 'btnBoxes')]: 'showBoxes', [t(lang, 'btnRating')]: 'showRating',
            [t(lang, 'btnSettings')]: 'showSettings', [t(lang, 'btnAdmin')]: 'showAdmin',
            [t(lang, 'btnGames')]: 'showGames', [t(lang, 'btnBack')]: 'showBack',
            '👤 Профиль': 'showProfile', '👤 Профіль': 'showProfile', '👤 Profile': 'showProfile',
            '🃏 Карточки': 'showCards', '🃏 Картки': 'showCards', '🃏 Cards': 'showCards',
            '👆 Кликер': 'showClicker', '👆 Клікер': 'showClicker', '👆 Clicker': 'showClicker',
            '🎁 Дропы': 'showDrops', '🎁 Дропи': 'showDrops', '🎁 Drops': 'showDrops',
            '🛒 Магазин': 'showShop', '🛒 Shop': 'showShop',
            '👥 Рефералы': 'showReferrals', '👥 Реферали': 'showReferrals', '👥 Referrals': 'showReferrals',
            '📦 Кейсы': 'showCases', '📦 Кейси': 'showCases', '📦 Cases': 'showCases',
            '💸 Продать': 'showSell', '💸 Продати': 'showSell', '💸 Sell': 'showSell',
            '📫 Боксы': 'showBoxes', '📫 Бокси': 'showBoxes', '📫 Boxes': 'showBoxes',
            '🏆 Рейтинг': 'showRating', '🏆 Rating': 'showRating',
            '⚙️ Настройки': 'showSettings', '⚙️ Налаштування': 'showSettings', '⚙️ Settings': 'showSettings',
            '⚙️ Админ': 'showAdmin', '⚙️ Адмін': 'showAdmin', '⚙️ Admin': 'showAdmin',
            '🎮 Игры': 'showGames', '🎮 Ігри': 'showGames', '🎮 Games': 'showGames',
            '⬅️ Назад': 'showBack', '⬅️ Back': 'showBack',
        };
        const action = btnMap[text];
        if (action) return handleAction(action, chatId, tid, user, lang, msg);

        if (!bot.userState) bot.userState = {};
        const state = bot.userState[tid];
        if (state) return handleState(state, text, chatId, tid, user, lang, msg);
    }
});

// =====================================================
// ДЕЙСТВИЯ
// =====================================================
async function handleAction(action, chatId, tid, user, lang, msg) {
    switch (action) {
        case 'showBack':
            return bot.sendMessage(chatId, t(lang, 'mainMenu'), mainMenu(user, lang));
        case 'showProfile': {
            const w = await getWallet(user.id);
            const c = await db.get('SELECT SUM(amount) AS total FROM user_cards WHERE user_id=?', [user.id]);
            return bot.sendMessage(chatId, t(lang, 'profile', user, w, c?.total || 0));
        }
        case 'showCards': {
            const cards = await db.all(`SELECT uc.card_id, uc.amount, c.name, c.rarity, c.image, c.media_type FROM user_cards uc JOIN cards c ON c.id=uc.card_id WHERE uc.user_id=? ORDER BY uc.obtained_at DESC LIMIT 30`, [user.id]);
            if (!cards.length) return bot.sendMessage(chatId, t(lang, 'noCards'), backBtn(lang));
            let msg2 = t(lang, 'myCards');
            for (const c of cards) msg2 += t(lang, 'cardLine', c);
            return bot.sendMessage(chatId, msg2, backBtn(lang));
        }
        case 'showClicker': {
            const w = await getWallet(user.id), cl = await getClicker(user.id);
            let rem = 0;
            if (cl.last_click) rem = Math.max(0, cl.cooldown - Math.floor((Date.now() - new Date(cl.last_click).getTime()) / 1000));
            return bot.sendMessage(chatId, t(lang, 'clicker', w, cl, rem), { reply_markup: { inline_keyboard: [[{ text: '👆 CLICK!', callback_data: 'click' }]] } });
        }
        case 'showShop': {
            const cl = await getClicker(user.id);
            const w = await getWallet(user.id);
            const hasOffline = w.offline_click === 1;
            const btns = SHOP_UPGRADES.map(u => [{ text: u.label, callback_data: u.cb }]);
            if (!hasOffline) btns.push([{ text: `💤 Оффлайн клик (+5/мин) — ${OFFLINE_CLICK_COST}💰`, callback_data: 'buy_offline_click' }]);
            else btns.push([{ text: `💤 Оффлайн клик ✅ (активен)`, callback_data: 'offline_info' }]);
            return bot.sendMessage(chatId, t(lang, 'shopText', cl.click_power, hasOffline), { reply_markup: { inline_keyboard: btns } });
        }
        case 'showDrops': {
            const drops = await db.all('SELECT * FROM drops ORDER BY id DESC');
            if (!drops.length) return bot.sendMessage(chatId, t(lang, 'noDrops'), backBtn(lang));
            const btns = drops.map(d => [{ text: `🎁 ${d.name} — ${d.price} ${d.currency}`, callback_data: `drop_${d.id}` }]);
            return bot.sendMessage(chatId, t(lang, 'dropsTitle'), { reply_markup: { inline_keyboard: btns } });
        }
        case 'showCases': {
            const btns = Object.values(CASES).map(c => [{ text: `${c.name} — ${c.price}💎`, callback_data: `open_case_${c.id}` }]);
            return bot.sendMessage(chatId, t(lang, 'casesMenu'), { reply_markup: { inline_keyboard: btns } });
        }
        case 'showSell': {
            const cards = await db.all(`SELECT uc.id as uc_id, uc.card_id, uc.amount, c.name, c.rarity FROM user_cards uc JOIN cards c ON c.id=uc.card_id WHERE uc.user_id=? ORDER BY uc.obtained_at DESC LIMIT 20`, [user.id]);
            if (!cards.length) return bot.sendMessage(chatId, t(lang, 'noCards'), backBtn(lang));
            const btns = cards.map(c => {
                const p = SELL_PRICES[c.rarity] || { coins: 0, diamonds: 0 };
                let ps = p.coins > 0 ? `${p.coins}💰` : ''; if (p.diamonds > 0) ps += (ps ? '+' : '') + `${p.diamonds}💎`;
                const label = c.amount > 1 ? `${c.name}×${c.amount} [${c.rarity}] → ${ps}` : `${c.name} [${c.rarity}] → ${ps}`;
                return [{ text: label, callback_data: `sell_card_${c.uc_id}` }];
            });
            return bot.sendMessage(chatId, t(lang, 'sellMenu'), { reply_markup: { inline_keyboard: btns } });
        }
        case 'showBoxes': {
            const boxes = await db.all('SELECT * FROM boxes WHERE (max_opens IS NULL OR opens < max_opens) ORDER BY id DESC');
            if (!boxes.length) return bot.sendMessage(chatId, '📫 Нет доступных боксов.', backBtn(lang));
            const btns = boxes.map(b => [{ text: `📫 ${b.name} — ${b.price} ${b.currency}`, callback_data: `open_box_${b.id}` }]);
            return bot.sendMessage(chatId, t(lang, 'boxesMenu'), { reply_markup: { inline_keyboard: btns } });
        }
        case 'showRating': {
            const top = await db.all(`SELECT u.username, w.coins, w.diamonds, w.points FROM game_wallets w JOIN users u ON u.id=w.user_id ORDER BY w.points DESC LIMIT 10`);
            if (!top.length) return bot.sendMessage(chatId, '🏆 Рейтинг пуст', backBtn(lang));
            let msg2 = '🏆 ТОП-10\n\n';
            top.forEach((p, i) => { msg2 += `${i + 1}. ${p.username} — ⭐${p.points} | 💰${p.coins} | 💎${p.diamonds}\n`; });
            return bot.sendMessage(chatId, msg2, backBtn(lang));
        }
        case 'showReferrals': {
            const cnt = await db.get('SELECT COUNT(*) AS c FROM referrals WHERE referrer_id=?', [user.id]);
            const ear = await db.get('SELECT COALESCE(SUM(reward),0) AS t FROM referrals WHERE referrer_id=?', [user.id]);
            const me = await bot.getMe();
            return bot.sendMessage(chatId, t(lang, 'referrals', cnt.c, ear.t, `https://t.me/${me.username}?start=ref_${tid}`), backBtn(lang));
        }
        case 'showSettings':
            return bot.sendMessage(chatId, t(lang, 'settings'), {
                reply_markup: {
                    inline_keyboard: [
                        [{ text: '🔐 Пароль', callback_data: 'change_password' }],
                        [{ text: '👤 Ник', callback_data: 'change_username' }],
                        [{ text: '🌐 Язык / Мова / Language', callback_data: 'change_language' }],
                    ]
                }
            });
        case 'showGames':
            return bot.sendMessage(chatId, t(lang, 'gamesMenu'), backBtn(lang));
        case 'showAdmin': {
            if (!isMod(user)) return bot.sendMessage(chatId, t(lang, 'noAccess'));
            const isAdminOnly = isAdmin(user);
            const buttons = [
                [{ text: '🃏 Добавить карточку', callback_data: 'admin_add_card' }],
                [{ text: '💰 Выдать монеты', callback_data: 'admin_coins' }],
                [{ text: '💎 Выдать алмазы', callback_data: 'admin_diamonds' }],
                [{ text: '⭐ Выдать очки', callback_data: 'admin_points' }],
                [{ text: '🎁 Создать дроп', callback_data: 'admin_add_drop' }],
                [{ text: '💌 Аирдроп', callback_data: 'mod_start_airdrop' }],
            ];
            if (isAdminOnly) {
                buttons.push([{ text: '📫 Создать бокс', callback_data: 'admin_add_box' }]);
            }
            return bot.sendMessage(chatId, t(lang, 'adminPanel'), { reply_markup: { inline_keyboard: buttons } });
        }
    }
}

// =====================================================
// СОСТОЯНИЯ
// =====================================================
async function handleState(state, text, chatId, tid, user, lang, msg) {
    if (state.action === 'change_password') {
        if (text.length < 6) return bot.sendMessage(chatId, t(lang, 'passwordTooShort'));
        await db.run('UPDATE users SET password=? WHERE id=?', [await bcrypt.hash(text, 10), user.id]);
        delete bot.userState[tid];
        return bot.sendMessage(chatId, t(lang, 'passwordChanged'), mainMenu(user, lang));
    }
    if (state.action === 'change_username') {
        if (!/^[a-zA-Z0-9_\-]{3,15}$/.test(text)) return bot.sendMessage(chatId, t(lang, 'usernameTooShort'));
        try { await db.run('UPDATE users SET username=? WHERE id=?', [text, user.id]); delete bot.userState[tid]; return bot.sendMessage(chatId, t(lang, 'usernameChanged', text), mainMenu({ ...user, username: text }, lang)); }
        catch { return bot.sendMessage(chatId, t(lang, 'usernameTaken')); }
    }
    if (state.action === 'admin_coins') {
        const [a, b] = text.trim().split(/\s+/);
        if (!+a || !+b || +b <= 0) return bot.sendMessage(chatId, t(lang, 'wrongFormat'));
        await addCoins(+a, +b); delete bot.userState[tid]; return bot.sendMessage(chatId, t(lang, 'adminGaveCoins', +b, +a), mainMenu(user, lang));
    }
    if (state.action === 'admin_diamonds') {
        const [a, b] = text.trim().split(/\s+/);
        if (!+a || !+b || +b <= 0) return bot.sendMessage(chatId, t(lang, 'wrongFormat'));
        await ensureWallet(+a); await db.run('UPDATE game_wallets SET diamonds=diamonds+? WHERE user_id=?', [+b, +a]);
        delete bot.userState[tid]; return bot.sendMessage(chatId, t(lang, 'adminGaveDiamonds', +b, +a), mainMenu(user, lang));
    }
    if (state.action === 'admin_points') {
        const [a, b] = text.trim().split(/\s+/);
        if (!+a || !+b || +b <= 0) return bot.sendMessage(chatId, t(lang, 'wrongFormat'));
        await ensureWallet(+a); await db.run('UPDATE game_wallets SET points=points+? WHERE user_id=?', [+b, +a]);
        delete bot.userState[tid]; return bot.sendMessage(chatId, t(lang, 'adminGavePoints', +b, +a), mainMenu(user, lang));
    }
    if (state.action === 'admin_card_name') {
        state.cardName = text; state.action = 'admin_card_rarity';
        const r = t(lang, 'rarities');
        return bot.sendMessage(chatId, t(lang, 'chooseRarity', state.cardName), { reply_markup: { inline_keyboard: Object.entries(r).map(([k, v]) => [{ text: v, callback_data: `rarity_${k}` }]) } });
    }
    if (state.action === 'admin_airdrop_amount') {
        const n = Number(text);
        if (isNaN(n) || n <= 0) return bot.sendMessage(chatId, t(lang, 'wrongFormat'));
        if (user.role !== 'admin') {
            const max = state.airdropType === 'diamonds' ? MOD_AIRDROP_LIMITS.maxDiamonds : MOD_AIRDROP_LIMITS.maxCoins;
            if (n > max) return bot.sendMessage(chatId, t(lang, 'modAirdropTooMuch', max, n));
        }
        state.airdropAmount = n; state.action = 'admin_airdrop_max_claims';
        return bot.sendMessage(chatId, t(lang, 'airdropMaxClaims', `${n} ${state.airdropType === 'diamonds' ? '💎' : '💰'}`));
    }
    if (state.action === 'admin_airdrop_max_claims') {
        const n = Number(text); if (isNaN(n) || n < 0) return bot.sendMessage(chatId, t(lang, 'wrongFormat'));
        if (user.role !== 'admin') {
            const { ok, left } = await checkModAirdropLimit(user.id);
            if (!ok) { delete bot.userState[tid]; return bot.sendMessage(chatId, t(lang, 'modAirdropLimit', 0), mainMenu(user, lang)); }
            await logModAirdrop(user.id);
        }
        const limit = n === 0 ? null : n, isCoins = state.airdropType !== 'diamonds';
        const result = await db.run('INSERT INTO airdrops (coins,diamonds,max_claims,claims) VALUES (?,?,?,0)', [isCoins ? state.airdropAmount : 0, !isCoins ? state.airdropAmount : 0, limit]);
        const aid = result.lastID, amt = state.airdropAmount, typ = state.airdropType;
        delete bot.userState[tid];
        await bot.sendMessage(chatId, t(lang, 'airdropSending'));
        const users = await db.all('SELECT telegram_id,telegram_lang FROM users WHERE telegram_id IS NOT NULL');
        let ok = 0;
        for (const u of users) {
            const ul = u.telegram_lang || 'ru';
            try {
                const txt = typ === 'diamonds' ? t(ul, 'airdropDiamText', amt, limit) : t(ul, 'airdropText', amt, limit);
                const btn = typ === 'diamonds' ? t(ul, 'airdropDiamBtn', amt) : t(ul, 'airdropBtn', amt);
                await bot.sendMessage(u.telegram_id, txt, { reply_markup: { inline_keyboard: [[{ text: btn, callback_data: `claim_airdrop_${aid}` }]] } });
                ok++; await new Promise(r => setTimeout(r, 35));
            } catch { }
        }
        return bot.sendMessage(chatId, t(lang, 'airdropDone', ok, users.length));
    }
    if (state.action === 'admin_drop_name') { state.dropName = text; state.action = 'admin_drop_currency'; return bot.sendMessage(chatId, t(lang, 'dropCurrency', text), { reply_markup: { inline_keyboard: [[{ text: '🪙 Coins', callback_data: 'drop_curr_coins' }], [{ text: '💎 Diamonds', callback_data: 'drop_curr_diamonds' }], [{ text: '⭐ Points', callback_data: 'drop_curr_points' }]] } }); }
    if (state.action === 'admin_drop_price') { const n = Number(text); if (isNaN(n) || n < 0) return bot.sendMessage(chatId, t(lang, 'wrongFormat')); state.dropPrice = n; state.action = 'admin_drop_max_opens'; return bot.sendMessage(chatId, t(lang, 'dropMaxOpens')); }
    if (state.action === 'admin_drop_max_opens') {
        const n = Number(text); if (isNaN(n) || n < 0) return bot.sendMessage(chatId, t(lang, 'wrongFormat'));
        const res = await db.run('INSERT INTO drops (name,currency,price,max_opens,opens,created_at) VALUES (?,?,?,?,0,datetime("now"))', [state.dropName, state.dropCurrency, state.dropPrice, n === 0 ? null : n]);
        const did = res.lastID, dn = state.dropName; delete bot.userState[tid];
        const cs = await db.all('SELECT id,name,rarity FROM cards');
        if (!cs.length) return bot.sendMessage(chatId, t(lang, 'dropNoCardsYet', dn), mainMenu(user, lang));
        return bot.sendMessage(chatId, t(lang, 'dropCreated', dn), { reply_markup: { inline_keyboard: cs.map(c => [{ text: `➕ ${c.name} (${c.rarity})`, callback_data: `add_card_to_drop_${did}_${c.id}` }]) } });
    }
    if (state.action === 'admin_drop_card_weight') { const n = Number(text); if (isNaN(n) || n <= 0) return bot.sendMessage(chatId, t(lang, 'wrongFormat')); await db.run('INSERT INTO drop_cards (drop_id,card_id,weight) VALUES (?,?,?)', [state.dropId, state.cardId, n]); delete bot.userState[tid]; return bot.sendMessage(chatId, t(lang, 'dropCardAdded'), mainMenu(user, lang)); }
    if (state.action === 'admin_box_name') { state.boxName = text; state.action = 'admin_box_currency'; return bot.sendMessage(chatId, t(lang, 'adminBoxCurrency', text), { reply_markup: { inline_keyboard: [[{ text: '🪙 Coins', callback_data: 'box_curr_coins' }], [{ text: '💎 Diamonds', callback_data: 'box_curr_diamonds' }], [{ text: '⭐ Points', callback_data: 'box_curr_points' }]] } }); }
    if (state.action === 'admin_box_price') { const n = Number(text); if (isNaN(n) || n < 0) return bot.sendMessage(chatId, t(lang, 'wrongFormat')); state.boxPrice = n; state.action = 'admin_box_limit'; return bot.sendMessage(chatId, t(lang, 'adminBoxLimit')); }
    if (state.action === 'admin_box_limit') {
        const n = Number(text); if (isNaN(n) || n < 0) return bot.sendMessage(chatId, t(lang, 'wrongFormat'));
        const res = await db.run('INSERT INTO boxes (name,currency,price,max_opens,opens) VALUES (?,?,?,?,0)', [state.boxName, state.boxCurrency, state.boxPrice, n === 0 ? null : n]);
        const bid = res.lastID; state.boxId = bid; state.action = 'admin_box_add_reward';
        return bot.sendMessage(chatId, t(lang, 'adminBoxCreated', state.boxName), {
            reply_markup: {
                inline_keyboard: [
                    [{ text: '💰 Монеты', callback_data: 'box_reward_coins' }],
                    [{ text: '💎 Алмазы', callback_data: 'box_reward_diamonds' }],
                    [{ text: '🃏 Карточку', callback_data: 'box_reward_card' }],
                    [{ text: '⚡ Улучшение клика', callback_data: 'box_reward_upgrade' }],
                    [{ text: '✅ Готово', callback_data: 'box_done' }],
                ]
            }
        });
    }
    if (state.action === 'admin_box_coins_amt') { const n = Number(text); if (isNaN(n) || n <= 0) return bot.sendMessage(chatId, t(lang, 'wrongFormat')); state.rewardValue = n; state.rewardType = 'coins'; state.action = 'admin_box_reward_weight'; return bot.sendMessage(chatId, t(lang, 'adminBoxWeight')); }
    if (state.action === 'admin_box_diam_amt') { const n = Number(text); if (isNaN(n) || n <= 0) return bot.sendMessage(chatId, t(lang, 'wrongFormat')); state.rewardValue = n; state.rewardType = 'diamonds'; state.action = 'admin_box_reward_weight'; return bot.sendMessage(chatId, t(lang, 'adminBoxWeight')); }
    if (state.action === 'admin_box_upgrade_amt') { const n = Number(text); if (isNaN(n) || n <= 0) return bot.sendMessage(chatId, t(lang, 'wrongFormat')); state.rewardValue = n; state.rewardType = 'upgrade'; state.action = 'admin_box_reward_weight'; return bot.sendMessage(chatId, t(lang, 'adminBoxWeight')); }
    if (state.action === 'admin_box_reward_weight') {
        const n = Number(text); if (isNaN(n) || n <= 0) return bot.sendMessage(chatId, t(lang, 'wrongFormat'));
        await db.run('INSERT INTO box_rewards (box_id,type,value,card_id,weight) VALUES (?,?,?,?,?)', [state.boxId, state.rewardType, state.rewardValue, state.rewardCardId || null, n]);
        state.action = 'admin_box_add_reward';
        return bot.sendMessage(chatId, t(lang, 'adminBoxRewardAdded') + '\n\nДобавь ещё:', {
            reply_markup: {
                inline_keyboard: [
                    [{ text: '💰 Монеты', callback_data: 'box_reward_coins' }],
                    [{ text: '💎 Алмазы', callback_data: 'box_reward_diamonds' }],
                    [{ text: '🃏 Карточку', callback_data: 'box_reward_card' }],
                    [{ text: '⚡ Улучшение', callback_data: 'box_reward_upgrade' }],
                    [{ text: '✅ Готово', callback_data: 'box_done' }],
                ]
            }
        });
    }
}

// =====================================================
// ФОТО / ВИДЕО
// =====================================================
async function handleCardMedia(msg, mediaType) {
    const tid = msg.from.id, state = bot.userState?.[tid];
    if (!state || state.action !== 'admin_card_photo') return;
    const user = await getUser(tid);
    if (!user || !isMod(user)) return;
    const lang = user.telegram_lang || 'ru';
    try {
        const fid = mediaType === 'video' ? msg.video.file_id : msg.photo[msg.photo.length - 1].file_id;
        const ext = mediaType === 'video' ? '.mp4' : '.jpg';
        const file = await bot.getFile(fid);
        const fname = `card_${Date.now()}${ext}`;
        await downloadFile(file.file_path, path.join(CARD_DIR, fname));
        const res = await db.run('INSERT INTO cards (name,rarity,image,media_type,created_at) VALUES (?,?,?,?,datetime("now"))', [state.cardName, state.rarity, `/cards/${fname}`, mediaType]);
        delete bot.userState[tid];
        await bot.sendMessage(chatId, t(lang, 'cardCreated', state.cardName, state.rarity, res.lastID), mainMenu(user, lang));
    } catch (e) { console.error('MEDIA:', e); await bot.sendMessage(chatId, t(lang, 'cardSaveError')); }
}
bot.on('photo', m => handleCardMedia(m, 'photo'));
bot.on('video', m => handleCardMedia(m, 'video'));

// =====================================================
// CALLBACKS
// =====================================================
bot.on('callback_query', async (query) => {
    const tid = query.from.id;
    const chatId = query.message.chat.id;
    const data = query.data;
    try {
        const user = await getUser(tid), lang = user?.telegram_lang || 'ru';
        if (!user) return bot.answerCallbackQuery(query.id, { text: t(lang, 'linkFirst') });

        // ── КЛИК ──
        if (data === 'click') {
            const cl = await getClicker(user.id);
            if (cl.last_click) {
                const elapsed = Math.floor((Date.now() - new Date(cl.last_click).getTime()) / 1000);
                if (elapsed < cl.cooldown) return bot.answerCallbackQuery(query.id, { text: t(lang, 'wait', cl.cooldown - elapsed), show_alert: true });
            }
            const { diamondsAdded } = await addCoins(user.id, cl.click_power);
            await db.run('UPDATE clicker_stats SET last_click=? WHERE user_id=?', [new Date().toISOString(), user.id]);
            await updateLastSeen(user.id);
            return bot.answerCallbackQuery(query.id, { text: t(lang, 'clicked', cl.click_power, diamondsAdded > 0) });
        }

        // ── УЛУЧШЕНИЯ ──
        const upg = SHOP_UPGRADES.find(u => u.cb === data);
        if (upg) {
            const w = await getWallet(user.id);
            if (w.coins < upg.cost) return bot.answerCallbackQuery(query.id, { text: t(lang, 'notEnoughCoins'), show_alert: true });
            await db.run('UPDATE game_wallets SET coins=coins-? WHERE user_id=?', [upg.cost, user.id]);
            await db.run('UPDATE clicker_stats SET click_power=click_power+? WHERE user_id=?', [upg.power, user.id]);
            return bot.answerCallbackQuery(query.id, { text: t(lang, 'upgraded', upg.power) });
        }

        // ── ОФФЛАЙН КЛИК ──
        if (data === 'buy_offline_click') {
            const w = await getWallet(user.id);
            if (w.offline_click) return bot.answerCallbackQuery(query.id, { text: t(lang, 'offlineAlready'), show_alert: true });
            if (w.coins < OFFLINE_CLICK_COST) return bot.answerCallbackQuery(query.id, { text: t(lang, 'notEnoughCoins'), show_alert: true });
            await db.run('UPDATE game_wallets SET coins=coins-?, offline_click=1, last_seen=? WHERE user_id=?', [OFFLINE_CLICK_COST, new Date().toISOString(), user.id]);
            return bot.answerCallbackQuery(query.id, { text: t(lang, 'offlineBought'), show_alert: true });
        }
        if (data === 'offline_info') return bot.answerCallbackQuery(query.id, { text: `💤 Оффлайн клик активен! +${OFFLINE_CLICK_POWER} монет в минуту (макс ${OFFLINE_MAX_MINUTES} мин)`, show_alert: true });

        // ── ЯЗЫКИ ──
        if (data === 'change_language') { await bot.answerCallbackQuery(query.id); return bot.sendMessage(chatId, t(lang, 'chooseLanguage'), { reply_markup: { inline_keyboard: [[{ text: '🇷🇺 Русский', callback_data: 'lang_ru' }], [{ text: '🇺🇦 Українська', callback_data: 'lang_uk' }], [{ text: '🇬🇧 English', callback_data: 'lang_en' }]] } }); }
        if (data.startsWith('lang_')) {
            const nl = data.replace('lang_', ''); if (!['ru', 'uk', 'en'].includes(nl)) return;
            await db.run('UPDATE users SET telegram_lang=? WHERE id=?', [nl, user.id]);
            await bot.answerCallbackQuery(query.id, { text: t(nl, 'languageSaved') });
            return bot.sendMessage(chatId, t(nl, 'welcome', user.username), mainMenu(user, nl));
        }

        // ── НАСТРОЙКИ ──
        if (data === 'change_password') { if (!bot.userState) bot.userState = {}; bot.userState[tid] = { action: 'change_password' }; await bot.answerCallbackQuery(query.id); return bot.sendMessage(chatId, t(lang, 'enterNewPassword'), backBtn(lang)); }
        if (data === 'change_username') { if (!bot.userState) bot.userState = {}; bot.userState[tid] = { action: 'change_username' }; await bot.answerCallbackQuery(query.id); return bot.sendMessage(chatId, t(lang, 'enterNewUsername'), backBtn(lang)); }

        // ── BATTLE ACCEPT ──
        if (data.startsWith('accept_battle_')) {
            const bid = Number(data.replace('accept_battle_', ''));
            await bot.answerCallbackQuery(query.id);
            return handleBattleAccept(query, bid);
        }

        // ── ДРОП ──
        if (data.startsWith('drop_') && !data.startsWith('drop_curr_')) {
            const did = Number(data.replace('drop_', ''));
            const drop = await db.get('SELECT * FROM drops WHERE id=?', [did]);
            if (!drop) return bot.answerCallbackQuery(query.id, { text: t(lang, 'noDrops') });
            if (drop.max_opens && drop.opens >= drop.max_opens) return bot.answerCallbackQuery(query.id, { text: t(lang, 'dropSold'), show_alert: true });
            const cards = await db.all('SELECT dc.card_id,dc.weight,c.name,c.rarity,c.image,c.media_type FROM drop_cards dc JOIN cards c ON c.id=dc.card_id WHERE dc.drop_id=?', [did]);
            if (!cards.length) return bot.answerCallbackQuery(query.id, { text: t(lang, 'dropNoCards'), show_alert: true });
            const w = await getWallet(user.id);
            if (!['coins', 'diamonds', 'points'].includes(drop.currency)) return bot.answerCallbackQuery(query.id, { text: '❌', show_alert: true });
            if ((w[drop.currency] || 0) < drop.price) return bot.answerCallbackQuery(query.id, { text: t(lang, 'notEnough'), show_alert: true });
            await db.run(`UPDATE game_wallets SET ${drop.currency}=${drop.currency}-? WHERE user_id=?`, [drop.price, user.id]);
            await db.run('UPDATE drops SET opens=opens+1 WHERE id=?', [did]);
            const card = weightedRandom(cards);
            await giveCard(user.id, card.card_id);
            await bot.answerCallbackQuery(query.id, { text: t(lang, 'gotCard', card.name), show_alert: true });
            await sendCard(query.message.chat.id, card, `🎉 ${card.name}\n✨ ${card.rarity}`);
            return;
        }
        if (data.startsWith('drop_curr_')) {
            const cur = data.replace('drop_curr_', '');
            if (bot.userState?.[tid]?.action === 'admin_drop_currency') {
                bot.userState[tid].dropCurrency = cur; bot.userState[tid].action = 'admin_drop_price';
                await bot.answerCallbackQuery(query.id); return bot.sendMessage(chatId, t(lang, 'currencyChosen', cur));
            }
        }

        // ── КЕЙС ──
        if (data.startsWith('open_case_')) {
            const cid = data.replace('open_case_', ''), caseData = CASES[cid];
            if (!caseData) return bot.answerCallbackQuery(query.id, { text: '❌ Кейс не найден', show_alert: true });
            const w = await getWallet(user.id);
            if (w.diamonds < caseData.price) return bot.answerCallbackQuery(query.id, { text: t(lang, 'notEnoughDiamonds'), show_alert: true });
            const phArr = caseData.rarities.map(() => '?').join(',');
            const avail = await db.all(`SELECT id,name,rarity,image,media_type,drop_weight as weight FROM cards WHERE rarity IN (${phArr})`, caseData.rarities);
            if (!avail.length) return bot.answerCallbackQuery(query.id, { text: t(lang, 'caseNoCards'), show_alert: true });
            const weighted = avail.map(c => { const idx = caseData.rarities.indexOf(c.rarity); return { ...c, weight: idx >= 0 ? caseData.weights[idx] : 1 }; });
            const card = weightedRandom(weighted);
            await db.run('UPDATE game_wallets SET diamonds=diamonds-? WHERE user_id=?', [caseData.price, user.id]);
            await giveCard(user.id, card.id);
            await bot.answerCallbackQuery(query.id, { text: t(lang, 'caseOpened', card.name, card.rarity), show_alert: true });
            await sendCard(query.message.chat.id, card, `🎉 ${card.name}\n✨ ${card.rarity}`);
            return;
        }

        // ── БОКС ──
        if (data.startsWith('open_box_')) {
            const bid = Number(data.replace('open_box_', ''));
            const box = await db.get('SELECT * FROM boxes WHERE id=?', [bid]);
            if (!box) return bot.answerCallbackQuery(query.id, { text: '❌ Бокс не найден', show_alert: true });
            if (box.max_opens && box.opens >= box.max_opens) return bot.answerCallbackQuery(query.id, { text: t(lang, 'boxEmpty'), show_alert: true });
            const rewards = await db.all('SELECT * FROM box_rewards WHERE box_id=?', [bid]);
            if (!rewards.length) return bot.answerCallbackQuery(query.id, { text: t(lang, 'boxNoRewards'), show_alert: true });
            const w = await getWallet(user.id);
            if (!['coins', 'diamonds', 'points'].includes(box.currency)) return bot.answerCallbackQuery(query.id, { text: '❌', show_alert: true });
            if ((w[box.currency] || 0) < box.price) return bot.answerCallbackQuery(query.id, { text: t(lang, 'notEnough'), show_alert: true });
            await db.run(`UPDATE game_wallets SET ${box.currency}=${box.currency}-? WHERE user_id=?`, [box.price, user.id]);
            await db.run('UPDATE boxes SET opens=opens+1 WHERE id=?', [bid]);
            const reward = weightedRandom(rewards);
            let resultText = t(lang, 'boxOpened') + '\n\n';
            if (reward.type === 'coins') { await addCoins(user.id, reward.value); resultText += t(lang, 'rewardCoins', reward.value); }
            else if (reward.type === 'diamonds') { await db.run('UPDATE game_wallets SET diamonds=diamonds+? WHERE user_id=?', [reward.value, user.id]); resultText += t(lang, 'rewardDiamonds', reward.value); }
            else if (reward.type === 'upgrade') { await db.run('UPDATE clicker_stats SET click_power=click_power+? WHERE user_id=?', [reward.value, user.id]); resultText += t(lang, 'rewardUpgrade', reward.value); }
            else if (reward.type === 'card' && reward.card_id) {
                const card = await db.get('SELECT * FROM cards WHERE id=?', [reward.card_id]);
                if (card) { await giveCard(user.id, card.id); resultText += t(lang, 'rewardCard', card.name, card.rarity); await sendCard(query.message.chat.id, card, resultText); return bot.answerCallbackQuery(query.id, { text: `🎉 ${card.name}!`, show_alert: true }); }
            }
            await bot.answerCallbackQuery(query.id, { text: resultText.replace(t(lang, 'boxOpened') + '\n\n', ''), show_alert: true });
            await bot.sendMessage(chatId, resultText);
            return;
        }

        // ── ПРОДАЖА ──
        if (data.startsWith('sell_card_')) {
            const ucId = Number(data.replace('sell_card_', ''));
            const uc = await db.get('SELECT uc.id,uc.user_id,uc.amount,c.name,c.rarity FROM user_cards uc JOIN cards c ON c.id=uc.card_id WHERE uc.id=? AND uc.user_id=?', [ucId, user.id]);
            if (!uc) return bot.answerCallbackQuery(query.id, { text: t(lang, 'cardNotFound'), show_alert: true });
            const p = SELL_PRICES[uc.rarity] || { coins: 0, diamonds: 0 };
            await bot.answerCallbackQuery(query.id);
            return bot.sendMessage(chatId, t(lang, 'sellConfirm', uc.name, uc.rarity, p.coins, p.diamonds), {
                reply_markup: {
                    inline_keyboard: [
                        [{ text: '✅ Продать 1', callback_data: `confirm_sell_${ucId}` }],
                        ...(uc.amount > 1 ? [[{ text: `✅ Продать все (×${uc.amount})`, callback_data: `confirm_sell_all_${ucId}` }]] : []),
                        [{ text: '❌ Отмена', callback_data: 'cancel_sell' }],
                    ]
                }
            });
        }
        if (data.startsWith('confirm_sell_all_')) {
            const ucId = Number(data.replace('confirm_sell_all_', ''));
            const uc = await db.get('SELECT uc.id,uc.user_id,uc.amount,c.name,c.rarity FROM user_cards uc JOIN cards c ON c.id=uc.card_id WHERE uc.id=? AND uc.user_id=?', [ucId, user.id]);
            if (!uc) return bot.answerCallbackQuery(query.id, { text: t(lang, 'cardNotFound'), show_alert: true });
            const p = SELL_PRICES[uc.rarity] || { coins: 0, diamonds: 0 }, tc = p.coins * uc.amount, td = p.diamonds * uc.amount;
            if (tc > 0) await addCoins(user.id, tc);
            if (td > 0) await db.run('UPDATE game_wallets SET diamonds=diamonds+? WHERE user_id=?', [td, user.id]);
            await db.run('DELETE FROM user_cards WHERE id=?', [ucId]);
            await bot.answerCallbackQuery(query.id, { text: t(lang, 'cardSold', `${uc.name}×${uc.amount}`, tc, td), show_alert: true });
            return bot.sendMessage(chatId, t(lang, 'cardSold', `${uc.name}×${uc.amount}`, tc, td), mainMenu(user, lang));
        }
        if (data.startsWith('confirm_sell_')) {
            const ucId = Number(data.replace('confirm_sell_', ''));
            const uc = await db.get('SELECT uc.id,uc.user_id,uc.amount,c.name,c.rarity FROM user_cards uc JOIN cards c ON c.id=uc.card_id WHERE uc.id=? AND uc.user_id=?', [ucId, user.id]);
            if (!uc) return bot.answerCallbackQuery(query.id, { text: t(lang, 'cardNotFound'), show_alert: true });
            const p = SELL_PRICES[uc.rarity] || { coins: 0, diamonds: 0 };
            if (p.coins > 0) await addCoins(user.id, p.coins);
            if (p.diamonds > 0) await db.run('UPDATE game_wallets SET diamonds=diamonds+? WHERE user_id=?', [p.diamonds, user.id]);
            if (uc.amount > 1) await db.run('UPDATE user_cards SET amount=amount-1 WHERE id=?', [ucId]);
            else await db.run('DELETE FROM user_cards WHERE id=?', [ucId]);
            await bot.answerCallbackQuery(query.id, { text: t(lang, 'cardSold', uc.name, p.coins, p.diamonds), show_alert: true });
            return bot.sendMessage(chatId, t(lang, 'cardSold', uc.name, p.coins, p.diamonds), mainMenu(user, lang));
        }
        if (data === 'cancel_sell') { await bot.answerCallbackQuery(query.id); return bot.sendMessage(chatId, t(lang, 'mainMenu'), mainMenu(user, lang)); }

        // ── АИРДРОП — старт ──
        if (data === 'mod_start_airdrop') {
            if (!isMod(user)) return bot.answerCallbackQuery(query.id, { text: t(lang, 'noAccess'), show_alert: true });
            if (user.role !== 'admin') {
                const { ok } = await checkModAirdropLimit(user.id);
                if (!ok) return bot.answerCallbackQuery(query.id, { text: t(lang, 'modAirdropLimit', 0), show_alert: true });
            }
            if (!bot.userState) bot.userState = {};
            bot.userState[tid] = { action: 'admin_airdrop_type' };
            await bot.answerCallbackQuery(query.id);
            const hint = user.role !== 'admin' ? `\n⚠️ Лимиты: монеты до ${MOD_AIRDROP_LIMITS.maxCoins}, алмазы до ${MOD_AIRDROP_LIMITS.maxDiamonds}, 5 раз/день` : '';
            return bot.sendMessage(chatId, '🎁 Тип эйрдропа:' + hint, { reply_markup: { inline_keyboard: [[{ text: '💰 Монеты', callback_data: 'airdrop_type_coins' }], [{ text: '💎 Алмазы', callback_data: 'airdrop_type_diamonds' }]] } });
        }
        if (data === 'airdrop_type_coins') { if (bot.userState?.[tid]?.action === 'admin_airdrop_type') { bot.userState[tid] = { ...bot.userState[tid], action: 'admin_airdrop_amount', airdropType: 'coins' }; await bot.answerCallbackQuery(query.id); return bot.sendMessage(chatId, t(lang, 'airdropCoins')); } }
        if (data === 'airdrop_type_diamonds') { if (bot.userState?.[tid]?.action === 'admin_airdrop_type') { bot.userState[tid] = { ...bot.userState[tid], action: 'admin_airdrop_amount', airdropType: 'diamonds' }; await bot.answerCallbackQuery(query.id); return bot.sendMessage(chatId, t(lang, 'airdropDiamondsAmt')); } }

        // ── АИРДРОП — получить ──
        if (data.startsWith('claim_airdrop_')) {
            const aid = Number(data.replace('claim_airdrop_', ''));
            const airdrop = await db.get('SELECT * FROM airdrops WHERE id=?', [aid]);
            if (!airdrop) return bot.answerCallbackQuery(query.id, { text: t(lang, 'airdropNotFound'), show_alert: true });
            if (airdrop.max_claims !== null && airdrop.claims >= airdrop.max_claims) return bot.answerCallbackQuery(query.id, { text: t(lang, 'airdropEmpty'), show_alert: true });
            const ex = await db.get('SELECT 1 FROM airdrop_claims WHERE airdrop_id=? AND user_id=?', [aid, user.id]);
            if (ex) return bot.answerCallbackQuery(query.id, { text: t(lang, 'airdropAlready'), show_alert: true });
            await ensureWallet(user.id);
            if (airdrop.diamonds > 0) await db.run('UPDATE game_wallets SET diamonds=diamonds+? WHERE user_id=?', [airdrop.diamonds, user.id]);
            if (airdrop.coins > 0) await addCoins(user.id, airdrop.coins);
            await db.run('INSERT INTO airdrop_claims (airdrop_id,user_id) VALUES (?,?)', [aid, user.id]);
            await db.run('UPDATE airdrops SET claims=claims+1 WHERE id=?', [aid]);
            const txt = airdrop.diamonds > 0 ? t(lang, 'airdropDiamClaim', airdrop.diamonds) : t(lang, 'airdropClaimed', airdrop.coins);
            return bot.answerCallbackQuery(query.id, { text: txt, show_alert: true });
        }

        // ── ADMIN CALLBACKS ──
        if (data === 'admin_add_card') {
            if (!isMod(user)) return bot.answerCallbackQuery(query.id, { text: t(lang, 'noAccess'), show_alert: true });
            if (!bot.userState) bot.userState = {}; bot.userState[tid] = { action: 'admin_card_name' }; await bot.answerCallbackQuery(query.id); return bot.sendMessage(chatId, t(lang, 'enterCardName'));
        }
        if (data === 'admin_coins') {
            if (!isMod(user)) return bot.answerCallbackQuery(query.id, { text: t(lang, 'noAccess'), show_alert: true });
            if (!bot.userState) bot.userState = {}; bot.userState[tid] = { action: 'admin_coins' }; await bot.answerCallbackQuery(query.id); return bot.sendMessage(chatId, t(lang, 'adminCoinsPrompt'));
        }
        if (data === 'admin_diamonds') {
            if (!isMod(user)) return bot.answerCallbackQuery(query.id, { text: t(lang, 'noAccess'), show_alert: true });
            if (!bot.userState) bot.userState = {}; bot.userState[tid] = { action: 'admin_diamonds' }; await bot.answerCallbackQuery(query.id); return bot.sendMessage(chatId, t(lang, 'adminDiamondsPrompt'));
        }
        if (data === 'admin_points') {
            if (!isMod(user)) return bot.answerCallbackQuery(query.id, { text: t(lang, 'noAccess'), show_alert: true });
            if (!bot.userState) bot.userState = {}; bot.userState[tid] = { action: 'admin_points' }; await bot.answerCallbackQuery(query.id); return bot.sendMessage(chatId, t(lang, 'adminPointsPrompt'));
        }
        if (data === 'admin_add_drop') {
            if (!isMod(user)) return bot.answerCallbackQuery(query.id, { text: t(lang, 'noAccess'), show_alert: true });
            if (!bot.userState) bot.userState = {}; bot.userState[tid] = { action: 'admin_drop_name' }; await bot.answerCallbackQuery(query.id); return bot.sendMessage(chatId, t(lang, 'dropName'));
        }
        if (data === 'admin_add_box') {
            if (!isAdmin(user)) return bot.answerCallbackQuery(query.id, { text: t(lang, 'noAccess'), show_alert: true });
            if (!bot.userState) bot.userState = {}; bot.userState[tid] = { action: 'admin_box_name' }; await bot.answerCallbackQuery(query.id); return bot.sendMessage(chatId, t(lang, 'adminBoxName'));
        }

        if (data.startsWith('rarity_')) { if (!bot.userState?.[tid] || bot.userState[tid].action !== 'admin_card_rarity') return; bot.userState[tid].rarity = data.replace('rarity_', ''); bot.userState[tid].action = 'admin_card_photo'; await bot.answerCallbackQuery(query.id); return bot.sendMessage(chatId, t(lang, 'sendPhoto', bot.userState[tid].rarity)); }
        if (data.startsWith('add_card_to_drop_')) { const p = data.split('_'); if (!bot.userState) bot.userState = {}; bot.userState[tid] = { action: 'admin_drop_card_weight', dropId: Number(p[4]), cardId: Number(p[5]) }; await bot.answerCallbackQuery(query.id); return bot.sendMessage(chatId, t(lang, 'dropCardWeight')); }

        if (data.startsWith('box_curr_')) { const cur = data.replace('box_curr_', ''); if (bot.userState?.[tid]?.action === 'admin_box_currency') { bot.userState[tid].boxCurrency = cur; bot.userState[tid].action = 'admin_box_price'; await bot.answerCallbackQuery(query.id); return bot.sendMessage(chatId, t(lang, 'adminBoxPrice')); } }
        if (data === 'box_reward_coins') { if (!bot.userState?.[tid]) return; bot.userState[tid].action = 'admin_box_coins_amt'; await bot.answerCallbackQuery(query.id); return bot.sendMessage(chatId, t(lang, 'adminBoxCoinsAmt')); }
        if (data === 'box_reward_diamonds') { if (!bot.userState?.[tid]) return; bot.userState[tid].action = 'admin_box_diam_amt'; await bot.answerCallbackQuery(query.id); return bot.sendMessage(chatId, t(lang, 'adminBoxDiamAmt')); }
        if (data === 'box_reward_upgrade') { if (!bot.userState?.[tid]) return; bot.userState[tid].action = 'admin_box_upgrade_amt'; await bot.answerCallbackQuery(query.id); return bot.sendMessage(chatId, t(lang, 'adminBoxUpgrAmt')); }
        if (data === 'box_reward_card') {
            if (!bot.userState?.[tid]) return;
            const cs = await db.all('SELECT id,name,rarity FROM cards');
            if (!cs.length) { await bot.answerCallbackQuery(query.id); return bot.sendMessage(chatId, '❌ Нет карточек'); }
            await bot.answerCallbackQuery(query.id);
            return bot.sendMessage(chatId, 'Выбери карточку:', { reply_markup: { inline_keyboard: cs.map(c => [{ text: `${c.name} (${c.rarity})`, callback_data: `box_pick_card_${c.id}` }]) } });
        }
        if (data.startsWith('box_pick_card_')) { const cid = Number(data.replace('box_pick_card_', '')); if (!bot.userState?.[tid]) return; bot.userState[tid].rewardCardId = cid; bot.userState[tid].rewardType = 'card'; bot.userState[tid].rewardValue = 0; bot.userState[tid].action = 'admin_box_reward_weight'; await bot.answerCallbackQuery(query.id); return bot.sendMessage(chatId, t(lang, 'adminBoxWeight')); }
        if (data === 'box_done') { delete bot.userState[tid]; await bot.answerCallbackQuery(query.id, { text: '✅ Бокс готов!' }); return bot.sendMessage(chatId, '✅ Бокс сохранён!', mainMenu(user, lang)); }

    } catch (e) {
        console.error('CALLBACK:', e);
        try { await bot.answerCallbackQuery(query.id, { text: t('ru', 'errorGeneral'), show_alert: true }); } catch { }
    }
});

process.on('unhandledRejection', (r) => console.error('Unhandled:', r));
bot.on('polling_error', e => console.error('Polling:', e.message));

startDatabase()
    .then(() => {
        console.log('🤖 Bot started!');
        setInterval(processNotificationQueue, NOTIFICATION_POLL_MS);
        setInterval(cleanupExpiredBattles, BATTLE_CLEANUP_MS);

    })
    .catch(e => { console.error('Start error:', e); process.exit(1); });
