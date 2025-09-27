import { mm, type MockApplication } from '@eggjs/mock';
import { describe, it, beforeAll, afterAll, expect } from 'vitest';

import { getFixtures } from './utils.ts';

describe('test/xframe.test.ts', () => {
  let app: MockApplication;
  let app2: MockApplication;
  let app3: MockApplication;
  let app4: MockApplication;

  beforeAll(async () => {
    app = mm.app({
      baseDir: getFixtures('apps/iframe'),
    });
    await app.ready();

    app2 = mm.app({
      baseDir: getFixtures('apps/iframe-novalue'),
    });
    await app2.ready();

    app3 = mm.app({
      baseDir: getFixtures('apps/iframe-allowfrom'),
    });
    await app3.ready();

    app4 = mm.app({
      baseDir: getFixtures('apps/iframe-black-urls'),
    });
    await app4.ready();
  });

  afterAll(async () => {
    await app.close();
    await app2.close();
    await app3.close();
    await app4.close();
  });

  it('should contain X-Frame-Options: SAMEORIGIN', async () => {
    await app.httpRequest().get('/').set('accept', 'text/html').expect('X-Frame-Options', 'SAMEORIGIN');

    await app.httpRequest().get('/foo').set('accept', 'text/html').expect('X-Frame-Options', 'SAMEORIGIN');
  });

  it('should contain X-Frame-Options: ALLOW-FROM http://www.domain.com by this.securityOptions', async () => {
    const res = await app.httpRequest().get('/options').set('accept', 'text/html').expect(200);
    expect(res.headers['x-frame-options']).toBe('ALLOW-FROM http://www.domain.com');
  });

  it('should contain X-Frame-Options: SAMEORIGIN when dont set value option', async () => {
    await app2.httpRequest().get('/foo').set('accept', 'text/html').expect('X-Frame-Options', 'SAMEORIGIN');
  });

  it('should contain X-Frame-Options: ALLOW-FROM with page when set ALLOW-FROM and page option', async () => {
    await app3
      .httpRequest()
      .get('/foo')
      .set('accept', 'text/html')
      .expect('X-Frame-Options', 'ALLOW-FROM http://www.domain.com');
  });

  it('should not contain X-Frame-Options: SAMEORIGIN when use ignore', async () => {
    let res = await app.httpRequest().get('/hello').set('accept', 'text/html').expect(200);
    expect(res.headers['X-Frame-Options']).toBeUndefined();

    res = await app4.httpRequest().get('/hello').set('accept', 'text/html').expect(200);
    expect(res.headers['X-Frame-Options']).toBeUndefined();

    res = await app.httpRequest().get('/world/12').set('accept', 'text/html').expect(200);
    expect(res.headers['X-Frame-Options']).toBeUndefined();

    res = await app.httpRequest().get('/world/12?xx=xx').set('accept', 'text/html').expect(200);
    expect(res.headers['X-Frame-Options']).toBeUndefined();

    res = await app2.httpRequest().get('/hello').set('accept', 'text/html').expect(200);
    expect(res.headers['X-Frame-Options']).toBeUndefined();

    res = await app2.httpRequest().get('/world/12').set('accept', 'text/html').expect(200);
    expect(res.headers['X-Frame-Options']).toBeUndefined();

    res = await app2.httpRequest().get('/world/12?xx=xx').set('accept', 'text/html').expect(200);
    expect(res.headers['X-Frame-Options']).toBeUndefined();
  });
});
