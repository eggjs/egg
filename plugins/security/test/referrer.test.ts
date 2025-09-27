import { mm, MockApplication } from '@eggjs/mock';

describe('test/referrer.test.ts', () => {
  let app: MockApplication;
  let app2: MockApplication;
  let app3: MockApplication;

  before(async () => {
    app = mm.app({
      baseDir: 'apps/referrer',
    });
    await app.ready();
    app2 = mm.app({
      baseDir: 'apps/referrer-config',
    });
    await app2.ready();
    app3 = mm.app({
      baseDir: 'apps/referrer-config-compatibility',
    });
    await app3.ready();
  });

  after(async () => {
    await app.close();
    await app2.close();
    await app3.close();
  });

  afterEach(mm.restore);

  it('should return default referrer-policy http header', () => {
    return app
      .httpRequest()
      .get('/')
      .set('accept', 'text/html')
      .expect('Referrer-Policy', 'no-referrer-when-downgrade')
      .expect(200);
  });

  it('should contain Referrer-Policy header when configured', () => {
    return app2.httpRequest().get('/').set('accept', 'text/html').expect('Referrer-Policy', 'origin').expect(200);
  });

  it('should throw error when Referrer-Policy settings is invalid when configured', () => {
    const policy = 'oorigin';
    return app2
      .httpRequest()
      .get(`/referrer?policy=${policy}`)
      .set('accept', 'text/html')
      .expect(new RegExp(`"${policy}" is not available.`))
      .expect(500);
  });

  it('should keep typo refererPolicy for backward compatibility', () => {
    const policy = 'oorigin';
    return app3
      .httpRequest()
      .get(`/referrer?policy=${policy}`)
      .set('accept', 'text/html')
      .expect(new RegExp(`"${policy}" is not available.`))
      .expect(500);
  });

  // check for fix https://github.com/eggjs/security/pull/50
  it('should throw error when Referrer-Policy is set to index of item in ALLOWED_POLICIES_ENUM', () => {
    const policy = 0;
    return app2
      .httpRequest()
      .get(`/referrer?policy=${policy}`)
      .set('accept', 'text/html')
      .expect(new RegExp(`"${policy}" is not available.`))
      .expect(500);
  });
});
