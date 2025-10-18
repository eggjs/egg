import { RDSClient } from '@eggjs/rds';
import type { RDSClientOptions } from '@eggjs/rds';
import { Base } from 'sdk-base';
import type { Logger } from '@eggjs/tegg-types';

export interface DataSourceOptions extends RDSClientOptions {
  name: string;
  // default is select 1 + 1;
  initSql?: string;
  forkDb?: boolean;
  initRetryTimes?: number;
  logger?: Logger;
}

const DEFAULT_OPTIONS: RDSClientOptions = {
  supportBigNumbers: true,
  bigNumberStrings: true,
  trace: true,
};

export class MysqlDataSource extends Base {
  private client: RDSClient;
  private readonly initSql: string;
  readonly name: string;
  readonly timezone?: string;
  readonly rdsOptions: RDSClientOptions;
  readonly forkDb?: boolean;
  readonly #initRetryTimes?: number;
  readonly #logger?: Logger;

  constructor(options: DataSourceOptions) {
    super({ initMethod: '_init' });
    const { name, initSql, forkDb, initRetryTimes, logger, ...mysqlOptions } = options;
    this.#logger = logger;
    this.forkDb = forkDb;
    this.initSql = initSql ?? 'SELECT 1 + 1';
    this.#initRetryTimes = initRetryTimes;
    this.name = name;
    this.timezone = options.timezone;
    this.rdsOptions = Object.assign({}, DEFAULT_OPTIONS, mysqlOptions);
    this.client = new RDSClient(this.rdsOptions);
  }

  protected async _init() {
    if (this.initSql) {
      await this.#doInit(1);
    }
  }

  async #doInit(tryTimes: number): Promise<void> {
    try {
      this.#logger?.log(`${tryTimes} try to initialize dataSource ${this.name}`);
      const st = Date.now();
      await this.client.query(this.initSql);
      this.#logger?.info(`dataSource initialization cost: ${Date.now() - st}, tryTimes: ${tryTimes}`);
    } catch (e) {
      this.#logger?.warn(`failed to initialize dataSource ${this.name}, tryTimes ${tryTimes}`, e);
      if (!this.#initRetryTimes || tryTimes >= this.#initRetryTimes) {
        throw e;
      }
      await this.#doInit(tryTimes + 1);
    }
  }

  async query<T = any>(sql: string): Promise<T> {
    return this.client.query(sql);
  }

  async beginTransactionScope<T>(scope: () => Promise<T>): Promise<T> {
    return await this.client.beginTransactionScope(scope);
  }
}
