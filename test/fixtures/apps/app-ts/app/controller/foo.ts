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
      this.ctx.helper.test();
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

  async testViewRender() {
    const { ctx } = this;
    this.app.logger.info(this.app.view.get('nunjucks'));
    this.app.logger.info(this.app.config.view.root);
    this.app.logger.info(this.app.config.view.defaultExtension);
    ctx.body = await this.ctx.view.render('test.tpl', {
      test: '123'
    });
  }

  async testViewRenderString() {
    this.ctx.body = await this.ctx.view.renderString('test');
  }
}
