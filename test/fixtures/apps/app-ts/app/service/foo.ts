import { Service } from '../../../../../../';

// add user controller and service
declare module '../../../../../../' {
  interface IService {
    foo: FooService;
  }
}

export default class FooService extends Service {
  async bar() {
    return { env: this.config.env };
  }
}
