import { strict as assert } from 'node:assert';
import { scheduler } from 'node:timers/promises';

import { describe, it, afterEach, beforeAll, afterAll } from 'vitest';
import { mm, MockApplication } from '@eggjs/mock';

import { cluster } from '../utils.ts';

afterEach(mm.restore);

describe('after started', () => {
  let app: MockApplication;
  let readyMsg: string;

  beforeAll(() => {
    mm.env('default');
    app = cluster('apps/egg-ready');
    // app.debug();
    setTimeout(() => {
      app.proc.on('message', (msg: any) => {
        if (msg.to === 'parent' && msg.action === 'egg-ready') {
          readyMsg = `parent: port=${msg.data.port}, address=${msg.data.address}`;
        }
      });
    }, 1);
    return app.ready();
  });
  afterAll(() => app.close());

  it('app/agent should receive egg-ready', async () => {
    // work for message sent
    await scheduler.wait(5000);
    assert(readyMsg.match(/parent: port=\d+, address=http:\/\/127.0.0.1:\d+/));
    app.expect('stdout', /agent receive egg-ready, with 1 workers/);
    app.expect('stdout', /app receive egg-ready, worker 1/);
  });

  it('should receive egg-ready when app restart', async () => {
    await app.httpRequest().get('/exception-app').expect(200);

    await scheduler.wait(5000);
    app.expect('stdout', /app receive egg-ready, worker 2/);
  });

  it('should receive egg-ready when agent restart', async () => {
    await app.httpRequest().get('/exception-agent').expect(200);

    await scheduler.wait(5000);

    const matched = app.stdout.match(/agent receive egg-ready/g);
    assert(matched.length === 2);
  });
});
