import { mm } from '@eggjs/mock';
import { createApp, MockApplication } from '../../utils.js';

describe('test/lib/plugins/onerror.test.ts', () => {
  let app: MockApplication;
  before(() => {
    mm.env('local');
    mm(process.env, 'EGG_LOG', 'NONE');
    app = createApp('apps/onerror');
    return app.ready();
  });

  after(() => app.close());

  afterEach(mm.restore);

  it('should redirect to error page', () => {
    mm(app.config, 'env', 'test');
    return app.httpRequest()
      .get('/?status=500')
      .expect('Location', 'http://eggjs.org/500?real_status=500')
      .expect(302);
  });
});
