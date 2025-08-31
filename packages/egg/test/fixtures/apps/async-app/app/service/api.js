'use strict';

module.exports = app => {
  return class ApiService extends app.Service {
    async getName() {
      await sleep(100);
      return 'service';
    }
  };
};

function sleep(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}
