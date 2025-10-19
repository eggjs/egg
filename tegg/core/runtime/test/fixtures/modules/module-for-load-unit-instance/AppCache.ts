import { SingletonProto } from '@eggjs/core-decorator';

@SingletonProto()
export default class AppCache {
  count = 0;

  async getCount(): Promise<number> {
    return this.count++;
  }
}
