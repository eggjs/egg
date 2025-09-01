'use strict';

module.exports = app => {
  const done = app.readyCallback('prepare-app');
  done(new Error('mock error'));
};
