const assert = require('assert');

module.exports = class Boot {
  constructor(app) {
    this.app = app;
  }

  async willReady() {
    const helper = this.app.createAnonymousContext().helper;
    assert(!helper.surl('foo://foo/bar'));
  }
};
