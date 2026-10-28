const translations = {
    en: {
        tgBannerTitle: "Link your account to the Telegram bot",
        tgBannerText: "To keep your account safe, link it to @MLLcards_bot. If you've already done this — ignore this message.",
        tgBannerBtn: "Link via @MLLcards_bot",
        pageTitle: "Mell Footage", logo: "Mell Footage", searchPlaceholder: "Search footage...",
        loading: "Loading...", notFound: "Nothing found", loadMore: "Load more videos",
        navHome: "Home", navUpload: "Upload", navNews: "News", navCollections: "Collections",
        navProfile: "Profile", navAdmin: "Admin", adminPublish: "Publish News (Admin)",
        fieldTitle: "Title", fieldContent: "Content", fieldImage: "Image", publishBtn: "Publish",
        fieldFile: "Select file", fieldDesc: "Description (optional)", descPlaceholder: "Describe your footage...",
        uploadBtn: "Upload", addToCollectionTitle: "Add to collection", createCollection: "+ Create new collection",
        cancel: "Cancel", login: "Log in", logout: "Log out", noNews: "No news yet",
        noCollections: "No collections yet", loginToView: "Log in to view this",
        uploading: "Uploading...", uploadSuccess: "Uploaded successfully!", uploadFail: "Upload failed",
        publishFail: "Failed to publish news", loginToLike: "Log in to like videos",
        addedToCollection: "Added to collection!", alreadyInCollection: "Already in this collection",
        collectionCreateFail: "Failed to create collection", addToCollectionFail: "Failed to add to collection",
        connectionError: "Connection error", collectionNamePrompt: "Collection name:",
        welcomeBack: "Welcome", points: "points", collectionsCount: "collections", likesCount: "likes",
        downloadFail: "Download failed", noVideos: "Failed to load videos", navSettings: "Settings",
        settingsAppearance: "Appearance", settingAccentColor: "Accent color",
        settingAccentColorHint: "Changes the app's main color", settingReset: "Reset",
        settingBlur: "Glass blur effect", settingBlurHint: "Adds a blurred glass look to the top and bottom bars",
        settingSafeMode: "Safe mode", settingSafeModeHint: "Hides profanity in video titles",
        settingGridDensity: "Grid density", settingGridDensityHint: "Choose default card display size",
        densityCompact: "Compact", densityStandard: "Standard", densityLarge: "Large",
        settingsBeta: "Beta functions", settingDockMode: "Dock-style navigation",
        settingDockModeHint: "Floating bottom menu, like on macOS", settingDockShape: "Button shape",
        settingDockShapeHint: "Round or square icons for the dock", settingDockRound: "Round",
        settingDockSquare: "Square", settingsDev: "Dev functions", settingPhoneMode: "Phone mode",
        settingPhoneModeHint: "Frames the app like a phone screen, for testing", settingPhoneModeToggle: "Toggle",
        sortTitle: "Sort", sortNewest: "Newest", sortPopular: "Popular", sortLikes: "Most liked",
        sortDownloads: "Most downloaded", editVideo: "Edit name", deleteVideo: "Delete",
        adminOnly: "Administrators only", renameVideoPrompt: "New footage name:",
        renameVideoEmpty: "Name cannot be empty",
        deleteVideoConfirm: "Delete footage \"{name}\"? This cannot be undone.",
        sortDefault: "Sorting", categoryAll: "All",
        settingsAnimations: "Animations & Motion", settingAnimMode: "Animation Mode",
        settingAnimModeHint: "Enable, disable, or make motions dynamic",
        settingAnimSpeed: "Animation Speed", settingAnimSpeedHint: "Control transition speeds",
        settingHoverEffect: "Card Hover Effect", settingHoverEffectHint: "Visual reaction on video hover",
        settingsInterface: "Interface Layout", settingViewMode: "Catalog View Mode",
        settingViewModeHint: "Grid layout vs List layout", settingCardElements: "Card Elements",
        settingCardElementsHint: "Show or hide card details", settingToastPos: "Toast Position",
        settingToastPosHint: "Where notifications pop up", settingBgStyle: "Background Style",
        settingBgStyleHint: "Gradient, Flat or Deep OLED", settingRadius: "Corner Roundness",
        settingRadiusHint: "Adjust border radius for cards & buttons", settingFont: "Font Family",
        settingFontHint: "Interface typography style", settingsPerformance: "Performance & Video Loading",
        settingDataSaver: "Data saver mode",
        settingDataSaverHint: "Don't preload video preview frames — only load on tap. Saves traffic and reduces lag on weak devices",
        settingAutoPause: "Pause videos off-screen",
        settingAutoPauseHint: "Automatically pause and unload videos that scroll out of view",
        settingSinglePlayback: "Play one video at a time",
        settingSinglePlaybackHint: "Starting a new video pauses any other video that's playing",
        settingPreviewDistance: "Preview preload distance",
        settingPreviewDistanceHint: "How early off-screen video previews start loading",
        previewNear: "Close (less traffic)", previewNormal: "Normal", previewFar: "Far (smoother scroll)"
    },
    uk: {
        tgBannerTitle: "Прив'яжіть акаунт до Telegram-бота",
        tgBannerText: "Щоб не втратити акаунт, прив'яжіть його до @MLLcards_bot. Якщо вже прив'язали — проігноруйте.",
        tgBannerBtn: "Прив'язати через @MLLcards_bot",
        pageTitle: "Mell Футажі", logo: "Mell Футажі", searchPlaceholder: "Пошук футажів...",
        loading: "Завантаження...", notFound: "Нічого не знайдено", loadMore: "Завантажити ще відео",
        navHome: "Головна", navUpload: "Завантажити", navNews: "Новини", navCollections: "Колекції",
        navProfile: "Профіль", navAdmin: "Адмін", adminPublish: "Опублікувати новину (Адмін)",
        fieldTitle: "Заголовок", fieldContent: "Текст", fieldImage: "Зображення", publishBtn: "Опублікувати",
        fieldFile: "Оберіть файл", fieldDesc: "Опис (необов'язково)", descPlaceholder: "Опишіть свій футаж...",
        uploadBtn: "Завантажити", addToCollectionTitle: "Додати до колекції",
        createCollection: "+ Створити нову колекцію", cancel: "Скасувати", login: "Увійти", logout: "Вийти",
        noNews: "Новин поки немає", noCollections: "Колекцій поки немає",
        loginToView: "Увійдіть, щоб переглянути це", uploading: "Завантаження...",
        uploadSuccess: "Успішно завантажено!", uploadFail: "Не вдалося завантажити",
        publishFail: "Не вдалося опублікувати новину", loginToLike: "Увійдіть, щоб ставити вподобайки",
        addedToCollection: "Додано до колекції!", alreadyInCollection: "Вже є в цій колекції",
        collectionCreateFail: "Не вдалося створити колекцію", addToCollectionFail: "Не вдалося додати до колекції",
        connectionError: "Помилка з'єднання", collectionNamePrompt: "Назва колекції:",
        welcomeBack: "Вітаємо", points: "очок", collectionsCount: "колекцій", likesCount: "вподобайок",
        downloadFail: "Не вдалося завантажити", noVideos: "Не вдалося завантажити відео",
        navSettings: "Налаштування", settingsAppearance: "Зовнішній вигляд",
        settingAccentColor: "Акцентний колір", settingAccentColorHint: "Змінює основний колір застосунку",
        settingReset: "Скинути", settingBlur: "Ефект скла (блюр)",
        settingBlurHint: "Додає розмиття для верхньої та нижньої панелей",
        settingSafeMode: "Безпечний режим", settingSafeModeHint: "Приховує лайку в назвах відео",
        settingGridDensity: "Щільність сітки", settingGridDensityHint: "Оберіть розмір показу карт у каталозі",
        densityCompact: "Компактна", densityStandard: "Стандартна", densityLarge: "Велика",
        settingsBeta: "Бета-функції", settingDockMode: "Меню у стилі Dock",
        settingDockModeHint: "Плаваюче нижнє меню, як на macOS", settingDockShape: "Форма кнопок",
        settingDockShapeHint: "Круглі або квадратні іконки для dock", settingDockRound: "Круглі",
        settingDockSquare: "Квадратні", settingsDev: "Dev-функції", settingPhoneMode: "Режим телефону",
        settingPhoneModeHint: "Обрамлює застосунок як екран телефону, для тестування",
        settingPhoneModeToggle: "Перемкнути",
        sortTitle: "Сортування", sortNewest: "Нові", sortPopular: "Популярні", sortLikes: "За лайками",
        sortDownloads: "За завантаженнями", editVideo: "Змінити назву", deleteVideo: "Видалити",
        adminOnly: "Лише для адміністраторів", renameVideoPrompt: "Нова назва футажу:",
        renameVideoEmpty: "Назва не може бути порожньою",
        deleteVideoConfirm: "Видалити футаж «{name}»? Цю дію не можна скасувати.",
        sortDefault: "Сортування", categoryAll: "Усі",
        settingsAnimations: "Анімації та рух", settingAnimMode: "Режим анімацій",
        settingAnimModeHint: "Увімкнути, вимкнути або зробити динамічними",
        settingAnimSpeed: "Швидкість анімацій", settingAnimSpeedHint: "Контроль швидкості переходів",
        settingHoverEffect: "Ефект при наведенні", settingHoverEffectHint: "Реакція картки на курсор",
        settingsInterface: "Макет інтерфейсу", settingViewMode: "Режим каталогу",
        settingViewModeHint: "Вигляд сіткою або списком", settingCardElements: "Елементи картки",
        settingCardElementsHint: "Показувати або приховувати деталі", settingToastPos: "Позиція сповіщень",
        settingToastPosHint: "Де з'являються повідомлення", settingBgStyle: "Стиль фону",
        settingBgStyleHint: "Градієнт, Плоский або Deep OLED", settingRadius: "Скруглення кутів",
        settingRadiusHint: "Налаштуйте радіус для карток та кнопок", settingFont: "Шрифт інтерфейсу",
        settingFontHint: "Типографіка застосунку", settingsPerformance: "Продуктивність і завантаження відео",
        settingDataSaver: "Режим економії трафіку",
        settingDataSaverHint: "Не завантажувати прев'ю відео заздалегідь — лише за натисканням. Економить трафік і зменшує лаги на слабких пристроях",
        settingAutoPause: "Ставити відео на паузу поза екраном",
        settingAutoPauseHint: "Автоматично ставити на паузу й вивантажувати відео, що зникли з екрана",
        settingSinglePlayback: "Відтворювати лише одне відео",
        settingSinglePlaybackHint: "Запуск нового відео ставить на паузу всі інші відтворювані відео",
        settingPreviewDistance: "Дистанція попереднього завантаження",
        settingPreviewDistanceHint: "Наскільки заздалегідь завантажуються прев'ю відео поза екраном",
        previewNear: "Близько (менше трафіку)", previewNormal: "Звичайно", previewFar: "Далеко (плавніший скрол)"
    },
    ru: {
        tgBannerTitle: "Привяжите аккаунт к Telegram-боту",
        tgBannerText: "Чтобы не потерять аккаунт, привяжите его к @MLLcards_bot. Если уже привязали — проигнорируйте.",
        tgBannerBtn: "Привязать через @MLLcards_bot",
        pageTitle: "Mell Футажи", logo: "Mell Футажи", searchPlaceholder: "Поиск футажей...",
        loading: "Загрузка...", notFound: "Ничего не найдено", loadMore: "Прогрузить больше видео",
        navHome: "Главная", navUpload: "Загрузить", navNews: "Новости", navCollections: "Коллекции",
        navProfile: "Профиль", navAdmin: "Админ", adminPublish: "Опубликовать новость (Админ)",
        fieldTitle: "Заголовок", fieldContent: "Текст", fieldImage: "Изображение", publishBtn: "Опубликовать",
        fieldFile: "Выберите файл", fieldDesc: "Описание (необязательно)", descPlaceholder: "Опишите свой футаж...",
        uploadBtn: "Загрузить", addToCollectionTitle: "Добавить в коллекцию",
        createCollection: "+ Создать новую коллекцию", cancel: "Отмена", login: "Войти", logout: "Выйти",
        noNews: "Новостей пока нет", noCollections: "Коллекций пока нет",
        loginToView: "Войдите, чтобы просмотреть это", uploading: "Загрузка...",
        uploadSuccess: "Успешно загружено!", uploadFail: "Не удалось загрузить",
        publishFail: "Не удалось опубликовать новость", loginToLike: "Войдите, чтобы ставить лайки",
        addedToCollection: "Добавлено в коллекцию!", alreadyInCollection: "Уже есть в этой коллекции",
        collectionCreateFail: "Не удалось создать коллекцию", addToCollectionFail: "Не удалось добавить в коллекцию",
        connectionError: "Ошибка соединения", collectionNamePrompt: "Название коллекции:",
        welcomeBack: "Добро пожаловать", points: "очков", collectionsCount: "коллекций", likesCount: "лайков",
        downloadFail: "Не удалось скачать", noVideos: "Не удалось загрузить видео",
        navSettings: "Настройки", settingsAppearance: "Внешний вид",
        settingAccentColor: "Акцентный цвет", settingAccentColorHint: "Меняет основной цвет приложения",
        settingReset: "Сбросить", settingBlur: "Эффект стекла (блюр)",
        settingBlurHint: "Добавляет размытие для верхней и нижней панелей",
        settingSafeMode: "Безопасный режим", settingSafeModeHint: "Скрывает мат в названиях видео",
        settingGridDensity: "Плотность сетки", settingGridDensityHint: "Размер карточек в каталоге",
        densityCompact: "Компактная", densityStandard: "Стандартная", densityLarge: "Крупная",
        settingsBeta: "Beta функции", settingDockMode: "Меню в стиле Dock",
        settingDockModeHint: "Плавающее нижнее меню, как на macOS", settingDockShape: "Форма кнопок",
        settingDockShapeHint: "Круглые или квадратные иконки для dock", settingDockRound: "Круглые",
        settingDockSquare: "Квадратные", settingsDev: "Dev функции", settingPhoneMode: "Режим телефона",
        settingPhoneModeHint: "Обрамляет приложение как экран телефона, для тестирования",
        settingPhoneModeToggle: "Переключить",
        sortTitle: "Сортировка", sortNewest: "Новые", sortPopular: "Популярные", sortLikes: "По лайкам",
        sortDownloads: "По скачиваниям", editVideo: "Изменить имя", deleteVideo: "Удалить",
        adminOnly: "Только для администраторов", renameVideoPrompt: "Новое имя футажа:",
        renameVideoEmpty: "Имя не может быть пустым",
        deleteVideoConfirm: "Удалить футаж «{name}»? Это действие нельзя отменить.",
        sortDefault: "Сортировка", categoryAll: "Все",
        settingsAnimations: "Анимации и движение", settingAnimMode: "Режим анимаций",
        settingAnimModeHint: "Включить, выключить или сделать динамичными",
        settingAnimSpeed: "Скорость анимаций", settingAnimSpeedHint: "Контроль скорости переходов",
        settingHoverEffect: "Эффект при наведении", settingHoverEffectHint: "Реакция карточки на курсор",
        settingsInterface: "Макет интерфейса", settingViewMode: "Режим каталога",
        settingViewModeHint: "Вид сеткой или списком", settingCardElements: "Элементы карточки",
        settingCardElementsHint: "Показывать или скрывать детали", settingToastPos: "Позиция уведомлений",
        settingToastPosHint: "Где всплывают сообщения", settingBgStyle: "Стиль фона",
        settingBgStyleHint: "Градиент, Плоский или Deep OLED", settingRadius: "Скругление углов",
        settingRadiusHint: "Радиус для карточек и кнопок", settingFont: "Шрифт интерфейса",
        settingFontHint: "Типографика приложения", settingsPerformance: "Производительность и загрузка видео",
        settingDataSaver: "Режим экономии трафика",
        settingDataSaverHint: "Не загружать превью видео заранее — только по нажатию. Экономит трафик и снижает лаги на слабых устройствах",
        settingAutoPause: "Ставить видео на паузу вне экрана",
        settingAutoPauseHint: "Автоматически ставить на паузу и выгружать видео, ушедшие за пределы экрана",
        settingSinglePlayback: "Воспроизводить только одно видео",
        settingSinglePlaybackHint: "Запуск нового видео ставит на паузу все остальные проигрываемые видео",
        settingPreviewDistance: "Дистанция предзагрузки превью",
        settingPreviewDistanceHint: "Насколько заранее начинают загружаться превью видео за пределами экрана",
        previewNear: "Близко (меньше трафика)", previewNormal: "Обычно", previewFar: "Далеко (плавнее скролл)"
    }
};

