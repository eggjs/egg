'use strict';

const utils = require('../../../utils');
const pedding = require('pedding');
const assert = require('assert');

describe.only('test/lib/core/messenger/local.test.js', () => {
  let app;

  before(async () => {
    app = await utils.singleProcessApp('apps/demo');
  });

  after(() => app.close());

  afterEach(() => {
    app.messenger.close();
    app.agent.messenger.close();
  });

  describe('broadcast()', () => {
    it('app.messenger.broadcast should work', done => {
      done = pedding(done, 2);
      app.messenger.once('broadcast-event', msg => {
        assert.deepEqual(msg, { foo: 'bar' });
        done();
      });
      app.agent.messenger.once('broadcast-event', msg => {
        assert.deepEqual(msg, { foo: 'bar' });
        done();
      });

      app.messenger.broadcast('broadcast-event', { foo: 'bar' });
    });

    it('agent.messenger.broadcast should work', done => {
      done = pedding(done, 2);
      app.messenger.once('broadcast-event', msg => {
        assert.deepEqual(msg, { foo: 'bar' });
        done();
      });
      app.agent.messenger.once('broadcast-event', msg => {
        assert.deepEqual(msg, { foo: 'bar' });
        done();
      });

      app.agent.messenger.broadcast('broadcast-event', { foo: 'bar' });
    });
  });

  describe('sendToApp()', () => {
    it('app.messenger.sendToApp should work', done => {
      app.agent.messenger.once('sendToApp-event', () => {
        throw new Error('should not emit on agent');
      });

      app.messenger.once('sendToApp-event', msg => {
        assert.deepEqual(msg, { foo: 'bar' });
        done();
      });

      app.messenger.sendToApp('sendToApp-event', { foo: 'bar' });
    });

    it('agent.messenger.sendToApp should work', done => {
      app.agent.messenger.once('sendToApp-event', () => {
        throw new Error('should not emit on agent');
      });

      app.messenger.once('sendToApp-event', msg => {
        assert.deepEqual(msg, { foo: 'bar' });
        done();
      });

      app.agent.messenger.sendToApp('sendToApp-event', { foo: 'bar' });
    });
  });

  describe('sendToAgent()', () => {
    it('app.messenger.sendToAgent should work', done => {
      app.agent.messenger.once('sendToAgent-event', msg => {
        assert.deepEqual(msg, { foo: 'bar' });
        done();
      });

      app.messenger.once('sendToAgent-event', () => {
        throw new Error('should not emit on app');
      });

      app.messenger.sendToAgent('sendToAgent-event', { foo: 'bar' });
    });

    it('agent.messenger.sendToAgent should work', done => {
      app.agent.messenger.once('sendToAgent-event', msg => {
        assert.deepEqual(msg, { foo: 'bar' });
        done();
      });

      app.messenger.once('sendToAgent-event', () => {
        throw new Error('should not emit on app');
      });

      app.agent.messenger.sendToAgent('sendToAgent-event', { foo: 'bar' });
    });
  });

  describe('sendRandom()', () => {
    it('app.messenger.sendRandom should work', done => {
      app.agent.messenger.once('sendRandom-event', msg => {
        assert.deepEqual(msg, { foo: 'bar' });
        done();
      });

      app.messenger.once('sendRandom-event', () => {
        throw new Error('should not emit on app');
      });

      app.messenger.sendRandom('sendRandom-event', { foo: 'bar' });
    });

    it('agent.messenger.sendRandom should work', done => {
      app.agent.messenger.once('sendRandom-event', () => {
        throw new Error('should not emit on agent');
      });

      app.messenger.once('sendRandom-event', msg => {
        assert.deepEqual(msg, { foo: 'bar' });
        done();
      });

      app.agent.messenger.sendRandom('sendRandom-event', { foo: 'bar' });
    });
  });

  describe('sendTo(pid)', () => {
    it('app.messenger.sendTo should work', done => {
      done = pedding(done, 2);
      app.messenger.once('sendTo-event', msg => {
        assert.deepEqual(msg, { foo: 'bar' });
        done();
      });
      app.agent.messenger.once('sendTo-event', msg => {
        assert.deepEqual(msg, { foo: 'bar' });
        done();
      });

      app.messenger.sendTo(process.pid, 'sendTo-event', { foo: 'bar' });
    });

    it('agent.messenger.sendTo should work', done => {
      done = pedding(done, 2);
      app.messenger.once('sendTo-event', msg => {
        assert.deepEqual(msg, { foo: 'bar' });
        done();
      });
      app.agent.messenger.once('sendTo-event', msg => {
        assert.deepEqual(msg, { foo: 'bar' });
        done();
      });

      app.agent.messenger.sendTo(process.pid, 'sendTo-event', { foo: 'bar' });
    });
  });
});
