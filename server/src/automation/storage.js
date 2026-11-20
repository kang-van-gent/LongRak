'use strict';

/**
 * Private file storage — LOCAL DISK adapter (dev / single-server beta).
 *
 * Files live under LONGRAK_PRIVATE_STORAGE_DIR (default server/.private-storage), which is
 * outside public/, never served over HTTP, and git-ignored. Only file_assets rows reference
 * them (storage_bucket_alias + object_key_private, both private fields).
 *
 * Production needs private object storage (encryption at rest, lifecycle rules, backups) —
 * an open decision in the ERD. Keep this interface (put/get/remove by key) when swapping.
 */
const fs = require('node:fs/promises');
const path = require('node:path');

const BUCKET = 'local-private';
const KEY_RE = /^[a-z0-9-]+(\/[a-z0-9-]+)*$/;

const root = () => path.resolve(process.env.LONGRAK_PRIVATE_STORAGE_DIR || path.join(__dirname, '..', '..', '.private-storage'));

function resolveKey(key) {
  if (!KEY_RE.test(key)) throw new Error('invalid object key');
  const full = path.join(root(), key);
  if (!full.startsWith(root() + path.sep)) throw new Error('invalid object key');
  return full;
}

async function put(key, data) {
  const full = resolveKey(key);
  await fs.mkdir(path.dirname(full), { recursive: true, mode: 0o700 });
  await fs.writeFile(full, data, { mode: 0o600, flag: 'wx' }); // never overwrite
  return { bucket: BUCKET, key };
}

const get = (key) => fs.readFile(resolveKey(key));

async function remove(key) {
  await fs.rm(resolveKey(key), { force: true });
}

module.exports = { BUCKET, put, get, remove, root };
