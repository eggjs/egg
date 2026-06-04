import { mm, type MockApplication } from '@eggjs/mock';
import { describe, it, afterEach } from 'vitest';

import { cluster } from './utils.ts';

// node v24 will hang when test this file
// FIXME: should enable this test after node v24 is stable
describe.skipIf(process.version.startsWith('v24') || process.platform === 'win32')('test/app_worker.test.ts', () => {
  let app: MockApplication;
  afterEach(() => app && app.close());
  afterEach(mm.restore);

  it('should exit when EADDRINUSE', async () => {
    mm.env('default');

    app = cluster('apps/app-server', { port: 17001 });
    // app.debug();
    await app.ready();

    let app2: MockApplication | undefined;
    try {
      app2 = cluster('apps/app-server', { port: 17001 });
      app2.debug();
      await app2.ready();

      app2.expect('code', 1);
      app2.expect('stderr', /\[app_worker] server got error: bind EADDRINUSE null:17001, code: EADDRINUSE/);
      app2.expect('stdout', /don't fork/);
    } finally {
      if (app2) {
        await app2.close();
      }
    }
  });
});
