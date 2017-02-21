'use strict';

const assert = require('assert');
const mm = require('egg-mock');
const sleep = require('ko-sleep');
const utils = require('../../utils');
const Messenger = require('../../../lib/core/messenger');

describe('test/lib/core/messenger.test.js', () => {
  let messenger;

  before(() => {
    messenger = new Messenger();
  });

  afterEach(mm.restore);

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
    before(() => {
      app = utils.cluster('apps/messenger');
      app.coverage(false);
      return app.ready();
    });
    before(() => sleep(1000));
    after(() => app.close());

    it('app should accept agent message', () => {
      app.expect('stdout', /\[app] agent-to-app agent msg/);
    });

    it('app should accept agent assgin pid message', () => {
      app.expect('stdout', /\[app] agent-to-app agent msg \d+/);
    });

    it('agent should accept app message', () => {
      app.expect('stdout', /\[agent] app-to-agent app msg/);
    });

    it('agent should not send message before started', () => {
      app.expect('stdout', /agent can't call sendTo before server started/);
      app.expect('stdout', /agent can't call sendToApp before server started/);
      app.expect('stdout', /agent can't call sendToAgent before server started/);
      app.expect('stdout', /agent can't call sendRandom before server started/);
      app.expect('stdout', /agent can't call broadcast before server started/);
    });
  });

  describe('broadcast()', () => {

    let app;
    before(() => {
      mm.env('default');
      app = utils.cluster('apps/messenger-broadcast', { workers: 2 });
      app.coverage(false);
      return app.ready();
    });
    before(() => sleep(1000));
    after(() => app.close());

    it('should broadcast each other', () => {
      // app 26496 receive message from app pid 26495
      // app 26496 receive message from app pid 26496
      // app 26495 receive message from app pid 26495
      // app 26495 receive message from app pid 26496
      // app 26495 receive message from agent pid 26494
      // app 26496 receive message from agent pid 26494
      // agent 26494 receive message from app pid 26495
      // agent 26494 receive message from app pid 26496
      // agent 26494 receive message from agent pid 26494
      const m = app.stdout.match(/(app|agent) \d+ receive message from (app|agent) pid \d+/g);
      m.length.should.eql(9);
    });
  });

  describe('sendRandom', () => {
    let app;
    before(() => {
      mm.env('default');
      app = utils.cluster('apps/messenger-random', { workers: 4 });
      app.coverage(false);
      return app.ready();
    });
    after(() => app.close());

    it('app should accept agent message', function* () {
      yield sleep(10000);

      const m = app.stdout.match(/\d+=\d+/g);
      const map = new Map();
      for (const item of m) {
        const a = item.split('=');
        map.set(a[0], a[1]);
      }
      for (const [ pid, count ] of map) {
        console.log('pid: %s, %s', pid, count);
      }
      assert(map.size <= 4);
      assert(map.size >= 2);
    });
  });

  describe('sendToApp and sentToAgent', () => {
    let app;
    before(() => {
      mm.env('default');
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