function t(key) {
    return (translations[currentLang] && translations[currentLang][key]) || translations.en[key] || key;
}
// codes
const inputcodes = document.getElementById("Codes")
inputcodes.addEventListener("keydown", async () => {
  if (inputcodes.value === "123") {
    console.log("test")
  } else if(inputcodes.value === "13") {
    console.log("1")
  }

})
// ================= STATE =================
let currentLang = localStorage.getItem('app_lang') || 'ru';
let rawVideos = [];
let filteredVideos = [];
const ITEMS_PER_PAGE = 12;
let currentPageNum = 1;
let currentUserData = { loggedIn: false };
let selectedVideoForCollection = null;
let currentPageName = 'footages';

const DEFAULT_ACCENT = '#7ec384';

let appSettings = {
    accentColor: localStorage.getItem('accentColor') || DEFAULT_ACCENT,
    glassMode: localStorage.getItem('glassMode') === '1',
    safeMode: localStorage.getItem('safeMode') === '1',
    dockMode: localStorage.getItem('dockMode') === '1',
    dockShape: localStorage.getItem('dockShape') || 'round',
    phoneMode: localStorage.getItem('phoneMode') === '1',
    bgStyle: localStorage.getItem('bgStyle') || 'gradient',
    cornerRadius: localStorage.getItem('cornerRadius') || 'medium',
    fontFamily: localStorage.getItem('fontFamily') || 'system',
    animMode: localStorage.getItem('animMode') || 'normal',
    animSpeed: localStorage.getItem('animSpeed') || 'normal',
    hoverEffect: localStorage.getItem('hoverEffect') || 'lift',
    viewMode: localStorage.getItem('viewMode') || 'grid',
    gridDensity: localStorage.getItem('gridDensity') || 'standard',
    toastPos: localStorage.getItem('toastPos') || 'bottom-right',
    showAuthors: localStorage.getItem('showAuthors') !== '0',
    showActions: localStorage.getItem('showActions') !== '0',
    showTitles: localStorage.getItem('showTitles') !== '0',
    dataSaver: localStorage.getItem('dataSaver') === '1',
    autoPauseOffscreen: localStorage.getItem('autoPauseOffscreen') !== '0',
    singlePlayback: localStorage.getItem('singlePlayback') !== '0',
    previewDistance: localStorage.getItem('previewDistance') || 'normal'
};

// ================= TRAFFIC OPTIMIZATION: REQUEST DEDUPLICATION =================
// Если тот же URL уже запрашивается — возвращаем один промис, а не создаём новый запрос
const pendingFetches = Object.create(null);

function fetchOnce(key, fetchFn) {
    if (pendingFetches[key]) return pendingFetches[key];
    const p = fetchFn().finally(() => { delete pendingFetches[key]; });
    pendingFetches[key] = p;
    return p;
}

// ================= TRAFFIC OPTIMIZATION: TTL STATS CACHE =================
// Кэш статистики на 5 минут. Повторный рендер / смена вкладки = 0 запросов
const STATS_TTL_MS = 5 * 60 * 1000;
const statsCache = Object.create(null); // { filename: { likes, downloads, liked, ts } }

function isCacheFresh(entry) {
    return entry && (Date.now() - (entry.ts || 0)) < STATS_TTL_MS;
}

function getCachedStats(video) {
    const c = statsCache[video.name];
    if (c) return c;
    return {
        likes: Number(video.likes ?? video.likeCount ?? 0) || 0,
        downloads: Number(video.downloads ?? video.downloadCount ?? 0) || 0
    };
}

// ================= TRAFFIC OPTIMIZATION: CONCURRENCY POOL =================
// Вместо Promise.all (100+ параллельных запросов) — очередь по 4
async function fetchPool(items, fn, concurrency = 4) {
    let idx = 0;
    async function worker() {
        while (idx < items.length) {
            const item = items[idx++];
            await fn(item).catch(() => {});
        }
    }
    await Promise.all(Array.from({ length: Math.min(concurrency, items.length) }, worker));
}

// ================= TRAFFIC OPTIMIZATION: LAZY STATS OBSERVER =================
// Статистика карточки грузится только когда она входит в viewport
let statsObserver = null;

function initStatsObserver() {
    if (statsObserver || !('IntersectionObserver' in window)) return;
    statsObserver = new IntersectionObserver((entries) => {
        entries.forEach(entry => {
            if (!entry.isIntersecting) return;
            const card = entry.target;
            if (card.dataset.statsLoaded === '1') return;
            card.dataset.statsLoaded = '1';
            statsObserver.unobserve(card);
            const filename = card.dataset.statsName;
            if (filename) loadCardStats(filename, card);
        });
    }, { rootMargin: '150px 0px', threshold: 0.01 });
}

// ================= INIT =================
document.addEventListener('DOMContentLoaded', async () => {
    if (localStorage.getItem('theme') === 'dark') document.body.classList.add('dark-theme');

    // Скрываем TG-баннер если уже закрыт
    if (localStorage.getItem('tg_banner_closed') === '1') {
        const b = document.getElementById('tg-warning-banner');
        if (b) b.style.display = 'none';
    }

    applyLanguage();
    updateActiveLangButton();
    applyAllSettings();
    initStatsObserver(); // <-- инициализируем lazy stats observer

    await checkAuth();
    renderAuthArea();
    loadVideos();
});

// ================= SETTINGS =================
function setPresetAccent(color) {
    appSettings.accentColor = color;
    localStorage.setItem('accentColor', color);
    applyAccentColor(color);
    const input = document.getElementById('accent-color-input');
    if (input) input.value = color;
    updateSettingUIButtons();
}

function hexToRgb(hex) {
    const m = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);
    return m ? { r: parseInt(m[1], 16), g: parseInt(m[2], 16), b: parseInt(m[3], 16) } : null;
}

function rgbToHex(r, g, b) {
    return '#' + [r, g, b].map(v => Math.max(0, Math.min(255, Math.round(v))).toString(16).padStart(2, '0')).join('');
}

function shadeColor(hex, percent) {
    const rgb = hexToRgb(hex);
    if (!rgb) return hex;
    const factor = 1 + percent / 100;
    return rgbToHex(rgb.r * factor, rgb.g * factor, rgb.b * factor);
}

function applyAccentColor(hex) {
    document.documentElement.style.setProperty('--primary', hex);
    document.documentElement.style.setProperty('--primary-dark', shadeColor(hex, -20));
}

function onAccentColorChange(hex) {
    appSettings.accentColor = hex;
    localStorage.setItem('accentColor', hex);
    applyAccentColor(hex);
    updateSettingUIButtons();
}

function resetAccentColor() { setPresetAccent(DEFAULT_ACCENT); }
function setBgStyle(style) { appSettings.bgStyle = style; localStorage.setItem('bgStyle', style); applyAllSettings(); }
function setCornerRadius(radius) { appSettings.cornerRadius = radius; localStorage.setItem('cornerRadius', radius); applyAllSettings(); }
function setFontFamily(font) { appSettings.fontFamily = font; localStorage.setItem('fontFamily', font); applyAllSettings(); }
function setAnimationMode(mode) { appSettings.animMode = mode; localStorage.setItem('animMode', mode); applyAllSettings(); }
function setAnimationSpeed(speed) { appSettings.animSpeed = speed; localStorage.setItem('animSpeed', speed); applyAllSettings(); }
function setHoverEffect(effect) { appSettings.hoverEffect = effect; localStorage.setItem('hoverEffect', effect); applyAllSettings(); }
function setViewMode(mode) { appSettings.viewMode = mode; localStorage.setItem('viewMode', mode); applyAllSettings(); }

function toggleCardElement(element, visible) {
    if (element === 'authors') { appSettings.showAuthors = visible; localStorage.setItem('showAuthors', visible ? '1' : '0'); }
    if (element === 'actions') { appSettings.showActions = visible; localStorage.setItem('showActions', visible ? '1' : '0'); }
    if (element === 'titles')  { appSettings.showTitles  = visible; localStorage.setItem('showTitles',  visible ? '1' : '0'); }
    applyAllSettings();
}
// terms-gate.js — экран принятия условий использования и политики конфиденциальности.
// Подключение в index.html ДО script.js:
//   <script src="terms-gate.js"></script>
// Пути к страницам поменяй под свои, если они называются иначе.

