'use strict';

module.exports = app => {
  // don't use the port that egg-mock defined
  app._options.port = undefined;
};
