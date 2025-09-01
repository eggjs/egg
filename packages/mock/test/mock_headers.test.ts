import { strict as assert } from 'node:assert';
import { request } from '@eggjs/supertest';
import mm, { MockApplication } from '../src/index.js';
import { getFixtures } from './helper.js';

describe('test/mock_headers.test.ts', () => {
  let app: MockApplication;
  before(() => {
    app = mm.app({
      baseDir: getFixtures('demo'),
    });
    return app.ready();
  });
  after(() => app.close());
  afterEach(mm.restore);

  it('should not exists without mock', done => {
    app.mockContext();

    request(app.callback())
      .get('/header')
      .expect(function(res) {
        assert(res.body.header === '');
      })
      .expect(200, done);
  });

  it('should mock headers', done => {
    app.mockContext();
    app.mockHeaders({
      customheader: 'customheader',
    });
    request(app.callback())
      .get('/header')
      .expect(function(res) {
        assert(res.body.header === 'customheader');
      })
      .expect(200, done);
  });

  it('should mock headers that is uppercase', done => {
    app.mockContext();
    app.mockHeaders({
      Customheader: 'customheader',
    });
    request(app.callback())
      .get('/header')
      .expect(function(res) {
        assert(res.body.header === 'customheader');
      })
      .expect(200, done);
  });
});
