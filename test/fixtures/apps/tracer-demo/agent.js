'use strict';

module.exports = agent => {
  require('./tracer')(agent);
};
