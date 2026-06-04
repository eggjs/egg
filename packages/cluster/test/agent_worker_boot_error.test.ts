import { mm, type MockClusterApplication } from '@eggjs/mock';
import { describe, it, afterEach } from 'vitest';

import { cluster } from './utils.ts';

describe('test/agent_worker.test.ts > Fork Agent boot errors', () => {
  let app: MockClusterApplication;

  afterEach(mm.restore);
  afterEach(() => app && app.close());

  it('should exist when error happened during boot', () => {
    app = cluster('apps/agent-die-onboot');
    return (
      app
        // .debug()
        .expect('code', 1)
        .expect('stderr', /\[master\] agent_worker#1:\d+ start fail, exiting with code:1/)
        .expect('stderr', /error: app worker throw/)
        .end()
    );
  });

  it('should not start app when error happened during agent starting', () => {
    app = cluster('apps/agent-die-onboot');
    return app
      .expect('code', 1)
      .expect('stderr', /\[master\] agent_worker#1:\d+ start fail, exiting with code:1/)
      .expect('stderr', /error: app worker throw/)
      .notExpect('stdout', /agent-error-but-app-start/)
      .end();
  });
});
