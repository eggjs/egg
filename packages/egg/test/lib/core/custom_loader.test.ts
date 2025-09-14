import { describe, it, beforeAll, afterAll, afterEach } from 'vitest';
import { mm } from '@eggjs/mock';

import { createApp, type MockApplication } from '../../utils.ts';

describe('test/lib/core/custom_loader.test.ts', () => {
  afterEach(mm.restore);

  let app: MockApplication;
  beforeAll(async () => {
    app = createApp('apps/custom-loader');
    await app.ready();
  });
  afterAll(() => app.close());

  it('should support customLoader', async () => {
    await app
      .httpRequest()
      .get('/users/popomore')
      .expect({
        adapter: 'docker',
        repository: 'popomore',
      })
      .expect(200);
  });

  it('should loadCustomLoader before loadCustomApp', async () => {
    await app.httpRequest().get('/beforeLoad').expect('beforeLoad').expect(200);
  });
});
