import type { IndexStoreType, IndexType } from '../enum/index.ts';

export interface IndexParams {
  keys: string[];
  name?: string;
  type?: IndexType;
  storeType?: IndexStoreType;
  comment?: string;
  engineAttribute?: string;
  secondaryEngineAttribute?: string;
  parser?: string;
}

export * from './Column.ts';
export * from './DataSourceQualifier.ts';
export * from './Table.ts';
