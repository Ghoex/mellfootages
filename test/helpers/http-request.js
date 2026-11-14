const http = require('node:http');

// Native fetch overrides Host. Use HTTP directly to exercise real proxy headers.
module.exports = function request(url, options = {}) {
    return new Promise((resolve, reject) => {
        const req = http.request(url, { method: options.method, headers: {
            ...options.headers, ...(options.body ? { 'Content-Length': Buffer.byteLength(options.body) } : {})
        } }, res => {
            const chunks = [];
            res.on('data', chunk => chunks.push(chunk));
            res.on('error', reject);
            res.on('end', () => resolve(new Response(Buffer.concat(chunks), {
                status: res.statusCode,
                headers: Object.entries(res.headers).flatMap(([name, value]) =>
                    (Array.isArray(value) ? value : [value]).map(item => [name, item]))
            })));
        });
        req.on('error', reject);
        req.end(options.body);
    });
};
