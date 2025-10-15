const { FrameworkBaseError } = require("@eggjs/errors");

class CustomError extends FrameworkBaseError {
  get module() {
    return "customPlugin";
  }
}

module.exports = class {
  async didLoad() {
    throw new CustomError("mock error", 99);
  }
};
