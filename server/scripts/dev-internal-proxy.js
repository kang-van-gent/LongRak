#!/usr/bin/env node
'use strict';

/**
 * DEV ONLY: forwards ONLY /internal/automation/* and /internal/ai/* (POST) to the local Strapi,
 * everything else gets 404. Put a tunnel (ngrok/cloudflared) in front of THIS port, never in
 * front of Strapi itself, so the admin panel and the public API are not exposed.
 *
 *   node scripts/dev-internal-proxy.js            # :1338 → http://127.0.0.1:1337
 *   PROXY_PORT=1338 STRAPI_URL=http://127.0.0.1:1337 node scripts/dev-internal-proxy.js
 */
const http = require('node:http');

const port = Number(process.env.PROXY_PORT) || 1338;
const target = new URL(process.env.STRAPI_URL || 'http://127.0.0.1:1337');
const ALLOWED = /^\/internal\/(automation|ai)\/[A-Za-z0-9/_-]+$/;

http.createServer((req, res) => {
  const path = (req.url || '').split('?')[0];
  if (req.method !== 'POST' || !ALLOWED.test(path)) {
    res.writeHead(404, { 'content-type': 'application/json' }).end('{"result":"not_found"}');
    return;
  }
  const upstream = http.request({
    hostname: target.hostname, port: target.port, path, method: 'POST',
    headers: { ...req.headers, host: target.host },
  }, (up) => {
    res.writeHead(up.statusCode, up.headers);
    up.pipe(res);
  });
  upstream.on('error', () => res.writeHead(502, { 'content-type': 'application/json' }).end('{"result":"strapi_unreachable"}'));
  req.pipe(upstream);
  console.log(`${new Date().toISOString()} ${req.method} ${path}`);
}).listen(port, () => console.log(`internal-only proxy :${port} → ${target.origin} (only POST /internal/automation|ai/*)`));
