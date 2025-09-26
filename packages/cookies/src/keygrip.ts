import { debuglog } from 'node:util';
import crypto, { type Cipheriv } from 'node:crypto';
import assert from 'node:assert';

const debug = debuglog('egg/cookies:keygrip');

const KEY_LEN = 32;
const IV_SIZE = 16;
const passwordCache = new Map();

const replacer: Record<string, string> = {
  '/': '_',
  '+': '-',
  '=': '',
};

function constantTimeCompare(a: Buffer, b: Buffer) {
  if (a.length !== b.length) {
    return false;
  }
  return crypto.timingSafeEqual(a, b);
}

// patch from https://github.com/crypto-utils/keygrip

export class Keygrip {
  readonly #keys: string[];
  readonly #hash = 'sha256';
  readonly #cipher = 'aes-256-cbc';

  constructor(keys: string[]) {
    assert(Array.isArray(keys) && keys.length > 0, 'keys must be provided and should be an array');
    this.#keys = keys;
  }

  // encrypt a message
  encrypt(data: string, key?: string) {
    key = key || this.#keys[0];
    const password = keyToPassword(key);
    const cipher = crypto.createCipheriv(this.#cipher, password.key, password.iv);
    return crypt(cipher, data);
  }

  // decrypt a single message
  // returns false on bad decrypts
  decrypt(data: string | Buffer): { value: Buffer; index: number } | false {
    // decrypt every key
    const keys = this.#keys;
    for (let i = 0; i < keys.length; i++) {
      const value = this.#decryptByKey(data, keys[i]);
      if (value !== false) {
        return { value, index: i };
      }
    }
    return false;
  }

  #decryptByKey(data: string | Buffer, key: string) {
    try {
      const password = keyToPassword(key);
      const cipher = crypto.createDecipheriv(this.#cipher, password.key, password.iv);
      return crypt(cipher, data);
    } catch (err: any) {
      debug('crypt error: %s', err);
      return false;
    }
  }

  sign(data: string | Buffer, key?: string) {
    // default to the first key
    key = key || this.#keys[0];

    // url safe base64
    return crypto
      .createHmac(this.#hash, key)
      .update(data)
      .digest('base64')
      .replace(/\/|\+|=/g, x => {
        return replacer[x];
      });
  }

  verify(data: string, digest: string) {
    const keys = this.#keys;
    for (let i = 0; i < keys.length; i++) {
      const key = keys[i];
      if (constantTimeCompare(Buffer.from(digest), Buffer.from(this.sign(data, key)))) {
        debug('data %s match key %s, index: %d', data, key, i);
        return i;
      }
    }
    return -1;
  }
}

function crypt(cipher: Cipheriv, data: string | Buffer) {
  const text = Buffer.isBuffer(data) ? cipher.update(data) : cipher.update(data, 'utf-8');
  const pad = cipher.final();
  return Buffer.concat([text, pad]);
}

function keyToPassword(key: string) {
  if (passwordCache.has(key)) {
    return passwordCache.get(key);
  }

  // Simulate EVP_BytesToKey.
  // see https://github.com/nodejs/help/issues/1673#issuecomment-503222925
  const bytes = Buffer.alloc(KEY_LEN + IV_SIZE);
  let lastHash = null,
    nBytes = 0;
  while (nBytes < bytes.length) {
    const hash = crypto.createHash('md5');
    if (lastHash) hash.update(lastHash);
    hash.update(key);
    lastHash = hash.digest();
    lastHash.copy(bytes, nBytes);
    nBytes += lastHash.length;
  }

  // Use these for decryption.
  const password = {
    key: bytes.subarray(0, KEY_LEN),
    iv: bytes.subarray(KEY_LEN, bytes.length),
  };

  passwordCache.set(key, password);
  return password;
}
