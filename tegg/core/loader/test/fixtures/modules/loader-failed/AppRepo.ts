import { Prototype } from '@eggjs/core-decorator';

interface App {
  name: string;
}

@Prototype()
export default class AppRepo {
  async findAppByName(): Promise<App> {
    return {
      name: 'hello',
    };
  }
}

@Prototype()
export class AppRepo2 {
  error here;
  async findAppByName(name: string): Promise<App> {
    Foo.bar;
    return {
      name: 'hello',
    };
  }
}
