// mailer.js — отправка писем. Два провайдера, выбирается MAIL_PROVIDER в .env:
//
//   gmail (по умолчанию) — через почту Gmail, работает сразу, на любые адреса.
//     GMAIL_USER=ваш.адрес@gmail.com
//     GMAIL_APP_PASSWORD=xxxx xxxx xxxx xxxx   (пароль приложения, см. инструкцию)
//     Нужен пакет: npm install nodemailer
//
//   resend — после подтверждения домена в Resend.
//     MAIL_PROVIDER=resend
//     RESEND_API_KEY=re_...
//     MAIL_FROM="Burmolda <no-reply@ваш-домен>"

const PROVIDER = (process.env.MAIL_PROVIDER || 'resend').trim().toLowerCase();

// ---------- Gmail ----------

let gmailTransport = null;

function getGmailTransport() {
    if (gmailTransport) return gmailTransport;

    const user = (process.env.GMAIL_USER || '').trim();
    // Пароль приложения Google показывается с пробелами, их убираем
    const pass = (process.env.GMAIL_APP_PASSWORD || '').replace(/\s+/g, '');
    if (!user || !pass) throw new Error('Не заданы GMAIL_USER и GMAIL_APP_PASSWORD в .env');

    // Подключаем здесь, а не в начале файла, чтобы сервер не падал,
    // если nodemailer ещё не установлен и выбран другой провайдер
    const nodemailer = require('nodemailer');
    gmailTransport = nodemailer.createTransport({
        service: 'gmail',
        auth: { user, pass },
    });
    return gmailTransport;
}

async function sendViaGmail({ to, subject, text }) {
    const user = (process.env.GMAIL_USER || '').trim();
    await getGmailTransport().sendMail({
        from: `Burmolda <${user}>`,
        to,
        subject,
        text,
    });
}

// ---------- Resend ----------

async function sendViaResend({ to, subject, text }) {
    const key = (process.env.RESEND_API_KEY || '').trim();
    const from = (process.env.MAIL_FROM || '').trim().replace(/^["']|["']$/g, '').trim();
    if (!key) throw new Error('RESEND_API_KEY не задан в .env');
    if (!from) throw new Error('MAIL_FROM не задан в .env');

    const res = await fetch('https://api.resend.com/emails', {
        method: 'POST',
        headers: { Authorization: `Bearer ${key}`, 'Content-Type': 'application/json' },
        body: JSON.stringify({ from, to: [to], subject, text }),
    });
    if (!res.ok) {
        const body = await res.text().catch(() => '');
        throw new Error(`Resend ${res.status}: ${body}`);
    }
}

// ---------- Общая функция ----------

async function sendMail({ to, subject, text }) {
    if (PROVIDER === 'resend') return sendViaResend({ to, subject, text });
    if (PROVIDER === 'gmail') return sendViaGmail({ to, subject, text });
    throw new Error(`Неизвестный MAIL_PROVIDER: ${PROVIDER}`);
}

module.exports = { sendMail };