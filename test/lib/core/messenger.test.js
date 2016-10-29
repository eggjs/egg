'use strict';

const mm = require('egg-mock');
const utils = require('../../utils');
const Messenger = require('../../../lib/core/messenger');

describe('test/lib/core/messenger.test.js', () => {
  let messenger;

  before(() => {
    messenger = new Messenger();
  });

  afterEach(mm.restore);

  describe('send()', () => {
    it('should send demo message', done => {
      // mock not childprocess
      mm(process, 'send', null);
      messenger.send('messenger-test-demo', { foo: 'haha' });
      messenger.once('messenger-test-demo', data => {
        data.should.eql({ foo: 'haha' });
        done();
      });
    });

    it('should mock process.send exists', done => {
      mm(process, 'connected', true);
      mm(process, 'send', msg => {
        msg.should.eql({
          action: 'message-test-send-demo',
          data: {
            foo: 'ok',
          },
        });
        done();
      });

      messenger.send('message-test-send-demo', {
        foo: 'ok',
      });
    });
  });

  describe('on(action, data)', () => {
    it('should listen an action event', done => {
      messenger.on('messenger-test-on-event', data => {
        data.should.eql({
          success: true,
        });
        done();
      });

      process.emit('message', {});

      process.emit('message', null);

      process.emit('message', {
        action: 'messenger-test-on-event',
        data: {
          success: true,
        },
      });
    });
  });

  describe('close()', () => {
    it('should remove all listeners', () => {
      const messenger = new Messenger();
      messenger.on('messenger-test-on-event', () => {
        throw new Error('should never emitted');
      });

      messenger.close();

      process.emit('message', {
        action: 'messenger-test-on-event',
        data: {
          success: true,
        },
      });
    });
  });

  describe('cluster messenger', () => {
    let app;
    before(done => {
      app = utils.cluster('apps/messenger');
      app.coverage(false);
      // 等 agent 接受消息
      app.ready(() => setTimeout(done, 1000));
    });
    after(() => app.close());

    it('app should accept agent message', () => {
      app.expect('stdout', /\[app] agent-to-app agent msg/);
    });
    it('app should accept agent assgin pid message', () => {
      app.expect('stdout', /\[app] agent-to-app agent msg \d+/);
    });
    it('app should accept itself message', () => {
      app.expect('stdout', /\[app] app-to-agent app msg/);
    });
    it('agent should accept app message', () => {
      app.expect('stdout', /\[agent] app-to-agent app msg/);
    });
    it('agent should accept itself message', () => {
      app.expect('stdout', /\[agent] agent-to-app agent msg/);
    });
    it('agent should accept itself assgin pid message', () => {
      app.expect('stdout', /\[agent] agent-to-app agent msg \d+/);
    });
  });

  describe('sendRandom', () => {
    let app;
    before(() => {
      mm.env('default');
      mm.consoleLevel('NONE');
      app = utils.cluster('apps/messenger-random', { workers: 4 });
      app.coverage(false);
      return app.ready();
    });
    after(() => app.close());

    it('app should accept agent message', done => {
      setTimeout(() => {
        const m = app.stdout.match(/\d+=\d+/g);
        const map = new Map();
        for (const item of m) {
          const a = item.split('=');
          map.set(a[0], a[1]);
        }
        map.size.should.equal(4);
        done();
      }, 8000);
    });
  });

  describe('sendToApp and sentToAgent', () => {
    let app;
    before(() => {
      mm.env('default');
      mm.consoleLevel('NONE');
      app = utils.cluster('apps/messenger-app-agent', { workers: 2 });
      app.coverage(false);
      return app.ready();
    });
    after(() => app.close());

    it('app should accept agent message', done => {
      setTimeout(() => {
        count(app.stdout, 'agent2app').should.equal(2);
        count(app.stdout, 'app2app').should.equal(4);
        count(app.stdout, 'agent2agent').should.equal(1);
        count(app.stdout, 'app2agent').should.equal(2);
        done();
      }, 500);

      function count(data, key) {
        return data.split('\n').filter(line => {
          return line.indexOf(key) >= 0;
        }).length;
      }
    });
  });
});
