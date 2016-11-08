'use strict';

module.exports = app => {
  const fooDone = app.readyCallback('foo_sub_done');
  const saveDone = app.readyCallback('mock_save_done');

  function listener(value) {
    app.foo = value;
    app.mockClient.subscribe({ id: 'foo' }, value => {
      if (value < app.foo) {
        throw new Error('subscribe error');
      }
      setImmediate(() => { app.mockClient.unSubscribe({ id: 'foo' }) });
    });
    app.mockClient.unSubscribe({ id: 'foo' }, listener);
    fooDone();
  }

  app.mockClient.subscribe({ id: 'foo' }, listener);
  app.mockClient.saveCallback('hello', 'world', saveDone);
};
