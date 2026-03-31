import { RDSClient } from '@eggjs/rds';
import type { QueryOptions, RDSClientOptions } from '@eggjs/rds';
import type { Logger } from '@eggjs/tegg-types';
import { Base } from 'sdk-base';

export interface EggQueryOptions extends QueryOptions {
  executeType?: 'execute' | 'query';
}

export interface DataSourceOptions extends RDSClientOptions {
  name: string;
  // default is select 1 + 1;
  initSql?: string;
  forkDb?: boolean;
  initRetryTimes?: number;
  logger?: Logger;
  executeType?: 'execute' | 'query';
}

const DEFAULT_OPTIONS: RDSClientOptions = {
  supportBigNumbers: true,
  bigNumberStrings: true,
  trace: true,
};

const DEFAULT_RETRY_TIMES = 3;

export class MysqlDataSource extends Base {
  private client: RDSClient;
  private readonly initSql: string;
  private readonly executeType?: 'execute' | 'query';
  readonly name: string;
  readonly timezone?: string;
  readonly rdsOptions: RDSClientOptions;
  readonly forkDb?: boolean;
  readonly #initRetryTimes: number;
  readonly #logger?: Logger;

  constructor(options: DataSourceOptions) {
    super({ initMethod: '_init' });
    const { name, initSql, forkDb, initRetryTimes, logger, executeType, ...mysqlOptions } = options;
    this.#logger = logger;
    this.forkDb = forkDb;
    this.initSql = initSql ?? 'SELECT 1 + 1';
    this.#initRetryTimes = initRetryTimes ?? DEFAULT_RETRY_TIMES;
    this.executeType = executeType;
    this.name = name;
    this.timezone = options.timezone;
    this.rdsOptions = Object.assign({}, DEFAULT_OPTIONS, mysqlOptions);
    this.client = new RDSClient(this.rdsOptions);
  }

  protected async _init(): Promise<void> {
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

  async query<T = any>(sql: string, params?: any[], options?: EggQueryOptions): Promise<T> {
    const executeType = options?.executeType || this.executeType;
    if (executeType === 'execute') {
      return (this.client as any).execute(sql, params, options);
    }
    return this.client.query(sql, params, options);
  }

  async beginTransactionScope<T>(scope: () => Promise<T>): Promise<T> {
    return await this.client.beginTransactionScope(scope);
  }
}
