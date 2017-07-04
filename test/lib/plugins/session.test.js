'use strict';

const assert = require('assert');
const mm = require('egg-mock');
const utils = require('../../utils');

describe('test/lib/plugins/session.test.js', () => {
  let app;
  before(() => {
    app = utils.app('apps/koa-session');
    return app.ready();
  });
  after(() => app.close());
  afterEach(mm.restore);

  it('should work when userId change', done => {
    app.mockContext({
      userId: 's1',
    });
    app.httpRequest()
      .get('/?uid=1')
      .expect({
        userId: 's1',
        sessionUid: '1',
        uid: '1',
      })
      .expect(200, (err, res) => {
        if (err) return done(err);
        assert(res.headers['set-cookie']);
        const cookie = res.headers['set-cookie'].join(';');
        assert(/EGG_SESS=[\w-]+/.test(cookie));

        // userId 不变，还是读取到上次的 session 值
        app.mockContext({
          userId: 's1',
        });
        app.httpRequest()
          .get('/?uid=2&userId=s1')
          .set('Cookie', cookie)
          .expect({
            userId: 's1',
            sessionUid: '1',
            uid: '2',
          })
          .expect(200, (err, res) => {
            if (err) return done(err);
            assert(!res.headers['set-cookie']);

            // userId change, session still not change
            app.mockContext({
              userId: 's2',
            });
            app.httpRequest()
              .get('/?uid=2')
              .set('Cookie', cookie)
              .expect({
                userId: 's2',
                sessionUid: '1',
                uid: '2',
              })
              .expect(res => {
                assert(!res.headers['set-cookie']);
              })
              .expect(200, err => {
                if (err) return done(err);
                app.httpRequest()
                  .get('/clear')
                  .set('Cookie', cookie)
                  .expect('set-cookie', /EGG_SESS=;/, done);
              });
          });
      });
  });
});
