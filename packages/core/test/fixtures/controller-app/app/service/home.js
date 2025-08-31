const { setTimeout } = require('node:timers/promises');

module.exports = app => {
  return class HomeService extends app.Service {
    async info() {
      await setTimeout(10);
      return 'done';
    }
  };
};
