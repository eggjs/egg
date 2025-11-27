import 'egg';
import AppService from '../../modules/multi-module-service/AppService.ts';
import TraceService from '../../modules/multi-module-service/TraceService.ts';

declare module 'egg' {
  export interface EggModule {
    // multiModuleService: {
    //   traceService: TraceService;
    //   appService: AppService;
    // }
  }
}
