const { FrameworkBaseError } = require('@eggjs/errors');

class CustomError extends FrameworkBaseError {
  get module() {
    return 'customPlugin';
  }
}

module.exports = class Boot {
  async configWillLoad() {
    console.error('mock error');
    throw new CustomError('mock error', 99);
  }
};
