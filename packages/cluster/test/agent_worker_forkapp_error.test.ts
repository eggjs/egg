import { mm, type MockClusterApplication } from '@eggjs/mock';
import { describe, it, afterEach } from 'vitest';

import { cluster } from './utils.ts';

describe('test/agent_worker.test.ts > Fork Agent forkapp/start errors', () => {
  let app: MockClusterApplication;

  afterEach(mm.restore);
  afterEach(() => app && app.close());

  it('should master exit when agent exit during app worker boot', () => {
    app = cluster('apps/agent-die-on-forkapp');

    return (
      app
        // .debug()
        .expect('code', 1)
        .expect('stdout', /\[master\] agent_worker#1:\d+ started/)
        .expect('stderr', /\[master\] agent_worker#1:\d+ died/)
        .expect('stderr', /\[master\] agent_worker#1:\d+ start fail, exiting with code:1/)
        .expect('stderr', /\[master\] exit with code:1/)
        .notExpect('stdout', /app_worker#2/)
        .end()
    );
  });

  it('should exit when emit error during agent worker boot', () => {
    app = cluster('apps/agent-start-error');
    return (
      app
        // .debug()
        .expect('code', 1)
        .expect('stderr', /mock error/)
        .expect('stderr', /\[agent_worker\] start error, exiting with code:1/)
        .expect('stderr', /\[master\] exit with code:1/)
        .end()
    );
  });
});
