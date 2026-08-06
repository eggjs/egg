import { strict as assert } from 'node:assert';
import { scheduler } from 'node:timers/promises';

import { mm, type MockApplication } from '@eggjs/mock';
import { describe, it, afterEach, beforeAll, afterAll } from 'vitest';

import { cluster } from '../utils.ts';

// Poll until `ready()` returns true, up to `timeout` ms, checking every 200ms.
// Resolves anyway on timeout so the caller's own assertions produce the diff;
// a fixed sleep here flakes on slow CI runners.
async function waitFor(ready: () => boolean, timeout = 30_000): Promise<void> {
  const deadline = Date.now() + timeout;
  while (!ready()) {
    if (Date.now() >= deadline) return;
    await scheduler.wait(200);
  }
}

// TODO: flaky test on windows
describe.skipIf(process.platform === 'win32')('after started', () => {
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

  afterEach(mm.restore);

  it('app/agent should receive egg-ready', async () => {
    // work for message sent
    await waitFor(
      () =>
        Boolean(readyMsg) &&
        /agent receive egg-ready, with 1 workers/.test(app.stdout) &&
        /app receive egg-ready, worker 1/.test(app.stdout),
    );
    assert(readyMsg.match(/parent: port=\d+, address=http:\/\/127.0.0.1:\d+/));
    app.expect('stdout', /agent receive egg-ready, with 1 workers/);
    app.expect('stdout', /app receive egg-ready, worker 1/);
  });

  it('should receive egg-ready when app restart', async () => {
    await app.httpRequest().get('/exception-app').expect(200);

    await waitFor(() => /app receive egg-ready, worker 2/.test(app.stdout));
    app.expect('stdout', /app receive egg-ready, worker 2/);
  });

  it('should receive egg-ready when agent restart', async () => {
    await app.httpRequest().get('/exception-agent').expect(200);

    await waitFor(() => (app.stdout.match(/agent receive egg-ready/g) ?? []).length >= 2);

    const matched = app.stdout.match(/agent receive egg-ready/g);
    assert(matched.length === 2);
  });
});
