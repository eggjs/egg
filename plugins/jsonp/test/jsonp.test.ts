import { strict as assert } from 'node:assert';
import path from 'node:path';

import { describe, it, beforeAll, afterAll, afterEach } from 'vitest';

import { mm, type MockApplication } from '@eggjs/mock';

describe('test/jsonp.test.ts', () => {
  let app: MockApplication;
  beforeAll(() => {
    app = mm.app({
      baseDir: path.join(import.meta.dirname, 'fixtures', 'jsonp-test'),
    });
    return app.ready();
  });

  afterAll(() => app.close());
  afterEach(() => mm.restore());

  it('should access acceptJSONP return false by default', () => {
    assert.equal(app.mockContext().acceptJSONP, false);
  });

  it('should support json', async () => {
    await app.httpRequest().get('/default').expect(200).expect({ foo: 'bar' });
  });

  it('should support jsonp', async () => {
    await app
      .httpRequest()
      .get('/default?callback=fn')
      .expect(200)
      .expect('/**/ typeof fn === \'function\' && fn({"foo":"bar"});');
  });

  it('should support _callback', async () => {
    await app
      .httpRequest()
      .get('/default?_callback=fn')
      .expect(200)
      .expect('/**/ typeof fn === \'function\' && fn({"foo":"bar"});');
  });

  it('should support jsonp if response is empty', async () => {
    await app.httpRequest().get('/empty?callback=fn').expect(200).expect("/**/ typeof fn === 'function' && fn(null);");
  });

  it('should not support jsonp if not use jsonp middleware', async () => {
    await app.httpRequest().get('/disable?_callback=fn').expect(200).expect({ foo: 'bar' });
  });

  it('should not support custom callback name', async () => {
    await app
      .httpRequest()
      .get('/fn?fn=fn')
      .expect(200)
      .expect('/**/ typeof fn === \'function\' && fn({"foo":"bar"});');
  });

  it('should not pass csrf', async () => {
    await app.httpRequest().get('/csrf').expect(403);
  });

  it('should pass csrf with cookie', async () => {
    await app
      .httpRequest()
      .get('/csrf')
      .set('cookie', 'csrfToken=token;')
      .set('x-csrf-token', 'token')
      .expect(200)
      .expect({ foo: 'bar' });
  });

  it('should pass csrf with cookie and support jsonp', async () => {
    await app
      .httpRequest()
      .get('/csrf')
      .set('cookie', 'csrfToken=token;')
      .set('x-csrf-token', 'token')
      .expect(200)
      .expect({ foo: 'bar' });
  });

  it('should pass referrer white list check with subdomain', async () => {
    await app
      .httpRequest()
      .get('/referrer/subdomain')
      .set('referrer', 'http://test.com/')
      .expect(200)
      .expect({ foo: 'bar' });

    await app
      .httpRequest()
      .get('/referrer/subdomain')
      .set('referrer', 'http://sub.test.com/')
      .expect(200)
      .expect({ foo: 'bar' });

    await app
      .httpRequest()
      .get('/referrer/subdomain')
      .set('referrer', 'https://sub.sub.test.com/')
      .expect(200)
      .expect({ foo: 'bar' });

    await app
      .httpRequest()
      .get('/referrer/subdomain')
      .set('referrer', 'https://sub.sub.test1.com/')
      .expect(403)
      .expect(/jsonp request security validate failed/);
  });

  it('should pass referrer white list with domain', async () => {
    await app
      .httpRequest()
      .get('/referrer/equal')
      .set('referrer', 'http://test.com/')
      .expect(200)
      .expect({ foo: 'bar' });

    await app
      .httpRequest()
      .get('/referrer/equal')
      .set('referrer', 'https://test.com/')
      .expect(200)
      .expect({ foo: 'bar' });

    await app
      .httpRequest()
      .get('/referrer/equal')
      .set('referrer', 'https://sub.sub.test.com/')
      .expect(403)
      .expect(/jsonp request security validate failed/);

    await app
      .httpRequest()
      .get('/referrer/equal')
      .set('referrer', 'https://sub.sub.test1.com/')
      .expect(403)
      .expect(/jsonp request security validate failed/);
  });

  it('should pass referrer white array and regexp', async () => {
    await app
      .httpRequest()
      .get('/referrer/regexp')
      .set('referrer', 'http://test.com/')
      .expect(200)
      .expect({ foo: 'bar' });

    await app
      .httpRequest()
      .get('/referrer/regexp')
      .set('referrer', 'https://foo.com/')
      .expect(200)
      .expect({ foo: 'bar' });

    await app
      .httpRequest()
      .get('/referrer/regexp')
      .set('referrer', 'https://sub.sub.test.com/')
      .expect(403)
      .expect(/jsonp request security validate failed/);

    await app
      .httpRequest()
      .get('/referrer/regexp')
      .set('referrer', 'https://sub.sub.test1.com/')
      .expect(403)
      .expect(/jsonp request security validate failed/);
  });

  it('should pass when pass csrf but not hit referrer white list', async () => {
    await app
      .httpRequest()
      .get('/both')
      .set('cookie', 'csrfToken=token;')
      .set('x-csrf-token', 'token')
      .expect(200)
      .expect({ foo: 'bar' });
  });

  it('should pass when not pass csrf but hit referrer white list', async () => {
    await app.httpRequest().get('/both').set('referrer', 'https://test.com/').expect(200).expect({ foo: 'bar' });
  });

  it('should 403 when not pass csrf and not hit referrer white list', async () => {
    await app
      .httpRequest()
      .get('/both')
      .expect(403)
      .expect(/jsonp request security validate failed/);
  });

  it('should 403 when not pass csrf and referrer illegal', async () => {
    await app
      .httpRequest()
      .get('/both')
      .set('referrer', '/hello')
      .expect(403)
      .expect(/jsonp request security validate failed/);
  });

  it('should pass and return is a jsonp function', async () => {
    await app
      .httpRequest()
      .get('/mark?_callback=fn')
      .expect(200)
      .expect('/**/ typeof fn === \'function\' && fn({"jsonpFunction":true});');
  });

  it('should pass and return is not a jsonp function', async () => {
    await app.httpRequest().get('/mark').expect(200).expect({ jsonpFunction: false });
  });

  it('should pass and return error message', async () => {
    await app
      .httpRequest()
      .get('/error?_callback=fn')
      .expect(200)
      .expect('/**/ typeof fn === \'function\' && fn({"msg":"jsonpFunction is error"});');
  });
});
