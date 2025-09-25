'use strict';

module.exports = app => {
  app.emit('eventOnReady');
  app.emit('eventOnReady');
  app.emit('eventOnceReady');
  app.emit('eventOnceReady');
};
