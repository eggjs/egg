import type { OrmConfig } from '../lib/DataSourceManager.ts';

export interface AppOrmConfig extends OrmConfig {
  datasources?: OrmConfig[];
}

export default {
  orm: {} as AppOrmConfig,
};

declare module 'egg' {
  interface EggAppConfig {
    /**
     * orm config
     */
    orm: AppOrmConfig;
  }
}
