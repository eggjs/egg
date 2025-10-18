import { Controller } from 'egg';
import { HelloService } from '../../modules/dynamic-inject-module/HelloService.ts';
import { SingletonHelloService } from '../../modules/dynamic-inject-module/SingletonHelloService.ts';

export default class App extends Controller {
  async dynamicInject() {
    // const helloService = await this.ctx.module.dynamicInjectModule.helloService;
    const helloService = await this.ctx.getEggObject(HelloService);
    const msgs = await helloService.hello();
    this.ctx.status = 200;
    this.ctx.body = msgs;
  }

  async singletonDynamicInject() {
    // const helloService = await this.app.module.dynamicInjectModule.singletonHelloService;
    const helloService = await this.app.getEggObject(SingletonHelloService);
    const msgs = await helloService.hello();
    this.ctx.status = 200;
    this.ctx.body = msgs;
  }
}
