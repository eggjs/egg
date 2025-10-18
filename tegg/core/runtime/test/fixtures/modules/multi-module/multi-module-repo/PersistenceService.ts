import { AccessLevel, ObjectInitType } from '@eggjs/tegg-types';
import { Prototype } from '@eggjs/core-decorator';

@Prototype({
  initType: ObjectInitType.SINGLETON,
  accessLevel: AccessLevel.PRIVATE,
})
export default class PersistenceService {
  private store: Map<string, string> = new Map();

  public set(key: string, val: string) {
    this.store.set(key, val);
  }

  public get(key: string): string | undefined {
    return this.store.get(key);
  }
}
