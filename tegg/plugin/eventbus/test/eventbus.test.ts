import { describe, afterEach, beforeAll, afterAll, it, expect } from 'vitest';
import { mm, type MockApplication } from '@eggjs/mock';
import { TimerUtil } from '@eggjs/tegg-common-util';
import { type IEventContext } from '@eggjs/tegg';

import { HelloService } from './fixtures/apps/event-app/app/event-module/HelloService.ts';
import { HelloLogger } from './fixtures/apps/event-app/app/event-module/HelloLogger.ts';
import { MultiEventHandler } from './fixtures/apps/event-app/app/event-module/MultiEventHandler.ts';
import { getFixtures } from './utils.ts';

describe('plugin/eventbus/test/eventbus.test.ts', () => {
  let app: MockApplication;

  afterEach(async () => {
    return mm.restore();
  });

  beforeAll(async () => {
    app = mm.app({
      baseDir: getFixtures('apps/event-app'),
    });
    await app.ready();
  });

  afterAll(() => {
    return app.close();
  });

  it('msg should work', async () => {
    await app.mockModuleContextScope(async (ctx) => {
      const helloService = await ctx.getEggObject(HelloService);
      let msg: string | undefined;
      // helloLogger is in child context
      mm(HelloLogger.prototype, 'handle', (m: string) => {
        msg = m;
      });
      const eventWaiter = await app.getEventWaiter();
      const helloEvent = eventWaiter.await('helloEgg');
      helloService.hello();
      await helloEvent;
      expect(msg).toBe('01');
    });
  });

  it('cork/uncork should work', async () => {
    await app.mockModuleContextScope(async (ctx) => {
      const helloService = await ctx.getEggObject(HelloService);
      let helloTime = 0;
      // helloLogger is in child context
      mm(HelloLogger.prototype, 'handle', () => {
        helloTime = Date.now();
      });
      helloService.cork();
      const triggerTime = Date.now();
      helloService.hello();

      await TimerUtil.sleep(100);
      helloService.uncork();

      const eventWaiter = await app.getEventWaiter();
      const helloEvent = eventWaiter.await('helloEgg');
      await helloEvent;
      expect(helloTime).toBeGreaterThanOrEqual(triggerTime + 100);
    });
  });

  it('can call cork/uncork multi times', async () => {
    await app.mockModuleContextScope(async (ctx) => {
      const helloService = await ctx.getEggObject(HelloService);
      const eventWaiter = await app.getEventWaiter();

      let helloCalled = 0;
      // helloLogger is in child context
      mm(HelloLogger.prototype, 'handle', () => {
        helloCalled++;
      });
      helloService.cork();
      helloService.hello();
      helloService.uncork();
      await eventWaiter.await('helloEgg');

      helloService.cork();
      helloService.hello();
      helloService.uncork();
      await eventWaiter.await('helloEgg');

      expect(helloCalled).toBe(2);
    });
  });

  it('reentry cork/uncork should work', async () => {
    await app.mockModuleContextScope(async (ctx) => {
      const helloService = await ctx.getEggObject(HelloService);
      const eventWaiter = await app.getEventWaiter();

      let helloCalled = 0;
      // helloLogger is in child context
      mm(HelloLogger.prototype, 'handle', () => {
        helloCalled++;
      });
      helloService.cork();
      helloService.cork();
      helloService.hello();
      helloService.uncork();
      helloService.uncork();
      await eventWaiter.await('helloEgg');

      expect(helloCalled).toBe(1);
    });
  });

  it('concurrent cork/uncork should work', async () => {
    let helloCalled = 0;
    // helloLogger is in child context
    mm(HelloLogger.prototype, 'handle', () => {
      helloCalled++;
    });
    await Promise.all([
      app.mockModuleContextScope(async (ctx) => {
        const helloService = await ctx.getEggObject(HelloService);
        const eventWaiter = await app.getEventWaiter();
        helloService.cork();
        helloService.hello();
        await TimerUtil.sleep(100);
        helloService.uncork();
        await eventWaiter.await('helloEgg');
      }),
      app.mockModuleContextScope(async (ctx) => {
        const helloService = await ctx.getEggObject(HelloService);
        const eventWaiter = await app.getEventWaiter();
        helloService.cork();
        helloService.hello();
        await TimerUtil.sleep(100);
        helloService.uncork();
        await eventWaiter.await('helloEgg');
      }),
    ]);
    expect(helloCalled).toBe(2);
  });

  it('multi event handler should work', async function () {
    await app.mockModuleContextScope(async (ctx) => {
      const helloService = await ctx.getEggObject(HelloService);
      let eventName = '';
      let msg = '';
      mm(MultiEventHandler.prototype, 'handle', (ctx: IEventContext, m: string) => {
        eventName = ctx.eventName;
        msg = m;
      });
      const eventWaiter = await app.getEventWaiter();
      const helloEvent = eventWaiter.await('helloEgg');
      helloService.hello();
      await helloEvent;
      expect(eventName).toBe('helloEgg');
      expect(msg).toBe('01');
      const hiEvent = eventWaiter.await('hiEgg');
      helloService.hi();
      await hiEvent;
      expect(eventName).toBe('hiEgg');
      expect(msg).toBe('Ydream');
    });
  });
});
