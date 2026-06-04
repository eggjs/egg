import { scheduler } from 'node:timers/promises';

import { mm, type MockClusterApplication } from '@eggjs/mock';
import coffee from 'coffee';
import { describe, it, afterEach } from 'vitest';

import { getFilepath } from './utils.ts';

describe('test/agent_worker.test.ts > Fork Agent spawn safety', () => {
  let app: MockClusterApplication;

  afterEach(mm.restore);
  afterEach(() => app && app.close());

  // process.send is not exist if started by spawn
  it('master should not die if spawn error', async () => {
    app = coffee.spawn('node', [getFilepath('apps/agent-die/start.js')]) as any;
    // app.debug();
    app.close = async () => app.proc.kill();

    await scheduler.wait(2000);
    app.emit('close', 0);
    app.expect('stderr', /Error: Cannot find module/);
    app.notExpect('stderr', /TypeError: process.send is not a function/);
  });
});
