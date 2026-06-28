import type { TableModel } from '@eggjs/dal-decorator';
import { TeggScope } from '@eggjs/tegg-types';

const TABLE_MODEL_MANAGER_SLOT = Symbol('tegg:dal:tableModelManager');

export class TableModelManager {
  // Per-app: keyed by module name, which collides across apps; resolved from the
  // active TeggScope bag so two apps never share table-model registrations.
  static get instance(): TableModelManager {
    return TeggScope.resolve(TABLE_MODEL_MANAGER_SLOT, () => new TableModelManager(), 'TableModelManager.instance');
  }

  private tableModels: Map</* moduleName */ string, Map<string, TableModel>>;

  constructor() {
    this.tableModels = new Map();
  }

  get(moduleName: string, clazzName: string): TableModel | undefined {
    return this.tableModels.get(moduleName)?.get(clazzName);
  }

  set(moduleName: string, tableModel: TableModel): void {
    let tables = this.tableModels.get(moduleName);
    if (!tables) {
      tables = new Map();
      this.tableModels.set(moduleName, tables);
    }
    tables.set(tableModel.clazz.name, tableModel);
  }

  clear(): void {
    this.tableModels.clear();
  }
}
