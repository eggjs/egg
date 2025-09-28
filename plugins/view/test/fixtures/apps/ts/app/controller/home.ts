import { Controller } from 'egg';

export default class HomeController extends Controller {
  async index() {
    const { ctx } = this;
    this.app.logger.info(this.app.config.view.root);
    this.app.logger.info(this.app.config.view.defaultExtension);
    ctx.body = await this.ctx.view.render('./test.tpl', {
      test: '123',
    });
  }

  async other() {
    this.ctx.body = await this.ctx.renderString('./test.tpl');
  }
}
