import {
  BaseContextClass,
  Context,
  Application,
  Agent,
  Controller,
  Service,
  Subscription,
  YadanApplication,
} from 'yadan';

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

// yadan application
const yadan = new YadanApplication({ baseDir: __dirname });
yadan.logger.info('123');
yadan.middleware.slice(0);
yadan.name.substring(0);
yadan.on('egg-ready', () => {});
yadan.emit('egg-ready');
yadan.getLogger('test').info('123');
yadan.inspect();
yadan.listen(1002);
yadan.logger.info(yadan.locals.test);

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

// test from yadan
app.fromYadan().then(result => result.substring(0));
app.config.yadanType.substring(0);

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

// controller
class MyController extends Controller {
  async test() {
    // test from yadan
    this.ctx.fromYadan().then(result => result.substring(0));
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

// subscription
class MySubscription extends Subscription {
  test() {
    this.logger.info(this.ctx.locals);
  }
}
new MySubscription({} as Context);


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

// extends yadan
app.config.frameworkYadan.substring(0);
declare module 'yadan' {
  interface EggAppConfig {
    frameworkYadan: string;
  }
}

// test from xiandan
import {
  BaseContextClass as XiandanBaseContextClass,
  Context as XiandanContext,
  Application as XiandanApplication2,
  Agent as XiandanAgent,
  Controller as XiandanController,
  Service as XiandanService,
  Subscription as XiandanSubscription,
  XiandanApplication,
} from 'xiandan';
new XiandanAgent({ baseDir: __dirname, plugins: {}, type: 'agent' });
new XiandanApplication2({ baseDir: __dirname, plugins: {}, type: 'agent' });
new XiandanBaseContextClass({} as XiandanContext);
new XiandanController({} as Context);
new XiandanService({} as Context);
new XiandanSubscription({} as Context);
new XiandanApplication().config.XiandanType.substring(0);
