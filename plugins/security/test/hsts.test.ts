import { mm, type MockApplication } from '@eggjs/mock';
import { describe, it, expect, afterAll, beforeAll } from 'vitest';

import { getFixtures } from './utils.ts';

describe('server', () => {
  let app: MockApplication;
  let app2: MockApplication;
  let app3: MockApplication;

  beforeAll(async () => {
    app = mm.app({
      baseDir: getFixtures('apps/hsts'),
    });
    await app.ready();
    app2 = mm.app({
      baseDir: getFixtures('apps/hsts-nosub'),
    });
    await app2.ready();
    app3 = mm.app({
      baseDir: getFixtures('apps/hsts-default'),
    });
    await app3.ready();
  });

  afterAll(async () => {
    await app.close();
    await app2.close();
    await app3.close();
  });

  it('should contain not Strict-Transport-Security header with default', async () => {
    const res = await app3.httpRequest().get('/').set('accept', 'text/html').expect(200);
    expect(res.headers['strict-transport-security']).toBeUndefined();
  });

  it('should contain Strict-Transport-Security header when configured', () => {
    return app2
      .httpRequest()
      .get('/')
      .set('accept', 'text/html')
      .expect('Strict-Transport-Security', 'max-age=31536000')
      .expect(200);
  });

  it('should contain includeSubdomains rule when defined', () => {
    return app
      .httpRequest()
      .get('/')
      .set('accept', 'text/html')
      .expect('Strict-Transport-Security', 'max-age=31536000; includeSubdomains')
      .expect(200);
  });

  it('should not contain includeSubdomains rule with this.securityOptions', () => {
    return app
      .httpRequest()
      .get('/nosub')
      .set('accept', 'text/html')
      .expect('Strict-Transport-Security', 'max-age=31536000')
      .expect(200);
  });
});
