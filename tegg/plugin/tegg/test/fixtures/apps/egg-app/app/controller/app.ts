import { Controller } from 'egg';

import AppService from '../../modules/multi-module-service/AppService.js';
import TraceService from '../../modules/multi-module-service/TraceService.js';

export default class App extends Controller {
  async find(): Promise<void> {
    const traceService = await this.ctx.app.getEggObject<TraceService>(TraceService);
    const appService = await this.ctx.app.getEggObject<AppService>(AppService);
    const traceId = await traceService.getTraceId();
    const app = await appService.findApp(this.ctx.query.name);
    this.ctx.body = {
      traceId,
      app,
    };
  }

  async find2(): Promise<void> {
    const traceService = await this.ctx.app.getEggObject<TraceService>(TraceService);
    const appService = await this.ctx.app.getEggObject<AppService>(AppService);
    const traceId = await traceService.getTraceId();
    const app = await appService.findApp(this.ctx.query.name);
    this.ctx.body = {
      traceId,
      app,
    };
  }

  async save(): Promise<void> {
    const app = this.ctx.request.body;
    const traceService = await this.ctx.app.getEggObject<TraceService>(TraceService);
    const appService = await this.ctx.app.getEggObject<AppService>(AppService);
    const traceId = await traceService.getTraceId();
    await appService.save(app);
    this.ctx.body = {
      success: true,
      traceId,
    };
  }
}
