import { Prototype } from '@eggjs/core-decorator';
import { ObjectInitType } from '@eggjs/tegg-types';

@Prototype({
  initType: ObjectInitType.ALWAYS_NEW,
})
export default class TempObj {
  count = 0;

  async getCount(): Promise<number> {
    return this.count++;
  }
}
