import { strict as assert } from 'node:assert';
import crypto from 'node:crypto';

import { describe, it } from 'vitest';

import { Keygrip } from '../src/index.ts';

describe('test/keygrip.test.ts', () => {
  it('should throw without keys', () => {
    assert.throws(() => {
      new (Keygrip as any)();
    }, /keys must be provided and should be an array/);
    assert.throws(() => {
      new Keygrip([]);
    }, /keys must be provided and should be an array/);
    assert.throws(() => {
      new Keygrip('hello' as any);
    }, /keys must be provided and should be an array/);
  });

  it('should encrypt and decrypt success', () => {
    const keygrip = new Keygrip(['foo', 'bar']);
    const newKeygrip = new Keygrip(['another', 'foo']);

    const encrypted = keygrip.encrypt('hello');
    const result = keygrip.decrypt(encrypted);
    assert(result);
    assert.equal(result.value.toString(), 'hello');
    assert.equal(result.index, 0);
    const result2 = newKeygrip.decrypt(encrypted);
    assert(result2);
    assert.equal(result2.value.toString(), 'hello');
    assert.equal(result2.index, 1);
  });

  it('should decrypt error return false', () => {
    const keygrip = new Keygrip(['foo', 'bar']);
    const newKeygrip = new Keygrip(['another']);

    const encrypted = keygrip.encrypt('hello');
    const result = keygrip.decrypt(encrypted);
    assert(result);
    assert.equal(result.value.toString(), 'hello');
    assert.equal(result.index, 0);
    assert.equal(newKeygrip.decrypt(encrypted), false);
  });

  it.skipIf(!('createCipher' in crypto))('should decrypt key encrypted by createCipher without error', () => {
    const keygrip = new Keygrip(['foo']);
    const encrypted = keygrip.encrypt('hello');

    // @ts-expect-error crypto.createCipher is deprecated
    const cipher = crypto.createCipher('aes-256-cbc', 'foo');
    const text = cipher.update('hello', 'utf8');
    const oldEncrypted = Buffer.concat([text, cipher.final()]);

    assert.equal(encrypted.toString('hex'), oldEncrypted.toString('hex'));
    const result = keygrip.decrypt(oldEncrypted);
    assert(result);
    assert.equal(result.value.toString('utf-8'), 'hello');
  });

  it('should signed and verify success', () => {
    const keygrip = new Keygrip(['foo', 'bar']);
    const newKeygrip = new Keygrip(['another', 'foo']);

    const signed = keygrip.sign('hello');
    assert.equal(keygrip.verify('hello', signed), 0);
    assert.equal(newKeygrip.verify('hello', signed), 1);
  });

  it('should signed and verify failed return -1', () => {
    const keygrip = new Keygrip(['foo', 'bar']);
    const newKeygrip = new Keygrip(['another']);

    const signed = keygrip.sign('hello');
    assert.equal(keygrip.verify('hello', signed), 0);
    assert.equal(newKeygrip.verify('hello', signed), -1);
  });
});
