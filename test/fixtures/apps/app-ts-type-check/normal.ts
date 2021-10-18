import {
  BaseContextClass,
  Context,
  Application,
  Agent,
  Controller,
  Service,
  Subscription,
  EggAppConfig,
  PowerPartial,
  Singleton,
  start,
} from 'egg';

// base context class
new BaseContextClass({} as Context);

// custom base context class
class CustomBaseContextClass extends BaseContextClass {
  constructor(ctx: Context) {
    super(ctx);
  }

  test() {
    this.logger.info(this.ctx);
    this.logger.info(this.app.config.keys);
    this.logger.info(this.ctx.curl('http://127.0.0.1', { method: 'GET' }));
  }
}
new CustomBaseContextClass({} as Context).test();

// application
const app = new Application({ baseDir: __dirname, plugins: {}, type: 'application' });
app.logger.info('123');
app.middleware.slice(0);
app.name.substring(0);
app.on('egg-ready', () => {});
app.emit('egg-ready');
app.getLogger('test').info('123');
app.inspect();
app.listen(1002);
app.logger.info(app.locals.test);
const ctxHttpClient = new app.ContextHttpClient({} as Context);
ctxHttpClient.request('http://127.0.0.1', { method: 'GET' });
const appHttpClient = new app.HttpClient(app);
appHttpClient.request('http://127.0.0.1', { method: 'GET' });
app.httpclient.request('http://127.0.0.1', { method: 'GET' }).catch(() => {});
app.logger.info(app.Service);
app.logger.info(app.Controller);
app.controller.test().then(() => {});

// agent
const agent = new Agent({ baseDir: __dirname, plugins: {}, type: 'agent' });
agent.logger.info('123');
agent.name.substring(0);
agent.on('egg-ready', () => {});
agent.emit('egg-ready');
agent.getLogger('test').info('123');
agent.inspect();
agent.listen(1002);
agent.httpclient.request('http://127.0.0.1', { method: 'GET' }).catch(() => {});
agent.logger.info(agent.Service);
agent.logger.info(agent.Controller);

// single process mode
start({ baseDir: __dirname,ignoreWarning: true}).then(app=>{
  const port= 1002;
  app.logger.info('123');
  app.on('egg-ready', () => {});
  app.emit('egg-ready');
  app.getLogger('test').info('123');
  app.inspect();
  app.listen(port);
  app.logger.info(app.locals.test);
  const ctxHttpClient = new app.ContextHttpClient({} as Context);
  ctxHttpClient.request('http://127.0.0.1', { method: 'GET' });
  const appHttpClient = new app.HttpClient(app);
  appHttpClient.request('http://127.0.0.1', { method: 'GET' });
  app.httpclient.request('http://127.0.0.1', { method: 'GET' }).catch(() => {});
  app.logger.info(app.Service);
  app.logger.info(app.Controller);
  app.controller.test().then(() => {});
});

// controller
class MyController extends Controller {
  async test() {
    this.ctx.logger.info(this.app.config.keys);
    await this.ctx.service.test();
    await this.service.myserv.test();
  }
}

// service
class MyService extends Service {
  async test() {
    this.ctx.logger.info(this.app.config.keys);
    await this.app.controller.myctrl.test();
  }
}

// should allow non-exist function
app.controller.nonExistFn();

// subscription
class MySubscription extends Subscription {
  test() {
    this.logger.info(this.ctx.locals);
  }
}
new MySubscription({} as Context);

// config
const config = {} as EggAppConfig;
config.keys = '123123';
config.customLoader = {
  model: {
    directory: 'app/model',
    inject: 'app',
  }
}
const httpclientOption = {
  keepAlive: true,
  freeSocketKeepAliveTimeout: 10 * 60 * 1000,
  freeSocketTimeout: 10 * 60 * 1000,
  timeout: 60 * 1000,
  maxSockets: 20,
  maxFreeSockets: 100,
};
config.httpclient = {
  ...httpclientOption,
  httpAgent: httpclientOption,
  httpsAgent: httpclientOption,
  enableProxy: true,
  request: {
    method: 'GET',
  },
  proxy: 'http://127.0.0.1:8888'
}
config.httpclient = httpclientOption;
config.logger = {
  dir: 'logs',
  encoding: 'utf8',
  env: 'prod',
  level: 'INFO',
  consoleLevel: 'INFO',
  disableConsoleAfterReady: true,
  outputJSON: false,
  buffer: true,
  appLogName: `app-web.log`,
  coreLogName: 'egg-web.log',
  agentLogName: 'egg-agent.log',
  errorLogName: 'common-error.log',
  allowDebugAtProd: false,
  coreLogger: {},
};
config.customLogger = {
  myLogger: {
    file: './test.log',
    jsonFile: './test.json',
    formatter: (meta: any) => (meta.date + ' ' + meta.level + ' ' + meta.pid + ' ' + meta.message),
    contextFormatter: meta => JSON.stringify(meta),
    buffer: true,
    eol: '\r\n',
  },

  otherLogger: {
    file: './other.log',
  }
}

// partial config
const config2 = {} as PowerPartial<EggAppConfig>;
config2.keys = '123123';
config2.customLoader = {
  model: {
    directory: 'app/model',
  }
}
config2.customLoader = {
  model: {
    inject: 'app',
  }
}
config2.security = {
  csrf: false,
  ssrf: {
    ipBlackList: [
      '10.0.0.0/8',
    ],
    checkAddress (ip) {
      return ip === '127.0.0.1';
    }
  },
}
config2.logger = {
  dir: 'logs',
  encoding: 'utf8',
  env: 'prod',
  level: 'INFO',
  coreLogger: {
    file: './test.log',
    level: 'ALL',
  }
}

// singleton
const redis = {} as Singleton<{ test(): void; }>;
redis.get('123').test();

// extends egg
app.config.mySpecConfig.substring(0);
declare module 'egg' {
  interface IApplicationLocals {
    test: string;
  }

  interface IController {
    test(): Promise<any>;
    myctrl: MyController;
  }

  interface IService {
    test(): Promise<any>;
    myserv: MyService;
  }

  interface EggAppConfig {
    mySpecConfig: string;
  }
}
