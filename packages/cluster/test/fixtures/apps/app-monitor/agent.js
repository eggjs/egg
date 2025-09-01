'use strict';

module.exports = () => {
  setTimeout(() => {
    process.send({ action: 'custom-agent' });
  }, 2000);
};
