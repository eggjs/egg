import assert from 'node:assert/strict';

import { mm } from '@eggjs/mock';
import { describe, it } from 'vitest';

import { BackgroundCounterService } from './fixtures/apps/multi-app-isolation/modules/counter-module/BackgroundCounterService.ts';
import { CounterProducer } from './fixtures/apps/multi-app-isolation/modules/counter-module/CounterEvent.ts';
import { CounterService } from './fixtures/apps/multi-app-isolation/modules/counter-module/CounterService.ts';
import { getAppBaseDir } from './utils.ts';

async function waitFor(predicate: () => boolean, timeout = 2000): Promise<void> {
  const deadline = Date.now() + timeout;
  while (!predicate()) {
    if (Date.now() > deadline) {
      throw new Error('waitFor timeout');
    }
    await new Promise((resolve) => setTimeout(resolve, 10));
  }
}

describe('plugin/tegg/test/MultiApp.test.ts', () => {
  it('should isolate singleton objects between two concurrent apps', async () => {
    // Both apps load the SAME counter-module file; isolation means each gets its
    // own CounterService singleton. Two apps alive => TeggScope strict mode is
    // active, so any per-app access escaping to the process-default bag throws.
    const app1 = mm.app({ baseDir: getAppBaseDir('multi-app-isolation') });
    const app2 = mm.app({ baseDir: getAppBaseDir('multi-app-isolation-b') });
    await Promise.all([app1.ready(), app2.ready()]);
    try {
      const counter1 = await app1.getEggObject(CounterService);
      const counter2 = await app2.getEggObject(CounterService);
      assert.notStrictEqual(counter1, counter2, 'each app must have its own CounterService singleton');

      counter1.increment();
      counter1.increment();
      assert.equal(counter1.getCount(), 2);
      assert.equal(counter2.getCount(), 0, 'app2 singleton must not be affected by app1 mutations');

      const counter1Again = await app1.getEggObject(CounterService);
      assert.strictEqual(counter1Again, counter1, 'same instance returned within app1');
      assert.equal(counter1Again.getCount(), 2);
    } finally {
      await Promise.all([app1.close(), app2.close()]);
    }
  });

  it('should isolate per-app data store (DB-like singleton state)', async () => {
    const app1 = mm.app({ baseDir: getAppBaseDir('multi-app-isolation') });
    const app2 = mm.app({ baseDir: getAppBaseDir('multi-app-isolation-b') });
    await Promise.all([app1.ready(), app2.ready()]);
    try {
      const counter1 = await app1.getEggObject(CounterService);
      const counter2 = await app2.getEggObject(CounterService);
      counter1.save('foo', 42);
      assert.equal(counter1.load('foo'), 42);
      assert.equal(counter2.load('foo'), undefined, 'app2 store must not see app1 data');
    } finally {
      await Promise.all([app1.close(), app2.close()]);
    }
  });

  it('should isolate EventBus emit/handler dispatch between two concurrent apps', async () => {
    const app1 = mm.app({ baseDir: getAppBaseDir('multi-app-isolation') });
    const app2 = mm.app({ baseDir: getAppBaseDir('multi-app-isolation-b') });
    await Promise.all([app1.ready(), app2.ready()]);
    try {
      const counter1 = await app1.getEggObject(CounterService);
      const counter2 = await app2.getEggObject(CounterService);

      // emit from within app1's context — the per-app EventBus dispatches the
      // handler in app1's scope, so it must hit app1's CounterService only.
      await app1.mockModuleContextScope(async (ctx: any) => {
        const producer1 = await ctx.getEggObject(CounterProducer);
        producer1.emit(3);
      });
      await waitFor(() => counter1.getEventCount() === 3);

      assert.equal(counter1.getEventCount(), 3, 'app1 handler should observe app1 emit');
      assert.equal(counter2.getEventCount(), 0, 'app2 must not observe app1 emit');
    } finally {
      await Promise.all([app1.close(), app2.close()]);
    }
  });

  it('should isolate background tasks between two concurrent apps', async () => {
    const app1 = mm.app({ baseDir: getAppBaseDir('multi-app-isolation') });
    const app2 = mm.app({ baseDir: getAppBaseDir('multi-app-isolation-b') });
    await Promise.all([app1.ready(), app2.ready()]);
    try {
      // Background task drains on context destroy (the timer/async escape point);
      // its callback must resolve app1's CounterService.
      await app1.mockModuleContextScope(async (ctx: any) => {
        const bg = await ctx.getEggObject(BackgroundCounterService);
        bg.schedule(2);
      });

      const counter1 = await app1.getEggObject(CounterService);
      const counter2 = await app2.getEggObject(CounterService);
      assert.equal(counter1.getCount(), 2, 'app1 background task should increment app1 counter');
      assert.equal(counter2.getCount(), 0, 'app2 must not be affected by app1 background task');
    } finally {
      await Promise.all([app1.close(), app2.close()]);
    }
  });

  it('should not leak state between sequential app lifecycles', async () => {
    const app1 = mm.app({ baseDir: getAppBaseDir('multi-app-isolation') });
    await app1.ready();
    try {
      const counter1 = await app1.getEggObject(CounterService);
      counter1.increment();
      counter1.increment();
      counter1.increment();
      assert.equal(counter1.getCount(), 3);
    } finally {
      await app1.close();
    }

    const app2 = mm.app({ baseDir: getAppBaseDir('multi-app-isolation') });
    await app2.ready();
    try {
      const counter2 = await app2.getEggObject(CounterService);
      assert.equal(counter2.getCount(), 0, 'app2 must not inherit app1 state after sequential restart');
    } finally {
      await app2.close();
    }
  });
});
