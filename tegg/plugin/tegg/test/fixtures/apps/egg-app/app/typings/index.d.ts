import 'egg';
import TraceService from '../../modules/multi-module-service/TraceService.js';
import AppService from '../../modules/multi-module-service/AppService.js';
import ConfigService from '../../modules/multi-module-service/ConfigService.js';
import CustomLoggerService from '../../modules/multi-module-service/CustomLoggerService.js';
import GlobalAppRepo from '../../modules/multi-module-repo/GlobalAppRepo.js';

declare module 'egg' {
  export interface EggModule {
    multiModuleService: {
      traceService: TraceService;
      appService: AppService;
      configService: ConfigService;
      customLoggerService: CustomLoggerService;
    };
    multiModuleRepo: {
      globalAppRepo: GlobalAppRepo;
    };
  }
}
