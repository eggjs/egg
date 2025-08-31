'use strict';

module.exports = app => {
  const err = Error();
  err.name = 'MockError';
  throw err;
};
