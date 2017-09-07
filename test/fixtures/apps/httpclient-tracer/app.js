'use strict';

module.exports = app => {
  const done = app.readyCallback('ready');
  setTimeout(done, 5000);
};