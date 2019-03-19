"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const egg_1 = require("egg");
new egg_1.BaseContextClass({}).ctx;
class MyController extends egg_1.Controller {
    async test() {
        this.ctx.locals.test.checkAny();
        this.app.config.keys.checkAny();
        this.app.checkAny();
    }
}
new MyController();
// service
class MyService extends egg_1.Service {
    async test() {
        this.ctx.locals.test.checkAny();
        this.app.config.keys.checkAny();
        this.app.checkAny();
    }
}
new MyService();
const app = new egg_1.Application({ baseDir: __dirname, plugins: {}, type: 'application' });
new app.ContextHttpClient();
new app.HttpClient();
new egg_1.Agent(undefined, 1123);
// test error in yadan
const yadan_1 = require("yadan");
new yadan_1.BaseContextClass();
const yadan = new yadan_1.Application({ baseDir: __dirname, plugins: {}, type: 'application' });
new yadan.ContextHttpClient();
new yadan.HttpClient();
new yadan_1.Agent(undefined, 1123);
