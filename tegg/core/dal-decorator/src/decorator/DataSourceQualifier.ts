import { DataSourceQualifierAttribute } from '@eggjs/tegg-types';
import { QualifierUtil } from '@eggjs/core-decorator';

export function DataSourceQualifier(dataSourceName: string) {
  return function (target: any, propertyKey: PropertyKey, parameterIndex?: number) {
    QualifierUtil.addInjectQualifier(target, propertyKey, parameterIndex, DataSourceQualifierAttribute, dataSourceName);
  };
}
