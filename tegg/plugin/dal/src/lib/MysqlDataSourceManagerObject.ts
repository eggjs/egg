import { AccessLevel, InnerObjectProto } from '@eggjs/core-decorator';

import { MysqlDataSourceManager } from './MysqlDataSourceManager.ts';

/**
 * Declaration merging: the wrapper's instance type IS the manager's public
 * surface — matching what the constructor actually hands out — so typing an
 * injection as MysqlDataSourceManagerObject is as sound as typing it as
 * MysqlDataSourceManager.
 */
export interface MysqlDataSourceManagerObject extends MysqlDataSourceManager {}

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
    return MysqlDataSourceManager.instance;
  }
}