(() => {
    'use strict';

    // Один файл legal.html, разделы открываются по якорю.
    // В legal.html у раздела условий должен быть id="terms", у политики — id="privacy".
    const TERMS_URL = '/terms';
    const PRIVACY_URL = '/privacy';

    const TEXTS = {
        en: {
            title: 'Before you continue',
            lead: 'To use the site, please read and accept the following.',
            prefix: 'I accept the',
            and: 'and',
            terms: 'Terms of Use',
            privacy: 'Privacy Policy',
            continue: 'Continue',
            decline: 'I do not accept',
            declined: 'You cannot use the site without accepting these documents.',
            error: 'Something went wrong. Please try again.',
        },
        uk: {
            title: 'Перш ніж продовжити',
            lead: 'Щоб користуватися сайтом, будь ласка, ознайомтеся і приймете:',
            prefix: 'Я приймаю',
            and: 'та',
            terms: 'Умови використання',
            privacy: 'Політику конфіденційності',
            continue: 'Продовжити',
            decline: 'Не приймаю',
            declined: 'Без прийняття цих документів користуватися сайтом не можна.',
            error: 'Щось пішло не так. Спробуйте ще раз.',
        },
        ru: {
            title: 'Прежде чем продолжить',
            lead: 'Чтобы пользоваться сайтом, пожалуйста, ознакомьтесь и примите:',
            prefix: 'Я принимаю',
            and: 'и',
            terms: 'Условия использования',
            privacy: 'Политику конфиденциальности',
            continue: 'Продолжить',
            decline: 'Не принимаю',
            declined: 'Без принятия этих документов пользоваться сайтом нельзя.',
            error: 'Что-то пошло не так. Попробуйте ещё раз.',
        },
    };

    const langCode = String(navigator.language || 'en').slice(0, 2).toLowerCase();
    const T = TEXTS[langCode] || TEXTS.en;

    // Все тексты вставляются через textContent, без innerHTML
    function el(tag, props = {}, children = []) {
        const node = document.createElement(tag);
        Object.entries(props).forEach(([key, value]) => {
            if (key === 'text') node.textContent = value;
            else if (key === 'style') Object.assign(node.style, value);
            else node.setAttribute(key, value);
        });
        children.forEach((c) => node.appendChild(c));
        return node;
    }

    let overlay = null;
    let savedOverflow = '';

    function showGate() {
        if (overlay) return;

        const checkbox = el('input', { type: 'checkbox', id: 'terms-gate-check' });
        const continueBtn = el('button', {
            type: 'button',
            text: T.continue,
            disabled: 'disabled',
            style: {
                marginTop: '18px', width: '100%', padding: '11px', border: '0', borderRadius: '10px',
                background: '#7ec384', color: '#0d0d0f', fontWeight: '600', fontSize: '15px',
                cursor: 'pointer', opacity: '0.45',
            },
        });
        const message = el('p', { style: { margin: '12px 0 0', fontSize: '13px', color: '#f0b429', minHeight: '1em' } });

        const link = (href, text) => el('a', {
            href, target: '_blank', rel: 'noopener',
            style: { color: '#7ec384', textDecoration: 'underline' },
            text,
        });

        checkbox.addEventListener('change', () => {
            continueBtn.disabled = !checkbox.checked;
            continueBtn.style.opacity = checkbox.checked ? '1' : '0.45';
        });

        const declineBtn = el('button', {
            type: 'button',
            text: T.decline,
            style: {
                marginTop: '8px', width: '100%', padding: '10px', background: 'transparent',
                border: '1px solid #3a3c44', borderRadius: '10px', color: '#9a9ca6',
                fontSize: '14px', cursor: 'pointer',
            },
        });
        declineBtn.addEventListener('click', () => {
            message.textContent = T.declined;
        });

        continueBtn.addEventListener('click', async () => {
            continueBtn.disabled = true;
            message.textContent = '';
            try {
                const res = await fetch('/api/terms/accept', { method: 'POST', credentials: 'same-origin' });
                if (!res.ok) throw new Error('accept failed');
                hideGate();
            } catch (_) {
                continueBtn.disabled = !checkbox.checked;
                message.textContent = T.error;
            }
        });

        const box = el('div', {
            role: 'dialog',
            'aria-modal': 'true',
            style: {
                width: '100%', maxWidth: '440px', background: '#1a1b1f', color: '#eceef2',
                borderRadius: '14px', padding: '24px', boxShadow: '0 20px 60px rgba(0,0,0,.5)',
                fontFamily: 'system-ui, -apple-system, "Segoe UI", Roboto, sans-serif',
            },
        }, [
            el('h2', { text: T.title, style: { margin: '0 0 8px', fontSize: '20px' } }),
            el('p', { text: T.lead, style: { margin: '0 0 18px', fontSize: '14px', color: '#9a9ca6', lineHeight: '1.5' } }),
            el('label', {
                style: { display: 'flex', gap: '10px', alignItems: 'flex-start', fontSize: '14px', lineHeight: '1.5', cursor: 'pointer' },
            }, [
                checkbox,
                el('span', {}, [
                    document.createTextNode(T.prefix + ' '),
                    link(TERMS_URL, T.terms),
                    document.createTextNode(' ' + T.and + ' '),
                    link(PRIVACY_URL, T.privacy),
                ]),
            ]),
            continueBtn,
            declineBtn,
            message,
        ]);

        overlay = el('div', {
            id: 'terms-gate',
            style: {
                position: 'fixed', inset: '0', zIndex: '2147483000', display: 'flex',
                alignItems: 'center', justifyContent: 'center', padding: '16px',
                background: 'rgba(0,0,0,.75)',
            },
        }, [box]);

        // Блокируем прокрутку и клики под экраном
        savedOverflow = document.documentElement.style.overflow;
        document.documentElement.style.overflow = 'hidden';
        document.body.appendChild(overlay);
        checkbox.focus();
    }

    function hideGate() {
        if (!overlay) return;
        overlay.remove();
        overlay = null;
        document.documentElement.style.overflow = savedOverflow;
    }

    async function init() {
        let status;
        try {
            const res = await fetch('/api/terms/status', { credentials: 'same-origin' });
            if (!res.ok) return;
            status = await res.json();
        } catch (_) {
            // Сервер недоступен: не блокируем сайт, чтобы не закрыть его для всех
            return;
        }
        if (!status.accepted) showGate();
    }

    if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', init);
    else init();
})();
function setToastPosition(pos) { appSettings.toastPos = pos; localStorage.setItem('toastPos', pos); applyAllSettings(); }

function setGridDensity(density) {
    appSettings.gridDensity = density;
    localStorage.setItem('gridDensity', density);
    applyGridDensity();
    updateGridDensityButtons();
}

function applyGridDensity() {
    document.body.classList.remove('density-compact', 'density-standard', 'density-large');
    document.body.classList.add('density-' + appSettings.gridDensity);
}

function updateGridDensityButtons() {
    ['compact', 'standard', 'large'].forEach(d => {
        const isActive = appSettings.gridDensity === d;
        const a = document.getElementById(`density-${d}-btn`);
        const b = document.getElementById(`qdensity-${d}-btn`);
        if (a) a.classList.toggle('active', isActive);
        if (b) b.classList.toggle('active', isActive);
    });
}

function updateSettingUIButtons() {
    const highlight = (id, active) => { const el = document.getElementById(id); if (el) el.classList.toggle('active', active); };

    highlight('bg-gradient-btn', appSettings.bgStyle === 'gradient');
    highlight('bg-flat-btn',     appSettings.bgStyle === 'flat');
    highlight('bg-oled-btn',     appSettings.bgStyle === 'oled');
    highlight('radius-sharp-btn',  appSettings.cornerRadius === 'sharp');
    highlight('radius-medium-btn', appSettings.cornerRadius === 'medium');
    highlight('radius-round-btn',  appSettings.cornerRadius === 'round');
    highlight('font-system-btn', appSettings.fontFamily === 'system');
    highlight('font-modern-btn', appSettings.fontFamily === 'modern');
    highlight('font-serif-btn',  appSettings.fontFamily === 'serif');
    highlight('anim-none-btn',       appSettings.animMode === 'none');
    highlight('anim-normal-btn',     appSettings.animMode === 'normal');
    highlight('anim-expressive-btn', appSettings.animMode === 'expressive');
    highlight('speed-fast-btn',   appSettings.animSpeed === 'fast');
    highlight('speed-normal-btn', appSettings.animSpeed === 'normal');
    highlight('speed-slow-btn',   appSettings.animSpeed === 'slow');
    highlight('hover-lift-btn',  appSettings.hoverEffect === 'lift');
    highlight('hover-scale-btn', appSettings.hoverEffect === 'scale');
    highlight('hover-glow-btn',  appSettings.hoverEffect === 'glow');
    highlight('view-grid-btn', appSettings.viewMode === 'grid');
    highlight('view-list-btn', appSettings.viewMode === 'list');
    highlight('toast-br-btn', appSettings.toastPos === 'bottom-right');
    highlight('toast-bc-btn', appSettings.toastPos === 'bottom-center');
    highlight('toast-tr-btn', appSettings.toastPos === 'top-right');

    document.querySelectorAll('.color-swatch').forEach(el => {
        const bg = (el.style.background || '').replace(/\s/g, '').toLowerCase();
        el.classList.toggle('active', bg === appSettings.accentColor.toLowerCase());
    });

    const checks = {
        'show-authors-check': appSettings.showAuthors,
        'show-actions-check': appSettings.showActions,
        'show-titles-check':  appSettings.showTitles
    };
    Object.entries(checks).forEach(([id, value]) => {
        const el = document.getElementById(id);
        if (el) el.checked = value;
    });

    const accentInput = document.getElementById('accent-color-input');
    if (accentInput) accentInput.value = appSettings.accentColor;

    const blurToggle = document.getElementById('blur-toggle');
    if (blurToggle) blurToggle.checked = appSettings.glassMode;

    const safeToggle = document.getElementById('safe-mode-toggle');
    if (safeToggle) safeToggle.checked = appSettings.safeMode;

    const dockToggle = document.getElementById('dock-mode-toggle');
    if (dockToggle) dockToggle.checked = appSettings.dockMode;

    const dockShapeRow = document.getElementById('dock-shape-row');
    if (dockShapeRow) dockShapeRow.style.display = appSettings.dockMode ? 'flex' : 'none';

    const roundBtn  = document.getElementById('dock-shape-round-btn');
    const squareBtn = document.getElementById('dock-shape-square-btn');
    if (roundBtn)  roundBtn.classList.toggle('active',  appSettings.dockShape === 'round');
    if (squareBtn) squareBtn.classList.toggle('active', appSettings.dockShape === 'square');

    const dataSaverToggle = document.getElementById('data-saver-toggle');
    if (dataSaverToggle) dataSaverToggle.checked = appSettings.dataSaver;

    const autoPauseToggle = document.getElementById('auto-pause-toggle');
    if (autoPauseToggle) autoPauseToggle.checked = appSettings.autoPauseOffscreen;

    const singlePlaybackToggle = document.getElementById('single-playback-toggle');
    if (singlePlaybackToggle) singlePlaybackToggle.checked = appSettings.singlePlayback;

    highlight('preview-near-btn',   appSettings.previewDistance === 'near');
    highlight('preview-normal-btn', appSettings.previewDistance === 'normal');
    highlight('preview-far-btn',    appSettings.previewDistance === 'far');

    updateGridDensityButtons();
}

function onBlurToggle(checked) { appSettings.glassMode = checked; localStorage.setItem('glassMode', checked ? '1' : '0'); applyAllSettings(); }
function onSafeModeToggle(checked) { appSettings.safeMode = checked; localStorage.setItem('safeMode', checked ? '1' : '0'); renderGrid(); }
function onDockModeToggle(checked) { appSettings.dockMode = checked; localStorage.setItem('dockMode', checked ? '1' : '0'); applyAllSettings(); }
function onDockShapeChange(shape) { appSettings.dockShape = shape; localStorage.setItem('dockShape', shape); applyAllSettings(); }
function onPhoneModeToggle() { appSettings.phoneMode = !appSettings.phoneMode; localStorage.setItem('phoneMode', appSettings.phoneMode ? '1' : '0'); applyAllSettings(); }

function onDataSaverToggle(checked) {
    appSettings.dataSaver = checked;
    localStorage.setItem('dataSaver', checked ? '1' : '0');
    document.querySelectorAll('.video-wrapper[data-video-src]').forEach(wrapper => {
        unloadVideoPreview(wrapper, true);
        if (isElementNearViewport(wrapper)) loadVideoPreview(wrapper);
    });
}

function onAutoPauseToggle(checked)     { appSettings.autoPauseOffscreen = checked; localStorage.setItem('autoPauseOffscreen', checked ? '1' : '0'); }
function onSinglePlaybackToggle(checked) { appSettings.singlePlayback = checked; localStorage.setItem('singlePlayback', checked ? '1' : '0'); }

function setPreviewDistance(mode) {
    appSettings.previewDistance = mode;
    localStorage.setItem('previewDistance', mode);
    updateSettingUIButtons();
    initMediaObserver();
}

function applyAllSettings() {
    applyAccentColor(appSettings.accentColor);

    document.body.classList.remove('bg-flat', 'bg-oled');
    if (appSettings.bgStyle === 'flat') document.body.classList.add('bg-flat');
    if (appSettings.bgStyle === 'oled') document.body.classList.add('bg-oled');

    if (appSettings.cornerRadius === 'sharp') {
        document.documentElement.style.setProperty('--card-radius', '0px');
        document.documentElement.style.setProperty('--btn-radius', '0px');
    } else if (appSettings.cornerRadius === 'round') {
        document.documentElement.style.setProperty('--card-radius', '20px');
        document.documentElement.style.setProperty('--btn-radius', '14px');
    } else {
        document.documentElement.style.setProperty('--card-radius', '12px');
        document.documentElement.style.setProperty('--btn-radius', '8px');
    }

    if (appSettings.fontFamily === 'modern') {
        document.documentElement.style.setProperty('--font-family', '"Inter", "Segoe UI", sans-serif');
    } else if (appSettings.fontFamily === 'serif') {
        document.documentElement.style.setProperty('--font-family', 'Georgia, serif');
    } else {
        document.documentElement.style.setProperty('--font-family', '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif');
    }

    document.body.classList.remove('anim-none', 'anim-expressive');
    if (appSettings.animMode === 'none')       document.body.classList.add('anim-none');
    if (appSettings.animMode === 'expressive') document.body.classList.add('anim-expressive');

    document.documentElement.style.setProperty(
        '--anim-speed',
        appSettings.animSpeed === 'fast' ? '0.15s' : appSettings.animSpeed === 'slow' ? '0.5s' : '0.3s'
    );

    document.body.classList.remove('hover-lift', 'hover-scale', 'hover-glow');
    document.body.classList.add('hover-' + appSettings.hoverEffect);
    document.body.classList.toggle('view-list',    appSettings.viewMode === 'list');
    document.body.classList.toggle('hide-authors', !appSettings.showAuthors);
    document.body.classList.toggle('hide-actions', !appSettings.showActions);
    document.body.classList.toggle('hide-titles',  !appSettings.showTitles);
    document.body.classList.toggle('glass-mode',   appSettings.glassMode);
    document.body.classList.toggle('dock-mode',    appSettings.dockMode);
    document.body.classList.remove('dock-shape-round', 'dock-shape-square');
    document.body.classList.add('dock-shape-' + appSettings.dockShape);
    document.body.classList.toggle('phone-mode', appSettings.phoneMode);

    document.body.classList.remove('toast-bottom-center', 'toast-top-right');
    if (appSettings.toastPos === 'bottom-center') document.body.classList.add('toast-bottom-center');
    if (appSettings.toastPos === 'top-right')     document.body.classList.add('toast-top-right');

    applyGridDensity();
    updateSettingUIButtons();
}

