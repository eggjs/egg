import { AccessLevel, InnerObjectProto } from '@eggjs/core-decorator';
import type { TableSqlMap } from '@eggjs/dal-runtime';

@InnerObjectProto({ name: 'sqlMapManager', accessLevel: AccessLevel.PUBLIC })
export class SqlMapManager {
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
