import { mm, type MockApplication } from '@eggjs/mock';
import { describe, it, afterEach, beforeAll, afterAll, expect } from '@voidzero-dev/vite-plus/test';

import { getFixtures } from '../utils.ts';

describe('plugin/controller/test/http/host.test.ts', () => {
  let app: MockApplication;

  afterEach(() => {
    return mm.restore();
  });

  beforeAll(async () => {
    app = mm.app({
      baseDir: getFixtures('apps/host-controller-app'),
    });
    await app.ready();
  });

  afterAll(() => {
    return app.close();
  });

  it('global host should work', async () => {
    app.mockCsrf();
    await app
      .httpRequest()
      .get('/apps/1')
      .set('host', 'foo.eggjs.com')
      .expect(200)
      .expect((res) => {
        console.log('res: ', res.text, res.body);
        expect(res.text).toBe('foo');
      });
  });

  it('method host should work', async () => {
    app.mockCsrf();
    await app
      .httpRequest()
      .get('/apps/2')
      .set('host', 'bar.eggjs.com')
      .expect(200)
      .expect((res) => {
        expect(res.text).toBe('bar');
      });
  });

  it('multi class host should work', async () => {
    app.mockCsrf();
    await app.httpRequest().get('/apps/apple').set('host', 'orange.eggjs.com').expect(404);

    await app
      .httpRequest()
      .get('/apps/apple')
      .set('host', 'apple.eggjs.com')
      .expect(200)
      .expect((res) => {
        expect(res.text).toBe('apple');
      });

    await app
      .httpRequest()
      .get('/apps/a')
      .set('host', 'a.eggjs.com')
      .expect(200)
      .expect((res) => {
        expect(res.text).toBe('a');
      });
  });

  it('method class host should work', async () => {
    app.mockCsrf();
    await app
      .httpRequest()
      .get('/apps/orange')
      .set('host', 'o.eggjs.com')
      .expect(200)
      .expect((res) => {
        expect(res.text).toBe('orange');
      });

    await app
      .httpRequest()
      .get('/apps/orange')
      .set('host', 'orange.eggjs.com')
      .expect(200)
      .expect((res) => {
        expect(res.text).toBe('orange');
      });

    await app
      .httpRequest()
      .get('/apps/juice')
      .set('host', 'juice.eggjs.com')
      .expect(200)
      .expect((res) => {
        expect(res.text).toBe('juice');
      });

    await app.httpRequest().get('/apps/juice').set('host', 'o.eggjs.com').expect(404);
  });
});
