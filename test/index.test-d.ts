import { expectType } from 'tsd';
import {
  Context, Application, IBoot, ILifecycleBoot,
  LoggerLevel,
} from '../src/index.js';
import { HttpClient } from '../src/urllib.js';

const app = {} as Application;
const ctx = app.createAnonymousContext();

expectType<Promise<void>>(app.runInAnonymousContextScope(async ctx => {
  console.log(ctx);
}));

expectType<Context>(ctx);
expectType<HttpClient>(ctx.httpClient);
expectType<any>(ctx.request.body);

class AppBoot implements ILifecycleBoot {
  private readonly app: Application;

  constructor(app: Application) {
    this.app = app;
  }

  get stages(): string[] {
    const app: any = this.app;
    if (!app.stages) {
      app.stages = [];
    }
    return app.stages;
  }

  configWillLoad() {
    this.stages.push('configWillLoad');
  }

  configDidLoad() {
    this.stages.push('configDidLoad');
  }

  async didLoad() {
    this.stages.push('didLoad');
  }

  async willReady() {
    this.stages.push('willReady');
  }

  async didReady() {
    this.stages.push('didReady');
  }

  async serverDidReady() {
    this.stages.push('serverDidReady');
  }

  async beforeClose() {
    this.stages.push('beforeClose');
  }
}

const appBoot = new AppBoot(app);
expectType<IBoot>(appBoot);
expectType<ILifecycleBoot>(appBoot);

expectType<string[]>(appBoot.stages);

expectType<LoggerLevel>('DEBUG');
