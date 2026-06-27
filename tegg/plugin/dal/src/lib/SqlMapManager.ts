import type { TableSqlMap } from '@eggjs/dal-runtime';
import { TeggScope } from '@eggjs/tegg-types';

const SQL_MAP_MANAGER_SLOT = Symbol('tegg:dal:sqlMapManager');

export class SqlMapManager {
  // Per-app: keyed by module name (collides across apps); resolved from scope.
  static get instance(): SqlMapManager {
    return TeggScope.resolve(SQL_MAP_MANAGER_SLOT, () => new SqlMapManager(), 'SqlMapManager.instance');
  }

  private sqlMaps: Map</* moduleName */ string, Map<string, TableSqlMap>>;

  constructor() {
    this.sqlMaps = new Map();
  }

  get(moduleName: string, clazzName: string): TableSqlMap | undefined {
    return this.sqlMaps.get(moduleName)?.get(clazzName);
  }

  set(moduleName: string, sqlMap: TableSqlMap): void {
    let tables = this.sqlMaps.get(moduleName);
    if (!tables) {
      tables = new Map();
      this.sqlMaps.set(moduleName, tables);
    }
    tables.set(sqlMap.name, sqlMap);
  }

  clear(): void {
    this.sqlMaps.clear();
  }
}
