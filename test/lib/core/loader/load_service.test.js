'use strict';

const assert = require('assert');
const request = require('supertest');
const mm = require('egg-mock');
const utils = require('../../../utils');

describe('test/lib/core/loader/load_service.test.js', () => {
  let app;
  afterEach(() => app.close());
  afterEach(mm.restore);

  it('should load app and plugin services', function* () {
    app = utils.app('apps/loader-plugin');
    yield app.ready();
    assert(app.serviceClasses.foo);
    assert(app.serviceClasses.foo2);
    assert(!app.serviceClasses.bar1);
    assert(app.serviceClasses.bar2);
    assert(app.serviceClasses.foo4);

    const ctx = app.mockContext();
    assert(ctx.service.fooDir.foo5);
    assert(ctx.service.foo);
    assert(ctx.service.foo2);
    assert(ctx.service.bar2);
    assert(ctx.service.foo4);

    yield request(app.callback())
    .get('/')
    .expect({
      foo2: 'foo2',
      foo3: 'foo3',
    })
    .expect(200);
  });

  it('should service support es6', function* () {
    app = utils.app('apps/services_loader_verify');
    yield app.ready();
    assert(Object.prototype.hasOwnProperty.call(app.serviceClasses, 'foo'));
    assert(
      [ 'bar' ].every(p => Object.prototype.hasOwnProperty.call(app.serviceClasses.foo, p))
    );
  });

  it('should support extend app.Service class', function* () {
    app = utils.app('apps/service-app');
    yield app.ready();

    yield request(app.callback())
    .get('/user')
    .expect(res => {
      assert(res.body.user);
      assert(res.body.user.userId === '123mock');
    })
    .expect(200);
  });

  describe('sub dir', () => {
    let app;
    afterEach(() => app.close());
    afterEach(mm.restore);

    it('should support top 1 and 2 dirs, ignore others', function* () {
      app = utils.app('apps/subdir-services');
      yield app.ready();

      yield request(app.callback())
      .get('/')
      .expect({
        user: {
          uid: '123',
        },
        cif: {
          uid: '123cif',
          cif: true,
        },
        bar1: {
          name: 'bar1name',
          bar: 'bar1',
        },
        bar2: {
          name: 'bar2name',
          bar: 'bar2',
        },
        'foo.subdir2.sub2': {
          name: 'bar3name',
          bar: 'bar3',
        },
        subdir11bar: {
          bar: 'bar111',
        },
        ok: {
          ok: true,
        },
        cmd: {
          cmd: 'hihi',
          method: 'GET',
          url: '/',
        },
        serviceIsSame: true,
        oldStyle: '/',
      })
      .expect(200);
    });
  });
});
