'use strict';

exports.schedule = {
  type: 'worker',
  interval: 2000,
};

exports.task = function* () {
  throw new Error('interval error');
};
