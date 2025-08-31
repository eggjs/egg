'use strict';

module.exports = class Boot {
  constructor(app) {
    this.app = app;
  }
  configDidLoad() {
    this.app.bootLog.push('configDidLoad in plugin');
  }
};
