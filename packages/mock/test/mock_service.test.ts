import { strict as assert } from 'node:assert';
import mm, { MockApplication } from '../src/index.js';
import { getFixtures } from './helper.js';

describe('test/mock_service.test.ts', () => {
  let app: MockApplication;
  before(async () => {
    app = mm.app({
      baseDir: getFixtures('demo'),
    });
    await app.ready();
  });
  after(() => app.close());
  afterEach(mm.restore);

  it('should return from service', () => {
    return app.httpRequest()
      .get('/service')
      .expect({
        foo1: 'bar',
        foo2: 'bar',
        foo3: 'bar',
        thirdService: 'third',
      });
  });

  it('should return from service when mock with data', () => {
    app.mockService('foo', 'get', 'foo');
    app.mockService('foo', 'getSync', 'foo');
    app.mockService('bar.foo', 'get', 'foo');
    return app.httpRequest()
      .get('/service')
      .expect({
        foo1: 'foo',
        foo2: 'foo',
        foo3: 'foo',
        thirdService: 'third',
      });
  });

  it('mock repeat success', () => {
    app.mockService('foo', 'get', 'foo');
    app.mockService('foo', 'get', 'foo');
    app.mockService('foo', 'getSync', 'foo');
    app.mockService('foo', 'getSync', 'foo');
    app.mockService('bar.foo', 'get', 'foo');
    app.mockService('bar.foo', 'get', 'foo');
    return app.httpRequest()
      .get('/service')
      .expect({
        foo1: 'foo',
        foo2: 'foo',
        foo3: 'foo',
        thirdService: 'third',
      });
  });

  it.skip('mock error success', async () => {
    app.mockService('foo', 'get', new Error('async error'));
    try {
      const ctx = app.mockContext();
      await ctx.service.foo.get();
      throw new Error('should not execute');
    } catch (err: any) {
      assert(err.message === 'async error');
    }
  });

  it.skip('mock sync error success', async () => {
    app.mockService('foo', 'getSync', new Error('sync error'));
    try {
      const ctx = app.mockContext();
      await ctx.service.foo.getSync();
      throw new Error('should not execute');
    } catch (err: any) {
      assert(err.message === 'sync error');
    }
  });

  it('should return from service when mock with normal function', () => {
    app.mockService('foo', 'get', () => 'foo');
    app.mockService('foo', 'getSync', () => 'foo');
    app.mockService('bar.foo', 'get', () => 'foo');
    return app.httpRequest()
      .get('/service')
      .expect({
        foo1: 'foo',
        foo2: 'foo',
        foo3: 'foo',
        thirdService: 'third',
      });
  });

  it('should support old service format', () => {
    app.mockService('old', 'test', 'test');
    return app.httpRequest()
      .get('/service/old')
      .expect('test');
  });

  it('should throw', () => {
    assert.throws(() => {
      app.mockService('foo', 'not_exist', 'foo');
    }, /property not_exist in original object must be function/);
  });

  it('should return from service when mock with generator', () => {
    app.mockService('foo', 'get', async () => {
      return 'foo';
    });
    return app.httpRequest()
      .get('/service')
      .expect({
        foo1: 'foo',
        foo2: 'bar',
        foo3: 'bar',
        thirdService: 'third',
      });
  });

  it('should return from service when mock with 3 level', () => {
    app.mockService('foo', 'get', '1 level service');
    app.mockService('bar.foo', 'get', '2 level service');
    app.mockService('third.bar.foo', 'get', '3 level service');
    return app.httpRequest()
      .get('/service')
      .expect({
        foo1: '1 level service',
        foo2: '2 level service',
        foo3: 'bar',
        thirdService: '3 level service',
      });
  });

  it('should return from service when mock with error', () => {
    app.mockService('foo', 'get', async () => {
      throw new Error('mock service foo.get error');
    });
    return app.httpRequest()
      .get('/service')
      .expect(/mock service foo\.get error/)
      .expect(500);
  });

  describe('app.mockServiceError()', () => {
    it('should default mock error', () => {
      app.mockServiceError('foo', 'get');
      return app.httpRequest()
        .get('/service')
        .expect(/mock get error/)
        .expect(500);
    });

    it('should create custom mock error with string', () => {
      app.mockServiceError('foo', 'get', 'mock service foo.get error1');
      return app.httpRequest()
        .get('/service')
        .expect(/mock service foo\.get error1/)
        .expect(500);
    });

    it('should return custom mock error', () => {
      app.mockServiceError('foo', 'get', new Error('mock service foo.get error2'));
      return app.httpRequest()
        .get('/service')
        .expect(/mock service foo\.get error2/)
        .expect(500);
    });
  });
});
