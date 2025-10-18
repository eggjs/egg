import type { EggProtoImplClass } from '../../core-decorator/index.ts';
import type { SqlMap } from './SqlMap.ts';

export interface BaseDaoType {
  new (...args: any[]): object;
  clazzModel: EggProtoImplClass<object>;
  clazzExtension: Record<string, SqlMap>;
  // todo: typed structure
  tableStature: object;
  tableSql: string;
}
