// exports.orm = {
//   client: 'mysql',
//   database: 'test',
//   host: 'localhost',
//   port: 3306,
//   user: 'root',
//
//   delegate: 'model',
//   baseDir: 'model',
//   migrations: 'database',
//
//   define: {
//     underscored: true,
//   },
//
//   // or put your config into datasources array to connect multiple databases
//   // datasources: [],
// };
export interface OrmConfig {
  client: string;
  database: string;
  host: string;
  port: number;
  user: string;
  define: object;
  options: object;
  charset: string;
  [key: string]: any;
}

export class DataSourceManager {
  private readonly dataSourceConfigs: OrmConfig[];
  private defaultDataSourceConfig?: OrmConfig;

  constructor() {
    this.dataSourceConfigs = [];
  }

  addDefaultConfig(config: OrmConfig) {
    this.defaultDataSourceConfig = config;
  }

  getDefaultConfig(): OrmConfig | undefined {
    return this.defaultDataSourceConfig;
  }

  addConfig(config: OrmConfig) {
    this.dataSourceConfigs.push(config);
  }

  getConfig(name: string): OrmConfig | undefined {
    if (this.defaultDataSourceConfig?.database === name) {
      return this.defaultDataSourceConfig;
    }
    return this.dataSourceConfigs.find(t => t.database === name);
  }
}
