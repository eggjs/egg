import { AccessLevel, Inject, SingletonProto } from '@eggjs/tegg';

import { LeoricRegister } from './LeoricRegister.ts';
import type { RealmType } from './types.ts';

@SingletonProto({
  accessLevel: AccessLevel.PUBLIC,
})
export class Orm {
  @Inject()
  private leoricRegister: LeoricRegister;

  // default dataSource
  get client(): RealmType {
    const defaultConfig = this.leoricRegister.getConfig();
    return this.leoricRegister.getRealm(defaultConfig)!;
  }

  getClient(datasource: string): RealmType {
    const config = this.leoricRegister.getConfig(datasource);
    if (!config) {
      throw new Error(`not found ${datasource} datasource`);
    }
    return this.leoricRegister.getOrCreateRealm(config.database)!;
  }
}
