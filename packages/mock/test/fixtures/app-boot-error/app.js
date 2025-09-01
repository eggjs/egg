const { FrameworkBaseError } = require('egg-errors');

class CustomError extends FrameworkBaseError {
  get module() {
    return 'customPlugin';
  }
}

module.exports = class AppBootHook {
  configWillLoad() {
    throw new CustomError('mock error', 99);
  }
};
