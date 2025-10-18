import { TableModel } from '@eggjs/dal-decorator';

export class TableModelManager {
  static instance = new TableModelManager();

  private tableModels: Map</* moduleName */ string, Map<string, TableModel>>;

  constructor() {
    this.tableModels = new Map();
  }

  get(moduleName: string, clazzName: string): TableModel | undefined {
    return this.tableModels.get(moduleName)?.get(clazzName);
  }

  set(moduleName: string, tableModel: TableModel) {
    let tables = this.tableModels.get(moduleName);
    if (!tables) {
      tables = new Map();
      this.tableModels.set(moduleName, tables);
    }
    tables.set(tableModel.clazz.name, tableModel);
  }

  clear() {
    this.tableModels.clear();
  }
}
