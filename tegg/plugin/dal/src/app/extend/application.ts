import { MysqlDataSourceManager } from '../../lib/MysqlDataSourceManager.ts';

export default {
  get mysqlDataSourceManager() {
    return MysqlDataSourceManager.instance;
  },
};
