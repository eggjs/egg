'use strict';

const should = require('should');
const mm = require('egg-mock');
const request = require('supertest');
const sleep = require('ko-sleep');
const path = require('path');
const EventEmitter = require('events').EventEmitter;
const utils = require('../../utils');
const Agent = require('../../..').Agent;
const fs = require('fs');

const fixtures = path.join(__dirname, '../../fixtures');

describe('test/lib/core/agent_worker_client.test.js', () => {

  describe('single process', () => {
    let agent;
    let client;

    before(done => {
      agent = new Agent({
        baseDir: path.join(fixtures, 'apps/demo'),
      });

      const realClient = Object.assign(Object.create(EventEmitter.prototype), {
        ready(flagOrFunction) {
          this._ready = !!this._ready;
          this._readyCallbacks = this._readyCallbacks || [];

          if (typeof flagOrFunction === 'function') {
            this._readyCallbacks.push(flagOrFunction);
          } else {
            this._ready = !!flagOrFunction;
          }

          if (this._ready) {
            this._readyCallbacks.splice(0, Infinity).forEach(callback => process.nextTick(callback));
          }
          return this;
        },
        getCallback(id, callback) {
          setTimeout(() => {
            if (id === 'error') {
              callback(new Error('mock error'));
            } else {
              callback(null, 'mock data');
            }
          }, 100);
        },
        getData() {
          return new Promise(resolve => {
            setTimeout(() => {
              resolve('mock data');
            }, 100);
          });
        },
        * getDataGenerator() {
          yield sleep(100);
          return 'mock data';
        },
        getError() {
          return new Promise((_, reject) => {
            setTimeout(() => {
              reject(new Error('mock error'));
            }, 100);
          });
        },
      });

      client = agent.startAgent({
        name: 'mock',
        client: realClient,
        subscribe(info, listener) {
          realClient.on(info.id, listener);
        },
        formatKey(info) {
          return info.id;
        },
      });
      client.ready(done);
      realClient.ready(true);
    });
    after(() => agent.close());
    afterEach(mm.restore);

    it('should ready', done => {
      client.ready(done);

      setTimeout(() => {
        client.innerClient.ready(true);
      }, 100);
    });

    it('should subscribe well', done => {
      mm(client, '_broadcast', (command, info) => {
        command.should.equal('mock_subscribe_changed');
        info.value.should.equal('mock data');
        done();
      });

      client.messenger.emit('mock_subscribe_request', {
        info: {
          id: 'mockKey',
        },
        pid: 123,
      });

      setImmediate(() => client.innerClient.emit('mockKey', 'mock data'));
    });

    it('should invoke callback well', done => {
      mm(client, '_sendTo', (pid, action, data) => {
        pid.should.equal(123);
        action.should.equal('mock_invoke_response');
        data.success.should.equal(true);
        data.data.should.equal('mock data');
        done();
      });

      client.messenger.emit('mock_invoke_request', {
        opaque: 1,
        method: 'getCallback',
        args: [ '123' ],
        pid: 123,
      });
    });

    it('should invoke callback with error', done => {
      mm(client, '_sendTo', (pid, action, data) => {
        pid.should.equal(123);
        action.should.equal('mock_invoke_response');
        data.success.should.equal(false);
        should.exist(data.errorMessage);
        data.errorMessage.should.equal('mock error');
        done();
      });

      client.messenger.emit('mock_invoke_request', {
        method: 'getCallback',
        args: [ 'error' ],
        pid: 123,
      });
    });

    it('should invoke promise well', done => {
      mm(client, '_sendTo', (pid, action, data) => {
        pid.should.equal(123);
        action.should.equal('mock_invoke_response');
        data.success.should.equal(true);
        data.data.should.equal('mock data');
        done();
      });

      client.messenger.emit('mock_invoke_request', {
        method: 'getData',
        args: [ '123' ],
        pid: 123,
      });
    });

    it('should invoke generatorFunction well', done => {
      mm(client, '_sendTo', (pid, action, data) => {
        pid.should.equal(123);
        action.should.equal('mock_invoke_response');
        data.success.should.equal(true);
        data.data.should.equal('mock data');
        done();
      });

      client.messenger.emit('mock_invoke_request', {
        method: 'getDataGenerator',
        args: [ '123' ],
        pid: 123,
      });
    });

    it('should invoke error', done => {
      mm(client, '_sendTo', (pid, action, data) => {
        pid.should.equal(123);
        action.should.equal('mock_invoke_response');
        data.success.should.equal(false);
        should.exist(data.errorMessage);
        data.errorMessage.should.equal('mock error');
        done();
      });

      client.messenger.emit('mock_invoke_request', {
        method: 'getError',
        args: [ '123' ],
        pid: 123,
      });
    });
  });

  describe('when dumpConfig error', () => {
    let agent;
    after(() => agent.close());

    it('should not exit ', done => {
      const writeFileSync = fs.writeFileSync;
      mm(fs, 'writeFileSync', function() {
        if (arguments[0] && arguments[0].endsWith('config.json')) {
          throw new Error('mock error');
        }
        writeFileSync.apply(fs, arguments);
      });
      agent = new Agent({
        baseDir: path.join(fixtures, 'apps/demo'),
      });
      agent.ready(done);
    });
  });

  describe('cluster', () => {
    let app;

    before(() => {
      app = utils.cluster('apps/agent-app');
      return app.ready();
    });
    after(() => app.close());

    it('should request ok', () => {
      return request(app.callback())
        .get('/')
        .expect(200, 'ok');
    });

    it('should request getData ok', () => {
      return request(app.callback())
        .get('/getData')
        .expect(200, 'mock data');
    });

    it('should request getDataGenerator ok', () => {
      return request(app.callback())
        .get('/getDataGenerator')
        .expect(200, 'mock data');
    });

    it('should request getError', () => {
      return request(app.callback())
        .get('/getError')
        .expect(200, 'mock error');
    });

    it('should request sub ok', () => {
      return request(app.callback())
        .get('/sub')
        .expect(200, 'bar');
    });
  });

  describe('agent sync callback', () => {
    let app;
    before(() => {
      app = utils.app('apps/agent-app-sync');
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
