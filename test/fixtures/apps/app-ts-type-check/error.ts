import {
  BaseContextClass,
  Context,
  Application,
  Agent,
  Controller,
  Service,
  EggAppConfig,
  PowerPartial,
  Singleton,
} from 'egg';

new BaseContextClass({} as Context).ctx;

class MyController extends Controller {
  async test() {
    this.ctx.locals.test.localsCheckAny();
    this.app.config.keys.configKeysCheckAny();
    this.app.appCheckAny();
  }
}
new MyController();

// service
class MyService extends Service {
  async test() {
    this.ctx.locals.test.serviceLocalCheckAny();
    this.app.config.keys.serviceConfigCheckAny();
    this.app.serviceAppCheckAny();
  }
}
new MyService();

const app = new Application({ baseDir: __dirname, plugins: {}, type: 'application' });
new app.ContextHttpClient();
new app.HttpClient();

new Agent(undefined, 1123);

// test error in yadan
import {
  BaseContextClass as YadanBaseContextClass,
  Application as YadanApplication,
  Agent as YadanAgent,
} from 'yadan';

new YadanBaseContextClass();
const yadan = new YadanApplication({ baseDir: __dirname, plugins: {}, type: 'application' });
new yadan.ContextHttpClient();
new yadan.HttpClient();
new YadanAgent(undefined, 1123);

// config
const config = {} as EggAppConfig;
config.customLoader = {
  model: {
  }
}

// partial config
const config2 = {} as PowerPartial<EggAppConfig>;
console.info(config2.security.csrf);

// singleton
const redis = {} as Singleton<{ test(): void; }>;
redis.get('123').checkSingleTon();
