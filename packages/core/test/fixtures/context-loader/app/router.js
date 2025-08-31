module.exports = app => {
  app.get('/depth', async function () {
    this.body = {
      one: this.depth.one.get(),
      two: this.depth.two.two.get(),
      three: this.depth.three.three.three.get(),
      four: this.depth.four.four.four.four.get(),
    };
  });

  app.get('/type', async function () {
    this.body = {
      class: this.type.class.get(),
      functionClass: this.type.functionClass.get(),
      object: this.type.object.get(),
      generator: await this.type.generator(),
      null: this.type.null,
      number: this.type.number,
    };
  });

  app.get('/service', async function () {
    this.body = {
      service1: this.service1.user.userInfo,
      service2: this.service2.user.userInfo,
    };
  });

  app.get('/pathname', async function () {
    this.body = await this.pathname.a.b.c.getPathname();
  });

  app.get('/config', async function () {
    this.body = await this.pathname.a.b.c.getName();
  });

  app.get('/BaseContextClass/service', async function () {
    this.body = this.service.user.info;
  });
};
