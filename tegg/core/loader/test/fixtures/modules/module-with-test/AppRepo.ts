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
