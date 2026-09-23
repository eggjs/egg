import assert from 'node:assert/strict';
import { createRequire } from 'node:module';
import path from 'node:path';

import mm from '@eggjs/mock';
import type { Context } from 'egg';
import { it, TestRunner, vi } from 'vitest';
import type { RunnerTestFile } from 'vitest';

import { configureTeggRunner } from '../src/index.ts';
import TeggVitestRunner from '../src/runner.ts';
import { HelloService } from './fixtures/apps/demo-app/modules/demo-module/HelloService.ts';

const require = createRequire(import.meta.url);

configureTeggRunner({ getApp: () => undefined });

function createBarrier() {
  let arrivals = 0;
  let release!: () => void;
  const ready = new Promise<void>((resolve) => {
    release = resolve;
  });
  return async () => {
    if (++arrivals === 2) release();
    await ready;
  };
}

it('isolates concurrent application scopes across retries', { timeout: 30_000 }, async () => {
  // Both applications load the same module and service class.
  const apps = [0, 1].map(() =>
    mm.app({
      baseDir: path.join(__dirname, 'fixtures/apps/demo-app'),
      framework: path.dirname(require.resolve('egg/package.json')),
      cache: false,
    }),
  );
  const files = apps.map(
    (_, index) => ({ id: `file-${index}`, filepath: `app-${index}.test.ts`, type: 'suite' }) as RunnerTestFile,
  );
  const barriers = [createBarrier(), createBarrier()];

  // Drive the adapter hooks without changing the enclosing Vitest test's state.
  vi.spyOn(TestRunner.prototype, 'importFile').mockImplementation(async (filepath) => {
    configureTeggRunner({
      getApp: () => apps[files.findIndex((file) => file.filepath === filepath)] as any,
      restoreMocks: false,
    });
  });
  vi.spyOn(TestRunner.prototype, 'onBeforeRunSuite').mockResolvedValue();
  vi.spyOn(TestRunner.prototype, 'onAfterRunSuite').mockResolvedValue();
  const beforeTryTask = vi.spyOn(TestRunner.prototype, 'onBeforeTryTask').mockImplementation(() => {});
  vi.spyOn(TestRunner.prototype, 'onAfterRunTask').mockImplementation(() => {});

  const runner = new TeggVitestRunner({
    isolate: true,
    experimental: {},
  } as ConstructorParameters<typeof TestRunner>[0]);

  try {
    await Promise.all(apps.map((app) => app.ready()));
    assert.notEqual(apps[0]._teggScopeBag, apps[1]._teggScopeBag);
    for (const file of files) await runner.importFile(file.filepath, 'collect');

    const attempts = await Promise.all(
      apps.map((app, index) =>
        app.ctxStorage.run(app.mockContext(undefined, { mockCtxStorage: false, reuseCtxStorage: false }), async () => {
          const file = files[index];
          const task = { id: `task-${index}`, name: 'retry', file } as Parameters<TestRunner['onBeforeTryTask']>[0];
          await runner.onBeforeRunSuite(file);
          const suiteCtx = app.ctxStorage.getStore()!;
          const contexts: Context[] = [];
          const services: HelloService[] = [];
          try {
            for (const retryCount of [0, 1]) {
              const options = { retry: retryCount, repeats: 0 };
              await runner.onBeforeTryTask(task, options);
              assert.deepEqual(beforeTryTask.mock.calls.filter(([candidate]) => candidate === task).at(-1), [
                task,
                options,
              ]);
              const ctx = app.ctxStorage.getStore()!;
              contexts.push(ctx);
              services.push(await ctx.getEggObject(HelloService));
              await barriers[retryCount]();

              assert.equal(app.ctxStorage.getStore(), ctx);
              assert.equal(ctx.app._teggScopeBag, app._teggScopeBag);
              assert(services[retryCount] instanceof HelloService);
              assert.equal(await ctx.getEggObject(HelloService), services[retryCount]);
              assert.equal(Reflect.get(ctx.teggContext, 'destroyed'), false);
              if (retryCount) {
                assert.notEqual(ctx, contexts[0]);
                assert.notEqual(services[1], services[0]);
                assert.equal(Reflect.get(contexts[0].teggContext, 'destroyed'), true);
              }
            }
          } finally {
            await runner.onAfterRunTask(task);
            await runner.onAfterRunSuite(file);
          }
          // Context middleware starts destruction without awaiting its completion.
          await vi.waitFor(() => {
            assert(contexts.every((ctx) => Reflect.get(ctx.teggContext, 'destroyed')));
            assert.equal(Reflect.get(suiteCtx.teggContext, 'destroyed'), true);
          });
          return { contexts, services };
        }),
      ),
    );
    for (const retryCount of [0, 1]) {
      assert.notEqual(attempts[0].contexts[retryCount], attempts[1].contexts[retryCount]);
      assert.notEqual(attempts[0].services[retryCount], attempts[1].services[retryCount]);
    }
  } finally {
    vi.restoreAllMocks();
    await Promise.all(apps.map((app) => app.close()));
    await mm.restore();
  }
});
