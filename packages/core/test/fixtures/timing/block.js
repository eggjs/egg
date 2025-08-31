'use strict';

module.exports = () => {
  const start = Date.now();
  while (Date.now() - start < 1000) {}
};
