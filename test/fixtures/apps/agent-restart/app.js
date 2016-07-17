'use strict';

const client = require('./client');

module.exports = app => {
  const mock = app.createAppWorkerClient('mock', {
    subscribe: function(info, listener) {
      this._subscribe(info, listener);
      return this;
    },
  });

  mock.subscribe('aaa', data => console.log(data));
};
