import { mm, type MockApplication } from '@eggjs/mock';
import { describe, it, afterAll, beforeAll, expect } from 'vitest';

import { getFixtures } from './utils.ts';

describe('test/security.test.ts', () => {
  let app: MockApplication;
  let app2: MockApplication;
  let app3: MockApplication;
  let app4: MockApplication;
  beforeAll(async () => {
    app = mm.app({
      baseDir: getFixtures('apps/security'),
    });
    await app.ready();
    app2 = mm.app({
      baseDir: getFixtures('apps/security-unset'),
    });
    await app2.ready();
    app3 = mm.app({
      baseDir: getFixtures('apps/security-override-controller'),
    });
    await app3.ready();
    app4 = mm.app({
      baseDir: getFixtures('apps/security-override-middleware'),
    });
    await app4.ready();
  });

  afterAll(async () => {
    await app.close();
    await app2.close();
    await app3.close();
    await app4.close();
  });

  it('should load default security headers', () => {
    return app
      .httpRequest()
      .get('/')
      .set('accept', 'text/html')
      .expect('X-Download-Options', 'noopen')
      .expect('X-Content-Type-Options', 'nosniff')
      .expect('X-XSS-Protection', '1; mode=block')
      .expect(200);
  });

  it('should load default security headers when developer try to override in controller', () => {
    return app3
      .httpRequest()
      .get('/')
      .set('accept', 'text/html')
      .expect('Strict-Transport-Security', 'max-age=31536000')
      .expect('X-Download-Options', 'noopen')
      .expect('X-Content-Type-Options', 'nosniff')
      .expect('X-XSS-Protection', '1; mode=block')
      .expect(200);
  });

  it('should load default security headers when developer try to override in middleware', async () => {
    const res = await app4
      .httpRequest()
      .get('/')
      .set('accept', 'text/html')
      .expect('Strict-Transport-Security', 'max-age=31536000')
      .expect('X-Download-Options', 'noopen')
      .expect('X-Content-Type-Options', 'nosniff')
      .expect('X-XSS-Protection', '1; mode=block')
      .expect(200);
    expect(res.status).toBe(200);
  });

  it('disable hsts for default', async () => {
    const res = await app2.httpRequest().get('/').set('accept', 'text/html');
    expect(res.headers['strict-transport-security']).toBeUndefined();
  });

  it('should not load security headers when set to enable:false', async () => {
    const res = await app2.httpRequest().get('/').set('accept', 'text/html');
    expect(res.headers['X-Frame-Options']).toBeUndefined();
  });
});
