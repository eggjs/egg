import { Hello, SingletonHello } from '../../modules/aop-module/Hello.js';

declare module 'egg' {
  export interface EggModule {
    aopModule: {
      hello: Hello;
      singletonHello: SingletonHello;
    };
  }
}
