import { expectType } from 'tsd';
import { EggCore, Context } from '@eggjs/core';
import { LogRotator } from '@eggjs/logrotator';
import {
  Application,
  type IBoot,
  type ILifecycleBoot,
  type LoggerLevel,
  type EggPlugin,
  type EggAppInfo,
  start,
  type SingleModeApplication,
  type SingleModeAgent,
  type MiddlewareFunc,
  Singleton,
  type PowerPartial,
  type EggAppConfig,
} from '../src/index.js';
import { HttpClient } from '../src/urllib.js';
import { type IMessenger } from '../src/lib/core/messenger/IMessenger.js';

const app = {} as EggCore;
expectType<IMessenger>(app.messenger);
expectType<IMessenger>(app.messenger.broadcast('test'));
expectType<void>(app.loggers.reload());

const config = {} as PowerPartial<EggAppConfig>;
expectType<boolean | undefined>(config.static?.gzip);

const ctx = app.createAnonymousContext();

expectType<Promise<void>>(
  app.runInAnonymousContextScope(async ctx => {
    console.log(ctx);
  })
);

expectType<Context>(ctx);
expectType<HttpClient>(ctx.httpClient);
expectType<any>(ctx.request.body);
expectType<number>(ctx.realStatus);
expectType<number>((ctx.realStatus = 200));

// watcher plugin types
// @ts-ignore - watcher plugin extends EggCore
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
expectType<string | RegExp | (string | RegExp)[]>(app.config.jsonp.whiteList!);
// @ts-ignore - jsonp plugin extends context
expectType<boolean>(ctx.acceptJSONP);
// @ts-ignore - jsonp plugin extends context
expectType<void>(ctx.createJsonpBody({}));
// @ts-ignore - jsonp plugin extends app
expectType<MiddlewareFunc>(app.jsonp());
// @ts-ignore - jsonp plugin extends app
expectType<MiddlewareFunc>(app.jsonp({ callback: 'callback' }));

// i18n plugin types
expectType<boolean>(app.config.i18n.writeCookie);
expectType<string>(app.config.i18n.defaultLocale);
// @ts-ignore - i18n plugin extends app
expectType<string>(app.gettext('en-us', 'email'));
// @ts-ignore - i18n plugin extends app
expectType<boolean>(app.isSupportLocale('en-us'));
// @ts-ignore - i18n plugin extends context
expectType<string>(ctx.__('email'));
// @ts-ignore - i18n plugin extends context
expectType<string>(ctx.gettext('email %s', 'fengmk2'));
// @ts-ignore - i18n plugin extends context
expectType<string>(ctx.locale);
expectType<string>((ctx.locale = 'en-us'));

// security plugin types
expectType<string>(app.config.security.csrf.headerName);

// session plugin types
expectType<boolean>(app.config.session.httpOnly);

// onerror plugin types
expectType<(err: any, ctx: any) => void>(app.config.onerror.html!);
expectType<string>(app.config.onerror.errorPageUrl as string);

// logrotator plugin types
class MyLogRotator extends LogRotator {
  async getRotateFiles() {
    return new Map();
  }
}
// @ts-ignore - LogRotator constructor type issue
expectType<LogRotator>(new MyLogRotator({ app }));
expectType<boolean>(app.config.logrotator.disableRotateByDay);
expectType<number>(app.config.logrotator.maxDays);
expectType<number>(app.config.logrotator.maxFileSize);
expectType<number>(app.config.logrotator.maxFiles);
expectType<number>(app.config.logrotator.rotateDuration);
expectType<boolean>(app.config.logrotator.gzip);
expectType<string>(app.config.logrotator.hourDelimiter);
expectType<string[] | null>(app.config.logrotator.filesRotateBySize);

// multipart plugin types
expectType<boolean>(app.config.multipart.cleanSchedule.disable);
expectType<string>(app.config.multipart.cleanSchedule.cron);
expectType<string>(app.config.multipart.defaultCharset);
expectType<'file' | 'stream'>(app.config.multipart.mode);

// view plugin types
expectType<string>(app.config.view.defaultViewEngine);
expectType<string>(app.config.view.root);
expectType<string>(app.config.view.mapping.html);
expectType<string>(app.config.view.defaultExtension);
// @ts-ignore - view plugin extends context
expectType<string>(await ctx.renderString('hello'));
// @ts-ignore - view plugin extends context
expectType<string>(await ctx.view.renderString('hello'));
// @ts-ignore - view plugin extends app
const ViewEngine = app.view.get('html')!;
expectType<string>(await new ViewEngine(ctx).render('hello'));

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

const app1 = {} as Application;

expectType<boolean>(app1.config.httpclient.allowH2!);

const appBoot = new AppBoot(app1);
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
expectType<Redis>(redis.get('client1') as unknown as Redis);
