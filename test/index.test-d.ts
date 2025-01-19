import { expectType } from 'tsd';
import {
  Context, Application, IBoot, ILifecycleBoot,
  LoggerLevel,
  EggPlugin,
  EggAppInfo,
  start, SingleModeApplication, SingleModeAgent,
  MiddlewareFunc,
  Singleton,
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

// jsonp plugin types
expectType<boolean>(app.config.jsonp.csrf);
expectType<string[] | string>(app.config.jsonp.callback);
expectType<number>(app.config.jsonp.limit);
expectType<string | RegExp |(string | RegExp)[]>(app.config.jsonp.whiteList!);
expectType<boolean>(ctx.acceptJSONP);
expectType<void>(ctx.createJsonpBody({}));
expectType<MiddlewareFunc>(app.jsonp());
expectType<MiddlewareFunc>(app.jsonp({ callback: 'callback' }));

// i18n plugin types
expectType<boolean>(app.config.i18n.writeCookie);
expectType<string>(app.config.i18n.defaultLocale);
expectType<string>(app.gettext('en-us', 'email'));
expectType<boolean>(app.isSupportLocale('en-us'));
expectType<string>(ctx.__('email'));
expectType<string>(ctx.gettext('email %s', 'fengmk2'));
expectType<string>(ctx.locale);
expectType<string>(ctx.locale = 'en-us');

// security plugin types
expectType<string>(app.config.security.csrf.headerName);

// session plugin types
expectType<boolean>(app.config.session.httpOnly);

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

class Redis {
  get(key: string) {
    return key;
  }
}
const redis = {} as Redis & Singleton<Redis>;
expectType<Redis>(redis);
expectType<string>(redis.get('foo'));
expectType<string>(redis.getSingletonInstance('client1').get('foo'));
expectType<Redis>(redis.getSingletonInstance('client1'));
// expectType<Redis>(redis.get('client1'));
