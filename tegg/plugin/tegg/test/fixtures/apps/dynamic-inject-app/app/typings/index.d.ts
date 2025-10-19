import 'egg';
import { HelloService } from '../../modules/dynamic-inject-module/HelloService.ts';
import { SingletonHelloService } from '../../modules/dynamic-inject-module/SingletonHelloService.ts';

declare module 'egg' {
  export interface EggModule {
    dynamicInjectModule: {
      helloService: HelloService;
      singletonHelloService: SingletonHelloService;
    };
  }
}
