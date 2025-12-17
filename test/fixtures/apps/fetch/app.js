'use strict';

module.exports = app => {
  if (parseInt(process.versions.node.split('.')[0]) >= 20) {
    require('./tracer')(app);
  }
};
