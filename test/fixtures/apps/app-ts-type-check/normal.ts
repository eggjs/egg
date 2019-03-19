import {
  BaseContextClass,
  Context,
  Application,
  Agent,
  Controller,
  Service,
  Subscription,
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
