import { strict as assert } from 'node:assert';

import { describe, it } from 'vitest';

import { lazyRequireProxySource } from '../src/commands/snapshot-build.ts';

describe('test/lazy-require-proxy.test.ts', () => {
  it('embeds the specifier in the deferred require call', () => {
    const src = lazyRequireProxySource('undici');
    assert.ok(src.includes('require("undici")'), 'should generate require("undici")');
    assert.ok(src.includes('new Proxy'), 'should construct a Proxy');
    assert.ok(src.includes('module.exports = new Proxy'), 'should expose the Proxy as module.exports');
  });

  it('escapes the specifier via JSON.stringify (quotes, special chars)', () => {
    const src = lazyRequireProxySource('scoped/pkg@1.0');
    assert.ok(src.includes('require("scoped/pkg@1.0")'));
  });

  it('defers loading: _real starts unset and only getReal() calls require', () => {
    const src = lazyRequireProxySource('urllib');
    assert.ok(/let\s+_real\b/.test(src), 'should declare a lazy _real slot');
    assert.ok(/if\s*\(!_real\)\s*_real\s*=\s*require/.test(src), 'should gate the require behind !_real');
  });

  it('forwards property access, assignment, has, ownKeys via getReal()', () => {
    const src = lazyRequireProxySource('undici');
    // get trap → getReal()[prop]
    assert.ok(/get\s*\(_,\s*prop\)\s*\{[^}]*getReal\(\)\[prop\]/s.test(src));
    // set trap → getReal()[prop] = value
    assert.ok(/set\s*\(_,\s*prop,\s*value\)\s*\{\s*getReal\(\)\[prop\]\s*=\s*value/s.test(src));
    // has trap returns false before first load, forwards after
    assert.ok(/has\s*\(_,\s*prop\)[^}]*!_real[^}]*prop in _real/s.test(src));
    // ownKeys forwards via Reflect.ownKeys(_real)
    assert.ok(/Reflect\.ownKeys\(_real\)/.test(src));
  });

  it('returns module.exports itself for the `default` key (CJS↔ESM interop)', () => {
    const src = lazyRequireProxySource('undici');
    assert.ok(/prop === 'default'.*module\.exports/s.test(src));
  });

  it('declares __esModule as false to avoid double-wrapping by esbuild interop helpers', () => {
    const src = lazyRequireProxySource('undici');
    assert.ok(/prop === '__esModule'.*return false/s.test(src));
  });

  it('different specifiers produce distinct sources', () => {
    const urllibSrc = lazyRequireProxySource('urllib');
    const undiciSrc = lazyRequireProxySource('undici');
    assert.notEqual(urllibSrc, undiciSrc);
    assert.ok(urllibSrc.includes('require("urllib")'));
    assert.ok(undiciSrc.includes('require("undici")'));
    assert.ok(!urllibSrc.includes('require("undici")'));
    assert.ok(!undiciSrc.includes('require("urllib")'));
  });
});
