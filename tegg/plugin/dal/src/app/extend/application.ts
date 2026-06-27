import { TeggScope } from '@eggjs/tegg-types';
import type { Application } from 'egg';

import { MysqlDataSourceManager } from '../../lib/MysqlDataSourceManager.ts';

export default {
  // Pin to THIS app's scope so `app.mysqlDataSourceManager` returns the app's
  // per-app manager even when accessed outside a request/boot scope.
  get mysqlDataSourceManager(): MysqlDataSourceManager {
    const app = this as unknown as Application;
    return TeggScope.run(app._teggScopeBag, () => MysqlDataSourceManager.instance);
  },
};
