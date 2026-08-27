import { strict as assert } from 'node:assert';
import path from 'node:path';

import { mm, type MockApplication } from '@eggjs/mock';
import type { Application } from 'egg';
import { afterAll, afterEach, beforeAll, describe, it } from 'vitest';

import AppBoot from '../src/app.ts';

function createApp(name: string): MockApplication {
  return mm.app({
    baseDir: path.join(import.meta.dirname, 'fixtures', 'apps', name),
  });
}

describe('@eggjs/cors', () => {
  let app: MockApplication;

  beforeAll(async () => {
    app = createApp('cors');
    await app.ready();
  });
  afterAll(() => app.close());
  afterEach(() => mm.restore());

  it('does not set an origin header when the request has no origin', async () => {
    await app
      .httpRequest()
      .get('/')
      .expect({ foo: 'bar' })
      .expect((res) => assert.equal(res.headers['access-control-allow-origin'], undefined))
      .expect(200);
  });

  it('allows origins in the security domain whitelist', async () => {
    await app
      .httpRequest()
      .get('/')
      .set('Origin', 'http://test.eggjs.org')
      .expect('Access-Control-Allow-Origin', 'http://test.eggjs.org')
      .expect('Access-Control-Allow-Credentials', 'true')
      .expect(200);

    await app
      .httpRequest()
      .get('/')
      .set('Origin', 'https://b.com:1234')
      .expect('Access-Control-Allow-Origin', 'https://b.com:1234')
      .expect(200);
  });

  it('rejects origins outside the security domain whitelist', async () => {
    await app
      .httpRequest()
      .get('/')
      .set('Origin', 'http://eggjs.org!.evil.com')
      .expect((res) => {
        assert.equal(res.headers['access-control-allow-origin'], undefined);
        assert.equal(res.headers['access-control-allow-credentials'], undefined);
      })
      .expect(200);
  });
});

describe('@eggjs/cors middleware registration', () => {
  it('moves an existing cors middleware to the front without duplicating it', () => {
    const coreMiddleware = ['bodyParser', 'cors', 'overrideMethod', 'cors'];
    const app = {
      config: {
        coreMiddleware,
        cors: {},
      },
    } as unknown as Application;

    new AppBoot(app).configWillLoad();

    assert.deepEqual(coreMiddleware, ['cors', 'bodyParser', 'overrideMethod']);
  });
});

describe('@eggjs/cors with a string origin', () => {
  let app: MockApplication;

  beforeAll(async () => {
    app = createApp('cors-origin');
    await app.ready();
  });
  afterAll(() => app.close());
  afterEach(() => mm.restore());

  it('uses the configured origin instead of the whitelist', async () => {
    await app
      .httpRequest()
      .get('/')
      .set('Origin', 'http://not-in-the-whitelist.example')
      .expect('Access-Control-Allow-Origin', 'eggjs.org')
      .expect('Access-Control-Allow-Credentials', 'true')
      .expect(200);
  });
});

describe('@eggjs/cors with an origin function', () => {
  let app: MockApplication;

  beforeAll(async () => {
    app = createApp('cors-origin-function');
    await app.ready();
  });
  afterAll(() => app.close());
  afterEach(() => mm.restore());

  it('marks and invokes the custom origin handler', async () => {
    await app.httpRequest().get('/config').expect({ hasCustomOriginHandler: true }).expect(200);
    await app
      .httpRequest()
      .get('/')
      .set('Origin', 'http://example.com')
      .expect('Access-Control-Allow-Origin', 'eggjs.org')
      .expect(200);
  });
});

describe('@eggjs/cors private network access', () => {
  let app: MockApplication;

  beforeAll(async () => {
    app = createApp('cors-private-network');
    await app.ready();
  });
  afterAll(() => app.close());
  afterEach(() => mm.restore());

  it('sets the private network header on a preflight request', async () => {
    await app
      .httpRequest()
      .options('/')
      .set('Origin', 'https://eggjs.org')
      .set('Access-Control-Request-Method', 'POST')
      .set('Access-Control-Request-Private-Network', 'true')
      .expect('Access-Control-Allow-Origin', 'https://eggjs.org')
      .expect('Access-Control-Allow-Private-Network', 'true')
      .expect(204);
  });
});
