// Keep HTML URLs tied to the contents of shared UI assets, including CDN caches.
const fs = require('node:fs');
const path = require('node:path');
const crypto = require('node:crypto');
const publicDir = path.join(__dirname, '..', 'public');
const versions = Object.fromEntries(['ui.css', 'ui.js', 'script.js', 'google-auth-client.js'].map(file => [
    file, crypto.createHash('sha256').update(fs.readFileSync(path.join(publicDir, file))).digest('hex').slice(0, 12)
]));
let changed = 0;
for (const file of fs.readdirSync(publicDir)) {
    if (!file.endsWith('.html') || file.startsWith('music')) continue;
    const target = path.join(publicDir, file);
    const original = fs.readFileSync(target, 'utf8');
    const updated = original.replace(/\b(href|src)=(['"])(\/?)(ui\.css|ui\.js|script\.js|google-auth-client\.js)(?:\?[^'"]*)?\2/g,
        (_, attr, quote, prefix, asset) => `${attr}=${quote}${prefix}${asset}?v=${versions[asset]}${quote}`);
    if (updated !== original) { fs.writeFileSync(target, updated); changed++; }
}
console.log(`Updated asset versions in ${changed} HTML files.`);
