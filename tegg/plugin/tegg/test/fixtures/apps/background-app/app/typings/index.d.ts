import 'egg';
import TraceService from '../../modules/multi-module-service/TraceService.ts';
import AppService from '../../modules/multi-module-service/AppService.ts';

declare module 'egg' {
  export interface EggModule {
    // multiModuleService: {
    //   traceService: TraceService;
    //   appService: AppService;
    // }
  }
}
