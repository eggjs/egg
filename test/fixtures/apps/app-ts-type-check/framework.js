"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const yadan_1 = require("yadan");
// base context class
new yadan_1.BaseContextClass({});
// custom base context class
class CustomBaseContextClass extends yadan_1.BaseContextClass {
    constructor(ctx) {
        super(ctx);
    }
    test() {
        this.logger.info(this.ctx);
        this.logger.info(this.app.config.keys);
        this.logger.info(this.ctx.curl('http://127.0.0.1', { method: 'GET' }));
    }
}
new CustomBaseContextClass({}).test();
// yadan application
const yadan = new yadan_1.YadanApplication({ baseDir: __dirname });
yadan.logger.info('123');
yadan.middleware.slice(0);
yadan.name.substring(0);
yadan.on('egg-ready', () => { });
yadan.emit('egg-ready');
yadan.getLogger('test').info('123');
yadan.inspect();
yadan.listen(1002);
yadan.logger.info(yadan.locals.test);
// application
const app = new yadan_1.Application({ baseDir: __dirname, plugins: {}, type: 'application' });
app.logger.info('123');
app.middleware.slice(0);
app.name.substring(0);
app.on('egg-ready', () => { });
app.emit('egg-ready');
app.getLogger('test').info('123');
app.inspect();
app.listen(1002);
app.logger.info(app.locals.test);
const ctxHttpClient = new app.ContextHttpClient({});
ctxHttpClient.request('http://127.0.0.1', { method: 'GET' });
const appHttpClient = new app.HttpClient(app);
appHttpClient.request('http://127.0.0.1', { method: 'GET' });
app.httpclient.request('http://127.0.0.1', { method: 'GET' }).catch(() => { });
app.logger.info(app.Service);
app.logger.info(app.Controller);
app.controller.test().then(() => { });
// test from yadan
app.fromYadan().then(result => result.substring(0));
app.config.yadanType.substring(0);
// agent
const agent = new yadan_1.Agent({ baseDir: __dirname, plugins: {}, type: 'agent' });
agent.logger.info('123');
agent.name.substring(0);
agent.on('egg-ready', () => { });
agent.emit('egg-ready');
agent.getLogger('test').info('123');
agent.inspect();
agent.listen(1002);
agent.httpclient.request('http://127.0.0.1', { method: 'GET' }).catch(() => { });
agent.logger.info(agent.Service);
agent.logger.info(agent.Controller);
// controller
class MyController extends yadan_1.Controller {
    async test() {
        // test from yadan
        this.ctx.fromYadan().then(result => result.substring(0));
        this.ctx.logger.info(this.app.config.keys);
        await this.ctx.service.test();
        await this.service.myserv.test();
    }
}
// service
class MyService extends yadan_1.Service {
    async test() {
        this.ctx.logger.info(this.app.config.keys);
        await this.app.controller.myctrl.test();
    }
}
// subscription
class MySubscription extends yadan_1.Subscription {
    test() {
        this.logger.info(this.ctx.locals);
    }
}
new MySubscription({});
// extends egg
app.config.mySpecConfig.substring(0);
// extends yadan
app.config.frameworkYadan.substring(0);
// test from xiandan
const xiandan_1 = require("xiandan");
new xiandan_1.Agent({ baseDir: __dirname, plugins: {}, type: 'agent' });
new xiandan_1.Application({ baseDir: __dirname, plugins: {}, type: 'agent' });
new xiandan_1.BaseContextClass({});
new xiandan_1.Controller({});
new xiandan_1.Service({});
new xiandan_1.Subscription({});
new xiandan_1.XiandanApplication().config.XiandanType.substring(0);
