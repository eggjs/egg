import { Controller } from 'egg';

export default class HomeController extends Controller {
  async index(): Promise<void> {
    this.ctx.body = { ok: true, appName: this.ctx.appName };
  }

  async user(): Promise<void> {
    const { id } = this.ctx.params as { id: string };
    this.ctx.body = await this.ctx.service.user.getUser(id);
  }
}
