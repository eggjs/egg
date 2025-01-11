import { expectType } from 'tsd';
import {
  Context, Application, IBoot, ILifecycleBoot,
  LoggerLevel,
  EggPlugin,
  EggAppInfo,
  start, SingleModeApplication, SingleModeAgent,
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

// watcher plugin types
expectType<object>(app.watcher);
expectType<string>(app.config.watcher.type);
expectType<string>(app.config.watcher.eventSources.default);

// development plugin types
expectType<boolean>(app.config.development.fastReady);
expectType<string[]>(app.config.development.watchDirs);

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

const plugin: EggPlugin = {
  tegg: {
    enable: true,
    package: '@eggjs/tegg-plugin',
  },
  teggConfig: {
    enable: true,
    package: '@eggjs/tegg-config',
  },
  teggController: {
    enable: true,
    package: '@eggjs/tegg-controller-plugin',
  },
  teggSchedule: {
    enable: true,
    package: '@eggjs/tegg-schedule-plugin',
  },
  eventbusModule: {
    enable: true,
    package: '@eggjs/tegg-eventbus-plugin',
  },
  aopModule: {
    enable: true,
    package: '@eggjs/tegg-aop-plugin',
  },
  onerror: true,
  logrotator: true,
};
expectType<EggPlugin>(plugin);

expectType<EggAppInfo>({
  name: 'egg',
  baseDir: 'baseDir',
  env: 'env',
  HOME: 'HOME',
  pkg: {},
  scope: 'scope',
  root: 'root',
});

const singleApp = await start({
  baseDir: 'baseDir',
  framework: 'egg',
  plugins: plugin,
});

expectType<SingleModeApplication>(singleApp);
expectType<SingleModeAgent>(singleApp.agent);
expectType<SingleModeApplication>(singleApp.agent.app);
