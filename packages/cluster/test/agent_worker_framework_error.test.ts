import { mm, type MockClusterApplication } from '@eggjs/mock';
import { describe, it, afterEach } from 'vitest';

import { cluster } from './utils.ts';

describe('test/agent_worker.test.ts > Fork Agent framework error formatter', () => {
  let app: MockClusterApplication;

  afterEach(mm.restore);
  afterEach(() => app && app.close());

  it('should FrameworkErrorformater work during agent boot', () => {
    app = cluster('apps/agent-start-framework-error');
    return (
      app
        // .debug()
        .expect('code', 1)
        .expect('stderr', /CustomError: mock error \[ https:\/\/eggjs\.org\/zh-cn\/faq\/customPlugin_99 \]/)
        .end()
    );
  });

  it('should FrameworkErrorformater work during agent boot ready', () => {
    app = cluster('apps/agent-start-framework-ready-error');
    return (
      app
        // .debug()
        .expect('code', 1)
        .expect('stderr', /CustomError: mock error \[ https:\/\/eggjs\.org\/zh-cn\/faq\/customPlugin_99 \]/)
        .end()
    );
  });
});
