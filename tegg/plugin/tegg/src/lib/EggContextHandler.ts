import { type Application } from 'egg';
import { ContextHandler, type EggContext } from '@eggjs/tegg-runtime';
import { EGG_CONTEXT } from '@eggjs/egg-module-common';

export class EggContextHandler {
  private readonly app: Application;

  constructor(app: Application) {
    this.app = app;
  }

  getContextCallback(): EggContext | undefined {
    const ctx = this.app.currentContext;
    return ctx?.teggContext;
  }

  async run<R>(eggContext: EggContext, fn: () => Promise<R>): Promise<R> {
    const ctx = eggContext.get(EGG_CONTEXT);
    return await this.app.ctxStorage.run(ctx, fn);
  }

  register() {
    ContextHandler.getContextCallback = () => {
      return this.getContextCallback();
    };
    ContextHandler.runInContextCallback = async (context: EggContext, fn: () => Promise<any>) => {
      return await this.run(context, fn);
    };
  }
}
