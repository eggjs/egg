import { MockApplication } from '@eggjs/mock';
import { cluster } from './utils.js';

describe('test/worker_threads.test.ts', () => {
  let app: MockApplication;

  describe('Fork Agent', () => {
    afterEach(() => app && app.close());

    it('support config agent debug port', async () => {
      app = cluster('apps/agent-worker-threads', { startMode: 'worker_threads' } as any);
      app.debug();
      return app
        .expect('stdout', /workerId: \d+/)
        .end();
    });

    it('should exit when emit error during agent worker boot', () => {
      app = cluster('apps/agent-worker-threads-error');
      app.debug();
      return app
        .debug()
        .expect('code', 1)
        .expect('stderr', /worker_threads mock error/)
        .expect('stderr', /\[agent_worker\] start error, exiting with code:1/)
        .expect('stderr', /\[master\] exit with code:1/)
        .end();
    });
  });
});
