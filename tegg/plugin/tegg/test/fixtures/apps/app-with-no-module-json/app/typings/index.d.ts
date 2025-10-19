import 'egg';
import ConfigService from '../../modules/config-module/ConfigService.ts';

declare module 'egg' {
  export interface EggModule {
    config: {
      configService: ConfigService;
    };
  }
}
