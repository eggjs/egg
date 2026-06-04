import { mm, type MockApplication } from '@eggjs/mock';
import { describe, it, afterEach, beforeAll, afterAll } from 'vitest';

import { cluster } from '../utils.ts';

let app: MockApplication;

afterEach(mm.restore);

// TODO: flaky test on windows, Hook timed out in 20000ms
describe.skipIf(process.platform === 'win32')('--cluster', () => {
  beforeAll(() => {
    app = cluster('apps/cluster_mod_app');
    return app.ready();
  });
  afterAll(() => app.close());

  it('should online cluster mode startup success', () => {
    return app.httpRequest().get('/portal/i.htm').expect('hi cluster').expect(200);
  });
});
