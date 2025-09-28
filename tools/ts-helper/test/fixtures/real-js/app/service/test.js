const { Service } = require('egg');

module.exports = class TestService extends Service {
  info() {
    console.info('info');
  }
}
