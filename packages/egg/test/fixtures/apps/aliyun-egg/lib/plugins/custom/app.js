'use strict';

module.exports = app => {
  app.custom = {};
  app.messenger.broadcast('custom-aliyun-egg-worker', 123);
  app.messenger.on('custom-aliyun-egg-agent', data => {
    app.agent = data;
  })
};
