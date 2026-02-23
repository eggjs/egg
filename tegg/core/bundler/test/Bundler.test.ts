import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

import { describe, it } from 'vitest';

import type { BuildOptions } from '../src/Bundler.ts';
import { Bundler } from '../src/Bundler.ts';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const MODULE_PATH = path.join(__dirname, './fixtures/apps/simple-app/app/module/user');
const FOO_MODULE_PATH = path.join(__dirname, './fixtures/apps/multi-module-app/app/module/foo');
const BAR_MODULE_PATH = path.join(__dirname, './fixtures/apps/multi-module-app/app/module/bar');
const API_MODULE_PATH = path.join(__dirname, './fixtures/apps/private-method-app/app/module/api');
const NOTIFY_MODULE_PATH = path.join(__dirname, './fixtures/apps/eventbus-app/app/module/notify');
const ORDER_MODULE_PATH = path.join(__dirname, './fixtures/apps/aop-app/app/module/order');

/**
 * A mock build function that just writes an empty file at the expected output path.
 * This allows us to test the Bundler's orchestration without an actual bundler.
 */
async function mockBuildFunc(options: BuildOptions): Promise<void> {
  const entry = options.entry[0];
  const outputPath = path.join(options.output.path, `${entry.name}.js`);
  await fs.mkdir(options.output.path, { recursive: true });
  await fs.writeFile(outputPath, `// mock bundle for ${entry.name}\n`);
}

