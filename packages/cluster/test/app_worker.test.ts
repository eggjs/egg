import { mm, type MockApplication } from '@eggjs/mock';
import { describe, it, afterEach, beforeAll } from 'vitest';

import { cluster } from './utils.ts';

// node v24 will hang when test this file
// FIXME: should enable this test after node v24 is stable
describe.skipIf(process.version.startsWith('v24') || process.platform === 'win32')('test/app_worker.test.ts', () => {
  let app: MockApplication;
  afterEach(() => app && app.close());
  afterEach(mm.restore);

  describe('app worker', () => {
    beforeAll(() => {
      app = cluster('apps/app-server');
      return app.ready();
    });
    it('should emit `server`', () => {
      return app.httpRequest().get('/').expect('true');
    });
  });
});