function renderSettingsPage() { updateSettingUIButtons(); }

const PROFANITY_PATTERNS = [
    /бля\w*/gi, /хуй\w*/gi, /хуе\w*/gi, /пизд\w*/gi, /еба\w*/gi, /ебл\w*/gi,
    /сука/gi, /мудак\w*/gi, /долбо\w*/gi, /гандон\w*/gi,
    /fuck\w*/gi, /shit\w*/gi, /bitch\w*/gi, /asshole\w*/gi, /dick\w*/gi,
];

function maskProfanity(text) {
    let result = String(text ?? '');
    PROFANITY_PATTERNS.forEach(pattern => {
        result = result.replace(pattern, match => match[0] + '*'.repeat(Math.max(1, match.length - 1)));
    });
    return result;
}

// ================= LANGUAGE =================
function toggleLangMenu() { document.getElementById('lang-menu').classList.toggle('open'); }

function switchLanguage(lang) {
    if (!translations[lang]) lang = 'en';
    currentLang = lang;
    localStorage.setItem('app_lang', lang);
    applyLanguage();
    updateActiveLangButton();

    const sortBtn = document.getElementById('sort-btn-label');
    if (sortBtn) {
        const labels = { default: t('sortDefault'), newest: t('sortNewest'), popular: t('sortPopular'), likes: t('sortLikes'), downloads: t('sortDownloads') };
        sortBtn.textContent = labels[currentSort] || labels.default;
    }

    buildCategoryChips();
    document.getElementById('lang-menu')?.classList.remove('open');
    renderAuthArea();
    filterAndRenderVideos(false);

    if (currentPageName === 'news')        loadNews();
    if (currentPageName === 'collections') loadCollections();
    if (currentPageName === 'profile')     loadProfile();
    if (currentPageName === 'settings')    renderSettingsPage();
}

function applyLanguage() {
    document.documentElement.lang = currentLang;
    document.querySelectorAll('[data-i18n]').forEach(el => {
        const val = t(el.getAttribute('data-i18n'));
        if (val) el.textContent = val;
    });
    document.querySelectorAll('[data-i18n-ph]').forEach(el => {
        const val = t(el.getAttribute('data-i18n-ph'));
        if (val) el.placeholder = val;
    });
}

function updateActiveLangButton() {
    document.querySelectorAll('.lang-option').forEach(btn => btn.classList.remove('active'));
    const langMap = { en: 0, uk: 1, ru: 2 };
    const buttons = document.querySelectorAll('.lang-option');
    if (buttons[langMap[currentLang]]) buttons[langMap[currentLang]].classList.add('active');
}

// ================= THEME =================
function toggleTheme() {
    const isDark = document.body.classList.toggle('dark-theme');
    localStorage.setItem('theme', isDark ? 'dark' : 'light');
}

// ================= TOAST NOTIFICATIONS =================
function showToast(msg, type = 'info', duration = 3000) {
    if (typeof type === 'boolean') type = type ? 'error' : 'success';

    const container = document.getElementById('toast-container');
    if (!container) return;

    const toast = document.createElement('div');
    toast.className = `toast-item ${type}`;

    let iconSvg = '';
    if (type === 'success') {
        iconSvg = `<svg viewBox="0 0 24 24"><path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"></path><polyline points="22 4 12 14.01 9 11.01"></polyline></svg>`;
    } else if (type === 'error') {
        iconSvg = `<svg viewBox="0 0 24 24"><circle cx="12" cy="12" r="10"></circle><line x1="15" y1="9" x2="9" y2="15"></line><line x1="9" y1="9" x2="15" y2="15"></line></svg>`;
    } else if (type === 'warning') {
        iconSvg = `<svg viewBox="0 0 24 24"><path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z"></path><line x1="12" y1="9" x2="12" y2="13"></line><line x1="12" y1="17" x2="12.01" y2="17"></line></svg>`;
    } else {
        iconSvg = `<svg viewBox="0 0 24 24"><circle cx="12" cy="12" r="10"></circle><line x1="12" y1="16" x2="12" y2="12"></line><line x1="12" y1="8" x2="12.01" y2="8"></line></svg>`;
    }

    toast.innerHTML = `<div class="toast-icon">${iconSvg}</div><div class="toast-msg">${escapeHtml(msg)}</div>`;
    container.appendChild(toast);

    setTimeout(() => {
        toast.classList.add('hide');
        toast.addEventListener('animationend', () => toast.remove());
    }, duration);
}

// ================= NAVIGATION =================
function navigateTo(page) {
    document.querySelectorAll('.page-section').forEach(s => s.classList.remove('active'));
    const pageEl = document.getElementById(page + '-page');
    if (pageEl) pageEl.classList.add('active');

    document.querySelectorAll('.nav-item').forEach(item => item.classList.remove('active'));
    const navItem = document.querySelector(`.nav-item[data-page="${page}"]`);
    if (navItem) navItem.classList.add('active');

    currentPageName = page;

    if (page === 'profile')     loadProfile();
    if (page === 'news')        loadNews();
    if (page === 'collections') loadCollections();
    if (page === 'settings')    renderSettingsPage();
}

// ================= AUTH =================
async function checkAuth() {
    try {
        const res = await fetch('/api/me', { credentials: 'same-origin' });
        currentUserData = await res.json();
    } catch (e) {
        currentUserData = { loggedIn: false };
    }

    const isAdmin = currentUserData.loggedIn && currentUserData.user && currentUserData.user.role === 'admin';
    const isStaff = currentUserData.loggedIn && currentUserData.user &&
        (currentUserData.user.role === 'admin' || currentUserData.user.role === 'moderator');

    document.getElementById('admin-news-section').style.display = isAdmin ? 'block' : 'none';
    document.getElementById('admin-nav-item').style.display = isStaff ? 'flex' : 'none';
}

function renderAuthArea() {
    const area = document.getElementById('auth-area');
    if (currentUserData.loggedIn) {
        area.innerHTML = `
            <div class="user-chip">
                <span>${escapeHtml(currentUserData.user.username)}</span>
                <button class="logout-btn" onclick="logout()">${t('logout')}</button>
            </div>`;
    } else {
        area.innerHTML = `<a href="/auth.html" class="auth-link">${t('login')}</a>`;
    }
}

async function logout() {
    try { await fetch('/api/logout', { method: 'POST', credentials: 'same-origin' }); } catch (e) {}
    location.reload();
}

// ================= SKELETON LOADERS =================
function renderSkeletons(count = 8) {
    const container = document.getElementById('video-container');
    if (!container) return;
    container.innerHTML = Array.from({ length: count }).map(() => `
        <div class="skeleton-card">
            <div class="skeleton-wrapper skeleton-shimmer"></div>
            <div class="skeleton-info">
                <div class="skeleton-line full skeleton-shimmer"></div>
                <div class="skeleton-line medium skeleton-shimmer"></div>
                <div class="skeleton-line short skeleton-shimmer"></div>
                <div class="skeleton-btn-row">
                    <div class="skeleton-btn skeleton-shimmer"></div>
                    <div class="skeleton-btn skeleton-shimmer"></div>
                    <div class="skeleton-btn skeleton-shimmer"></div>
                </div>
            </div>
        </div>`).join('');
}

// ================= VIDEOS =================
async function loadVideos() {
    renderSkeletons(8);
    try {
        const response = await fetch('/api/videos', { credentials: 'same-origin' });
        if (!response.ok) throw new Error(`HTTP ${response.status}`);
        const data = await response.json();
        rawVideos = Array.isArray(data) ? data.map(normalizeVideo).filter(Boolean) : [];
        buildCategoryChips();
        filterAndRenderVideos(true);
    } catch (err) {
        console.error('Video loading error:', err);
        document.getElementById('video-container').innerHTML = `<p class="status-message">${t('noVideos')}</p>`;
    }
}

function normalizeVideo(video, index = 0) {
    if (typeof video === 'string') {
        return { name: video, category: null, categories: [], tags: [], uploader: null, createdAt: null, index };
    }
    if (!video || typeof video !== 'object') return null;
    const name = String(video.name ?? video.filename ?? video.file ?? '').trim();
    if (!name) return null;

    const categories = []
        .concat(video.categories || [])
        .concat(video.tags || [])
        .filter(Boolean)
        .map(v => typeof v === 'object' ? (v.name ?? v.title ?? '') : String(v))
        .filter(Boolean);

    return {
        ...video, name,
        category: video.category ?? null,
        categories,
        uploader: video.uploader || null,
        createdAt: video.createdAt ?? video.created_at ?? video.uploadedAt ?? video.uploaded_at ?? video.date ?? video.mtime ?? null,
        index
    };
}

function getVideoCategories(video) {
    const result = [];
    if (video.category) result.push(String(video.category));
    if (Array.isArray(video.categories)) result.push(...video.categories.map(String));
    if (Array.isArray(video.tags)) {
        result.push(...video.tags.map(tag => typeof tag === 'object' ? (tag.name ?? '') : String(tag)));
    }
    return [...new Set(result.map(v => v.trim()).filter(Boolean))];
}

function buildCategoryChips() {
    const container = document.getElementById('category-chips');
    if (!container) return;

    const categories = [...new Set(rawVideos.flatMap(getVideoCategories))].sort((a, b) => a.localeCompare(b, undefined, { sensitivity: 'base' }));
    const allActive = currentCategory === 'all';
    container.innerHTML = `<button class="chip ${allActive ? 'active' : ''}" onclick="selectCategory('all', this)" data-i18n="categoryAll">${escapeHtml(t('categoryAll'))}</button>`;

    categories.forEach(category => {
        const btn = document.createElement('button');
        btn.className = `chip ${currentCategory === category ? 'active' : ''}`;
        btn.textContent = category;
        btn.dataset.category = category;
        btn.onclick = () => selectCategory(category, btn);
        container.appendChild(btn);
    });
}

// ================= TRAFFIC OPTIMIZATION: DEBOUNCED SEARCH =================
// Задержка 300 мс — быстрый набор "motion blur" = 1 вызов вместо 10
let _searchDebounceTimer = null;
function onSearchInput() {
    clearTimeout(_searchDebounceTimer);
    _searchDebounceTimer = setTimeout(() => filterAndRenderVideos(true), 300);
}

// ================= CATEGORIES & SORT =================
let currentCategory = 'all';
let currentSort = 'default';

function selectCategory(category, btnEl) {
    currentCategory = category;
    document.querySelectorAll('#category-chips .chip').forEach(c => c.classList.remove('active'));
    if (btnEl) btnEl.classList.add('active');
    filterAndRenderVideos(true);
}

function openSortSheet()  { const s = document.getElementById('sort-sheet'); if (s) s.classList.add('open'); }
function closeSortSheet() { const s = document.getElementById('sort-sheet'); if (s) s.classList.remove('open'); }

function parseTimestamp(value) {
    if (value === null || value === undefined || value === '') return null;
    const numeric = Number(value);
    if (Number.isFinite(numeric)) return numeric < 1e12 ? numeric * 1000 : numeric;
    const parsed = Date.parse(String(value));
    return Number.isNaN(parsed) ? null : parsed;
}

function getDateValue(video) {
    const candidates = [video.createdAt, video.created_at, video.uploadedAt, video.uploaded_at, video.mtime, video.modifiedAt, video.modified_at, video.timestamp];
    for (const candidate of candidates) {
        const parsed = parseTimestamp(candidate);
        if (parsed !== null) return parsed;
    }
    return null;
}

// ================= TRAFFIC OPTIMIZATION: HEAD DATE CACHE =================
// HEAD-запросы для дат кэшируются и дедуплицируются
const _headDateCache = Object.create(null);

async function fetchVideoFileDate(video) {
    const filename = video.name;
    if (_headDateCache[filename] !== undefined) {
        video.__fileDate = _headDateCache[filename];
        return video.__fileDate;
    }
    return fetchOnce('head:' + filename, async () => {
        try {
            const res = await fetch(`/videos/${encodeURIComponent(filename)}`, {
                method: 'HEAD', credentials: 'same-origin', cache: 'no-store'
            });
            const header = res.headers.get('Last-Modified');
            const date = header ? parseTimestamp(header) : null;
            video.__fileDate = date;
            _headDateCache[filename] = date;
            return date;
        } catch {
            video.__fileDate = null;
            _headDateCache[filename] = null;
            return null;
        }
    });
}

async function ensureNewestDates(videos) {
    const missing = videos.filter(v => getDateValue(v) === null && _headDateCache[v.name] === undefined);
    if (!missing.length) return;
    await fetchPool(missing, fetchVideoFileDate, 6); // HEAD лёгкий, concurrency выше
}

// ================= TRAFFIC OPTIMIZATION: STATS WITH TTL + DEDUP + POOL =================
async function fetchVideoStats(video) {
    const filename = video.name;
    const cached = statsCache[filename];
    if (isCacheFresh(cached)) return cached;

    return fetchOnce('stats:' + filename, async () => {
        const encoded = encodeURIComponent(filename);
        const [likesR, dlR] = await Promise.allSettled([
            fetch(`/api/likes/${encoded}`,     { credentials: 'same-origin' }),
            fetch(`/api/downloads/${encoded}`, { credentials: 'same-origin' })
        ]);

        let likes     = Number(video.likes ?? video.likeCount ?? 0) || 0;
        let downloads = Number(video.downloads ?? video.downloadCount ?? 0) || 0;
        let liked     = false;

        if (likesR.status === 'fulfilled' && likesR.value.ok) {
            const d = await likesR.value.json().catch(() => ({}));
            likes = Number(d.likes ?? d.count ?? likes) || 0;
            liked = !!d.liked;
        }
        if (dlR.status === 'fulfilled' && dlR.value.ok) {
            const d = await dlR.value.json().catch(() => ({}));
            downloads = Number(d.downloads ?? d.count ?? downloads) || 0;
        }

        const entry = { likes, downloads, liked, ts: Date.now() };
        statsCache[filename] = entry;
        return entry;
    });
}

