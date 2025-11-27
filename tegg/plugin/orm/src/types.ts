import '@eggjs/tegg-plugin/types';
import type { AttributeOptions } from '@eggjs/orm-decorator';

import type { AppOrmConfig } from './config/config.default.ts';
import type { LeoricRegister } from './lib/LeoricRegister.ts';
import type { Orm } from './lib/SingletonORM.ts';
import type { DataType } from './lib/types.ts';

declare module '@eggjs/orm-decorator' {
  // @ts-expect-error: DataType is not defined in tegg-orm-decorator
  export function Attribute(
    dataType: DataType,
    options?: AttributeOptions,
  ): (target: any, propertyKey: PropertyKey) => void;
}

declare module 'egg' {
  interface EggAppConfig {
    /**
     * orm config
     */
    orm: AppOrmConfig;
  }

  interface Application {
    leoricRegister: LeoricRegister;
    orm: Orm;
  }
}
