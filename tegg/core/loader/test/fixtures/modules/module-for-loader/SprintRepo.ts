import { Prototype } from '@eggjs/core-decorator';

@Prototype()
export default class SprintRepo {
  async save() {
    return Promise.resolve();
  }
}
