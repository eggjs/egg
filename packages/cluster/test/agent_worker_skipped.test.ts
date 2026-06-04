import { scheduler } from 'node:timers/promises';

import { mm, type MockClusterApplication } from '@eggjs/mock';
import { describe, it, afterEach } from 'vitest';

import { cluster } from './utils.ts';

describe('test/agent_worker.test.ts > Fork Agent skipped scenarios', () => {
  let app: MockClusterApplication;

  afterEach(mm.restore);
  afterEach(() => app && app.close());

  it.skip('support config agent debug port', () => {
    mm(process.env, 'EGG_AGENT_DEBUG_PORT', '15800');
    app = cluster('apps/agent-debug-port', {
      opt: {
        require: ['./inject1.js'],
      },
    });
    return (
      app
        // .debug()
        .expect('stdout', /@@inject1\.js run/)
        .expect('stdout', /=15800/)
        .end()
    );
  });

  it.skip('agent debug port default 5800', () => {
    app = cluster('apps/agent-debug-port');
    return (
      app
        // .debug()
        .expect('stdout', /=5800/)
        .end()
    );
  });

  it.skip('should refork new agent_worker after app started', async () => {
    app = cluster('apps/agent-die');
    await app
      // .debug()
      .expect('stdout', /\[master\] egg started on http:\/\/127.0.0.1:\d+/)
      .end();

    app.process.send({
      to: 'agent',
      action: 'kill-agent',
    });

    await scheduler.wait(2000);

    app.expect('stderr', /\[master\] agent_worker#1:\d+ died/);
    app.expect('stdout', /\[master\] try to start a new agent_worker after 1s .../);
    app.expect('stdout', /\[master\] agent_worker#2:\d+ started/);
    app.notExpect('stdout', /app_worker#2/);
  });

  it.skip('should exit agent_worker when master die in accident', async () => {
    app = cluster('apps/agent-die');
    await app
      // .debug()
      .expect('stdout', /\[master\] egg started on http:\/\/127.0.0.1:\d+/)
      .end();

    // kill -9 master
    app.process.kill('SIGKILL');
    await scheduler.wait(2000);
    app
      .expect('stderr', /\[app_worker\] receive disconnect event in cluster fork mode, exitedAfterDisconnect:false/)
      .expect('stderr', /\[agent_worker\] receive disconnect event on child_process fork mode, exiting with code:110/)
      .expect('stderr', /\[agent_worker\] exit with code:110/);
  });
});
