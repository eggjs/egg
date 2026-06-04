import { mm, type MockApplication } from '@eggjs/mock';
import { request } from '@eggjs/supertest';
import { describe, it, afterEach, beforeAll, afterAll } from 'vitest';

import { cluster } from '../utils.ts';

let app: MockApplication;

afterEach(mm.restore);

describe.skipIf(process.platform !== 'linux')('--sticky', () => {
  beforeAll(async () => {
    app = cluster('apps/cluster_mod_sticky', {
      sticky: true,
      port: 17010,
    } as any);
    app.debug();
    await app.ready();
  });
  afterAll(() => app.close());

  it('should online sticky cluster mode startup success', async () => {
    app.expect('stdout', /app_worker#\d:\d+ started at (?!9500)/);
    app.expect('stdout', /egg started on http:\/\/127.0.0.1:17010/);
    await request('http://127.0.0.1:17010').get('/portal/i.htm').expect('hi cluster').expect(200);
  });
});
