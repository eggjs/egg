import { strict as assert } from 'node:assert';
import mm, { MockApplication } from '../src/index.js';
import { getFixtures } from './helper.js';

describe('test/mock_service_async.test.ts', () => {
  let app: MockApplication;
  before(async () => {
    app = mm.app({
      baseDir: getFixtures('demo-async'),
    });
    await app.ready();
  });
  after(() => app.close());
  afterEach(mm.restore);

  it('should return from service', done => {
    app.httpRequest()
      .get('/service')
      .expect({
        foo1: 'bar',
        foo2: 'bar',
        foo3: 'bar',
        thirdService: 'third',
      }, done);
  });

  it('should return from service when mock with data', done => {
    app.mockService('foo', 'get', 'foo');
    app.mockService('foo', 'getSync', 'foo');
    app.mockService('bar.foo', 'get', 'foo');
    app.httpRequest()
      .get('/service')
      .expect({
        foo1: 'foo',
        foo2: 'foo',
        foo3: 'foo',
        thirdService: 'third',
      }, done);
  });

  it('should return from service when mock with normal function', done => {
    app.mockService('foo', 'get', () => 'foo');
    app.mockService('foo', 'getSync', () => 'foo');
    app.mockService('bar.foo', 'get', () => 'foo');
    app.httpRequest()
      .get('/service')
      .expect({
        foo1: 'foo',
        foo2: 'foo',
        foo3: 'foo',
        thirdService: 'third',
      }, done);
  });

  it('should throw', () => {
    assert.throws(() => {
      app.mockService('foo', 'not_exist', 'foo');
    }, /property not_exist in original object must be function/);
  });

  it('should return from service when mock with generator', done => {
    app.mockService('foo', 'get', async () => {
      return 'foo';
    });
    app.httpRequest()
      .get('/service')
      .expect({
        foo1: 'foo',
        foo2: 'bar',
        foo3: 'bar',
        thirdService: 'third',
      }, done);
  });

  it('should return from service when mock with 3 level', done => {
    app.mockService('foo', 'get', '1 level service');
    app.mockService('bar.foo', 'get', '2 level service');
    app.mockService('third.bar.foo', 'get', '3 level service');
    app.httpRequest()
      .get('/service')
      .expect({
        foo1: '1 level service',
        foo2: '2 level service',
        foo3: 'bar',
        thirdService: '3 level service',
      }, done);
  });

  it('should return from service when mock with error', done => {
    app.mockService('foo', 'get', async () => {
      throw new Error('mock service foo.get error');
    });
    app.httpRequest()
      .get('/service')
      .expect(/mock service foo\.get error/)
      .expect(500, done);
  });

  describe('app.mockServiceError()', () => {
    it('should default mock error', done => {
      app.mockServiceError('foo', 'get');
      app.httpRequest()
        .get('/service')
        .expect(/mock get error/)
        .expect(500, done);
    });

    it('should create custom mock error with string', done => {
      app.mockServiceError('foo', 'get', 'mock service foo.get error1');
      app.httpRequest()
        .get('/service')
        .expect(/mock service foo\.get error1/)
        .expect(500, done);
    });

    it('should return custom mock error', done => {
      app.mockServiceError('foo', 'get', new Error('mock service foo.get error2'));
      app.httpRequest()
        .get('/service')
        .expect(/mock service foo\.get error2/)
        .expect(500, done);
    });
  });
});