async function ensureStatsForVideos(videos) {
    const stale = videos.filter(v => !isCacheFresh(statsCache[v.name]));
    if (!stale.length) return;
    await fetchPool(stale, fetchVideoStats, 4);
}

async function applySort(sortType) {
    currentSort = sortType || 'default';
    const labelEl = document.getElementById('sort-btn-label');
    const labelMap = { default: t('sortDefault'), newest: t('sortNewest'), popular: t('sortPopular'), likes: t('sortLikes'), downloads: t('sortDownloads') };
    if (labelEl) labelEl.textContent = labelMap[currentSort] || t('sortDefault');

    closeSortSheet();

    if (['popular', 'likes', 'downloads'].includes(currentSort)) await ensureStatsForVideos(filteredVideos);
    if (currentSort === 'newest') await ensureNewestDates(filteredVideos);

    sortFilteredVideos();
    currentPageNum = 1;
    renderGrid();
}

function sortFilteredVideos() {
    const decorated = filteredVideos.map((video, index) => ({ video, index }));
    decorated.sort((a, b) => {
        const va = a.video, vb = b.video;
        if (currentSort === 'newest') {
            const da = getDateValue(va) ?? va.__fileDate ?? null;
            const db = getDateValue(vb) ?? vb.__fileDate ?? null;
            if (da !== null && db !== null && da !== db) return db - da;
            if (da !== null && db === null) return -1;
            if (da === null && db !== null) return 1;
            return (Number(vb.index ?? b.index) || 0) - (Number(va.index ?? a.index) || 0);
        }
        if (currentSort === 'likes')     { const sa = getCachedStats(va).likes,     sb = getCachedStats(vb).likes;     return sb - sa || a.index - b.index; }
        if (currentSort === 'downloads') { const sa = getCachedStats(va).downloads, sb = getCachedStats(vb).downloads; return sb - sa || a.index - b.index; }
        if (currentSort === 'popular') {
            const sa = getCachedStats(va), sb = getCachedStats(vb);
            return (sb.likes + sb.downloads) - (sa.likes + sa.downloads) || a.index - b.index;
        }
        return a.index - b.index;
    });
    filteredVideos = decorated.map(item => item.video);
}

async function filterAndRenderVideos(reset) {
    const input = document.getElementById('search-input');
    const query = input ? input.value.toLowerCase().trim() : '';
    if (reset) currentPageNum = 1;

    filteredVideos = rawVideos.filter(video => {
        const text = [video.name, video.category, ...(video.categories || []),
            ...(video.tags || []).map(tag => typeof tag === 'object' ? (tag.name ?? '') : String(tag))
        ].join(' ').toLowerCase();

        const matchesSearch   = !query || text.includes(query);
        const categories      = getVideoCategories(video);
        const matchesCategory = currentCategory === 'all' ||
            categories.some(c => c.localeCompare(currentCategory, undefined, { sensitivity: 'base' }) === 0);

        return matchesSearch && matchesCategory;
    });

    if (['popular', 'likes', 'downloads'].includes(currentSort)) {
        const missing = filteredVideos.filter(v => !statsCache[v.name]);
        if (missing.length) await ensureStatsForVideos(missing);
    }

    sortFilteredVideos();
    renderGrid();
}

function isCurrentUserAdmin() {
    return !!(currentUserData && currentUserData.loggedIn && currentUserData.user &&
        String(currentUserData.user.role || '').toLowerCase() === 'admin');
}

async function renameVideo(encodedName, event) {
    if (event) { event.preventDefault(); event.stopPropagation(); }
    if (!isCurrentUserAdmin()) return showToast(t('adminOnly'), 'error');
    const oldName = decodeURIComponent(encodedName);
    const extension = oldName.includes('.') ? oldName.slice(oldName.lastIndexOf('.')) : '';
    const currentBase = extension ? oldName.slice(0, -extension.length) : oldName;
    const newBase = prompt(t('renameVideoPrompt'), currentBase);
    if (newBase === null) return;
    const cleanBase = String(newBase).trim();
    if (!cleanBase) return showToast(t('renameVideoEmpty'), 'warning');
    try {
        const res = await fetch(`/api/admin/videos/${encodedName}/rename`, {
            method: 'POST', credentials: 'same-origin',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ new_name: cleanBase })
        });
        const data = await res.json().catch(() => ({}));
        if (!res.ok) return showToast(data.error || 'Не удалось переименовать футаж', 'error');
        showToast(data.message || 'Футаж переименован', 'success');
        await loadVideos();
    } catch (e) {
        console.error('Rename video error:', e);
        showToast('Ошибка соединения с сервером', 'error');
    }
}

async function deleteVideo(encodedName, event) {
    if (event) { event.preventDefault(); event.stopPropagation(); }
    if (!isCurrentUserAdmin()) return showToast(t('adminOnly'), 'error');
    const filename = decodeURIComponent(encodedName);
    const confirmed = confirm((t('deleteVideoConfirm')).replace('{name}', filename));
    if (!confirmed) return;
    try {
        const res = await fetch(`/api/admin/videos/${encodedName}`, { method: 'DELETE', credentials: 'same-origin' });
        const data = await res.json().catch(() => ({}));
        if (!res.ok) return showToast(data.error || 'Не удалось удалить футаж', 'error');
        rawVideos      = rawVideos.filter(v => v && v.name !== filename);
        filteredVideos = filteredVideos.filter(v => v && v.name !== filename);
        renderGrid();
        showToast(data.message || 'Футаж удалён', 'success');
    } catch (e) {
        console.error('Delete video error:', e);
        showToast('Ошибка соединения с сервером', 'error');
    }
}

// ================= TRAFFIC OPTIMIZATION: applyStatsToCard =================
// Единая точка обновления DOM для статистики карточки
function applyStatsToCard(card, stats) {
    const likeBtn = card.querySelector('.like-btn');
    if (likeBtn) {
        likeBtn.querySelector('.like-count').textContent = stats.likes ?? 0;
        likeBtn.classList.toggle('liked', !!stats.liked);
    }
    const dlSpan = card.querySelector('.dl-count');
    if (dlSpan) dlSpan.textContent = `⬇ ${stats.downloads ?? 0}`;
}

// ================= TRAFFIC OPTIMIZATION: cache-first loadCardStats =================
// 1. Рисует из кэша мгновенно (0 запросов)
// 2. Если кэш устарел — обновляет в фоне через fetchOnce (1 общий промис)
async function loadCardStats(filename, card) {
    const cached = statsCache[filename];

    if (cached) {
        applyStatsToCard(card, cached);
        if (isCacheFresh(cached)) return;
    }

    try {
        const stats = await fetchOnce('stats:' + filename, async () => {
            const encoded = encodeURIComponent(filename);
            const [likesRes, dlRes] = await Promise.all([
                fetch(`/api/likes/${encoded}`,     { credentials: 'same-origin' }),
                fetch(`/api/downloads/${encoded}`, { credentials: 'same-origin' })
            ]);
            const likesData = await likesRes.json().catch(() => ({}));
            const dlData    = await dlRes.json().catch(() => ({}));
            const entry = {
                likes:     Number(likesData.likes     ?? 0),
                downloads: Number(dlData.downloads    ?? 0),
                liked:     !!likesData.liked,
                ts:        Date.now()
            };
            statsCache[filename] = entry;
            return entry;
        });
        applyStatsToCard(card, stats);
    } catch (_) { /* DOM уже показывает кэш или нули */ }
}

// ================= RENDER GRID =================
function renderGrid() {
    const container = document.getElementById('video-container');
    const loadMoreBtn = document.getElementById('load-more-btn');
    if (!container) return;

    if (currentPageNum === 1) {
        container.innerHTML = '';
        if (mediaObserver) mediaObserver.disconnect();
        // Переподключаем statsObserver при полном ре-рендере
        if (statsObserver) {
            // Отключаем старые наблюдения (карточки удалены из DOM)
            statsObserver.disconnect();
        }
    }

    if (filteredVideos.length === 0) {
        container.innerHTML = `<p class="status-message">${t('notFound')}</p>`;
        loadMoreBtn.style.display = 'none';
        return;
    }

    const start = (currentPageNum - 1) * ITEMS_PER_PAGE;
    const end   = currentPageNum * ITEMS_PER_PAGE;
    const items = filteredVideos.slice(start, end);

    items.forEach(video => {
        const filename = video.name;
        const uploader = video.uploader || null;
        const card = document.createElement('div');
        card.className = 'video-card';

        const isImage = /\.(jpg|jpeg|png|gif|webp)$/i.test(filename);
        const encoded = encodeURIComponent(filename);

        const media = isImage
            ? `<img src="/videos/${encoded}" alt="${escapeHtml(filename)}" loading="lazy">`
            : `<div class="video-placeholder"><div class="mini-spinner"></div></div>
               <button type="button" class="play-overlay" onclick="activateVideo(this)" aria-label="Play">
                   <svg viewBox="0 0 24 24" fill="currentColor"><polygon points="6 3 20 12 6 21"></polygon></svg>
               </button>`;

        const wrapperDataAttr = isImage ? '' : ` data-video-src="/videos/${encoded}"`;

        const uploaderHtml = uploader ? `
            <div class="card-uploader">
                <a href="/user/${encodeURIComponent(uploader.username)}" class="uploader-link" onclick="event.stopPropagation()">
                    ${uploaderAvatarHtml(uploader)}
                    <span class="uploader-name">${escapeHtml(uploader.username)}</span>
                    ${uploader.is_verified ? verifiedBadgeSvg() : ''}
                </a>
                ${(uploader.tags || []).map(tag => `
                    <span class="user-tag-badge" style="color:${escapeHtml(tag.color || '#7ec384')}; background:${escapeHtml(tag.color || '#7ec384')}22;">
                        ${tag.icon ? escapeHtml(tag.icon) + ' ' : ''}${escapeHtml(tag.name)}
                    </span>`).join('')}
            </div>` : '';

        // Используем кэш для первичного отображения (без запроса)
        const initStats = getCachedStats(video);

        card.innerHTML = `
            <div class="video-wrapper"${wrapperDataAttr}>${media}</div>
            <div class="card-info">
                <span class="video-title">${escapeHtml(appSettings.safeMode ? maskProfanity(filename) : filename)}</span>
                ${uploaderHtml}
                <div class="card-meta">
                    <span class="dl-count">⬇ ${initStats.downloads}</span>
                </div>
                <div class="card-actions">
                    <a href="/videos/${encoded}" download="${escapeHtml(filename)}" class="action-btn download-btn" onclick="trackDownload('${escapeJs(encoded)}')">⬇</a>
                    <button type="button" class="action-btn like-btn" data-name="${escapeHtml(filename)}" onclick="toggleLike('${escapeJs(encoded)}', this, event)">
                        ♥ <span class="like-count">${initStats.likes}</span>
                    </button>
                    <button type="button" class="action-btn collection-btn" onclick="openCollectionModal('${escapeJs(filename)}')">✚</button>
                </div>
                ${isCurrentUserAdmin() ? `
                    <div class="admin-video-actions">
                        <button type="button" class="action-btn edit-video-btn" onclick="renameVideo('${escapeJs(encoded)}', event)">✎ ${t('editVideo')}</button>
                        <button type="button" class="action-btn delete-video-btn" onclick="deleteVideo('${escapeJs(encoded)}', event)">🗑 ${t('deleteVideo')}</button>
                    </div>` : ''}
            </div>`;

        container.appendChild(card);

        // TRAFFIC OPTIMIZATION: lazy stats — только когда карточка видна
        card.dataset.statsName = filename;
        if (statsObserver) {
            statsObserver.observe(card);
        } else {
            loadCardStats(filename, card);
        }

        if (!isImage) {
            const wrapper = card.querySelector('.video-wrapper');
            if (wrapper) observeWrapper(wrapper);
        }
    });

    loadMoreBtn.style.display = (end >= filteredVideos.length) ? 'none' : 'block';
}

function loadMore() { currentPageNum++; renderGrid(); }

async function toggleLike(encodedName, btn, event) {
    if (event) { event.preventDefault(); event.stopPropagation(); }
    if (btn.dataset.loading === '1') return;
    btn.dataset.loading = '1';
    btn.disabled = true;

    const countSpan = btn.querySelector('.like-count');
    const oldCount  = parseInt(countSpan?.textContent) || 0;
    const wasLiked  = btn.classList.contains('liked');

    try {
        const res = await fetch(`/api/likes/${encodedName}`, {
            method: 'POST', credentials: 'same-origin', headers: { 'Content-Type': 'application/json' }
        });
        if (res.status === 401) { showToast(t('loginToLike'), 'warning'); return; }
        if (!res.ok) throw new Error();

        const data = await res.json();
        if (data.liked) {
            btn.classList.add('liked');
            if (countSpan) countSpan.textContent = oldCount + (wasLiked ? 0 : 1);
            showToast('Liked footage', 'success');
        } else {
            btn.classList.remove('liked');
            if (countSpan) countSpan.textContent = Math.max(0, oldCount - (wasLiked ? 1 : 0));
        }

        // Обновляем кэш после лайка
        const filename = decodeURIComponent(encodedName);
        if (statsCache[filename]) {
            statsCache[filename].liked     = !!data.liked;
            statsCache[filename].likes     = Number(countSpan?.textContent) || 0;
            statsCache[filename].ts        = Date.now();
        }
    } catch (err) {
        console.error('Like error:', err);
        if (countSpan) countSpan.textContent = oldCount;
        showToast(t('connectionError'), 'error');
    } finally {
        btn.dataset.loading = '0';
        btn.disabled = false;
    }
}

