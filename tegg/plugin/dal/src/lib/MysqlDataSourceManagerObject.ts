import { AccessLevel, InnerObjectProto } from '@eggjs/core-decorator';

import { MysqlDataSourceManager } from './MysqlDataSourceManager.ts';

/**
 * PUBLIC injection surface declared by the dal module itself: business
 * modules `@Inject() mysqlDataSourceManager` on any host (the counterpart of
 * the egg-side `app.mysqlDataSourceManager` extend) — hosts carry no dal
 * knowledge.
 *
 * The constructor return-override hands out the per-app TeggScope singleton
 * the dal hooks populate — NOT a second instance — so injected consumers see
 * the datasources created by DalModuleLoadUnitHook.
 */
@InnerObjectProto({ name: 'mysqlDataSourceManager', accessLevel: AccessLevel.PUBLIC })
export class MysqlDataSourceManagerObject {
  constructor() {
    return MysqlDataSourceManager.instance as unknown as MysqlDataSourceManagerObject;
  }
}
