import type { TableModel } from '@eggjs/dal-decorator';

export class TableModelManager {
  static instance: TableModelManager = new TableModelManager();

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
