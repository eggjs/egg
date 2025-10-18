import { ContextProto } from '@eggjs/core-decorator';

@ContextProto()
export default class AppCache {
  count = 0;

  async getCount(): Promise<number> {
    return this.count++;
  }
}
