'use strict';

module.exports = app => {
  app.get('/', async function() {
    const foo2 = await this.service.foo2();
    const foo3 = await this.service.foo3.foo3();
    this.body = {
      foo2: foo2,
      foo3: foo3,
    };
  });
};
