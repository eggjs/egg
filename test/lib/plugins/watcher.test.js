'use strict';

require('should');
const mm = require('egg-mock');
const fs = require('fs');
const request = require('supertest');
const utils = require('../../utils');
const file_path1 = utils.getFilepath('apps/watcher-development-app/tmp.txt');
const file_path2 = utils.getFilepath('apps/watcher-development-app/tmp/tmp.txt');
const file_path1_agent = utils.getFilepath('apps/watcher-development-app/tmp-agent.txt');

describe('test/lib/plugins/watcher.test.js', () => {
  describe('default', () => {
    let app;
    beforeEach(() => {
      app = utils.cluster('apps/watcher-development-app');
      return app.ready();
    });

    afterEach(() => {
      app.close();
      mm.restore();
    });

    it('should app watcher work', done => {
      const server = app.callback();
      let count = 0;
      request(server)
        .get('/app-watch')
        .expect(200)
        .expect('app watch success')
        .end(function(err) {
          if (err) {
            return done(err);
          }
          fs.writeFileSync(file_path1, 'aaa');
          setTimeout(function() {
            request(server)
              .get('/app-msg')
              .expect(200)
              .expect(function(res) {
                const lastCount = count;
                count = parseInt(res.text);
                count.should.greaterThan(lastCount);
              })
              .end(function(err) {
                if (err) {
                  return done(err);
                }
                fs.writeFileSync(file_path2, 'aaa');
                setTimeout(function() {
                  request(server)
                    .get('/app-msg')
                    .expect(200)
                    .expect(function(res) {
                      const lastCount = count;
                      count = parseInt(res.text);
                      count.should.greaterThan(lastCount);
                    })
                    .end(function(err) {
                      if (err) {
                        return done(err);
                      }
                      request(server)
                        .get('/app-unwatch')
                        .expect(200)
                        .expect('app unwatch success')
                        .end(function(err) {
                          if (err) return done(err);
                          setTimeout(() => {
                            fs.writeFileSync(file_path2, 'aaa');
                            fs.writeFileSync(file_path1, 'aaa');
                            setTimeout(function() {
                              request(server)
                                .get('/app-msg')
                                .expect(200)
                                .expect(function(res) {
                                  const lastCount = count;
                                  count = parseInt(res.text);
                                  count.should.equal(lastCount);
                                }) // unchanged
                                .end(done);
                            }, 100);
                          }, 100);
                        });

                    });
                }, 100);
              });
          }, 100);
        });
    });

    it('should agent watcher work', done => {
      let count = 0;
      request(app.callback())
        .get('/agent-watch')
        .expect(200)
        .expect('agent watch success')
        .end(err => {
          if (err) {
            return done(err);
          }
          fs.writeFileSync(file_path1_agent, 'bbb');
          setTimeout(() => {
            request(app.callback())
              .get('/agent-msg')
              .expect(200)
              .expect(res => {
                const lastCount = count;
                count = parseInt(res.text);
                count.should.greaterThan(lastCount);
              })
              .end(err => {
                if (err) {
                  return done(err);
                }
                request(app.callback())
                  .get('/agent-unwatch')
                  .expect(200)
                  .expect('agent unwatch success')
                  .end(err => {
                    if (err) {
                      return done(err);
                    }

                    setTimeout(() => {
                      fs.writeFileSync(file_path1_agent, 'bbb');
                      setTimeout(() => {
                        request(app.callback())
                          .get('/agent-msg')
                          .expect(200)
                          .expect(res => {
                            const lastCount = count;
                            count = parseInt(res.text);
                            count.should.equal(lastCount);
                          })
                          .end(done);
                      }, 100);
                    }, 100);
                  });
              });
          }, 100);
        });
    });

  });

  describe('config.watcher.type is default', () => {
    let app;
    before(() => {
      app = utils.cluster('apps/watcher-type-default');
      return app.ready();
    });

    after(() => app.close());

    it('should warn user', done => {
      setTimeout(() => {
        const content = fs.readFileSync(
            utils.getFilepath('apps/watcher-type-default/logs/watcher-type-default/egg-agent.log')).toString();
        content.should.containEql('defaultEventSource watcher will NOT take effect');
        done();
      }, 1000);
    });
  });
});
