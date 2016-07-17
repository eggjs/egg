'use strict';

module.exports = app => {
  const done = app.readyCallback('foo');
  app.mockClient.subscribe({
    id: 'foo'
  }, value => {
    app.foo = value;
    done();
  });
};
