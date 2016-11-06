'use strict';

const should = require('should');
const request = require('supertest');
const utils = require('../../utils');

describe('test/lib/core/agent_worker_client.test.js', () => {
  describe('cluster mode', () => {
    let app;
    before(function* () {
      app = utils.cluster('apps/agent-app');
      return app.ready();
    });
    after(() => app.close());

    it('should request getData ok', () => {
      return request(app.callback())
        .get('/getData')
        .expect(200, 'world');
    });

    it('should request getDataGenerator ok', () => {
      return request(app.callback())
        .get('/getDataGenerator')
        .expect(200, 'world');
    });

    it('should request getError', () => {
      return request(app.callback())
        .get('/getError')
        .expect(200, 'mock error');
    });

    it('should request sub ok', done => {
      request(app.callback())
        .get('/sub')
        .expect(200, (err, res) => {
          should.not.exist(err);
          should.exist(res.body);
          res.body.should.have.properties([ 'foo', 'first', 'second' ]);
          res.body.foo.should.above(0);
          res.body.second.should.above(res.body.first);
          done();
        });
    });

    it('should invoke oneway ok', done => {
      request(app.callback())
        .get('/save')
        .expect(200, (err, res) => {
          should.not.exist(err);
          res.text.should.eql('ok');
          setTimeout(() => {
            request(app.callback())
              .get('/getData')
              .expect(200, 'node', done);
          }, 1000);
        });
    });

    it('should invoke timeout', () => {
      return request(app.callback())
        .get('/timeout')
        .expect(200, 'timeout');
    });
  });

  describe('agent sync callback', () => {
    let app;
    before(() => {
      app = utils.cluster('apps/agent-app-sync');
      return app.ready();
    });
    after(() => app.close());

    it('should call', () => {
      return request(app.callback())
        .get('/')
        .expect(200)
        .expect('test');
    });
  });

  describe('agent restart', () => {
    let app;
    before(() => {
      app = utils.cluster('apps/agent-restart');
      // app.debug();
      app.expect('code', 0);
      return app.ready();
    });
    before(done => {
      app.process.send({
        action: 'die',
        to: 'agent',
      });
      setTimeout(done, 8000);
    });
    after(() => app.close());

    it('should resend subscribe', () => {
      const stdout = app.stdout;
      stdout.match(/Agent Worker started/g).length.should.eql(2);
      stdout.match(/agent subscribe aaa/g).length.should.eql(2);
    });
  });
});
