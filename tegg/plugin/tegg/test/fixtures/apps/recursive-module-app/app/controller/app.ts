import { Controller } from 'egg';

export default class App extends Controller {
  async find() {
    const traceId = await this.ctx.app.module.multiModuleService.traceService.getTraceId();
    const app = await this.ctx.app.module.multiModuleService.appService.findApp(this.ctx.query.name);
    this.ctx.body = {
      traceId,
      app,
    };
  }

  async save() {
    const app = this.ctx.request.body;
    const traceId = await this.ctx.app.module.multiModuleService.traceService.getTraceId();
    await this.ctx.app.module.multiModuleService.appService.save(app);
    this.ctx.body = {
      success: true,
      traceId,
    };
  }
}
