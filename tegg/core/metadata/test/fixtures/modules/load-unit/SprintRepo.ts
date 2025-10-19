import { Prototype } from '@eggjs/core-decorator';

@Prototype()
export default class SprintRepo {
  async save(): Promise<void> {
    return Promise.resolve();
  }
}
