import { TableSqlMap } from '@eggjs/dal-runtime';

export class SqlMapManager {
  static instance = new SqlMapManager();

  private sqlMaps: Map</* moduleName */ string, Map<string, TableSqlMap>>;

  constructor() {
    this.sqlMaps = new Map();
  }

  get(moduleName: string, clazzName: string): TableSqlMap | undefined {
    return this.sqlMaps.get(moduleName)?.get(clazzName);
  }

  set(moduleName: string, sqlMap: TableSqlMap) {
    let tables = this.sqlMaps.get(moduleName);
    if (!tables) {
      tables = new Map();
      this.sqlMaps.set(moduleName, tables);
    }
    tables.set(sqlMap.name, sqlMap);
  }

  clear() {
    this.sqlMaps.clear();
  }
}
