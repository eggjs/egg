import { TableModel } from '@eggjs/dal-decorator';
import type { DataSource as IDataSource, PaginateData, SqlType } from '@eggjs/tegg-types';

import { MysqlDataSource } from './MySqlDataSource.ts';
import { TableSqlMap } from './TableSqlMap.ts';
import { TableModelInstanceBuilder } from './TableModelInstanceBuilder.ts';

export interface ExecuteSql {
  sql: string;
  template: string;
  sqlType: SqlType;
}

const PAGINATE_COUNT_WRAPPER = ['SELECT COUNT(0) as count FROM (', ') AS T'];

export class DataSource<T> implements IDataSource<T> {
  private readonly tableModel: TableModel<T>;
  private readonly mysqlDataSource: MysqlDataSource;
  private readonly sqlMap: TableSqlMap;

  constructor(tableModel: TableModel<T>, mysqlDataSource: MysqlDataSource, sqlMap: TableSqlMap) {
    this.tableModel = tableModel;
    this.mysqlDataSource = mysqlDataSource;
    this.sqlMap = sqlMap;
  }

  /**
   * public for aop execute to implement sql hint append
   * @param sqlName - sql name
   * @param data - sql data
   */
  async generateSql(sqlName: string, data: object): Promise<ExecuteSql> {
    const sql = this.sqlMap.generate(sqlName, data, this.mysqlDataSource.timezone!);
    const sqlType = this.sqlMap.getType(sqlName);
    const template = this.sqlMap.getTemplateString(sqlName);
    return {
      sql,
      sqlType,
      template,
    };
  }

  async count(sqlName: string, data?: any): Promise<number> {
    const newData = Object.assign({ $$count: true }, data);
    const executeSql = await this.generateSql(sqlName, newData);
    return await this.#paginateCount(executeSql.sql);
  }

  async execute(sqlName: string, data?: any): Promise<Array<T>> {
    const executeSql = await this.generateSql(sqlName, data);
    const rows = await this.mysqlDataSource.query(executeSql.sql);
    return rows.map((t: any) => {
      return TableModelInstanceBuilder.buildInstance(this.tableModel, t);
    });
  }

  async executeRaw(sqlName: string, data?: any): Promise<Array<any>> {
    const executeSql = await this.generateSql(sqlName, data);
    return await this.mysqlDataSource.query(executeSql.sql);
  }

  async executeScalar(sqlName: string, data?: any): Promise<T | null> {
    const ret = await this.execute(sqlName, data);
    if (!Array.isArray(ret)) return ret || null;
    return ret[0] || null;
  }

  async executeRawScalar(sqlName: string, data?: any): Promise<any | null> {
    const ret = await this.executeRaw(sqlName, data);
    if (!Array.isArray(ret)) return (ret || null) as any;
    return ret[0] || null;
  }

  async paginate(sqlName: string, data: any, currentPage: number, perPageCount: number): Promise<PaginateData<T>> {
    const limit = `LIMIT ${(currentPage - 1) * perPageCount}, ${perPageCount}`;
    const sql = (await this.generateSql(sqlName, data)).sql + ' ' + limit;
    const countSql = (await this.generateSql(sqlName, Object.assign({ $$count: true }, data))).sql;

    const ret = await Promise.all([this.mysqlDataSource.query(sql), this.#paginateCount(countSql)]);

    return {
      total: Number(ret[1]),
      pageNum: currentPage,
      rows: ret[0].map((t: any) => TableModelInstanceBuilder.buildInstance(this.tableModel, t)),
    };
  }

  async #paginateCount(baseSQL: string): Promise<number> {
    const sql = `${PAGINATE_COUNT_WRAPPER[0]}${baseSQL}${PAGINATE_COUNT_WRAPPER[1]}`;

    const result = await this.mysqlDataSource.query(sql);

    return result[0].count;
  }
}
