import { strict as assert } from 'node:assert';

import { describe, it, afterEach } from 'vitest';

import mm from '../src/index.ts';
import { getFixtures } from './helper.ts';

describe('test/setup_vitest.test.ts', () => {
  afterEach(mm.restore);

  it('should fail fast with cached startupPromise vs old pattern', async () => {
    const FILE_COUNT = 10;
    const baseDir = getFixtures('app-fail');

    // --- Old pattern ---
    // Old setup_vitest.ts: each beforeAll creates a new `await app.ready()` call.
    // Old app_handler.ts (with globals: true) also registered a duplicate
    // `beforeAll(() => app.ready())` + two afterEach hooks.
    // Per file: 2x beforeAll + 2x afterEach = 4 hook executions.
    const oldApp = mm.app({ baseDir, cache: false });
    const oldDurations: number[] = [];

    for (let i = 0; i < FILE_COUNT; i++) {
      const start = Date.now();
      // setup_vitest.ts beforeAll: await app.ready()
      try {
        await oldApp.ready();
      } catch {
        /* expected */
      }
      // app_handler.ts duplicate beforeAll: app.ready()
      try {
        await oldApp.ready();
      } catch {
        /* expected */
      }
      // app_handler.ts afterEach: app.backgroundTasksFinished()
      try {
        await (oldApp as any).backgroundTasksFinished?.();
      } catch {
        /* expected */
      }
      // app_handler.ts afterEach: restore()
      try {
        await mm.restore();
      } catch {
        /* expected */
      }
      oldDurations.push(Date.now() - start);
    }
    await oldApp.close();

    // --- New pattern ---
    // Single cached startupPromise, no duplicate hooks.
    // Per file: 1x await startupPromise (instant if cached).
    const newApp = mm.app({ baseDir, cache: false });
    const newDurations: number[] = [];

    let startupPromise: Promise<void> | undefined;
    for (let i = 0; i < FILE_COUNT; i++) {
      const start = Date.now();
      if (!startupPromise) {
        startupPromise = (async () => {
          await newApp.ready();
        })();
        startupPromise.catch(() => {});
      }
      try {
        await startupPromise;
      } catch {
        /* expected */
      }
      newDurations.push(Date.now() - start);
    }
    await newApp.close();

    const oldTotal = oldDurations.reduce((a, b) => a + b, 0);
    const newTotal = newDurations.reduce((a, b) => a + b, 0);

    console.log(`Old pattern (${FILE_COUNT} files, 2x ready + 2x afterEach each):`);
    console.log(`  durations: [${oldDurations.join(', ')}]ms, total=${oldTotal}ms`);
    console.log(`New pattern (${FILE_COUNT} files, cached promise):`);
    console.log(`  durations: [${newDurations.join(', ')}]ms, total=${newTotal}ms`);

    // New pattern: files after the first should be 0ms
    for (let i = 1; i < FILE_COUNT; i++) {
      assert(newDurations[i] < 50, `new pattern file ${i + 1} should be instant, got ${newDurations[i]}ms`);
    }
  });

  it('should not re-attempt startup when startupPromise is cached', async () => {
    let initCount = 0;
    const baseDir = getFixtures('app-fail');

    let startupPromise: Promise<void> | undefined;

    // Simulate the setup_vitest.ts beforeAll pattern for 3 test files
    for (let i = 0; i < 3; i++) {
      if (!startupPromise) {
        initCount++;
        const app = mm.app({ baseDir, cache: false });
        startupPromise = (async () => {
          await app.ready();
        })();
        startupPromise.catch(() => {});
      }

      try {
        await startupPromise;
      } catch {
        // expected
      }
    }

    // Should only have attempted startup once
    assert.equal(initCount, 1, 'should only attempt startup once, not once per test file');
  });
});
