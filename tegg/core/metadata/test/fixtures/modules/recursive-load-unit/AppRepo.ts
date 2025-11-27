import { Prototype, Inject } from '@eggjs/core-decorator';

import SprintRepo from './SprintRepo.ts';

interface App {
  name: string;
}

@Prototype()
export default class AppRepo {
  @Inject()
  sprintRepo: SprintRepo;

  async findAppByName(): Promise<App> {
    return {
      name: 'hello',
    };
  }
}
