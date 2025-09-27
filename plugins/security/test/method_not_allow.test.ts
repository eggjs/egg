import { mm, MockApplication } from '@eggjs/mock';

describe('test/method_not_allow.test.ts', () => {
  let app: MockApplication;
  before(() => {
    app = mm.app({
      baseDir: 'apps/method',
    });
    return app.ready();
  });

  afterEach(mm.restore);

  after(() => app.close());

  it('should allow', async () => {
    await app.httpRequest().get('/').expect(200);
  });

  it('should not allow trace method', async () => {
    await app.httpRequest().trace('/').set('accept', 'text/html').expect(405);
  });

  it('should allow options method', () => {
    return app.httpRequest().options('/').set('accept', 'text/html').expect(200);
  });
});
