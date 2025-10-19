import type { SqlType } from '../enum/index.ts';

export interface BaseSqlMap {
  type?: SqlType;
}

export interface FullSqlMap extends BaseSqlMap {
  type: typeof SqlType.DELETE | typeof SqlType.INSERT | typeof SqlType.UPDATE | typeof SqlType.SELECT;
  sql: string;
}

export interface BlockSqlMap extends BaseSqlMap {
  type: typeof SqlType.BLOCK;
  content: string;
}

export type SqlMap = FullSqlMap | BlockSqlMap;

export interface GenerateSqlMap {
  name: string;
  type: typeof SqlType.DELETE | typeof SqlType.UPDATE | typeof SqlType.INSERT | typeof SqlType.SELECT;
  sql: string;
}
