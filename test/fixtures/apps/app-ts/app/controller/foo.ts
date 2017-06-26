import { Controller } from 'egg';

// add user controller and service
declare module 'egg' {
  interface IController {
    foo: FooController;
  }
}

// controller
export default class FooController extends Controller {
  async getData() {
    try {
      this.ctx.body = await this.ctx.service.foo.bar();
    } catch (e) {
      const body: { foo: string } = this.ctx.request.body;
      this.app.logger.info(e.name, body.foo);
    }
  }
  async getBar() {
    try {
      this.ctx.body = await this.service.foo.bar();
    } catch (e) {
      this.ctx.logger.error(e);
    }
  }
}
