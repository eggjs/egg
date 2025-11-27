import { QualifierUtil } from '@eggjs/core-decorator';
import { DataSourceQualifierAttribute } from '@eggjs/tegg-types';

export function DataSourceQualifier(dataSourceName: string) {
  return function (target: any, propertyKey: PropertyKey, parameterIndex?: number): void {
    QualifierUtil.addInjectQualifier(target, propertyKey, parameterIndex, DataSourceQualifierAttribute, dataSourceName);
  };
}
