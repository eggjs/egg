import { strict as assert } from 'node:assert';

import { describe, it, beforeAll, afterAll, afterEach } from 'vitest';

import mm, { type MockApplication } from '../src/index.ts';
import { getFixtures } from './helper.ts';

describe('test/mock_service.test.ts', () => {
  let app: MockApplication;
  beforeAll(async () => {
    app = mm.app({
      baseDir: getFixtures('demo'),
    });
    await app.ready();
  });
  afterAll(() => app.close());
  afterEach(mm.restore);

  it('should return from service', async () => {
    await app.httpRequest().get('/service').expect({
      foo1: 'bar',
      foo2: 'bar',
      foo3: 'bar',
      thirdService: 'third',
    });
  });

  it('should return from service when mock with data', async () => {
    app.mockService('foo', 'get', 'foo');
    app.mockService('foo', 'getSync', 'foo');
    app.mockService('bar.foo', 'get', 'foo');
    await app.httpRequest().get('/service').expect({
      foo1: 'foo',
      foo2: 'foo',
      foo3: 'foo',
      thirdService: 'third',
    });
  });

  it('mock repeat success', async () => {
    app.mockService('foo', 'get', 'foo');
    app.mockService('foo', 'get', 'foo');
    app.mockService('foo', 'getSync', 'foo');
    app.mockService('foo', 'getSync', 'foo');
    app.mockService('bar.foo', 'get', 'foo');
    app.mockService('bar.foo', 'get', 'foo');
    await app.httpRequest().get('/service').expect({
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

  it('should return from service when mock with normal function', async () => {
    app.mockService('foo', 'get', () => 'foo');
    app.mockService('foo', 'getSync', () => 'foo');
    app.mockService('bar.foo', 'get', () => 'foo');
    await app.httpRequest().get('/service').expect({
      foo1: 'foo',
      foo2: 'foo',
      foo3: 'foo',
      thirdService: 'third',
    });
  });

  it('should support old service format', async () => {
    app.mockService('old', 'test', 'test');
    await app.httpRequest().get('/service/old').expect('test');
  });

  it('should throw', () => {
    assert.throws(() => {
      app.mockService('foo', 'not_exist', 'foo');
    }, /property not_exist in original object must be function/);
  });

  it('should return from service when mock with generator', async () => {
    app.mockService('foo', 'get', async () => {
      return 'foo';
    });
    await app.httpRequest().get('/service').expect({
      foo1: 'foo',
      foo2: 'bar',
      foo3: 'bar',
      thirdService: 'third',
    });
  });

  it('should return from service when mock with 3 level', async () => {
    app.mockService('foo', 'get', '1 level service');
    app.mockService('bar.foo', 'get', '2 level service');
    app.mockService('third.bar.foo', 'get', '3 level service');
    await app.httpRequest().get('/service').expect({
      foo1: '1 level service',
      foo2: '2 level service',
      foo3: 'bar',
      thirdService: '3 level service',
    });
  });

  it('should return from service when mock with error', async () => {
    app.mockService('foo', 'get', async () => {
      throw new Error('mock service foo.get error');
    });
    await app
      .httpRequest()
      .get('/service')
      .expect(/mock service foo\.get error/)
      .expect(500);
  });

  describe('app.mockServiceError()', () => {
    it('should default mock error', async () => {
      app.mockServiceError('foo', 'get');
      await app
        .httpRequest()
        .get('/service')
        .expect(/mock get error/)
        .expect(500);
    });

    it('should create custom mock error with string', async () => {
      app.mockServiceError('foo', 'get', 'mock service foo.get error1');
      await app
        .httpRequest()
        .get('/service')
        .expect(/mock service foo\.get error1/)
        .expect(500);
    });

    it('should return custom mock error', async () => {
      app.mockServiceError('foo', 'get', new Error('mock service foo.get error2'));
      await app
        .httpRequest()
        .get('/service')
        .expect(/mock service foo\.get error2/)
        .expect(500);
    });
  });
});
