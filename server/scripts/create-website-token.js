#!/usr/bin/env node
'use strict';

/**
 * DEV HELPER: (re)create the website's Strapi API token and write it into web/.env.
 *
 *   node scripts/create-website-token.js            # → ../web/.env
 *   node scripts/create-website-token.js /path/.env
 *
 * Token: type "Custom", no expiry, permissions exactly
 *   Lead → submit, Analysis-session → record, Analysis-session → startSession
 * The token value is written to the file only — never printed. An existing token with the
 * same name is revoked first. Also fills NUXT_STRAPI_URL and NUXT_IP_HASH_SALT if missing.
 * In production create the token in the admin UI and put it in the server's .env instead.
 */
const fs = require('node:fs');
const path = require('node:path');
const { randomBytes } = require('node:crypto');

const NAME = 'LongRak website';
const PERMISSIONS = [
  'api::lead.lead.submit',
  'api::analysis-session.analysis-session.record',
  'api::analysis-session.analysis-session.startSession',
];

function setVar(text, key, value, onlyIfMissing) {
  const re = new RegExp(`^${key}=.*$`, 'm');
  if (re.test(text)) {
    if (onlyIfMissing && !new RegExp(`^${key}=\\s*$`, 'm').test(text)) return text;
    return text.replace(re, `${key}=${value}`);
  }
  return `${text.replace(/\n*$/, '\n')}${key}=${value}\n`;
}

async function main() {
  const target = path.resolve(process.argv[2] || path.join(__dirname, '..', '..', 'web', '.env'));
  process.env.LONGRAK_OUTBOX_DISPATCHER = 'false';
  process.env.LONGRAK_SEED = 'false';
  const { createStrapi } = require('@strapi/strapi');
  const appDir = path.resolve(__dirname, '..');
  const strapi = await createStrapi({ appDir, distDir: appDir }).load();
  strapi.log.level = 'error';
  try {
    const tokens = strapi.service('admin::api-token');
    const existing = await strapi.db.query('admin::api-token').findOne({ where: { name: NAME }, select: ['id'] });
    if (existing) await tokens.revoke(existing.id);
    const created = await tokens.create({
      name: NAME,
      description: 'Website server → Strapi (leads, AI check sessions). Created by scripts/create-website-token.js',
      type: 'custom',
      kind: 'content-api',
      lifespan: null,
      permissions: PERMISSIONS,
    });

    let text = fs.existsSync(target) ? fs.readFileSync(target, 'utf8') : '# Website (Nuxt) — local dev. Server-only values; never exposed to the browser.\n';
    text = setVar(text, 'NUXT_STRAPI_URL', `http://127.0.0.1:${process.env.PORT || 1337}`, true);
    text = setVar(text, 'NUXT_STRAPI_TOKEN', created.accessKey, false);
    text = setVar(text, 'NUXT_IP_HASH_SALT', randomBytes(32).toString('base64url'), true);
    fs.writeFileSync(target, text, { mode: 0o600 });
    console.log(`"${NAME}" token ${existing ? 're-created' : 'created'} (${PERMISSIONS.length} permissions) and written to ${target} (value not shown).`);
    return 0;
  }
  finally {
    await strapi.destroy();
  }
}

main().then((c) => process.exit(c), (err) => { console.error(err.message); process.exit(1); });
