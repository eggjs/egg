'use strict';

const sleep = timeout => callback => setTimeout(callback, timeout);

module.exports = app => {
  app.get('/getData', function*() {
    this.body = yield app.mockClient.getData('hello');
  });

  app.get('/getDataGenerator', function*() {
    this.body = yield app.mockClient.getDataGenerator('hello');
  });

  app.get('/getError', function*() {
    try {
      yield app.mockClient.getError();
    } catch (err) {
      this.body = err.message;
    }
  });

  function subThunk() {
    return callback => {
      app.mockClient.subscribe({ id: 'foo' }, val => callback(null, val));
    };
  }

  app.get('/sub', function*() {
    const first = yield subThunk();
    yield sleep(1000);
    const second = yield subThunk();
    this.body = {
      foo: app.foo,
      first,
      second,
    };
  });

  app.get('/save', function*() {
    app.mockClient.saveAsync('hello', 'node');
    this.body = 'ok';
  });

  app.get('/timeout', function*() {
    try {
      yield app.mockClient.getTimeout();
      this.body = 'ok';
    } catch (err) {
      this.body = 'timeout';
    }
  });
};