describe('Bundler', () => {
  it('should produce one bundle per controller method', async () => {
    const outputPath = await fs.mkdtemp(path.join(os.tmpdir(), 'bundler-test-'));

    try {
      const bundler = new Bundler(mockBuildFunc);
      const results = await bundler.bundle({
        outputPath,
        moduleReferences: [
          {
            name: 'user',
            path: MODULE_PATH,
          },
        ],
      });

      // UserController has 2 methods: getUser and adminAction
      assert.equal(results.length, 2, 'should produce 2 bundle results');

      const keys = results.map((r) => r.key);
      assert(
        keys.some((k) => k.includes('getUser')),
        'should have getUser bundle',
      );
      assert(
        keys.some((k) => k.includes('adminAction')),
        'should have adminAction bundle',
      );
    } finally {
      await fs.rm(outputPath, { recursive: true, force: true });
    }
  });

  it('getUser bundle meta should NOT include adminService', async () => {
    const outputPath = await fs.mkdtemp(path.join(os.tmpdir(), 'bundler-test-'));

    try {
      const bundler = new Bundler(mockBuildFunc);
      const results = await bundler.bundle({
        outputPath,
        moduleReferences: [{ name: 'user', path: MODULE_PATH }],
      });

      const getUserResult = results.find((r) => r.key.includes('getUser'));
      assert(getUserResult, 'getUser bundle result should exist');

      const depNames = getUserResult.meta.dependencies.map((d) => d.protoName);
      assert(depNames.includes('userService'), 'getUser meta should include userService');
      assert(!depNames.includes('adminService'), 'getUser meta should NOT include adminService');
    } finally {
      await fs.rm(outputPath, { recursive: true, force: true });
    }
  });

  it('adminAction bundle meta should include both services', async () => {
    const outputPath = await fs.mkdtemp(path.join(os.tmpdir(), 'bundler-test-'));

    try {
      const bundler = new Bundler(mockBuildFunc);
      const results = await bundler.bundle({
        outputPath,
        moduleReferences: [{ name: 'user', path: MODULE_PATH }],
      });

      const adminResult = results.find((r) => r.key.includes('adminAction'));
      assert(adminResult, 'adminAction bundle result should exist');

      const depNames = adminResult.meta.dependencies.map((d) => d.protoName);
      assert(depNames.includes('userService'), 'adminAction meta should include userService');
      assert(depNames.includes('adminService'), 'adminAction meta should include adminService');
    } finally {
      await fs.rm(outputPath, { recursive: true, force: true });
    }
  });

  it('should generate correct meta JSON files on disk', async () => {
    const outputPath = await fs.mkdtemp(path.join(os.tmpdir(), 'bundler-test-'));

    try {
      const bundler = new Bundler(mockBuildFunc);
      const results = await bundler.bundle({
        outputPath,
        moduleReferences: [{ name: 'user', path: MODULE_PATH }],
      });

      for (const result of results) {
        const metaContent = await fs.readFile(result.metaPath, 'utf-8');
        const parsedMeta = JSON.parse(metaContent);

        assert.equal(parsedMeta.methodName, result.meta.methodName);
        assert.equal(parsedMeta.http.fullPath, result.meta.http.fullPath);
        assert(Array.isArray(parsedMeta.dependencies));
      }
    } finally {
      await fs.rm(outputPath, { recursive: true, force: true });
    }
  });

  it('should pass externals to the build function', async () => {
    const outputPath = await fs.mkdtemp(path.join(os.tmpdir(), 'bundler-test-'));
    const capturedOptions: BuildOptions[] = [];

    try {
      const capturingBuildFunc = async (opts: BuildOptions): Promise<void> => {
        capturedOptions.push(opts);
        await mockBuildFunc(opts);
      };

      const bundler = new Bundler(capturingBuildFunc);
      await bundler.bundle({
        outputPath,
        moduleReferences: [{ name: 'user', path: MODULE_PATH }],
        externals: { lodash: '_' },
      });

      assert(capturedOptions.length > 0, 'build func should be called');
      for (const opts of capturedOptions) {
        assert.deepEqual(opts.externals, { lodash: '_' }, 'externals should be passed through');
      }
    } finally {
      await fs.rm(outputPath, { recursive: true, force: true });
    }
  });

  describe('cross-module dependencies (multi-module-app)', () => {
    it('should bundle BarController methods with cross-module transitive deps', async () => {
      const outputPath = await fs.mkdtemp(path.join(os.tmpdir(), 'bundler-test-'));

      try {
        const bundler = new Bundler(mockBuildFunc);
        const results = await bundler.bundle({
          outputPath,
          moduleReferences: [
            { name: 'foo', path: FOO_MODULE_PATH },
            { name: 'bar', path: BAR_MODULE_PATH },
          ],
        });

        // BarController has 3 methods: fetchUser, createUser, healthCheck
        assert.equal(results.length, 3, 'should produce 3 bundle results for BarController');

        const keys = results.map((r) => r.key);
        assert(
          keys.some((k) => k.includes('fetchUser')),
          'should have fetchUser bundle',
        );
        assert(
          keys.some((k) => k.includes('createUser')),
          'should have createUser bundle',
        );
        assert(
          keys.some((k) => k.includes('healthCheck')),
          'should have healthCheck bundle',
        );
      } finally {
        await fs.rm(outputPath, { recursive: true, force: true });
      }
    });

    it('fetchUser bundle should include fooService and transitive fooRepository', async () => {
      const outputPath = await fs.mkdtemp(path.join(os.tmpdir(), 'bundler-test-'));

      try {
        const bundler = new Bundler(mockBuildFunc);
        const results = await bundler.bundle({
          outputPath,
          moduleReferences: [
            { name: 'foo', path: FOO_MODULE_PATH },
            { name: 'bar', path: BAR_MODULE_PATH },
          ],
        });

        const fetchUserResult = results.find((r) => r.key.includes('fetchUser'));
        assert(fetchUserResult, 'fetchUser result should exist');

        const depNames = fetchUserResult.meta.dependencies.map((d) => d.protoName);
        assert(depNames.includes('fooService'), 'fetchUser should include fooService (cross-module)');
        assert(depNames.includes('fooRepository'), 'fetchUser should include fooRepository (transitive)');
      } finally {
        await fs.rm(outputPath, { recursive: true, force: true });
      }
    });

    it('healthCheck bundle should have empty deps (pure method)', async () => {
      const outputPath = await fs.mkdtemp(path.join(os.tmpdir(), 'bundler-test-'));

      try {
        const bundler = new Bundler(mockBuildFunc);
        const results = await bundler.bundle({
          outputPath,
          moduleReferences: [
            { name: 'foo', path: FOO_MODULE_PATH },
            { name: 'bar', path: BAR_MODULE_PATH },
          ],
        });

        const healthCheckResult = results.find((r) => r.key.includes('healthCheck'));
        assert(healthCheckResult, 'healthCheck result should exist');
        assert.equal(healthCheckResult.meta.dependencies.length, 0, 'healthCheck should have no deps');
      } finally {
        await fs.rm(outputPath, { recursive: true, force: true });
      }
    });
  });

  describe('private method chain (private-method-app)', () => {
    it('should correctly isolate deps via private method chain analysis', async () => {
      const outputPath = await fs.mkdtemp(path.join(os.tmpdir(), 'bundler-test-'));

      try {
        const bundler = new Bundler(mockBuildFunc);
        const results = await bundler.bundle({
          outputPath,
          moduleReferences: [{ name: 'api', path: API_MODULE_PATH }],
        });

        // ApiController has 3 methods: getProfile, getOrder, getSummary
        assert.equal(results.length, 3, 'should produce 3 bundle results');

        const getProfileResult = results.find((r) => r.key.includes('getProfile'));
        assert(getProfileResult, 'getProfile result should exist');
        const profileDepNames = getProfileResult.meta.dependencies.map((d) => d.protoName);
        assert(profileDepNames.includes('userService'), 'getProfile should include userService (via #loadUser)');
        assert(!profileDepNames.includes('orderService'), 'getProfile should NOT include orderService');

        const getOrderResult = results.find((r) => r.key.includes('getOrder'));
        assert(getOrderResult, 'getOrder result should exist');
        const orderDepNames = getOrderResult.meta.dependencies.map((d) => d.protoName);
        assert(orderDepNames.includes('orderService'), 'getOrder should include orderService (via #loadOrder)');
        assert(!orderDepNames.includes('userService'), 'getOrder should NOT include userService');

        const getSummaryResult = results.find((r) => r.key.includes('getSummary'));
        assert(getSummaryResult, 'getSummary result should exist');
        const summaryDepNames = getSummaryResult.meta.dependencies.map((d) => d.protoName);
        assert(summaryDepNames.includes('userService'), 'getSummary should include userService');
        assert(summaryDepNames.includes('orderService'), 'getSummary should include orderService');
      } finally {
        await fs.rm(outputPath, { recursive: true, force: true });
      }
    });
  });

  describe('framework built-in graceful skip (eventbus-app)', () => {
    it('should skip EventBus (not in GlobalGraph) without crashing', async () => {
      const outputPath = await fs.mkdtemp(path.join(os.tmpdir(), 'bundler-test-'));

      try {
        const bundler = new Bundler(mockBuildFunc);
        const results = await bundler.bundle({
          outputPath,
          moduleReferences: [{ name: 'notify', path: NOTIFY_MODULE_PATH }],
        });

        // NotifyController has 1 method: notifyUser
        assert.equal(results.length, 1, 'should produce 1 bundle result');

        const notifyResult = results.find((r) => r.key.includes('notifyUser'));
        assert(notifyResult, 'notifyUser result should exist');

        const depNames = notifyResult.meta.dependencies.map((d) => d.protoName);
        assert(depNames.includes('notifierService'), 'should include notifierService');
        assert(depNames.includes('userService'), 'should include userService (transitive)');
        // EventBus is NOT in GlobalGraph — should be skipped, not crash
        assert(!depNames.includes('eventBus'), 'should NOT include eventBus (framework built-in)');
      } finally {
        await fs.rm(outputPath, { recursive: true, force: true });
      }
    });
  });

  describe('AOP cross-cutting concerns (aop-app)', () => {
    it('getOrder bundle should include full transitive dep chain (AOP-like services)', async () => {
      const outputPath = await fs.mkdtemp(path.join(os.tmpdir(), 'bundler-test-'));

      try {
        const bundler = new Bundler(mockBuildFunc);
        const results = await bundler.bundle({
          outputPath,
          moduleReferences: [{ name: 'order', path: ORDER_MODULE_PATH }],
        });

        // OrderController has 2 methods: getOrder, ping
        assert.equal(results.length, 2, 'should produce 2 bundle results');

        const getOrderResult = results.find((r) => r.key.includes('getOrder'));
        assert(getOrderResult, 'getOrder result should exist');

        // Dep chain: OrderController -> OrderService -> MetricsService
        const depNames = getOrderResult.meta.dependencies.map((d) => d.protoName);
        assert(depNames.includes('orderService'), 'getOrder should include orderService');
        assert(depNames.includes('metricsService'), 'getOrder should include metricsService (AOP transitive dep)');
      } finally {
        await fs.rm(outputPath, { recursive: true, force: true });
      }
    });

    it('ping bundle should have empty deps (pure method, no AOP overhead)', async () => {
      const outputPath = await fs.mkdtemp(path.join(os.tmpdir(), 'bundler-test-'));

      try {
        const bundler = new Bundler(mockBuildFunc);
        const results = await bundler.bundle({
          outputPath,
          moduleReferences: [{ name: 'order', path: ORDER_MODULE_PATH }],
        });

        const pingResult = results.find((r) => r.key.includes('ping'));
        assert(pingResult, 'ping result should exist');
        assert.equal(pingResult.meta.dependencies.length, 0, 'ping should have no deps (no service access)');
      } finally {
        await fs.rm(outputPath, { recursive: true, force: true });
      }
    });
  });
});
