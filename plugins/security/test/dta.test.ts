import { scheduler } from 'node:timers/promises';
import { mm, MockApplication } from '@eggjs/mock';
import snapshot from 'snap-shot-it';

describe('test/dta.test.ts', () => {
  let app: MockApplication;
  before(() => {
    app = mm.app({
      baseDir: 'apps/dta',
    });
    return app.ready();
  });

  afterEach(mm.restore);

  after(() => app.close());

  it('should ok when path is normal', () => {
    snapshot(app.config.security);
    return app.httpRequest().get('/test').expect(200);
  });

  it('should ok when path2 is normal', () => {
    return app.httpRequest().get('/%2E.%2E/').expect(404);
  });

  it('should ok when path3 is normal', () => {
    return app.httpRequest().get('/foo/%2E%2E/').expect(404);
  });

  it('should ok when path4 is normal', () => {
    return app.httpRequest().get('/foo/%2E%2E/foo/%2E%2E/').expect(404);
  });

  it('should ok when path5 is normal', () => {
    return app.httpRequest().get('/%252e%252e/').expect(404);
  });

  it('should not allow Directory_traversal_attack when path is invalid', () => {
    return app
      .httpRequest()
      .get(
        '/%2F.%2F.%2F.%2F.%2F.%2F.%2F.%2F.%2F.%2F.%2F.%2F.%2F.%2F.%2F.%2F.%2F.%2F.%2F.%2F.%2F.%2F.%2F.%2F.%2F.%2F.%2F.%2F.%2F.%2F.%2F.%2F.%2F.%2F.%2F.%2F.%2F.%2F.%2F.%2F.%2F.%2F.%2F.%2F.%2F.%2F.%2F.%2F.%2F.%2F.%2F.%2F.%2F.%2F.%2F.%2F.%2F.%2F.%2F.%2F.%2F.%2F.%2F.%2F.%2F.%2F.%2F.%2F.%2F.%2F.%2F.%2F.%2F.%2F.%2F.%2F.%2F.%2F.%2F.%2F.%2F.%2F.%2F.%2F.%2F.%2F.%2F.%2F.%2F.%2F.%2F.%2F.%2F.%2F.%2F.%2F.%2F.%2F.%2F.%2F.%2F.%2F.%2F.%2F.%2F.%2F.%2F.%2F.%2F.%2F.%2F.%2F.%2F.%2F.%2F.%2F.%2F.%2F.%2F.%2F.%2F.%2F.%2F.%2F.%2F.%2F.%2F.%2F.%2F.%2F.%2F.%2F.%2F.%2F.%2F.%2F.%2F.%2F.%2F.%2F.%2F.%2F.%2F.%2F.%2F.%2F.%2F.%2F.%2F.%2F.%2F..%2F..%2F..%2F..%2F..%2F..%2F..%2F..%2Fetc%2Fpasswd'
      )
      .expect(400);
  });

  it.skip('should not allow Directory_traversal_attack when path2 is invalid', () => {
    return app.httpRequest().get('/%2E%2E/').expect(400);
  });

  it.skip('should not allow Directory_traversal_attack when path3 is invalid', () => {
    return app.httpRequest().get('/foo/%2E%2E/%2E%2E/').expect(400);
  });

  it.skip('should not allow Directory_traversal_attack when path4 is invalid', () => {
    return app.httpRequest().get('/foo/%2E%2E/foo/%2E%2E/%2E%2E/').expect(400);
  });

  it('should log err under dev', async () => {
    app.mockLog();
    await app.httpRequest().get('/%2c%2f%').expect(404);
    if (process.platform === 'win32') {
      await scheduler.wait(2000);
    }
    app.expectLog('decode file path', 'coreLogger');
  });
});
