'use strict';

module.exports = function (app) {
  app.get('/', async function () {
    const foo2 = await this.service.foo2();
    const foo3 = await this.service.foo3.foo3();
    this.body = {
      foo2: foo2,
      foo3: foo3,
      foo4: !!this.service.foo4,
      foo5: !!this.service.fooDir.foo5,
      foo: !!this.service.foo,
      bar2: !!this.service.bar2,
    };
  });

  app.get('/proxy', async function () {
    this.body = {
      coupon: await this.proxy.couponQuery.query(),
      userInfo: await this.proxy.userInfoQuery.query(),
      onlyClass: await this.proxy.onlyClassQuery.query(),
    };
  });
};
