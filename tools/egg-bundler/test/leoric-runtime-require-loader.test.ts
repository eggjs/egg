import { createRequire } from 'node:module';

import { describe, expect, it, vi } from 'vitest';

const require = createRequire(import.meta.url);
const loader = require('../src/compat/leoric/runtime-require-loader.cjs') as (
  this: {
    resourcePath: string;
    cacheable?: () => void;
  },
  source: string,
) => string;

function transform(resourcePath: string, source: string): string {
  return loader.call({ resourcePath }, source);
}

describe('leoric-runtime-require-loader', () => {
  it.each([
    [
      '/app/node_modules/leoric/lib/drivers/mysql/index.js',
      'return require(client).createPool(options);',
      'return globalThis.__RUNTIME_REQUIRE(client).createPool(options);',
    ],
    [
      '/app/node_modules/leoric/lib/drivers/sqlite/pool.js',
      'const client = require(options.client);',
      'const client = globalThis.__RUNTIME_REQUIRE(options.client);',
    ],
    [
      '/app/node_modules/leoric/lib/drivers/postgres/index.js',
      "return new (require('pg')).Pool(options);",
      "return new (globalThis.__RUNTIME_REQUIRE('pg')).Pool(options);",
    ],
    [
      '/app/node_modules/leoric/lib/drivers/postgres/type_parser.js',
      'const pgTypes = require("pg-types");',
      "const pgTypes = globalThis.__RUNTIME_REQUIRE('pg-types');",
    ],
    [
      '/app/node_modules/leoric/lib/drivers/sqljs/sqljs-connection.js',
      "const mod = require('sql.js');",
      "const mod = globalThis.__RUNTIME_REQUIRE('sql.js');",
    ],
    [
      '/app/node_modules/leoric/lib/realm/index.js',
      'const model = require(path.join(dir, entry.name));',
      'const model = globalThis.__RUNTIME_REQUIRE(path.join(dir, entry.name));',
    ],
    [
      '/app/node_modules/leoric/lib/migrations.js',
      'return { ...require(path.join(dir, name)), name };',
      'return { ...globalThis.__RUNTIME_REQUIRE(path.join(dir, name)), name };',
    ],
  ])('rewrites %s to the restore-time require hook', (resourcePath, source, expected) => {
    expect(transform(resourcePath, source)).toBe(expected);
  });

  it('supports Windows resource paths and marks the transform cacheable', () => {
    const cacheable = vi.fn();
    const source = 'return require(client);';
    const result = loader.call(
      { resourcePath: 'C:\\app\\node_modules\\leoric\\lib\\drivers\\mysql\\index.js', cacheable },
      source,
    );

    expect(result).toBe('return globalThis.__RUNTIME_REQUIRE(client);');
    expect(cacheable).toHaveBeenCalledOnce();
  });

  it('leaves unrelated JavaScript unchanged', () => {
    const source = 'const value = require(name);';
    expect(transform('/app/src/user.js', source)).toBe(source);
  });

  it('fails loudly when a targeted Leoric file contains an unknown dynamic require', () => {
    expect(() =>
      transform('/app/node_modules/leoric/lib/drivers/mysql/index.js', 'return require(resolveClient(options));'),
    ).toThrow(/unsupported Leoric dynamic require remains/);
  });

  it('leaves ordinary literal dependencies in a targeted file visible to @utoo/pack', () => {
    const source = "const local = require('./attribute');";
    expect(transform('/app/node_modules/leoric/lib/drivers/mysql/index.js', source)).toBe(source);
  });
});
