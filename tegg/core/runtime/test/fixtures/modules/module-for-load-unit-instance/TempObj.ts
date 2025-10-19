import { ObjectInitType } from '@eggjs/tegg-types';
import { Prototype } from '@eggjs/core-decorator';

@Prototype({
  initType: ObjectInitType.ALWAYS_NEW,
})
export default class TempObj {
  count = 0;

  async getCount(): Promise<number> {
    return this.count++;
  }
}
