import type { SqlType } from '../enum/index.ts';

export interface BaseSqlMap {
  type?: SqlType;
}

export interface FullSqlMap extends BaseSqlMap {
  type: SqlType.DELETE | SqlType.INSERT | SqlType.UPDATE | SqlType.SELECT;
  sql: string;
}

export interface BlockSqlMap extends BaseSqlMap {
  type: SqlType.BLOCK;
  content: string;
}

export type SqlMap = FullSqlMap | BlockSqlMap;

export interface GenerateSqlMap {
  name: string;
  type: SqlType.DELETE | SqlType.UPDATE | SqlType.INSERT | SqlType.SELECT;
  sql: string;
}