// ================= VIDEO LAZY LOADING / PERFORMANCE =================
let mediaObserver = null;

function getPreviewRootMargin() {
    switch (appSettings.previewDistance) {
        case 'near': return '50px 0px';
        case 'far':  return '600px 0px';
        default:     return '200px 0px';
    }
}

function initMediaObserver() {
    if (mediaObserver) mediaObserver.disconnect();
    if (!('IntersectionObserver' in window)) { mediaObserver = null; return; }

    mediaObserver = new IntersectionObserver((entries) => {
        entries.forEach(entry => {
            const wrapper = entry.target;
            if (entry.isIntersecting) loadVideoPreview(wrapper);
            else unloadVideoPreview(wrapper);
        });
    }, { root: null, rootMargin: getPreviewRootMargin(), threshold: 0.01 });

    document.querySelectorAll('.video-wrapper[data-video-src]').forEach(w => mediaObserver.observe(w));
}

function observeWrapper(wrapper) {
    if (!mediaObserver) initMediaObserver();
    if (mediaObserver) mediaObserver.observe(wrapper);
    else loadVideoPreview(wrapper);
}

function isElementNearViewport(el) {
    const rect = el.getBoundingClientRect();
    const margin = 300;
    return rect.bottom > -margin && rect.top < (window.innerHeight + margin);
}

function loadVideoPreview(wrapper) {
    if (!wrapper || !wrapper.isConnected) return;
    const state = wrapper.dataset.previewState;
    if (state === 'loading' || state === 'loaded') return;
    const src = wrapper.dataset.videoSrc;
    if (!src) return;

    if (appSettings.dataSaver) {
        wrapper.dataset.previewState = 'skipped';
        wrapper.classList.add('preview-skipped');
        return;
    }

    wrapper.dataset.previewState = 'loading';
    const video = document.createElement('video');
    video.muted = true;
    video.playsInline = true;
    video.setAttribute('preload', 'metadata');
    video.addEventListener('click', () => activateVideo(video));

    video.addEventListener('loadeddata', () => {
        wrapper.dataset.previewState = 'loaded';
        wrapper.classList.add('frame-ready');
    }, { once: true });
    video.addEventListener('error', () => {
        wrapper.dataset.previewState = 'error';
        wrapper.classList.add('frame-ready');
    }, { once: true });

    video.src = src + '#t=0.1';
    wrapper.insertBefore(video, wrapper.firstChild);
}

function unloadVideoPreview(wrapper, force) {
    if (!wrapper) return;
    const video = wrapper.querySelector('video');
    if (!video) return;

    const isPlaying = wrapper.classList.contains('playing') && !video.paused;
    if (isPlaying) {
        if (!force && !appSettings.autoPauseOffscreen) return;
        video.pause();
        wrapper.classList.remove('playing');
    }

    video.removeAttribute('src');
    try { video.load(); } catch (e) {}
    video.remove();
    wrapper.dataset.previewState = 'idle';
    wrapper.classList.remove('frame-ready', 'preview-skipped');
}

function pauseAllOtherVideos(exceptWrapper) {
    document.querySelectorAll('.video-wrapper.playing').forEach(wrapper => {
        if (wrapper === exceptWrapper) return;
        const video = wrapper.querySelector('video');
        if (video) { video.pause(); video.controls = false; video.muted = true; }
        wrapper.classList.remove('playing');
    });
}

function activateVideo(btn) {
    const wrapper = btn.closest ? btn.closest('.video-wrapper') : btn;
    if (!wrapper) return;

    let video = wrapper.querySelector('video');
    if (!video) {
        const src = wrapper.dataset.videoSrc;
        if (!src) return;
        video = document.createElement('video');
        video.playsInline = true;
        video.src = src;
        wrapper.insertBefore(video, wrapper.firstChild);
        wrapper.classList.remove('preview-skipped');
        wrapper.classList.add('frame-ready');
        wrapper.dataset.previewState = 'loaded';
    }

    if (appSettings.singlePlayback) pauseAllOtherVideos(wrapper);
    video.muted = false;
    video.controls = true;
    video.setAttribute('preload', 'auto');
    wrapper.classList.add('playing');
    video.play().catch(() => { video.muted = true; video.play().catch(() => {}); });
}

async function trackDownload(encodedName) {
    try { await fetch(`/api/downloads/${encodedName}`, { method: 'POST' }); } catch (e) {}
}

// ================= COLLECTIONS MODAL =================
async function openCollectionModal(filename) {
    selectedVideoForCollection = filename;
    const modal = document.getElementById('collection-modal');
    const list  = document.getElementById('collection-modal-list');
    modal.classList.add('open');
    list.innerHTML = `<p class="status-message">${t('loading')}</p>`;

    try {
        const res = await fetch('/api/collections/my', { credentials: 'same-origin' });
        if (res.status === 401) { list.innerHTML = `<p class="status-message">${t('loginToView')}</p>`; return; }
        if (!res.ok) throw new Error();

        const collections = await res.json();
        if (!Array.isArray(collections) || collections.length === 0) {
            list.innerHTML = `<p class="status-message">${t('noCollections')}</p>`;
            return;
        }
        list.innerHTML = collections.map(c => {
            const count = Array.isArray(c.items) ? c.items.length : 0;
            return `<button type="button" class="modal-option" onclick="addVideoToCollection(${Number(c.id)})">${escapeHtml(c.name)} <span style="opacity:.6"> · ${count}</span></button>`;
        }).join('');
    } catch (e) {
        list.innerHTML = `<p class="status-message">${t('connectionError')}</p>`;
    }
}

function closeCollectionModal() {
    document.getElementById('collection-modal').classList.remove('open');
    selectedVideoForCollection = null;
}

function closeTgBanner() {
    const b = document.getElementById('tg-warning-banner');
    if (b) b.style.display = 'none';
    localStorage.setItem('tg_banner_closed', '1');
}

async function addVideoToCollection(collectionId) {
    if (!selectedVideoForCollection) return;
    const videoName = selectedVideoForCollection;
    try {
        const res = await fetch(`/api/collections/${encodeURIComponent(collectionId)}/items`, {
            method: 'POST', credentials: 'same-origin',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ video_name: videoName })
        });
        const data = await res.json().catch(() => ({}));
        if (res.status === 401) { showToast(t('loginToView'), 'warning'); return; }
        if (res.status === 409) { showToast(data.error || t('alreadyInCollection'), 'info'); return; }
        if (!res.ok) { showToast(data.error || t('addToCollectionFail'), 'error'); return; }
        showToast(t('addedToCollection'), 'success');
        closeCollectionModal();
    } catch (e) {
        showToast(t('connectionError'), 'error');
    }
}

async function createCollectionFromVideo() {
    const name = prompt(t('collectionNamePrompt'));
    if (!name || !name.trim()) return;
    try {
        const res = await fetch('/api/collections', {
            method: 'POST', credentials: 'same-origin',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ name: name.trim(), description: '', is_public: 1 })
        });
        const data = await res.json().catch(() => ({}));
        if (res.status === 401) { showToast(t('loginToView'), 'warning'); return; }
        if (!res.ok || !data.id) { showToast(data.error || t('collectionCreateFail'), 'error'); return; }
        await addVideoToCollection(data.id);
    } catch (e) {
        showToast(t('connectionError'), 'error');
    }
}

document.addEventListener('click', (e) => {
    const modal = document.getElementById('collection-modal');
    if (modal && modal.classList.contains('open') && e.target === modal) closeCollectionModal();
    if (!e.target.closest('.lang-dropdown')) document.getElementById('lang-menu').classList.remove('open');
});

document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape') { closeCollectionModal(); closeSortSheet(); }
});

