import { Controller } from 'egg';
import { Hello } from '../../modules/aop-module/Hello.js';

export default class App extends Controller {
  async aop() {
    const hello: Hello = await this.ctx.module.aopModule.hello;
    const msg = await hello.hello('foo');
    this.ctx.status = 200;
    this.ctx.body = { msg };
  }

  async contextAdviceWithSingleton() {
    const hello: Hello = await this.app.module.aopModule.singletonHello;
    const msg = await hello.hello('foo');
    this.ctx.status = 200;
    this.ctx.body = { msg };
  }
}
