import { mock, type MockApplication } from '@eggjs/mock';
import { describe, it, beforeAll, afterAll, afterEach, expect } from '@voidzero-dev/vite-plus/test';

import { getFixtures } from '../utils.ts';

// TODO: windows will return \r\n, not \n
// Node.js v20: SyntaxError: Unexpected identifier 'SingleModeApplication'
describe.skipIf(process.platform === 'win32' || process.version.startsWith('v20.'))('test/view/view.test.ts', () => {
  let app: MockApplication;

  beforeAll(async () => {
    app = mock.app({
      baseDir: getFixtures('example'),
      framework: getFixtures('framework'),
    });
    await app.ready();
  });

  afterAll(() => app.close());
  afterEach(() => mock.restore());

  it('should enable', () => {
    return app.httpRequest().get('/').expect(200);
  });

  it('should render string', () => {
    return app
      .httpRequest()
      .get('/string')
      .expect(200)
      .expect(/hi, egg/);
  });

  it('should render string with options path', () => {
    return app
      .httpRequest()
      .get('/string_options')
      .expect(200)
      .expect(/<div>egg<div>/);
  });

  it('should render template', () => {
    return app
      .httpRequest()
      .get('/')
      .expect(200)
      .expect(/hi, egg/);
  });

  it('should render template not found', () => {
    return app
      .httpRequest()
      .get('/not_found')
      .expect(500)
      .expect(/Can't find not_found.tpl from /);
  });

  it('should render error', () => {
    return app
      .httpRequest()
      .get('/error_string')
      .expect(500)
      .expect(/Template render error/i);
  });

  it('should inject helper/ctx/request', () => {
    return app
      .httpRequest()
      .get('/inject')
      .expect(200)
      .expect(/ctx: true/)
      .expect(/request: true/)
      .expect(/helper: true/)
      .expect(/helperFn: true/);
  });

  it('should load filter.js', async () => {
    const res = await app.httpRequest().get('/filter');
    expect(res.text).toMatch(/hi, egg/);
    expect(res.status).toBe(200);
  });

  it('should load filter.js with include', () => {
    return app
      .httpRequest()
      .get('/filter/include')
      .expect(200)
      .expect(/hi, egg/)
      .expect(/hi, yadan/);
  });

  it('should extend locals', () => {
    return app
      .httpRequest()
      .get('/locals')
      .expect(200)
      .expect(/app, ctx, locals/);
  });

  describe('multi-dir', () => {
    let app: MockApplication;

    beforeAll(async () => {
      app = mock.app({
        baseDir: getFixtures('multi-dir'),
        framework: getFixtures('framework'),
      });
      await app.ready();
    });

    afterAll(() => app.close());

    it('should support multi-dir config', () => {
      return app.httpRequest().get('/view').expect(200, 'hi, egg');
    });

    it('should support multi-dir config for ext', () => {
      return app.httpRequest().get('/ext').expect(200, 'hi, ext egg');
    });

    it('should include', () => {
      return app.httpRequest().get('/include').expect(200, 'include hi, ext egg\n');
    });

    it('should include relative', () => {
      return app.httpRequest().get('/relative').expect(200, 'hello egg\n');
    });

    it('should import', () => {
      return app.httpRequest().get('/import').expect(200, '<div>\n  <label>egg</label>\n</div>\n');
    });
  });
});
