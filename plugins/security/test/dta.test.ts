import { scheduler } from 'node:timers/promises';
import { mm, type MockApplication } from '@eggjs/mock';
import { describe, it, expect, afterAll, beforeAll } from 'vitest';

import { getFixtures } from './utils.ts';

describe('test/dta.test.ts', () => {
  let app: MockApplication;
  beforeAll(async () => {
    app = mm.app({
      baseDir: getFixtures('apps/dta'),
    });
    await app.ready();
  });

  afterAll(() => app.close());

  it('should ok when path is normal', () => {
    expect(app.config.security).toMatchSnapshot();
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
