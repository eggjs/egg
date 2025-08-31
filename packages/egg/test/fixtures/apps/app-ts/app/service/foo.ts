// import { Service } from 'egg';
import { Service } from '../../../../../../src/index.js';

// add user controller and service
declare module 'egg' {
  interface IService {
    foo: FooService;
  }
}

export default class FooService extends Service {
  async bar() {
    return { env: this.config.env };
  }
}
