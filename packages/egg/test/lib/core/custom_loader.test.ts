import { mm } from '@eggjs/mock';
import { createApp, MockApplication } from '../../utils.js';

describe('test/lib/core/custom_loader.test.ts', () => {
  afterEach(mm.restore);

  let app: MockApplication;
  before(() => {
    app = createApp('apps/custom-loader');
    return app.ready();
  });
  after(() => app.close());

  it('should support customLoader', async () => {
    await app.httpRequest()
      .get('/users/popomore')
      .expect({
        adapter: 'docker',
        repository: 'popomore',
      })
      .expect(200);
  });

  it('should loadCustomLoader before loadCustomApp', async () => {
    await app.httpRequest()
      .get('/beforeLoad')
      .expect('beforeLoad')
      .expect(200);
  });
});
