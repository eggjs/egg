import { strict as assert } from 'node:assert';
import { scheduler } from 'node:timers/promises';
import { once } from 'node:events';

import { describe, it, beforeAll, afterEach, afterAll } from 'vitest';
import { mm } from '@eggjs/mock';

import { cluster, type MockApplication } from '../../../utils.ts';
import { Messenger } from '../../../../src/lib/core/messenger/ipc.ts';

describe.skip('test/lib/core/messenger/ipc.test.ts', () => {
  let messenger: Messenger;
  const app: any = {};

  beforeAll(() => {
    messenger = new Messenger(app);
  });

  afterEach(mm.restore);

  describe('on(action, data)', () => {
    it('should listen an action event', async () => {
      const dataEvent = once(messenger, 'messenger-test-on-event');
      process.emit('message', {}, null);
      process.emit('message', null, null);
      process.emit(
        'message',
        {
          action: 'messenger-test-on-event',
          data: {
            success: true,
          },
        },
        null
      );

      const data = await dataEvent;
      assert.deepEqual(data[0], {
        success: true,
      });
    });
  });

  describe('close()', () => {
    it('should remove all listeners', () => {
      const messenger = new Messenger(app);
      messenger.on('messenger-test-on-event-2', () => {
        throw new Error('should never emitted');
      });

      messenger.close();

      process.emit(
        'message',
        {
          action: 'messenger-test-on-event-2',
          data: {
            success: true,
          },
        },
        null
      );
    });
  });

  describe('cluster messenger', () => {
    let app: MockApplication;
    afterAll(() => app.close());

    // use it to record create coverage codes time
    it('before: should start cluster app', async () => {
      app = cluster('apps/messenger');
      app.coverage(true);
      await app.ready();
      await scheduler.wait(1000);
    });

    it('app should accept agent message', () => {
      app.expect('stdout', /\[app] agent-to-app agent msg/);
    });

    it('app should accept agent assign pid message', () => {
      app.expect('stdout', /\[app] agent-to-app agent msg \d+/);
    });

    it('agent should accept app message', () => {
      app.expect('stdout', /\[agent] app-to-agent app msg/);
    });

    it('agent should not send message before started', () => {
      app.expect('stdout', /agent can't call sendTo before server started/);
      app.expect('stdout', /agent can't call sendToApp before server started/);
      app.expect(
        'stdout',
        /agent can't call sendToAgent before server started/
      );
      app.expect('stdout', /agent can't call sendRandom before server started/);
      app.expect('stdout', /agent can't call broadcast before server started/);
    });
  });

  describe.skip('broadcast()', () => {
    let app: MockApplication;
    beforeAll(() => {
      mm.env('default');
      app = cluster('apps/messenger-broadcast', { workers: 2 });
      app.coverage(false);
      return app.ready();
    });
    beforeAll(() => scheduler.wait(1000));
    afterAll(() => app.close());

    it('should broadcast each other', () => {
      // app 26496 receive message from app pid 26495
      // app 26496 receive message from app pid 26496
      // app 26495 receive message from app pid 26495
      // app 26495 receive message from app pid 26496
      // app 26495 receive message from agent pid 26494
      // app 26496 receive message from agent pid 26494
      // agent 26494 receive message from app pid 26495
      // agent 26494 receive message from app pid 26496
      // agent 26494 receive message from agent pid 26494
      const m = app.stdout.match(
        /(app|agent) \d+ receive message from (app|agent) pid \d+/g
      );
      assert.equal(m.length, 9);
    });
  });

  describe.skip('sendRandom', () => {
    let app: MockApplication;
    beforeAll(() => {
      mm.env('default');
      app = cluster('apps/messenger-random', { workers: 4 });
      app.coverage(false);
      return app.ready();
    });
    afterAll(() => app.close());

    it('app should accept agent message', async () => {
      await scheduler.wait(10000);

      const m = app.stdout.match(/\d+=\d+/g);
      const map = new Map();
      for (const item of m) {
        const a = item.split('=');
        map.set(a[0], a[1]);
      }
      // for (const [ pid, count ] of map) {
      //   console.log('pid: %s, %s', pid, count);
      // }
      assert(map.size <= 4);
      assert(map.size >= 2);
    });
  });

  describe('sendToApp and sentToAgent', () => {
    let app: MockApplication;
    beforeAll(() => {
      mm.env('default');
      app = cluster('apps/messenger-app-agent', { workers: 2 });
      app.coverage(false);
      return app.ready();
    });
    afterAll(() => app.close());

    it('app should accept agent message', async () => {
      function count(data: string, key: string) {
        return data.split('\n').filter(line => {
          return line.indexOf(key) >= 0;
        }).length;
      }
      await scheduler.wait(500);
      assert(count(app.stdout, 'agent2app') === 2);
      assert(count(app.stdout, 'app2app') === 4);
      assert(count(app.stdout, 'agent2agent') === 1);
      assert(count(app.stdout, 'app2agent') === 2);
    });
  });

  describe('worker_threads mode', () => {
    let app: MockApplication;
    beforeAll(() => {
      mm.env('default');
      app = cluster('apps/messenger-app-agent', {
        workers: 1,
        startMode: 'worker_threads',
      });
      app.coverage(false);
      return app.ready();
    });
    afterAll(() => app.close());

    it('app should accept agent message', async () => {
      function count(data: string, key: string) {
        return data.split('\n').filter(line => {
          return line.indexOf(key) >= 0;
        }).length;
      }

      await scheduler.wait(500);
      assert(count(app.stdout, 'agent2app') === 1);
      assert(count(app.stdout, 'app2app') === 1);
      assert(count(app.stdout, 'agent2agent') === 1);
      assert(count(app.stdout, 'app2agent') === 1);
    });
  });
});
