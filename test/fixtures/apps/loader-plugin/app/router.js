'use strict';

module.exports = app => {
  app.get('/', function*() {
    const foo2 = yield this.service.foo2();
    const foo3 = yield this.service.foo3.foo3();
    this.body = {
      foo2: foo2,
      foo3: foo3,
    };
  });
};
