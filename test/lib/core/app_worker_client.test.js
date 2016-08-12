'use strict';

const should = require('should');
const mm = require('egg-mock');
const pedding = require('pedding');
const utils = require('../../utils');

describe('test/lib/core/app_worker_client.test.js', () => {

  let app;
  let client;

  before(() => {
    app = utils.app('apps/demo');
    return app.ready();
  });
  before(done => {
    const impl = {
      subscribe(reg, listener) {
        this._subscribe(reg, listener);
        return this;
      },

      unSubscribe(reg, listener) {
        return this._unSubscribe(reg, listener);
      },

      * getData(id) {
        return yield this._invoke('getData', [ id ]);
      },

      sendOneway(data) {
        this._invokeOneway('sendOneway', [ data ]);
      },
    };

    client = app.createAppWorkerClient('mock', impl, {
      responseTimeout: 3000,
      force: true,
    });

    client._on('xxx', () => {});
    client._once('yyy', () => {});
    client._removeListener('xxx', () => {});
    client._removeAllListeners('xxx');
    client._removeAllListeners('yyy');

    client.ready(done);
  });

  afterEach(mm.restore);

  it('should work', () => {
    mm(client, '_opaque', Math.pow(2, 31) - 10);

    client.publicEvents.should.eql([ 'agent_restart', 'error' ]);
    client._getNextOpaque().should.equal(0);
  });

  it('should subscribe data well', done => {
    done = pedding(done, 2);
    const info = {
      dataId: 'mockId',
      groupId: 'mockGroup',
    };

    client.subscribe(info, function(value) {
      value.should.equal('mock data');
      done();
    });

    client.messenger.emit('mock_subscribe_changed', {
      key: JSON.stringify(info),
      info,
      value: 'mock data',
    });

    client.unSubscribe(info, () => {});
    client.unSubscribe(info);

    client._subscriptions.has(JSON.stringify(info)).should.equal(false);

    client.messenger.emit('mock_subscribe_changed', {
      key: JSON.stringify(info),
      info,
      value: 'mock data2',
    });

    setTimeout(() => done(), 500);
  });

  it('should subscribe string well', done => {
    const info = 'mock-info';

    client.subscribe(info, function(value) {
      value.should.equal('mock data');
      done();
    });

    client.messenger.emit('mock_subscribe_changed', {
      key: JSON.stringify(info),
      info,
      value: 'mock data',
    });
  });

  it('should invoke API well', function* () {
    mm(client, '_opaque', 1);

    setTimeout(() => {
      client.messenger.emit('mock_invoke_response', {
        opaque: 1,
        success: true,
        data: 'mock data',
      });
    }, 100);

    const result = yield client.getData('123');
    result.should.equal('mock data');
  });

  it('should invoke API well with wrong opaque', function* () {
    let warned = false;
    mm(client, '_opaque', 10);
    const logger = client.logger;
    mm(logger, 'warn', (msg, name, data) => {
      if (data === 'mock data') {
        warned = true;
      }
    });

    setTimeout(() => {
      client.messenger.emit('mock_invoke_response', {
        opaque: 1,
        success: true,
        data: 'mock data',
      });
    }, 100);

    try {
      yield client.getData('123');
    } catch (err) {
      // do noting
    }
    should(warned).equal(true);
  });

  it('should invoke oneway ok', done => {
    client._invoke('sendOneway', [ '123' ], {
      oneway: true,
    }).then(done);
  });

  it('should call sendOneway ok', done => {
    mm(client, '_opaque', 1);
    mm(client, '_sendToAgent', (cmd, data) => {
      cmd.should.equal('mock_invoke_request');
      const pid = client.pid;
      data.should.eql({
        opaque: 1,
        method: 'sendOneway',
        args: [ '123' ],
        pid,
        oneway: true,
      });
      done();
    });
    client.sendOneway('123');
  });

  it('should invoke API with error', function* () {
    mm(client, '_opaque', 1);

    setTimeout(() => {
      client.messenger.emit('mock_invoke_response', {
        opaque: 1,
        success: false,
        errorMessage: 'mock error',
      });
    }, 100);

    try {
      yield client.getData('123');
      throw new Error('should not run here');
    } catch (err) {
      err.message.should.equal('mock error');
    }
  });

  it('should throw timeout error', function* () {
    mm(client, '_opaque', 1);
    try {
      yield client.getData('123');

      throw new Error('should not run here');
    } catch (err) {
      err.name.should.equal('AgentWorkerRequestTimeoutError');
      err.message.should.equal('Agent worker no response in 3000ms, AppWorkerClient:mock invoke getData with req#1');
    }
  });

  it('should emit agent_restart when agent worker restart', done => {
    client.on('agent_restart', done);
    client.messenger.emit('agent-start');
  });

});
