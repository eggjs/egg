'use strict';

module.exports = agent => {
  if (parseInt(process.versions.node.split('.')[0]) >= 20) {
    require('./tracer')(agent);
  }
};