// ================= PROFILE =================
async function loadProfile() {
    const content = document.getElementById('profile-content');
    const page    = document.getElementById('page-content');
    content.innerHTML = `<p class="status-message">${t('loading')}</p>`;

    try {
        const meRes = await fetch('/api/me', { credentials: 'same-origin' });
        const me = await meRes.json();

        if (!me.loggedIn) {
            page.innerHTML = `
                <div class="not-logged">
                    <h2>${t('loginRequiredTitle')}</h2>
                    <p>${t('loginRequiredText')}</p>
                    <a href="/auth">${t('login')}</a>
                </div>`;
            return;
        }

        const [profRes, subsRes, colsRes] = await Promise.all([
            fetch('/api/profile', { credentials: 'same-origin' }),
            fetch('/api/submissions/my', { credentials: 'same-origin' }),
            fetch('/api/collections/my', { credentials: 'same-origin' })
        ]);
        if (!profRes.ok) throw new Error('Profile request failed');

        const prof = await profRes.json();
        const subs = subsRes.ok ? await subsRes.json() : [];
        let myCollections = [];
        if (colsRes.ok) {
            try { myCollections = await colsRes.json(); } catch (e) { myCollections = []; }
        }

        let publicUser = null;
        if (prof.username) {
            try {
                const userRes = await fetch(`/api/user/${encodeURIComponent(prof.username)}`, { credentials: 'same-origin' });
                if (userRes.ok) publicUser = await userRes.json();
            } catch (e) { console.error('Fallback user fetch error:', e); }
        }

        const tags             = Array.isArray(prof.tags)               ? prof.tags               : (Array.isArray(publicUser?.tags)               ? publicUser.tags               : []);
        const publicCollections = Array.isArray(prof.public_collections) ? prof.public_collections : (Array.isArray(publicUser?.public_collections) ? publicUser.public_collections : []);

        const username      = String(prof.username || '');
        const avatarUrl     = prof.avatar_url || publicUser?.avatar_url || null;
        const activityOn    = prof.activity_visible !== false;

        content.innerHTML = `
            <div class="profile-header">
                <div class="avatar-wrap">
                    <div class="avatar ${activityOn ? 'ring-online' : 'ring-hidden'}" id="prof-avatar"></div>
                    <button type="button" class="avatar-edit" id="avatar-edit-btn" title="${escapeHtml(pt('changeAvatar'))}" aria-label="${escapeHtml(pt('changeAvatar'))}">
                        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"><path d="M23 19a2 2 0 0 1-2 2H3a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h4l2-3h6l2 3h4a2 2 0 0 1 2 2z"/><circle cx="12" cy="13" r="4"/></svg>
                    </button>
                    <input type="file" id="avatar-file" accept=".png,.jpg,.jpeg,.webp,image/png,image/jpeg,image/webp" hidden>
                </div>
                <div class="profile-info">
                    <div class="profile-name-row">
                        <h2 id="prof-username"></h2>
                        <span id="prof-verified" title="Verified" style="display:none;"></span>
                    </div>
                    <div id="prof-tags" class="user-tags"></div>
                    <div class="profile-chips">
                        <span class="role-badge" id="prof-role"></span>
                        <span class="activity-pill ${activityOn ? 'on' : 'off'}">
                            <i></i>${escapeHtml(activityOn ? pt('activityShown') : pt('activityHidden'))}
                        </span>
                    </div>
                    <div class="profile-links">
                        <a href="/user/${encodeURIComponent(username)}" class="profile-link">${escapeHtml(pt('publicPage'))} →</a>
                        <button type="button" class="profile-link profile-link-btn" id="ps-copy-link">${escapeHtml(pt('copyLink'))}</button>
                    </div>
                </div>
            </div>
            <div id="profile-collections"></div>
            <div id="profile-settings"></div>`;

        const profAvatarEl = document.getElementById('prof-avatar');
        if (avatarUrl) {
            profAvatarEl.innerHTML = `<img src="${escapeHtml(avatarUrl)}" alt="">`;
        } else {
            profAvatarEl.textContent = username ? username.charAt(0).toUpperCase() : '?';
        }
        document.getElementById('prof-username').textContent = username;

        const verified =
            prof.is_verified === true || prof.is_verified === 1 || prof.is_verified === '1' ||
            prof.verified === true || prof.verified === 1 || prof.verified === '1' ||
            prof.isVerified === true;

        const verifiedBadgeEl = document.getElementById('prof-verified');
        verifiedBadgeEl.style.display = verified ? 'inline-flex' : 'none';
        verifiedBadgeEl.innerHTML     = verified ? verifiedBadgeSvg() : '';
        document.getElementById('prof-role').textContent = prof.role || 'user';

        const tagsElement = document.getElementById('prof-tags');
        tagsElement.innerHTML = '';
        tags.forEach(tag => {
            if (!tag) return;
            const tagName = String(tag.name || '').trim();
            if (!tagName) return;
            const tagElement  = document.createElement('span');
            tagElement.className = 'user-tag-badge';
            let tagColor = String(tag.color || '#7ec384');
            if (!/^#[0-9a-fA-F]{3,8}$/.test(tagColor)) tagColor = '#7ec384';
            tagElement.style.color            = tagColor;
            tagElement.style.backgroundColor = tagColor + '22';
            tagElement.style.borderColor     = tagColor;
            if (tag.icon) { const ic = document.createElement('span'); ic.textContent = String(tag.icon); tagElement.appendChild(ic); }
            const nameEl = document.createElement('span'); nameEl.textContent = tagName; tagElement.appendChild(nameEl);
            tagsElement.appendChild(tagElement);
        });

        renderProfileCollections(
            Array.isArray(myCollections) && colsRes.ok
                ? myCollections
                : publicCollections
        );

        renderProfileSettings({ username, avatarUrl, activityOn });
    } catch (error) {
        console.error('Profile loading error:', error);
        content.innerHTML = `<p class="status-message">${t('connectionError')}</p>`;
    }
}

// ================= PROFILE COLLECTIONS =================
// Блок «Мои коллекции» в профиле: список всех коллекций пользователя
// (публичных и приватных) + форма создания новой.
// Лимит коллекций задаётся на сервере (MAX_COLLECTIONS_PER_USER = 6).
function renderProfileCollections(cols) {
    const box = document.getElementById('profile-collections');
    if (!box) return;

    const items = Array.isArray(cols) ? cols : [];

    const listHtml = items.length ? items.map(c => {
        const count = Array.isArray(c.items) ? c.items.length : 0;
        const pub   = Number(c.is_public) === 1 || c.is_public === true;
        const desc  = String(c.description || '').trim();
        return `
            <div class="collection-item">
                <div class="icon">${pub ? '🌐' : '🔒'}</div>
                <div class="collection-info">
                    <div class="collection-name">${escapeHtml(String(c.name || ''))}
                        <span class="col-vis-badge ${pub ? 'public' : 'private'}">${escapeHtml(pub ? pt('colPublic') : pt('colPrivate'))}</span>
                    </div>
                    <div class="collection-meta">${desc ? escapeHtml(desc) + ' · ' : ''}${escapeHtml(pt('colItems').replace('{n}', count))}</div>
                </div>
                <a href="/collection/${Number(c.id)}" class="btn" style="padding:6px 14px; font-size:0.85rem;">${escapeHtml(pt('colOpen'))}</a>
            </div>`;
    }).join('') : `<p class="status-message">${escapeHtml(pt('colEmpty'))}</p>`;

    box.innerHTML = `
        <section class="profile-settings profile-collections-card">
            <h3 class="ps-title">${escapeHtml(pt('myCollections'))}
                <span class="ps-count" title="${escapeHtml(pt('colLimit'))}">${items.length} / 6</span>
            </h3>

            <button type="button" class="btn pc-create-open-btn" id="pc-create-open">${escapeHtml(pt('createCollection'))}</button>

            <form class="ps-form pc-create-form" id="pc-create-form" hidden>
                <input type="text" id="pc-name" maxlength="60" placeholder="${escapeHtml(pt('colName'))}" autocomplete="off">
                <input type="text" id="pc-desc" maxlength="300" placeholder="${escapeHtml(pt('colDesc'))}" autocomplete="off">
                <label class="ps-check-row">
                    <input type="checkbox" id="pc-public" checked>
                    <span>
                        <strong>${escapeHtml(pt('colPublicLabel'))}</strong>
                        <small>${escapeHtml(pt('colPublicHint'))}</small>
                    </span>
                </label>
                <div class="ps-inline">
                    <button type="submit" class="btn">${escapeHtml(pt('colCreate'))}</button>
                    <button type="button" class="btn-outline" id="pc-cancel">${escapeHtml(pt('colCancel'))}</button>
                </div>
            </form>

            <div class="pc-list">${listHtml}</div>
        </section>`;

    bindProfileCollections();
}

function bindProfileCollections() {
    const openBtn = document.getElementById('pc-create-open');
    const form    = document.getElementById('pc-create-form');
    if (!openBtn || !form) return;

    openBtn.addEventListener('click', () => {
        form.hidden = false;
        openBtn.hidden = true;
        document.getElementById('pc-name')?.focus();
    });

    document.getElementById('pc-cancel')?.addEventListener('click', () => {
        form.hidden = true;
        form.reset();
        openBtn.hidden = false;
    });

    form.addEventListener('submit', async (e) => {
        e.preventDefault();
        const name = document.getElementById('pc-name').value.trim();
        const desc = document.getElementById('pc-desc').value.trim();
        const isPublic = document.getElementById('pc-public').checked ? 1 : 0;
        if (!name) return showToast(pt('colNameNeeded'), 'error');
        try {
            const res  = await profileFetch('/api/collections', 'POST', { name, description: desc, is_public: isPublic });
            const data = await res.json().catch(() => ({}));
            if (!res.ok) return showToast(data.error || pt('colCreateFail'), 'error');
            showToast(pt('colCreated'), 'success');
            loadProfile();
        } catch { showToast(pt('errGeneric'), 'error'); }
    });
}

// ================= NEWS =================
async function loadNews() {
    const container = document.getElementById('news-container');
    container.innerHTML = `<p class="status-message">${t('loading')}</p>`;
    try {
        const res  = await fetch('/api/news');
        const news = await res.json();
        if (!news || news.length === 0) { container.innerHTML = `<p class="status-message">${t('noNews')}</p>`; return; }
        container.innerHTML = news.map(item => `
            <div class="card">
                <h2>${escapeHtml(item.title)}</h2>
                <small>${escapeHtml(item.date || '')}</small>
                ${item.image ? `<img src="${item.image}" alt="news">` : ''}
                <p>${escapeHtml(item.content)}</p>
            </div>`).join('');
    } catch (e) {
        container.innerHTML = `<p class="status-message">${t('connectionError')}</p>`;
    }
}

async function publishNews(e) {
    e.preventDefault();
    const btn = e.target.querySelector('button[type="submit"]');
    const formData = new FormData();
    formData.append('title',   document.getElementById('news-title').value);
    formData.append('content', document.getElementById('news-content').value);
    const file = document.getElementById('news-image').files[0];
    if (file) formData.append('image', file);
    btn.disabled = true;
    try {
        const res  = await fetch('/api/news', { method: 'POST', body: formData, credentials: 'same-origin' });
        const data = await res.json().catch(() => ({}));
        if (res.ok) { document.getElementById('news-form').reset(); loadNews(); showToast(t('uploadSuccess'), 'success'); }
        else showToast(data.error || t('publishFail'), 'error');
    } catch (e) {
        showToast(t('connectionError'), 'error');
    } finally { btn.disabled = false; }
}

// ================= COLLECTIONS PAGE =================
async function loadCollections() {
    const content = document.getElementById('collections-content');
    content.innerHTML = `<p class="status-message">${t('loading')}</p>`;
    try {
        const res = await fetch('/api/collections/my', { credentials: 'same-origin' });
        if (res.status === 401) {
            content.innerHTML = `<p class="status-message"><a href="/auth.html" style="color:var(--primary); font-weight:600;">${t('login')}</a></p>`;
            return;
        }
        const collections = await res.json();
        if (!collections || collections.length === 0) { content.innerHTML = `<p class="status-message">${t('noCollections')}</p>`; return; }
        content.innerHTML = collections.map(c => `
            <div class="collection-item">
                <div class="icon">📁</div>
                <div class="collection-info">
                    <div class="collection-name">${escapeHtml(c.name)}</div>
                    <div class="collection-meta">${(c.items ? c.items.length : 0)} · ${c.is_public ? '🌐' : '🔒'}</div>
                </div>
                <a href="/collection/${c.id}" class="btn" style="padding:6px 14px; font-size:0.85rem;">Open</a>
            </div>`).join('');
    } catch (e) {
        content.innerHTML = `<p class="status-message">${t('connectionError')}</p>`;
    }
}

// ================= UPLOAD =================
async function uploadFoo(e) {
    e.preventDefault();
    const btn       = document.getElementById('upload-submit-btn');
    const fileInput = document.getElementById('upload-file');
    const file      = fileInput.files[0];
    if (!file) return;

    const formData = new FormData();
    formData.append('video',        file);
    formData.append('display_name', document.getElementById('upload-desc').value);

    btn.disabled = true;
    const originalText = btn.textContent;
    btn.textContent = t('uploading');

    try {
        const res  = await fetch('/api/submissions', { method: 'POST', body: formData, credentials: 'same-origin' });
        const data = await res.json().catch(() => ({}));
        if (res.ok) {
            showToast(t('uploadSuccess'), 'success');
            document.getElementById('upload-form').reset();
            rawVideos = [];
            loadVideos();
        } else {
            showToast(data.error || t('uploadFail'), 'error');
        }
    } catch (e) {
        console.error('Upload error:', e);
        showToast(t('connectionError'), 'error');
    } finally {
        btn.disabled = false;
        btn.textContent = originalText;
    }
}

// ================= PROFILE & CARD AVATARS =================
// Строки для блоков, которые добавлены в профиль и карточки (отдельно от основного translations)
const PROFILE_I18N = {
    ru: {
        activityShown: 'Статус: видно', activityHidden: 'Статус: скрыт',
        publicPage: 'Публичная страница', copyLink: 'Скопировать ссылку', linkCopied: 'Ссылка скопирована',
        changeAvatar: 'Сменить аватар', removeAvatar: 'Удалить аватар',
        settingsTitle: 'Настройки аккаунта',
        activityLabel: 'Показывать онлайн-статус',
        activityHint: 'Зелёная обводка — в сети, серая — не в сети, красная — статус скрыт',
        nickTitle: 'Никнейм', nickHint: 'Латиница, цифры, _ и -, от 3 до 15 символов',
        passTitle: 'Смена пароля', passCurrent: 'Текущий пароль', passNew: 'Новый пароль',
        passConfirm: 'Повторите новый пароль', save: 'Сохранить',
        saved: 'Сохранено', avatarUpdated: 'Аватар обновлён', avatarRemoved: 'Аватар удалён',
        nickChanged: 'Никнейм изменён', passChanged: 'Пароль изменён',
        errFill: 'Заполните все поля', errMatch: 'Пароли не совпадают',
        errNick: 'Никнейм: от 3 до 15 символов, латиница, цифры, _ или -',
        errFile: 'Выберите изображение (png, jpg, webp до 5 МБ)', errGeneric: 'Что-то пошло не так',
        dangerTitle: 'Удаление аккаунта', dangerText: 'Личные данные, лайки и коллекции будут удалены без возможности восстановления. Загруженные футажи останутся на сайте без привязки к вашему профилю.',
        deleteOpen: 'Удалить аккаунт', deleteCancel: 'Отмена', deleteConfirm: 'Удалить навсегда',
        deleteUserPrompt: 'Введите свой логин для подтверждения', deletePassPrompt: 'Введите пароль',
        deleteDone: 'Аккаунт удалён', errDeleteFill: 'Введите пароль и логин',
        myCollections: 'Мои коллекции', createCollection: '+ Создать коллекцию',
        colOpen: 'Открыть', colCreate: 'Создать', colCancel: 'Отмена',
        colName: 'Название коллекции', colDesc: 'Описание (необязательно)',
        colPublicLabel: 'Публичная коллекция',
        colPublicHint: 'Публичные видны всем на вашей странице, приватные — только вам',
        colPublic: 'Публичная', colPrivate: 'Приватная', colItems: '{n} видео',
        colCreated: 'Коллекция создана!', colCreateFail: 'Не удалось создать коллекцию',
        colNameNeeded: 'Введите название коллекции', colEmpty: 'Коллекций пока нет',
        colLimit: 'Лимит: до 6 коллекций'
    },
    uk: {
        activityShown: 'Статус: видно', activityHidden: 'Статус: приховано',
        publicPage: 'Публічна сторінка', copyLink: 'Копіювати посилання', linkCopied: 'Посилання скопійовано',
        changeAvatar: 'Змінити аватар', removeAvatar: 'Видалити аватар',
        settingsTitle: 'Налаштування акаунта',
        activityLabel: 'Показувати онлайн-статус',
        activityHint: 'Зелена обводка — в мережі, сіра — не в мережі, червона — статус приховано',
        nickTitle: 'Нікнейм', nickHint: 'Латиниця, цифри, _ та -, від 3 до 15 символів',
        passTitle: 'Зміна пароля', passCurrent: 'Поточний пароль', passNew: 'Новий пароль',
        passConfirm: 'Повторіть новий пароль', save: 'Зберегти',
        saved: 'Збережено', avatarUpdated: 'Аватар оновлено', avatarRemoved: 'Аватар видалено',
        nickChanged: 'Нікнейм змінено', passChanged: 'Пароль змінено',
        errFill: 'Заповніть усі поля', errMatch: 'Паролі не збігаються',
        errNick: 'Нікнейм: від 3 до 15 символів, латиниця, цифри, _ або -',
        errFile: 'Оберіть зображення (png, jpg, webp до 5 МБ)', errGeneric: 'Щось пішло не так',
        dangerTitle: 'Видалення акаунта', dangerText: 'Особисті дані, лайки та колекції буде видалено без можливості відновлення. Завантажені футажі залишаться на сайті без прив’язки до вашого профілю.',
        deleteOpen: 'Видалити акаунт', deleteCancel: 'Скасувати', deleteConfirm: 'Видалити назавжди',
        deleteUserPrompt: 'Введіть свій логін для підтвердження', deletePassPrompt: 'Введіть пароль',
        deleteDone: 'Акаунт видалено', errDeleteFill: 'Введіть пароль і логін',
        myCollections: 'Мої колекції', createCollection: '+ Створити колекцію',
        colOpen: 'Відкрити', colCreate: 'Створити', colCancel: 'Скасувати',
        colName: 'Назва колекції', colDesc: 'Опис (необовʼязково)',
        colPublicLabel: 'Публічна колекція',
        colPublicHint: 'Публічні видимі всім на вашій сторінці, приватні — лише вам',
        colPublic: 'Публічна', colPrivate: 'Приватна', colItems: '{n} відео',
        colCreated: 'Колекцію створено!', colCreateFail: 'Не вдалося створити колекцію',
        colNameNeeded: 'Введіть назву колекції', colEmpty: 'Колекцій поки немає',
        colLimit: 'Ліміт: до 6 колекцій'
    },
    en: {
        activityShown: 'Status: visible', activityHidden: 'Status: hidden',
        publicPage: 'Public page', copyLink: 'Copy link', linkCopied: 'Link copied',
        changeAvatar: 'Change avatar', removeAvatar: 'Remove avatar',
        settingsTitle: 'Account settings',
        activityLabel: 'Show online status',
        activityHint: 'Green ring — online, grey — offline, red — status hidden',
        nickTitle: 'Nickname', nickHint: 'Latin letters, digits, _ and -, 3 to 15 characters',
        passTitle: 'Change password', passCurrent: 'Current password', passNew: 'New password',
        passConfirm: 'Repeat new password', save: 'Save',
        saved: 'Saved', avatarUpdated: 'Avatar updated', avatarRemoved: 'Avatar removed',
        nickChanged: 'Nickname changed', passChanged: 'Password changed',
        errFill: 'Please fill in all fields', errMatch: 'Passwords do not match',
        errNick: 'Nickname: 3 to 15 characters, Latin letters, digits, _ or -',
        errFile: 'Choose an image (png, jpg, webp up to 5 MB)', errGeneric: 'Something went wrong',
        dangerTitle: 'Delete account', dangerText: 'Your personal data, likes and collections will be permanently deleted. Footage you uploaded stays on the site without being linked to your profile.',
        deleteOpen: 'Delete account', deleteCancel: 'Cancel', deleteConfirm: 'Delete permanently',
        deleteUserPrompt: 'Type your username to confirm', deletePassPrompt: 'Enter your password',
        deleteDone: 'Account deleted', errDeleteFill: 'Enter your password and username',
        myCollections: 'My collections', createCollection: '+ Create collection',
        colOpen: 'Open', colCreate: 'Create', colCancel: 'Cancel',
        colName: 'Collection name', colDesc: 'Description (optional)',
        colPublicLabel: 'Public collection',
        colPublicHint: 'Public collections are visible on your page; private ones — only to you',
        colPublic: 'Public', colPrivate: 'Private', colItems: '{n} video(s)',
        colCreated: 'Collection created!', colCreateFail: 'Failed to create collection',
        colNameNeeded: 'Enter a collection name', colEmpty: 'No collections yet',
        colLimit: 'Limit: up to 6 collections'
    }
};

function pt(key) {
    const dict = PROFILE_I18N[currentLang] || PROFILE_I18N.en;
    return dict[key] || PROFILE_I18N.en[key] || key;
}

// Цвет обводки: скрытый статус → красный, онлайн за последние 5 минут → зелёный, иначе серый
function activityRingClass(u) {
    if (!u || u.activity_visible === false) return 'ring-hidden';
    if (!u.last_seen) return 'ring-offline';
    const seen = new Date(u.last_seen).getTime();
    return (Date.now() - seen) < 5 * 60 * 1000 ? 'ring-online' : 'ring-offline';
}

// Маленькая аватарка рядом с ником под футажем
function uploaderAvatarHtml(u) {
    const letter = escapeHtml(String(u.username || '?').charAt(0).toUpperCase());
    const inner  = u.avatar_url ? `<img src="${escapeHtml(u.avatar_url)}" alt="" loading="lazy">` : letter;
    return `<span class="uploader-avatar ${activityRingClass(u)}" aria-hidden="true">${inner}</span>`;
}

function profileFetch(url, method, body) {
    const opts = { method, credentials: 'same-origin', headers: {} };
    if (body !== undefined) {
        opts.headers['Content-Type'] = 'application/json';
        opts.body = JSON.stringify(body);
    }
    return fetch(url, opts);
}

async function readError(res) {
    try { const j = await res.json(); return j.error || pt('errGeneric'); }
    catch { return pt('errGeneric'); }
}

function renderProfileSettings({ username, avatarUrl, activityOn }) {
    const box = document.getElementById('profile-settings');
    if (!box) return;

    box.innerHTML = `
        <section class="profile-settings">
            <h3 class="ps-title">${escapeHtml(pt('settingsTitle'))}</h3>

            <div class="ps-row">
                <div class="ps-row-text">
                    <strong>${escapeHtml(pt('activityLabel'))}</strong>
                    <small>${escapeHtml(pt('activityHint'))}</small>
                </div>
                <label class="switch">
                    <input type="checkbox" id="ps-activity" ${activityOn ? 'checked' : ''}>
                    <span class="switch-slider"></span>
                </label>
            </div>

            <form class="ps-form" id="ps-nick-form">
                <h4>${escapeHtml(pt('nickTitle'))}</h4>
                <small class="ps-hint">${escapeHtml(pt('nickHint'))}</small>
                <div class="ps-inline">
                    <input type="text" id="ps-nick" maxlength="15" value="${escapeHtml(username)}" autocomplete="username">
                    <button type="submit" class="btn">${escapeHtml(pt('save'))}</button>
                </div>
            </form>

            <form class="ps-form" id="ps-pass-form">
                <h4>${escapeHtml(pt('passTitle'))}</h4>
                <input type="password" id="ps-pass-cur" placeholder="${escapeHtml(pt('passCurrent'))}" autocomplete="current-password">
                <input type="password" id="ps-pass-new" placeholder="${escapeHtml(pt('passNew'))}" minlength="6" autocomplete="new-password">
                <input type="password" id="ps-pass-confirm" placeholder="${escapeHtml(pt('passConfirm'))}" minlength="6" autocomplete="new-password">
                <button type="submit" class="btn">${escapeHtml(pt('save'))}</button>
            </form>

            <div class="ps-row ps-row-last">
                <div class="ps-row-text"><strong>${escapeHtml(pt('changeAvatar'))}</strong></div>
                <button type="button" class="btn-outline ps-danger" id="ps-avatar-remove" ${avatarUrl ? '' : 'disabled'}>${escapeHtml(pt('removeAvatar'))}</button>
            </div>

            <div class="ps-danger-zone">
                <div class="ps-row-text">
                    <strong>${escapeHtml(pt('dangerTitle'))}</strong>
                    <small>${escapeHtml(pt('dangerText'))}</small>
                </div>
                <button type="button" class="btn-outline ps-danger" id="ps-delete-open">${escapeHtml(pt('deleteOpen'))}</button>
                <form class="ps-delete-form" id="ps-delete-form" hidden>
                    <label for="ps-delete-user">${escapeHtml(pt('deleteUserPrompt'))}</label>
                    <input type="text" id="ps-delete-user" autocomplete="off" placeholder="${escapeHtml(username)}">
                    <label for="ps-delete-pass">${escapeHtml(pt('deletePassPrompt'))}</label>
                    <input type="password" id="ps-delete-pass" autocomplete="current-password">
                    <div class="ps-delete-actions">
                        <button type="button" class="btn-outline" id="ps-delete-cancel">${escapeHtml(pt('deleteCancel'))}</button>
                        <button type="submit" class="btn ps-delete-confirm">${escapeHtml(pt('deleteConfirm'))}</button>
                    </div>
                </form>
            </div>
        </section>`;

    bindProfileSettings();
}

function bindProfileSettings() {
    const fileInput = document.getElementById('avatar-file');
    document.getElementById('avatar-edit-btn')?.addEventListener('click', () => fileInput.click());

    fileInput?.addEventListener('change', async () => {
        const file = fileInput.files?.[0];
        fileInput.value = '';
        if (!file) return;
        if (!/^image\/(png|jpeg|webp)$/.test(file.type) || file.size > 5 * 1024 * 1024) {
            return showToast(pt('errFile'), 'error');
        }
        const fd = new FormData();
        fd.append('avatar', file);
        try {
            const res = await fetch('/api/profile/avatar', { method: 'POST', credentials: 'same-origin', body: fd });
            if (!res.ok) return showToast(await readError(res), 'error');
            const data = await res.json();
            if (currentUserData?.user) currentUserData.user.avatar_url = data.avatar_url;
            showToast(pt('avatarUpdated'), 'success');
            loadProfile();
        } catch { showToast(pt('errGeneric'), 'error'); }
    });

    document.getElementById('ps-avatar-remove')?.addEventListener('click', async () => {
        try {
            const res = await profileFetch('/api/profile/avatar', 'DELETE');
            if (!res.ok) return showToast(await readError(res), 'error');
            if (currentUserData?.user) currentUserData.user.avatar_url = null;
            showToast(pt('avatarRemoved'), 'success');
            loadProfile();
        } catch { showToast(pt('errGeneric'), 'error'); }
    });

    document.getElementById('ps-activity')?.addEventListener('change', async (e) => {
        const visible = e.target.checked;
        try {
            const res = await profileFetch('/api/profile/activity-visibility', 'PATCH', { activity_visible: visible });
            if (!res.ok) { e.target.checked = !visible; return showToast(await readError(res), 'error'); }
            if (currentUserData?.user) currentUserData.user.activity_visible = visible;
            showToast(pt('saved'), 'success');
            loadProfile();
        } catch { e.target.checked = !visible; showToast(pt('errGeneric'), 'error'); }
    });

    document.getElementById('ps-nick-form')?.addEventListener('submit', async (e) => {
        e.preventDefault();
        const nick = document.getElementById('ps-nick').value.trim();
        if (!/^[A-Za-z0-9_-]{3,15}$/.test(nick)) return showToast(pt('errNick'), 'error');
        try {
            const res = await profileFetch('/api/profile/nickname', 'PATCH', { nickname: nick });
            if (!res.ok) return showToast(await readError(res), 'error');
            showToast(pt('nickChanged'), 'success');
            await checkAuth();
            renderAuthArea();
            loadProfile();
        } catch { showToast(pt('errGeneric'), 'error'); }
    });

    document.getElementById('ps-pass-form')?.addEventListener('submit', async (e) => {
        e.preventDefault();
        const cur     = document.getElementById('ps-pass-cur').value;
        const next    = document.getElementById('ps-pass-new').value;
        const confirm = document.getElementById('ps-pass-confirm').value;
        if (!cur || !next || !confirm) return showToast(pt('errFill'), 'error');
        if (next !== confirm)          return showToast(pt('errMatch'), 'error');
        try {
            const res = await profileFetch('/api/profile/password', 'PATCH', { current_password: cur, new_password: next });
            if (!res.ok) return showToast(await readError(res), 'error');
            e.target.reset();
            showToast(pt('passChanged'), 'success');
        } catch { showToast(pt('errGeneric'), 'error'); }
    });

    const deleteForm = document.getElementById('ps-delete-form');
    document.getElementById('ps-delete-open')?.addEventListener('click', () => {
        deleteForm.hidden = false;
        document.getElementById('ps-delete-open').hidden = true;
        document.getElementById('ps-delete-user').focus();
    });
    document.getElementById('ps-delete-cancel')?.addEventListener('click', () => {
        deleteForm.reset();
        deleteForm.hidden = true;
        document.getElementById('ps-delete-open').hidden = false;
    });
    deleteForm?.addEventListener('submit', async (e) => {
        e.preventDefault();
        const confirmUser = document.getElementById('ps-delete-user').value.trim();
        const password    = document.getElementById('ps-delete-pass').value;
        if (!confirmUser || !password) return showToast(pt('errDeleteFill'), 'error');
        try {
            const res = await profileFetch('/api/profile/account', 'DELETE', {
                password, confirm_username: confirmUser
            });
            if (!res.ok) return showToast(await readError(res), 'error');
            showToast(pt('deleteDone'), 'success');
            setTimeout(() => location.reload(), 800);
        } catch { showToast(pt('errGeneric'), 'error'); }
    });

    document.getElementById('ps-copy-link')?.addEventListener('click', async () => {
        const link = `${location.origin}/user/${encodeURIComponent(currentUserData?.user?.username || '')}`;
        try {
            await navigator.clipboard.writeText(link);
            showToast(pt('linkCopied'), 'success');
        } catch { showToast(link, 'info', 5000); }
    });
}

// ================= UTILS =================
function escapeHtml(s) {
    return String(s ?? '').replaceAll('&', '&amp;').replaceAll('<', '&lt;').replaceAll('>', '&gt;').replaceAll('"', '&quot;').replaceAll("'", '&#039;');
}
function escapeJs(s) {
    return String(s ?? '').replaceAll('\\', '\\\\').replaceAll("'", "\\'").replaceAll('\n', '\\n');
}

// ================= VERIFIED BADGE =================
let __vbUid = 0;
function verifiedBadgeSvg() {
    const gid = 'vbGrad' + (__vbUid++);
    return `<svg class="verified-badge" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg" role="img" aria-label="Verified">
        <defs>
            <linearGradient id="${gid}" x1="2" y1="2" x2="22" y2="22" gradientUnits="userSpaceOnUse">
                <stop offset="0%" stop-color="#4FC3F7"/>
                <stop offset="100%" stop-color="#0A84FF"/>
            </linearGradient>
        </defs>
        <path fill="url(#${gid})" d="M23 12l-2.44-2.79.34-3.69-3.61-.82-1.89-3.2L12 2.96 8.6 1.5 6.71 4.69 3.1 5.5l.34 3.7L1 12l2.44 2.79-.34 3.7 3.61.82L8.6 22.5l3.4-1.46 3.4 1.46 1.89-3.19 3.61-.82-.34-3.69z"/>
        <path fill="#fff" d="M10 17l-4-4 1.41-1.41L10 14.17l6.59-6.59L18 9l-8 8z"/>
    </svg>`;
}
