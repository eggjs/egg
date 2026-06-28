import assert from 'node:assert/strict';

import { mm } from '@eggjs/mock';
import { describe, it } from 'vitest';

import { CounterProducer } from './fixtures/apps/multi-app-isolation/modules/counter-module/CounterEvent.ts';
import { CounterService } from './fixtures/apps/multi-app-isolation/modules/counter-module/CounterService.ts';
import { getAppBaseDir } from './utils.ts';

async function waitFor(predicate: () => boolean, timeout = 5000): Promise<void> {
  const deadline = Date.now() + timeout;
  while (!predicate()) {
    if (Date.now() > deadline) {
      throw new Error('waitFor timeout');
    }
    await new Promise((resolve) => setTimeout(resolve, 10));
  }
}

/**
 * Parallel sibling to MultiApp.test.ts.
 *
 * Where MultiApp.test.ts drives the two apps SEQUENTIALLY inside one `it`, this
 * file uses `describe.concurrent` so vitest runs every `it` body AT THE SAME
 * TIME: many apps boot, mutate, dispatch events and tear down concurrently. This
 * mirrors how the suite runs under vitest's default parallel config
 * (`pool: 'threads'`, `isolate: false`) — multiple `mm.app` instances alive in
 * one process at once.
 *
 * Each `it` boots its OWN app with `cache: false`: `mm.app` caches by `baseDir`
 * (see `createApp` in `@eggjs/mock`), so without it the concurrent bodies that
 * share a `baseDir` would all receive the SAME cached instance. With `cache:
 * false` every call yields a distinct app + its own `TeggScope` bag. While ≥2
 * apps are alive the strict-mode escape fuse is active throughout, so any per-app
 * access that escaped its scope under concurrency would THROW rather than pass.
 *
 * The per-app increment / emit deltas are all distinct, so a cross-talk bug
 * surfaces as a wrong total instead of coincidentally matching the expectation.
 */
const WORKERS = [
  { name: 'A', dir: 'multi-app-isolation', bumps: 1, emit: 11 },
  { name: 'B', dir: 'multi-app-isolation-b', bumps: 2, emit: 22 },
  { name: 'C', dir: 'multi-app-isolation', bumps: 3, emit: 33 },
  { name: 'D', dir: 'multi-app-isolation-b', bumps: 4, emit: 44 },
] as const;

describe.concurrent('plugin/tegg/test/MultiAppParallel.test.ts', () => {
  for (const w of WORKERS) {
    it(`app ${w.name}: isolates singleton + store + eventbus under concurrent boot`, async () => {
      // cache:false => a fresh app even when another worker shares this baseDir.
      const app = mm.app({ baseDir: getAppBaseDir(w.dir), cache: false });
      await app.ready();
      try {
        const counter = await app.getEggObject(CounterService);

        // 1) plain singleton state
        for (let i = 0; i < w.bumps; i++) {
          counter.increment();
        }

        // 2) DB-like per-app data store
        counter.save(w.name, w.emit);

        // 3) eventbus emit-path: emit inside THIS app's context. doEmit must
        //    re-establish THIS app's scope, so the handler hits THIS app's
        //    CounterService — never a concurrently-booted sibling's.
        await app.mockModuleContextScope(async (ctx: any) => {
          const producer = await ctx.getEggObject(CounterProducer);
          producer.emit(w.emit);
        });
        await waitFor(() => counter.getEventCount() === w.emit);

        // Yield so every other concurrent app interleaves between mutate and
        // assert — maximizing the chance a scope leak would be observed.
        await new Promise((resolve) => setTimeout(resolve, 30));

        assert.equal(counter.getCount(), w.bumps, `app ${w.name} must observe only its own ${w.bumps} increments`);
        assert.equal(counter.getEventCount(), w.emit, `app ${w.name} must observe only its own emit (${w.emit})`);
        assert.equal(counter.load(w.name), w.emit, `app ${w.name} store must keep only its own value`);

        const again = await app.getEggObject(CounterService);
        assert.strictEqual(again, counter, `app ${w.name} must return the same singleton instance`);
      } finally {
        await app.close();
      }
    });
  }
});
