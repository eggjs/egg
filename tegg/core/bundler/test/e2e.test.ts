/**
 * E2E tests: verify the full Bundler pipeline with @utoo/pack produces valid output.
 *
 * Uses the default Bundler (with @utoo/pack, platform: 'node') to produce
 * Node.js-compatible bundles, then verifies: build succeeds, output files
 * exist and are non-empty, bundles can be dynamically imported in Node.js,
 * and meta JSON files are valid.
 */
import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import { createRequire } from 'node:module';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

import { afterAll, beforeAll, describe, it } from 'vitest';

// Turbopack platform:'node' outputs CJS bundles (require/module.exports).
// Since this package has "type":"module", we need createRequire to load them.
const require = createRequire(import.meta.url);

import type { MethodBundleResult } from '../src/Bundler.ts';
import { Bundler } from '../src/Bundler.ts';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const MODULE_PATH = path.join(__dirname, './fixtures/apps/simple-app/app/module/user');
const FOO_MODULE_PATH = path.join(__dirname, './fixtures/apps/multi-module-app/app/module/foo');
const BAR_MODULE_PATH = path.join(__dirname, './fixtures/apps/multi-module-app/app/module/bar');

// Turbopack requires output paths within the project root — cannot use os.tmpdir()
const E2E_OUTPUT_DIR = path.join(__dirname, '.e2e-output');

describe('e2e: simple-app — @utoo/pack build pipeline', () => {
  let results: MethodBundleResult[];
  let outputPath: string;

  beforeAll(async () => {
    outputPath = path.join(E2E_OUTPUT_DIR, 'simple');
    await fs.mkdir(outputPath, { recursive: true });
    const bundler = new Bundler();
    results = await bundler.bundle({
      outputPath,
      moduleReferences: [{ name: 'user', path: MODULE_PATH }],
    });
  }, 60_000);

  afterAll(async () => {
    if (outputPath) {
      await fs.rm(outputPath, { recursive: true, force: true });
    }
  });

  it('produces expected number of method bundles', () => {
    assert.equal(results.length, 2, 'should produce 2 method bundles (getUser, adminAction)');
    assert(
      results.find((r) => r.key.includes('getUser')),
      'getUser bundle should exist',
    );
    assert(
      results.find((r) => r.key.includes('adminAction')),
      'adminAction bundle should exist',
    );
  });

  it('getUser bundle can be loaded in Node.js', async () => {
    const result = results.find((r) => r.key.includes('getUser'))!;
    const stat = await fs.stat(result.bundlePath);
    assert(stat.size > 0, 'bundle file should not be empty');

    // Turbopack node bundles are CJS — use require() to load
    const mod = require(result.bundlePath);
    assert(mod, 'bundle should be loadable');
  });

  it('adminAction bundle can be loaded in Node.js', async () => {
    const result = results.find((r) => r.key.includes('adminAction'))!;
    const stat = await fs.stat(result.bundlePath);
    assert(stat.size > 0, 'bundle file should not be empty');

    const mod = require(result.bundlePath);
    assert(mod, 'bundle should be loadable');
  });

  it('meta JSON files are valid and consistent with results', async () => {
    for (const result of results) {
      const metaContent = await fs.readFile(result.metaPath, 'utf-8');
      const meta = JSON.parse(metaContent);

      assert.equal(meta.methodName, result.meta.methodName);
      assert.equal(meta.className, result.meta.className);
      assert.equal(meta.http.fullPath, result.meta.http.fullPath);
      assert(Array.isArray(meta.dependencies));
    }
  });
});

describe('e2e: multi-module-app — cross-module @utoo/pack build', () => {
  let results: MethodBundleResult[];
  let outputPath: string;

  beforeAll(async () => {
    outputPath = path.join(E2E_OUTPUT_DIR, 'multi');
    await fs.mkdir(outputPath, { recursive: true });
    const bundler = new Bundler();
    results = await bundler.bundle({
      outputPath,
      moduleReferences: [
        { name: 'foo', path: FOO_MODULE_PATH },
        { name: 'bar', path: BAR_MODULE_PATH },
      ],
    });
  }, 60_000);

  afterAll(async () => {
    if (outputPath) {
      await fs.rm(outputPath, { recursive: true, force: true });
    }
  });

  it('produces expected number of method bundles', () => {
    assert(results.length >= 2, `should produce at least 2 bundles, got ${results.length}`);
    assert(
      results.find((r) => r.key.includes('fetchUser')),
      'fetchUser bundle should exist',
    );
    assert(
      results.find((r) => r.key.includes('healthCheck')),
      'healthCheck bundle should exist',
    );
  });

  it('fetchUser bundle can be loaded in Node.js', async () => {
    const result = results.find((r) => r.key.includes('fetchUser'))!;
    const stat = await fs.stat(result.bundlePath);
    assert(stat.size > 0, 'bundle file should not be empty');

    const mod = require(result.bundlePath);
    assert(mod, 'bundle should be loadable');
  });

  it('healthCheck bundle can be loaded in Node.js', async () => {
    const result = results.find((r) => r.key.includes('healthCheck'))!;
    const stat = await fs.stat(result.bundlePath);
    assert(stat.size > 0, 'bundle file should not be empty');

    const mod = require(result.bundlePath);
    assert(mod, 'bundle should be loadable');
  });

  it('meta JSON files are valid for all bundles', async () => {
    for (const result of results) {
      const metaContent = await fs.readFile(result.metaPath, 'utf-8');
      const meta = JSON.parse(metaContent);

      assert.equal(meta.methodName, result.meta.methodName);
      assert.equal(meta.className, result.meta.className);
      assert.equal(meta.http.fullPath, result.meta.http.fullPath);
      assert(Array.isArray(meta.dependencies));
    }
  });
});
