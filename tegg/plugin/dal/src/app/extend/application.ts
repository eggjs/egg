import { MysqlDataSourceManager } from '../../lib/MysqlDataSourceManager.ts';

export default {
  get mysqlDataSourceManager(): MysqlDataSourceManager {
    return MysqlDataSourceManager.instance;
  },
};
