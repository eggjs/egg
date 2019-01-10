import { Controller, RequestObjectBody } from 'egg';

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
      this.ctx.logger.info('getData');
      this.ctx.body = await this.ctx.service.foo.bar();
      this.ctx.proxy.foo.bar();
    } catch (e) {
      const body: RequestObjectBody = this.ctx.request.body;
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
  async httpclient() {
    await this.app.httpclient.request('url', {
      method: 'POST',
    });
    await this.ctx.curl('url', {
      method: 'POST',
    });
    await this.app.curl('url', {
      method: 'POST',
    });
  }
}
