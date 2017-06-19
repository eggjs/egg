import { Controller, Service, Application } from '..';

// add user controller and service
declare module '..' {
  interface IController {
    foo: FooController;
  }
  interface IService {
    foo: FooService;
  }
}

// controller
class FooController extends Controller {
  async getData() {
    this.ctx.body = await this.ctx.service.foo.bar();
    this.ctx.body = await this.service.foo.bar();
  }
}

class FooService extends Service {
  async bar() {
    //
    return this.config.env;
  }
}

// router

function router(app: Application) {
  const controller = app.controller;
  app.get('/foo', controller.foo.getData);
  app.post('/', controller.foo.getData);
}
