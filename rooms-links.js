// rooms-links.js — защита от внешних ссылок в чате комнат.
// Ссылки на свой сайт (OWN_HOSTS в .env) остаются, остальные заменяются на «[ссылка удалена]».

const OWN_HOSTS = (process.env.OWN_HOSTS || 'burmolda.ru,www.burmolda.ru')
    .split(',')
    .map((s) => s.trim().toLowerCase())
    .filter(Boolean);

// Ловит: http(s)://..., www...., домен.зона/путь, javascript:/data:/vbscript:/file:
// Не трогает #футажи, @ники и куски слов.
const LINK_RE = /(?<![#@\w.\-\/])((?:https?:\/\/|www\.)\S+|(?:[a-z0-9\-]+\.)+[a-z]{2,}(?:\/\S*)?|(?:javascript|data|vbscript|file):\S*)/gi;

function isOwnLink(raw) {
    try {
        const withScheme = /^[a-z][a-z0-9+.-]*:\/\//i.test(raw) ? raw : 'https://' + raw;
        const u = new URL(withScheme);
        return /^https?:$/.test(u.protocol) && OWN_HOSTS.includes(u.hostname.toLowerCase());
    } catch {
        return false;
    }
}

function stripExternalLinks(text) {
    return String(text).replace(LINK_RE, (m) => (isOwnLink(m) ? m : '[ссылка удалена]'));
}

module.exports = { stripExternalLinks, isOwnLink, OWN_HOSTS };